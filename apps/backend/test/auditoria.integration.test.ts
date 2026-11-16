import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  isEventoAuditoriaDetalhe,
  isEventoAuditoriaResumo,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import type { Prisma } from '../src/generated/prisma/client';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';
import { registrarAuditoria } from '../src/auditoria/registrar-auditoria';

const databaseUrl = process.env.DATABASE_TEST_URL;
describe('Auditoria real HTTP/PostgreSQL', { skip: !databaseUrl }, () => {
  let app: INestApplication, prisma: PrismaService, base: string;
  const usuarios: number[] = [],
    eventos: number[] = [];
  const cookies = new Map<string, string>();
  let admin = 0;
  const entidadeId = 771007;
  before(async () => {
    assert.ok(databaseUrl);
    assert.match(new URL(databaseUrl).pathname, /\/[a-zA-Z0-9_]+_test$/);
    process.env.DATABASE_URL = databaseUrl;
    process.env.FRONTEND_URL = 'http://localhost:5173';
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
    for (const perfil of [
      'administrador',
      'gestor',
      'estagiario',
      'visualizador',
      'empresario',
    ]) {
      const u = await prisma.usuario.create({
        data: {
          nome: `Pessoa auditoria ${perfil}`,
          email: `auditoria-${perfil}@example.test`,
          perfil,
        },
      });
      usuarios.push(u.id);
      if (perfil === 'administrador') admin = u.id;
      const token = novoToken();
      await prisma.sessao.create({
        data: {
          usuarioId: u.id,
          tokenHash: hashToken(token),
          criadaEm: new Date(),
          expiraEm: new Date(Date.now() + 3600000),
        },
      });
      cookies.set(perfil, `oto_sessao=${token}`);
    }
    await prisma.permissaoPerfil.upsert({
      where: {
        perfil_recurso_acao: {
          perfil: 'administrador',
          recurso: 'auditoria',
          acao: 'consultar',
        },
      },
      create: {
        perfil: 'administrador',
        recurso: 'auditoria',
        acao: 'consultar',
        escopo: 'todos',
      },
      update: { escopo: 'todos' },
    });
    await prisma.$transaction(async (tx) => {
      const primeiro = await registrarAuditoria(tx, {
        usuarioId: admin,
        entidade: 'empreendimento',
        entidadeId,
        acao: 'alterar',
        antes: { nomeFantasia: 'Antes fictício', situacao: 'ativo' },
        depois: { nomeFantasia: 'Depois fictício', situacao: 'encerrado' },
        correlacaoId: 'lote:teste-07',
      });
      eventos.push(primeiro.id);
      const automatico = await registrarAuditoria(tx, {
        processo: 'importacao:teste',
        entidade: 'empreendimento',
        entidadeId,
        acao: 'alterar',
        depois: { nomeFantasia: 'Processado' },
        correlacaoId: 'lote:teste-07',
      });
      eventos.push(automatico.id);
      // Simula evento legado inseguro: a API não deve publicar os campos arbitrários.
      const legado = await tx.auditoria.create({
        data: {
          usuarioId: admin,
          entidade: 'empreendimento',
          entidadeId,
          acao: 'alterar',
          antes: { nomeFantasia: null, senha: 'segredo-legado' },
          depois: {
            nomeFantasia: 'Legado fictício',
            tokenHash: 'segredo-legado',
            contatos: [
              { valor: 'contato@example.test', password: 'segredo-legado' },
            ],
          },
        },
      });
      eventos.push(legado.id);
    });
  });
  after(async () => {
    if (prisma)
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`ALTER TABLE auditoria DISABLE TRIGGER auditoria_imutavel`;
        await tx.auditoria.deleteMany({
          where: {
            OR: [{ usuarioId: { in: usuarios } }, { id: { in: eventos } }],
          },
        });
        await tx.$executeRaw`ALTER TABLE auditoria ENABLE TRIGGER auditoria_imutavel`;
        await tx.sessao.deleteMany({ where: { usuarioId: { in: usuarios } } });
        await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
      });
    await app?.close();
  });
  const get = (path: string, perfil = 'administrador') =>
    fetch(`${base}/api${path}`, {
      headers: { cookie: cookies.get(perfil) ?? '' },
    });
  const filtro = () => `entidadeId eq ${entidadeId}`;
  it('nega sessão ausente e todos os perfis sem acesso inclusive por ID direto', async () => {
    assert.equal((await get('/auditorias', 'ausente')).status, 401);
    for (const perfil of [
      'gestor',
      'estagiario',
      'visualizador',
      'empresario',
    ]) {
      assert.equal((await get('/auditorias', perfil)).status, 403);
      assert.equal(
        (await get(`/auditorias/${eventos[0]}`, perfil)).status,
        403,
      );
    }
  });
  it('uma regra concedida indevidamente a gestor não ultrapassa o limite de perfil', async () => {
    const where = {
      perfil_recurso_acao: {
        perfil: 'gestor',
        recurso: 'auditoria',
        acao: 'consultar',
      },
    };
    const anterior = await prisma.permissaoPerfil.findUnique({ where });
    try {
      await prisma.permissaoPerfil.upsert({
        where,
        create: {
          perfil: 'gestor',
          recurso: 'auditoria',
          acao: 'consultar',
          escopo: 'todos',
        },
        update: { escopo: 'todos' },
      });
      assert.equal((await get('/auditorias', 'gestor')).status, 403);
      assert.equal(
        (await get(`/auditorias/${eventos[0]}`, 'gestor')).status,
        403,
      );
    } finally {
      if (anterior)
        await prisma.permissaoPerfil.update({
          where,
          data: { escopo: anterior.escopo },
        });
      else await prisma.permissaoPerfil.delete({ where });
    }
  });

  it('lista sem snapshots, filtra e pagina com ordenação estável e total opcional', async () => {
    const path = `/auditorias?${new URLSearchParams({ $filter: filtro(), $orderby: 'em asc', $top: '1', $skip: '0', $count: 'true' })}`;
    const r = await get(path);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    const body = (await r.json()) as {
      data: unknown[];
      meta: { total: number; top: number; skip: number };
    };
    assert.equal(body.meta.total, 3);
    assert.equal(body.data.length, 1);
    assert.equal(body.meta.top, 1);
    assert.ok(isEventoAuditoriaResumo(body.data[0]));
    assert.ok(!('antes' in body.data[0]));
    const semTotal = (await (
      await get(`/auditorias?${new URLSearchParams({ $filter: filtro() })}`)
    ).json()) as { meta: object };
    assert.ok(!('total' in semTotal.meta));
    const porAutor = (await (
      await get(
        `/auditorias?${new URLSearchParams({ $filter: `${filtro()} and origem eq 'manual' and contains(autor,'administrador') and acao eq 'alterar' and em ge 2020-01-01T00:00:00Z`, $count: 'true' })}`,
      )
    ).json()) as { meta: { total: number } };
    assert.equal(porAutor.meta.total, 2);
    const processo = (await (
      await get(
        `/auditorias?${new URLSearchParams({ $filter: `${filtro()} and processo eq 'importacao:teste'` })}`,
      )
    ).json()) as {
      data: { usuarioId: number | null; origem: string; autor: string }[];
    };
    assert.equal(processo.data.length, 1);
    assert.equal(processo.data[0].usuarioId, null);
    assert.equal(processo.data[0].origem, 'automatica');
    assert.equal(processo.data[0].autor, 'importacao:teste');
  });
  it('detalhe retorna diferenças e não expõe segredos legados, com 404 para ID ausente', async () => {
    const r = await get(`/auditorias/${eventos[0]}`);
    assert.equal(r.status, 200);
    const { data } = (await r.json()) as { data: unknown };
    assert.ok(isEventoAuditoriaDetalhe(data));
    assert.equal(data.diferencas.length, 2);
    assert.equal(data.usuarioId, admin);
    assert.equal(data.correlacaoId, 'lote:teste-07');
    const raw = await (await get(`/auditorias/${eventos[2]}`)).text();
    assert.ok(!raw.includes('segredo-legado'));
    assert.ok(!raw.includes('password'));
    assert.ok(!raw.includes('tokenHash'));
    assert.equal((await get('/auditorias/2147483647')).status, 404);
    assert.equal((await get('/auditorias/999999999999999999')).status, 400);
    assert.equal((await get('/auditorias/0')).status, 400);
    assert.equal((await get('/auditorias?usuarioId=1')).status, 400);
    assert.equal((await get('/auditorias?page=1')).status, 400);
    assert.equal((await get('/auditorias?$top=101')).status, 400);
    assert.equal(
      (await get('/auditorias?$filter=senha%20eq%20%27x%27')).status,
      400,
    );
  });
  it('mantém autoria do instante após renomear e inativar a pessoa e consulta evento sem entidade ativa', async () => {
    const outro = await prisma.usuario.create({
      data: {
        nome: 'Nome no instante',
        email: 'audit-inativo@example.test',
        perfil: 'gestor',
      },
    });
    usuarios.push(outro.id);
    const ev = await prisma.$transaction((tx) =>
      registrarAuditoria(tx, {
        usuarioId: outro.id,
        entidade: 'conta',
        entidadeId: outro.id,
        acao: 'alterar',
        depois: { ativo: false },
      }),
    );
    eventos.push(ev.id);
    await prisma.usuario.update({
      where: { id: outro.id },
      data: { ativo: false, nome: 'Nome atual' },
    });
    const { data } = (await (await get(`/auditorias/${ev.id}`)).json()) as {
      data: { autor: string };
    };
    assert.equal(data.autor, 'Nome no instante');
  });
  it('bloqueia UPDATE, DELETE e TRUNCATE no banco e não oferece mutações HTTP', async () => {
    await assert.rejects(
      prisma.auditoria.update({
        where: { id: eventos[0] },
        data: { acao: 'excluir' },
      }),
      /imutável/,
    );
    await assert.rejects(
      prisma.auditoria.delete({ where: { id: eventos[0] } }),
      /imutável/,
    );
    await assert.rejects(
      prisma.$executeRaw`TRUNCATE TABLE auditoria`,
      /imutável/,
    );
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const r = await fetch(`${base}/api/auditorias/${eventos[0]}`, {
        method,
        headers: { cookie: cookies.get('administrador')! },
      });
      assert.ok(r.status >= 400);
    }
    assert.ok(await prisma.auditoria.findUnique({ where: { id: eventos[0] } }));
  });
  it('falha física ao gravar auditoria reverte a mutação de negócio na mesma transação', async () => {
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        const u = await tx.usuario.create({
          data: {
            nome: 'Deve reverter',
            email: 'audit-rollback@example.test',
            perfil: 'gestor',
          },
        });
        const comFalha = new Proxy(tx, {
          get(target, key) {
            if (key === 'auditoria')
              return {
                create: (args: { data: Record<string, unknown> }) =>
                  tx.auditoria.create({
                    data: {
                      ...args.data,
                      usuarioId: 2147483647,
                    } as Prisma.AuditoriaUncheckedCreateInput,
                  }),
              };
            return Reflect.get(target, key);
          },
        });
        await registrarAuditoria(comFalha, {
          usuarioId: u.id,
          entidade: 'conta',
          entidadeId: u.id,
          acao: 'criar',
          depois: { nome: u.nome },
        });
      }),
    );
    assert.equal(
      await prisma.usuario.count({
        where: { email: 'audit-rollback@example.test' },
      }),
      0,
    );
  });
});
