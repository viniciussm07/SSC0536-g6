import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { administrarConta } from '../src/autenticacao/administrar-conta';
import { hashToken } from '../src/autenticacao/segredos';
import { isSessaoAtual } from '@ssc0536/common';

const databaseUrl = process.env.DATABASE_TEST_URL;
describe('Autenticação real HTTP/PostgreSQL', { skip: !databaseUrl }, () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  const ids: number[] = [];
  const limites = new Set<string>();
  const origem = 'http://localhost:5173';
  const senha = 'Senha fictícia exclusiva 2026';
  before(async () => {
    assert.ok(databaseUrl);
    assert.match(new URL(databaseUrl).pathname, /\/[a-zA-Z0-9_]+_test$/);
    process.env.DATABASE_URL = databaseUrl;
    process.env.FRONTEND_URL = origem;
    process.env.AUTH_COOKIE_SECURE = 'false';
    const { AppModule } = await import('../src/app.module.js');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    prisma = app.get(PrismaService);
  });
  after(async () => {
    if (prisma && ids.length) {
      await prisma.$transaction(async (tx) => {
        await tx.limiteAutenticacao.deleteMany({
          where: { chave: { in: [...limites] } },
        });
        await tx.sessao.deleteMany({ where: { usuarioId: { in: ids } } });
        await tx.ativacaoConta.deleteMany({
          where: { usuarioId: { in: ids } },
        });
        await tx.credencialLocal.deleteMany({
          where: { usuarioId: { in: ids } },
        });
        await tx.auditoria.deleteMany({
          where: { usuarioId: { in: ids }, entidade: 'conta' },
        });
        await tx.usuario.deleteMany({ where: { id: { in: ids } } });
      });
    }
    await app?.close();
  });
  function request(
    path: string,
    method = 'GET',
    body?: unknown,
    cookie?: string,
  ) {
    if (method === 'POST') {
      const janela = Math.floor(Date.now() / 900000);
      limites.add(hashToken(`${janela}:ip:127.0.0.1`));
      if (
        typeof body === 'object' &&
        body !== null &&
        'email' in body &&
        typeof body.email === 'string'
      )
        limites.add(
          hashToken(`${janela}:email:${body.email.trim().toLowerCase()}`),
        );
    }
    return fetch(`${base}/api${path}`, {
      method,
      headers: {
        Origin: origem,
        'Content-Type': 'application/json',
        'X-OTO-Request': '1',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  }
  function cookie(res: Response) {
    const value = res.headers.get('set-cookie');
    assert.ok(value);
    assert.match(value, /HttpOnly/);
    assert.match(value, /SameSite=Lax/);
    return value.split(';')[0];
  }
  it('bootstrap, ativação única, sessões independentes, logout, recuperação e conta inativa', async () => {
    const admin = await administrarConta(prisma, {
      acao: 'bootstrap',
      nome: 'Admin Fictício',
      email: 'auth-admin@example.test',
    });
    ids.push(admin.usuarioId);
    await assert.rejects(
      administrarConta(prisma, {
        acao: 'bootstrap',
        nome: 'Outro',
        email: 'outro@example.test',
      }),
    );
    const criar = async (email: string) => {
      const resultado = await administrarConta(prisma, {
        acao: 'criar',
        nome: 'Pessoa Fictícia',
        email,
        perfil: 'gestor',
        administradorId: admin.usuarioId,
      });
      ids.push(resultado.usuarioId);
      assert.ok(resultado.token);
      const gravado = await prisma.ativacaoConta.findUniqueOrThrow({
        where: { tokenHash: hashToken(resultado.token) },
      });
      assert.notEqual(gravado.tokenHash, resultado.token);
      assert.equal(
        (await request('/ativacoes', 'POST', { token: resultado.token, senha }))
          .status,
        204,
      );
      assert.equal(
        (await request('/ativacoes', 'POST', { token: resultado.token, senha }))
          .status,
        400,
      );
      return resultado;
    };
    const a = await criar('auth-a@example.test');
    const b = await criar('auth-b@example.test');
    const login = (email: string) =>
      request('/sessoes', 'POST', { email, senha });
    const ra = await login(' AUTH-A@EXAMPLE.TEST ');
    assert.equal(ra.status, 201);
    const ca = cookie(ra);
    const rb = await login('auth-b@example.test');
    assert.equal(rb.status, 201);
    const cb = cookie(rb);
    assert.notEqual(ca, cb);
    const body = await ra.json();
    assert.ok(
      typeof body === 'object' &&
        body !== null &&
        'data' in body &&
        isSessaoAtual(body.data),
    );
    assert.equal(body.data.usuario.id, a.usuarioId);
    assert.equal(
      (await request('/sessoes/atual', 'GET', undefined, ca)).status,
      200,
    );
    assert.equal(
      (await request('/sessoes/atual', 'DELETE', undefined, ca)).status,
      204,
    );
    assert.equal(
      (await request('/sessoes/atual', 'GET', undefined, ca)).status,
      401,
    );
    assert.equal(
      (await request('/sessoes/atual', 'GET', undefined, cb)).status,
      200,
    );
    await administrarConta(prisma, {
      acao: 'desativar',
      email: 'auth-b@example.test',
      administradorId: admin.usuarioId,
    });
    assert.equal(
      (await request('/sessoes/atual', 'GET', undefined, cb)).status,
      401,
    );
    const inativa = await login('auth-b@example.test');
    const desconhecida = await login('ausente@example.test');
    assert.equal(inativa.status, 401);
    assert.deepEqual(await inativa.json(), await desconhecida.json());
    const nova = await login('auth-a@example.test');
    const cn = cookie(nova);
    await prisma.sessao.updateMany({
      where: { usuarioId: a.usuarioId },
      data: { expiraEm: new Date(0) },
    });
    assert.equal(
      (await request('/sessoes/atual', 'GET', undefined, cn)).status,
      401,
    );
    const antes = cookie(await login('auth-a@example.test'));
    const recuperar = await administrarConta(prisma, {
      acao: 'recuperar',
      email: 'auth-a@example.test',
      administradorId: admin.usuarioId,
    });
    assert.equal(
      (await request('/sessoes/atual', 'GET', undefined, antes)).status,
      401,
    );
    assert.equal((await login('auth-a@example.test')).status, 401);
    const resultados = await Promise.all([
      request('/ativacoes', 'POST', { token: recuperar.token, senha }),
      request('/ativacoes', 'POST', { token: recuperar.token, senha }),
    ]);
    assert.deepEqual(resultados.map((r) => r.status).sort(), [204, 400]);
    const auditorias = await prisma.auditoria.findMany({
      where: { entidade: 'conta', entidadeId: { in: ids } },
    });
    assert.ok(auditorias.length >= 6);
    assert.ok(!JSON.stringify(auditorias).includes(senha));
    assert.ok(!JSON.stringify(auditorias).includes(recuperar.token!));
    const semOrigem = await fetch(`${base}/api/sessoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'auth-a@example.test', senha }),
    });
    assert.equal(semOrigem.status, 403);
    assert.equal(
      (
        await request('/sessoes', 'POST', {
          email: 'auth-a@example.test',
          senha,
          usuarioId: a.usuarioId,
        })
      ).status,
      400,
    );
    const expirado = await administrarConta(prisma, {
      acao: 'recuperar',
      email: 'auth-a@example.test',
      administradorId: admin.usuarioId,
    });
    await prisma.ativacaoConta.update({
      where: { tokenHash: hashToken(expirado.token!) },
      data: { expiraEm: new Date(0) },
    });
    assert.equal(
      (await request('/ativacoes', 'POST', { token: expirado.token, senha }))
        .status,
      400,
    );
    assert.equal(
      (await prisma.usuario.findUniqueOrThrow({ where: { id: b.usuarioId } }))
        .ativo,
      false,
    );
    const chave = hashToken(
      `${Math.floor(Date.now() / 900000)}:email:auth-a@example.test`,
    );
    await prisma.limiteAutenticacao.upsert({
      where: { chave },
      create: { chave, tentativas: 8, expiraEm: new Date(Date.now() + 900000) },
      update: { tentativas: 8 },
    });
    const limitada = await login('auth-a@example.test');
    assert.equal(limitada.status, 429);
    assert.equal(limitada.headers.get('retry-after'), '900');
  });
});
