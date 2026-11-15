import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  conferirSenha,
  hashSenha,
  hashToken,
  novoToken,
} from '../src/autenticacao/segredos';
import { AutenticacaoService } from '../src/autenticacao/autenticacao.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import {
  conferirOrigem,
  cookieSessao,
} from '../src/autenticacao/autenticacao.http';
import type { IncomingMessage } from 'node:http';
import { validateEnvironment } from '../src/config/env.validation';

describe('Autenticação local: regras sem banco', () => {
  it('salt independente, comparação de senha e tokens imprevisíveis', async () => {
    const hash = await hashSenha('Senha fictícia longa');
    const outro = await hashSenha('Senha fictícia longa');
    assert.notEqual(hash, outro);
    assert.ok(!hash.includes('Senha fictícia'));
    assert.equal(await conferirSenha('Senha fictícia longa', hash), true);
    assert.equal(await conferirSenha('Senha errada', hash), false);
    assert.equal(await conferirSenha('Senha errada'), false);
    const token = novoToken();
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(token, novoToken());
    assert.notEqual(token, hashToken(token));
  });
  it('sessão ausente, expirada, revogada ou conta inativa nunca libera identidade', async () => {
    for (const alteracao of [
      null,
      { expiraEm: new Date(0) },
      { revogadaEm: new Date() },
      { usuario: { ativo: false } },
    ]) {
      const prisma = {
        sessao: {
          findUnique: async () =>
            alteracao === null
              ? null
              : {
                  expiraEm: new Date(Date.now() + 60000),
                  revogadaEm: null,
                  usuario: { ativo: true },
                  ...alteracao,
                },
        },
      } as unknown as PrismaService;
      const service = new AutenticacaoService(prisma);
      await assert.rejects(service.atual('a'.repeat(64)), { status: 401 });
      await assert.rejects(service.atual(), { status: 401 });
    }
  });
  it('limite persistido interrompe tentativas antes de verificar senha', async () => {
    const prisma = {
      limiteAutenticacao: { upsert: async () => ({ tentativas: 31 }) },
    } as unknown as PrismaService;
    await assert.rejects(
      new AutenticacaoService(prisma).login(
        'teste@example.test',
        'senha',
        'local',
      ),
      { status: 429 },
    );
  });
  it('escrita exige origem exata, JSON e cabeçalho não simples; cookie duplicado é rejeitado', () => {
    const headers = {
      origin: 'http://localhost:5173',
      'content-type': 'application/json',
      'x-oto-request': '1',
    };
    const req = (h: object) => ({ headers: h }) as IncomingMessage;
    assert.doesNotThrow(() => conferirOrigem(req(headers), headers.origin));
    for (const h of [
      {},
      { ...headers, origin: 'https://evil.example.test' },
      { ...headers, 'x-oto-request': undefined },
    ])
      assert.throws(() => conferirOrigem(req(h), headers.origin));
    assert.equal(
      cookieSessao(req({ cookie: 'oto_sessao=a; oto_sessao=b' })),
      undefined,
    );
  });
  it('produção exige cookie seguro fora do ambiente local', () => {
    const base = {
      DATABASE_URL: 'postgresql://app:app@localhost/app',
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://oto.example.test',
    };
    assert.equal(validateEnvironment(base).AUTH_COOKIE_SECURE, true);
    assert.throws(() =>
      validateEnvironment({ ...base, AUTH_COOKIE_SECURE: 'false' }),
    );
    assert.throws(() =>
      validateEnvironment({ ...base, AUTH_COOKIE_SECURE: 'talvez' }),
    );
  });
});
