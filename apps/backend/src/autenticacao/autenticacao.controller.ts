import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AutenticacaoService, SESSAO_DURACAO_MS } from './autenticacao.service';
import { LoginDto, AtivacaoDto } from './autenticacao.dto';
import { RotaPublica } from '../acesso/acesso.decorators';
import {
  AutenticacaoExceptionFilter,
  conferirOrigem,
  cookieSessao,
} from './autenticacao.http';

@Controller()
@RotaPublica()
@UseFilters(AutenticacaoExceptionFilter)
export class AutenticacaoController {
  constructor(
    private readonly auth: AutenticacaoService,
    private readonly config: ConfigService,
  ) {}

  @Post('sessoes')
  @HttpCode(201)
  async login(
    @Body() body: LoginDto,
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    this.escrita(req);
    const resultado = await this.auth.login(
      body.email,
      body.senha,
      req.socket.remoteAddress ?? 'local',
    );
    res.setHeader(
      'Set-Cookie',
      this.cookie(resultado.token, SESSAO_DURACAO_MS / 1000),
    );
    res.setHeader('Cache-Control', 'no-store');
    return { data: resultado.data };
  }
  @Get('sessoes/atual')
  async atual(
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return { data: await this.auth.atual(cookieSessao(req)) };
  }
  @Delete('sessoes/atual')
  @HttpCode(204)
  async logout(
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    this.escrita(req);
    await this.auth.logout(cookieSessao(req));
    res.setHeader('Set-Cookie', this.cookie('', 0));
    res.setHeader('Cache-Control', 'no-store');
  }
  @Post('ativacoes')
  @HttpCode(204)
  async ativar(
    @Body() body: AtivacaoDto,
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    this.escrita(req);
    await this.auth.ativar(
      body.token,
      body.senha,
      req.socket.remoteAddress ?? 'local',
    );
    res.setHeader('Set-Cookie', this.cookie('', 0));
    res.setHeader('Cache-Control', 'no-store');
  }
  private escrita(req: IncomingMessage) {
    conferirOrigem(req, this.config.getOrThrow<string>('FRONTEND_URL'));
  }
  private cookie(token: string, segundos: number) {
    return `oto_sessao=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${segundos}${this.config.get<boolean>('AUTH_COOKIE_SECURE') ? '; Secure' : ''}`;
  }
}
