import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { isPeriodoLinha, type Perfil } from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  meta?: { top?: number; skip?: number; total?: number };
  error?: { code: string; details?: { field?: string; message?: string }[] };
}

describe('Períodos HTTP/PostgreSQL', { skip: !databaseUrl }, () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  const origem = 'http://localhost:5173';
  const perfis = new Map<Perfil, number>();
  const usuarios: number[] = [];
  const criados: number[] = [];

  async function sessao(perfil: Perfil) {
    const token = novoToken();
    await prisma.sessao.create({
      data: {
        tokenHash: hashToken(token),
        usuarioId: perfis.get(perfil)!,
        criadaEm: new Date(),
        expiraEm: new Date(Date.now() + 3600000),
      },
    });
    return `oto_sessao=${token}`;
  }
  async function chamar(
    caminho: string,
    cookie: string,
    metodo = 'GET',
    corpo?: unknown,
  ) {
    const r = await fetch(`${base}/api${caminho}`, {
      method: metodo,
      headers: {
        Origin: origem,
        Cookie: cookie,
        'X-OTO-Request': '1',
        ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
    return { status: r.status, json: (await r.json()) as Corpo };
  }

  before(async () => {
    assert.ok(databaseUrl);
    assert.match(new URL(databaseUrl).pathname, /\/[a-zA-Z0-9_]+_test$/);
    process.env.DATABASE_URL = databaseUrl;
    process.env.FRONTEND_URL = origem;
    process.env.AUTH_COOKIE_SECURE = 'false';
    const { AppModule } = await import('../src/app.module.js');
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    prisma = app.get(PrismaService);
    for (const perfil of ['administrador', 'gestor', 'estagiario'] as const) {
      const u = await prisma.usuario.create({
        data: {
          nome: `Períodos ${perfil}`,
          email: `periodos-${perfil}@example.test`,
          perfil,
        },
      });
      usuarios.push(u.id);
      perfis.set(perfil, u.id);
    }
  });

  after(async () => {
    if (prisma) {
      await prisma.$transaction(async (tx) => {
        await tx.pesquisaPergunta.deleteMany({
          where: { periodoId: { in: criados } },
        });
        await tx.periodo.deleteMany({ where: { id: { in: criados } } });
        await tx.sessao.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await tx.$executeRaw`ALTER TABLE auditoria DISABLE TRIGGER auditoria_imutavel`;
        await tx.auditoria.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await tx.$executeRaw`ALTER TABLE auditoria ENABLE TRIGGER auditoria_imutavel`;
        await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
      });
    }
    await app?.close();
  });

  it('cria, lista com OData, detalha e audita; permissões valem por perfil', async () => {
    const gestor = await sessao('gestor');
    const estagiario = await sessao('estagiario');
    const mes = {
      tipo: 'mes',
      rotulo: 'Março 2026',
      dataInicio: '2026-03-01',
      dataFim: '2026-03-31',
    };
    const criado = await chamar('/periodos', gestor, 'POST', mes);
    assert.equal(criado.status, 201);
    const linha = criado.json.data as { id: number };
    assert.ok(isPeriodoLinha(criado.json.data));
    criados.push(linha.id);

    const feriado = await chamar('/periodos', gestor, 'POST', {
      tipo: 'feriado_prolongado',
      rotulo: 'Páscoa 2026',
      dataInicio: '2026-04-03',
      dataFim: '2026-04-05',
    });
    assert.equal(feriado.status, 201);
    criados.push((feriado.json.data as { id: number }).id);

    // Duplicidade de identidade canônica.
    const dup = await chamar('/periodos', gestor, 'POST', mes);
    assert.equal(dup.status, 409);
    assert.equal(dup.json.error?.code, 'PERIODO_DUPLICADO');

    // Coleção OData com filtro e $count.
    const lista = await chamar(
      '/periodos?$filter=tipo eq ' +
        "'mes' and dataInicio ge 2026-03-01&$count=true",
      gestor,
    );
    assert.equal(lista.status, 200);
    const linhas = lista.json.data as unknown[];
    assert.equal(linhas.length, 1);
    assert.equal(lista.json.meta?.total, 1);

    // Detalhe sem uso.
    const detalhe = await chamar(`/periodos/${linha.id}`, gestor);
    assert.equal(detalhe.status, 200);
    assert.equal((detalhe.json.data as { emUso: boolean }).emUso, false);

    // Estagiário consulta, mas não cria.
    const leitura = await chamar('/periodos?$top=5', estagiario);
    assert.equal(leitura.status, 200);
    const negado = await chamar('/periodos', estagiario, 'POST', {
      tipo: 'mes',
      rotulo: 'Abril 2026',
      dataInicio: '2026-04-01',
      dataFim: '2026-04-30',
    });
    assert.equal(negado.status, 403);

    // Alteração de rótulo com auditoria na mesma transação.
    const alterado = await chamar(`/periodos/${linha.id}`, gestor, 'PUT', {
      rotulo: 'Março/2026',
    });
    assert.equal(alterado.status, 200);
    assert.equal(
      (alterado.json.data as { rotulo: string }).rotulo,
      'Março/2026',
    );
    const eventos = await prisma.auditoria.findMany({
      where: { entidade: 'periodo', entidadeId: linha.id },
    });
    assert.ok(eventos.length >= 2);
    assert.equal(eventos[0].acao, 'criar');
    assert.equal(eventos[1].acao, 'alterar');

    // Intervalo inválido é recusado no servidor.
    const invalido = await chamar(`/periodos/${linha.id}`, gestor, 'PUT', {
      dataFim: '2026-02-01',
    });
    assert.equal(invalido.status, 400);
  });
});
