import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { POLITICA_ROTA, type PoliticaRota } from './acesso.decorators';
import { AutorizacaoService } from './autorizacao.service';
import { acessoNegado } from './acesso.errors';
import {
  conferirOrigem,
  cookieSessao,
} from '../autenticacao/autenticacao.http';
import type { RequisicaoAutenticada } from './acesso.types';

@Injectable()
export class AcessoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly autorizacao: AutorizacaoService,
    private readonly config: ConfigService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const politica = this.reflector.getAllAndOverride<PoliticaRota>(
      POLITICA_ROTA,
      [context.getHandler(), context.getClass()],
    );
    if (politica && 'publica' in politica) return true;
    const req = context.switchToHttp().getRequest<RequisicaoAutenticada>();
    req.acesso = await this.autorizacao.identificar(cookieSessao(req));
    context
      .switchToHttp()
      .getResponse<{ setHeader: (name: string, value: string) => void }>()
      .setHeader('Cache-Control', 'no-store');
    if (!politica) throw acessoNegado();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? ''))
      conferirOrigem(req, this.config.getOrThrow<string>('FRONTEND_URL'));
    if ('recurso' in politica)
      await this.autorizacao.exigir(
        req.acesso,
        politica.recurso,
        politica.acao,
      );
    return true;
  }
}
