import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { isModeloPesquisaDetalhe, type Perfil } from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  meta?: { total?: number };
  error?: { code: string; details?: { field?: string; message?: string }[] };
}

describe('Modelos de pesquisa HTTP/PostgreSQL', { skip: !databaseUrl }, () => {
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
    for (const perfil of ['administrador', 'estagiario'] as const) {
      const u = await prisma.usuario.create({
        data: {
          nome: `Modelos ${perfil}`,
          email: `modelos-${perfil}@example.test`,
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
          where: { campo: { modeloId: { in: criados } } },
        });
        // Snapshots são imutáveis por gatilho; a limpeza do teste o suspende só nesta transação.
        await tx.$executeRaw`ALTER TABLE pesquisa_campo_versao DISABLE TRIGGER pesquisa_campo_versao_imutavel`;
        await tx.$executeRaw`ALTER TABLE pesquisa_modelo_versao DISABLE TRIGGER pesquisa_modelo_versao_imutavel`;
        await tx.pesquisaCampoVersao.deleteMany({
          where: { modeloId: { in: criados } },
        });
        await tx.pesquisaModeloVersao.deleteMany({
          where: { modeloId: { in: criados } },
        });
        await tx.$executeRaw`ALTER TABLE pesquisa_campo_versao ENABLE TRIGGER pesquisa_campo_versao_imutavel`;
        await tx.$executeRaw`ALTER TABLE pesquisa_modelo_versao ENABLE TRIGGER pesquisa_modelo_versao_imutavel`;
        await tx.pesquisaCampo.deleteMany({
          where: { modeloId: { in: criados } },
        });
        await tx.pesquisaModelo.deleteMany({ where: { id: { in: criados } } });
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

  it('cria modelo com opções, versiona mudanças semânticas e preserva o histórico', async () => {
    const gestor = await sessao('administrador');
    const estagiario = await sessao('estagiario');
    const entrada = {
      nome: 'Pesquisa de ocupação 2026',
      publicoAlvo: 'Meios de hospedagem',
      campos: [
        {
          chave: 'ocupacao',
          rotulo: 'Taxa de ocupação (%)',
          tipoValor: 'percentual',
          obrigatorio: true,
          ordem: 1,
          opcoes: [],
        },
        {
          chave: 'publico',
          rotulo: 'Perfil do público',
          tipoValor: 'escolha',
          obrigatorio: false,
          ordem: 2,
          opcoes: [
            { chave: 'familias', rotulo: 'Famílias', ordem: 1 },
            { chave: 'congresso', rotulo: 'Congresso', ordem: 2 },
          ],
        },
      ],
    };
    const criado = await chamar('/modelos-pesquisa', gestor, 'POST', entrada);
    assert.equal(criado.status, 201);
    assert.ok(isModeloPesquisaDetalhe(criado.json.data));
    const modelo = criado.json.data as { id: number; versao: number };
    criados.push(modelo.id);
    assert.equal(modelo.versao, 1);

    // Estagiário não cria.
    const negado = await chamar(
      '/modelos-pesquisa',
      estagiario,
      'POST',
      entrada,
    );
    assert.equal(negado.status, 403);

    // Mudança semântica gera versão 2 e mantém o snapshot da versão 1.
    const campos = structuredClone(entrada.campos);
    campos[0].rotulo = 'Ocupação do período (%)';
    const alterado = await chamar(
      `/modelos-pesquisa/${modelo.id}`,
      gestor,
      'PUT',
      { campos, motivo: 'Revisão do rótulo aprovada' },
    );
    assert.equal(alterado.status, 200);
    assert.equal((alterado.json.data as { versao: number }).versao, 2);

    const versoes = await chamar(
      `/modelos-pesquisa/${modelo.id}/versoes?$count=true`,
      gestor,
    );
    assert.equal(versoes.status, 200);
    assert.equal((versoes.json.data as unknown[]).length, 2);
    assert.equal(versoes.json.meta?.total, 2);
    const snapshotV1 = await prisma.pesquisaCampoVersao.findUniqueOrThrow({
      where: {
        modeloId_numero_campoId: {
          modeloId: modelo.id,
          numero: 1,
          campoId: (
            await prisma.pesquisaCampo.findFirstOrThrow({
              where: { modeloId: modelo.id, chave: 'ocupacao' },
            })
          ).id,
        },
      },
    });
    assert.equal(snapshotV1.rotulo, 'Taxa de ocupação (%)');
    const modeloV1 = await prisma.pesquisaModeloVersao.findUniqueOrThrow({
      where: { modeloId_numero: { modeloId: modelo.id, numero: 1 } },
    });
    const modeloV2 = await prisma.pesquisaModeloVersao.findUniqueOrThrow({
      where: { modeloId_numero: { modeloId: modelo.id, numero: 2 } },
    });
    assert.equal(modeloV1.motivo, null);
    assert.equal(modeloV2.motivo, 'Revisão do rótulo aprovada');

    // Mudança só de ordem não gera nova versão (parte da estrutura já atualizada).
    const reordenado = structuredClone(campos);
    reordenado[0].ordem = 2;
    reordenado[1].ordem = 1;
    const soOrdem = await chamar(
      `/modelos-pesquisa/${modelo.id}`,
      gestor,
      'PUT',
      { campos: reordenado },
    );
    assert.equal(soOrdem.status, 200);
    assert.equal((soOrdem.json.data as { versao: number }).versao, 2);

    // Snapshots são imutáveis.
    await assert.rejects(
      prisma.pesquisaModeloVersao.update({
        where: {
          modeloId_numero: { modeloId: modelo.id, numero: 1 },
        },
        data: { nome: 'reescrita proibida' },
      }),
    );
  });
});
