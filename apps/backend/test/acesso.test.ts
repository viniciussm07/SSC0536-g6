import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { AutorizacaoService } from '../src/acesso/autorizacao.service';
import { AcessoGuard } from '../src/acesso/acesso.guard';
import {
  ExigirPermissao,
  RequerSessao,
  RotaPublica,
} from '../src/acesso/acesso.decorators';
import type {
  RequisicaoAutenticada,
  ContextoAcesso,
} from '../src/acesso/acesso.types';
import type { PrismaService } from '../src/prisma/prisma.service';

const contexto: ContextoAcesso = {
  usuario: {
    id: 1,
    nome: 'Pessoa Fictícia',
    email: 'pessoa@example.test',
    perfil: 'empresario',
  },
  tokenHash: 'hash-interno',
};
describe('Política central de acesso', () => {
  it('nega regras ausentes, desconhecidas ou que ampliam o escopo do empresário', async () => {
    for (const regra of [
      null,
      { recurso: 'empreendimentos', acao: 'consultar', escopo: 'todos' },
      { recurso: 'empreendimentos', acao: 'consultar', escopo: 'outro' },
    ]) {
      const prisma = {
        permissaoPerfil: { findUnique: async () => regra },
      } as unknown as PrismaService;
      await assert.rejects(
        new AutorizacaoService(prisma).exigir(
          contexto,
          'empreendimentos',
          'consultar',
        ),
        { status: 403 },
      );
    }
  });
  it('escopo vinculado exige vínculo e usuário ativos no filtro do banco', async () => {
    const prisma = {
      permissaoPerfil: {
        findUnique: async () => ({
          recurso: 'empreendimentos',
          acao: 'consultar',
          escopo: 'vinculados',
        }),
      },
    } as unknown as PrismaService;
    const filtro = await new AutorizacaoService(prisma).filtroEmpreendimentos(
      contexto,
      'empreendimentos',
      'consultar',
    );
    assert.deepEqual(filtro, {
      usuarios: {
        some: { usuarioId: 1, ativo: true, usuario: { ativo: true } },
      },
    });
  });
  it('guard nega rota sem política e ignora identidade enviada pelo cliente', async () => {
    const req = {
      method: 'GET',
      headers: { cookie: 'oto_sessao=token' },
      acesso: { usuario: { id: 999 } },
    } as unknown as RequisicaoAutenticada;
    const auth = {
      identificar: async () => contexto,
      exigir: async () => 'vinculados',
    } as unknown as AutorizacaoService;
    class SemPolitica {}
    const handler = () => undefined;
    const ctx = {
      getHandler: () => handler,
      getClass: () => SemPolitica,
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ setHeader: () => undefined }),
      }),
    } as unknown as ExecutionContext;
    const guard = new AcessoGuard(
      new Reflector(),
      auth,
      new ConfigService({ FRONTEND_URL: 'http://localhost:5173' }),
    );
    await assert.rejects(guard.canActivate(ctx), { status: 403 });
    assert.equal(req.acesso.usuario.id, 1);
    RequerSessao()(SemPolitica);
    assert.equal(await guard.canActivate(ctx), true);
    RotaPublica()(SemPolitica);
    assert.equal(await guard.canActivate(ctx), true);
    ExigirPermissao('empreendimentos', 'consultar')(SemPolitica);
    assert.equal(await guard.canActivate(ctx), true);
    ExigirPermissao('pesquisas', 'consultar', true)(SemPolitica);
    await assert.rejects(guard.canActivate(ctx), { status: 403 });
    ExigirPermissao('empreendimentos', 'consultar')(SemPolitica);
    req.method = 'PUT';
    await assert.rejects(guard.canActivate(ctx), { status: 403 });
  });
});
