import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  CABECALHO_NOME_ARQUIVO,
  LIMITES_IMPORTACAO,
  isLinhaImportacaoLinha,
  isLoteImportacaoDetalhe,
  isLoteImportacaoLinha,
  isOcorrenciaImportacaoLinha,
  type Perfil,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';
import { construirXlsx, tabulacaoFicticia } from './xlsx-teste';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  meta?: { top?: number; skip?: number; total?: number };
  error?: { code: string; details?: { field?: string; message?: string }[] };
}

describe(
  'Importação: recepção e leitura HTTP/PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const perfis = new Map<Perfil, number>();
    const usuarios: number[] = [];
    const planilha = (rotulo = 'A') =>
      Buffer.from(
        construirXlsx([
          tabulacaoFicticia([
            {
              nome: `Hotel Fictício ${rotulo}`,
              ocupacao: { v: 0.6, pct: true },
            },
            { nome: `Pousada Fictícia ${rotulo}`, ocupacao: '45%' },
            { nome: `Chalé Fictício ${rotulo}`, ocupacao: 0.5 },
          ]),
        ]),
      );

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
    async function enviar(
      cookie: string,
      arquivo: Buffer,
      fonte = 'tabulacao_consolidado',
      nome = 'Tabulação 2026.xlsx',
    ) {
      const r = await fetch(`${base}/api/importacoes?fonte=${fonte}`, {
        method: 'POST',
        headers: {
          Origin: origem,
          Cookie: cookie,
          'X-OTO-Request': '1',
          'content-type': 'application/octet-stream',
          [CABECALHO_NOME_ARQUIVO]: encodeURIComponent(nome),
        },
        body: new Uint8Array(arquivo),
      });
      return { status: r.status, json: (await r.json()) as Corpo };
    }
    async function chamar(caminho: string, cookie: string, metodo = 'GET') {
      const r = await fetch(`${base}/api${caminho}`, {
        method: metodo,
        headers: {
          Origin: origem,
          Cookie: cookie,
          'X-OTO-Request': '1',
          ...(metodo !== 'GET' ? { 'content-type': 'application/json' } : {}),
        },
        body: metodo === 'POST' ? '{}' : undefined,
      });
      const texto = await r.text();
      return {
        status: r.status,
        json: (texto ? JSON.parse(texto) : {}) as Corpo,
      };
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
      for (const perfil of [
        'administrador',
        'gestor',
        'estagiario',
        'visualizador',
      ] as const) {
        const u = await prisma.usuario.create({
          data: {
            nome: `Importação ${perfil}`,
            email: `importacao-${perfil}@example.test`,
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
          await tx.importacaoLote.deleteMany({
            where: { criadoPor: { in: usuarios } },
          });
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

    it('recebe, lê, preserva o original e não grava dados de negócio', async () => {
      const gestor = await sessao('gestor');
      const antes = await Promise.all([
        prisma.empreendimento.count(),
        prisma.resposta.count(),
        prisma.respostaItem.count(),
        prisma.periodo.count(),
      ]);
      const arquivo = planilha('um');
      const r = await enviar(gestor, arquivo);
      assert.equal(r.status, 201, JSON.stringify(r.json));
      assert.ok(isLoteImportacaoDetalhe(r.json.data));
      const lote = r.json.data;
      assert.equal(lote.estado, 'lido');
      assert.equal(lote.nomeArquivo, 'Tabulação 2026.xlsx');
      assert.equal(lote.tamanhoBytes, arquivo.length);
      assert.equal(lote.versaoParser, 'tabulacao-consolidado/1');
      assert.equal(lote.resumo?.linhasEntrada, 3);
      assert.equal(lote.totais.erros, 1); // 0.5 sem formato de porcentagem é ambíguo
      assert.equal(lote.totais.linhas, 2 + 3);

      const guardado = await prisma.importacaoArquivo.findUniqueOrThrow({
        where: { loteId: lote.id },
      });
      assert.ok(Buffer.from(guardado.conteudo).equals(arquivo));
      const depois = await Promise.all([
        prisma.empreendimento.count(),
        prisma.resposta.count(),
        prisma.respostaItem.count(),
        prisma.periodo.count(),
      ]);
      assert.deepEqual(depois, antes);

      const linhas = await chamar(
        `/importacoes/${lote.id}/linhas?$filter=tipo eq 'entrada'&$count=true`,
        gestor,
      );
      assert.equal(linhas.status, 200);
      assert.equal(linhas.json.meta?.total, 3);
      const dadosLinhas = linhas.json.data as unknown[];
      assert.ok(dadosLinhas.every(isLinhaImportacaoLinha));
      assert.deepEqual(
        dadosLinhas.map((l) => (l as { situacao: string }).situacao),
        ['valida', 'valida', 'erro'],
      );
      const oc = await chamar(`/importacoes/${lote.id}/ocorrencias`, gestor);
      const ocorrencias = oc.json.data as {
        codigo: string;
        linha: number;
        coluna: string;
      }[];
      assert.ok(ocorrencias.every(isOcorrenciaImportacaoLinha));
      assert.deepEqual(
        ocorrencias.map((o) => [o.codigo, o.linha, o.coluna]),
        [['ESCALA_AMBIGUA', 7, 'L']],
      );

      const lista = await chamar(`/importacoes?$top=5&$count=true`, gestor);
      assert.ok((lista.json.data as unknown[]).every(isLoteImportacaoLinha));
      assert.ok(!JSON.stringify(lista.json).includes('conteudo'));

      const auditoria = await prisma.auditoria.findMany({
        where: { entidade: 'importacao_lote', entidadeId: lote.id },
        orderBy: { id: 'asc' },
      });
      assert.deepEqual(
        auditoria.map((a) => a.acao),
        ['criar', 'alterar'],
      );
    });

    it('repetir o arquivo conflita; reler é idempotente e não duplica linhas', async () => {
      const gestor = await sessao('gestor');
      const arquivo = planilha('dois');
      const primeiro = await enviar(gestor, arquivo);
      const id = (primeiro.json.data as { id: number }).id;
      const repetido = await enviar(gestor, arquivo);
      assert.equal(repetido.status, 409);
      assert.equal(repetido.json.error?.code, 'ARQUIVO_JA_RECEBIDO');
      assert.equal(repetido.json.error?.details?.[0].message, String(id));
      const contar = () =>
        Promise.all([
          prisma.importacaoLinha.count({ where: { loteId: id } }),
          prisma.importacaoOcorrencia.count({ where: { loteId: id } }),
          prisma.importacaoLote.count({
            where: { criadoPor: perfis.get('gestor') },
          }),
        ]);
      const antes = await contar();
      const releitura = await chamar(
        `/importacoes/${id}/leituras`,
        gestor,
        'POST',
      );
      assert.equal(releitura.status, 200);
      assert.deepEqual(await contar(), antes);
    });

    it('arquivo ilegível vira lote em erro recuperável, com orientação', async () => {
      const gestor = await sessao('gestor');
      const r = await enviar(gestor, Buffer.from('isto não é uma planilha'));
      assert.equal(r.status, 201);
      const lote = r.json.data as {
        id: number;
        estado: string;
        erroMensagem: string;
      };
      assert.equal(lote.estado, 'erro');
      assert.match(lote.erroMensagem, /xlsx/);
      const oc = await chamar(`/importacoes/${lote.id}/ocorrencias`, gestor);
      assert.deepEqual(
        (oc.json.data as { codigo: string }[]).map((o) => o.codigo),
        ['FORMATO_NAO_HOMOLOGADO'],
      );
      assert.equal(
        await prisma.importacaoLinha.count({ where: { loteId: lote.id } }),
        0,
      );
    });

    it('leitura interrompida pode ser refeita; leitura em andamento é recusada', async () => {
      const gestor = await sessao('gestor');
      const r = await enviar(gestor, planilha('tres'));
      const id = (r.json.data as { id: number }).id;
      await prisma.importacaoLote.update({
        where: { id },
        data: { estado: 'lendo', lidoEm: new Date() },
      });
      const emCurso = await chamar(
        `/importacoes/${id}/leituras`,
        gestor,
        'POST',
      );
      assert.equal(emCurso.status, 409);
      assert.equal(emCurso.json.error?.code, 'LEITURA_EM_ANDAMENTO');
      await prisma.importacaoLote.update({
        where: { id },
        data: { lidoEm: new Date(Date.now() - 10 * 60000) },
      });
      const refeita = await chamar(
        `/importacoes/${id}/leituras`,
        gestor,
        'POST',
      );
      assert.equal(refeita.status, 200);
      assert.equal((refeita.json.data as { estado: string }).estado, 'lido');
    });

    it('valida entrada, tamanho e aplica permissão por perfil', async () => {
      const gestor = await sessao('gestor');
      const admin = await sessao('administrador');
      const estagiario = await sessao('estagiario');
      const visualizador = await sessao('visualizador');
      const arquivo = planilha('quatro');
      assert.equal((await enviar(gestor, arquivo, 'inventario')).status, 400);
      assert.equal((await enviar(gestor, Buffer.alloc(0))).status, 400);
      const grande = await enviar(
        gestor,
        Buffer.alloc(LIMITES_IMPORTACAO.tamanhoMaximoBytes + 1),
      );
      assert.equal(grande.status, 413);
      assert.equal(grande.json.error?.code, 'ARQUIVO_MUITO_GRANDE');
      assert.equal(
        (await enviar(gestor, arquivo, 'tabulacao_consolidado', '../x.xlsx'))
          .status,
        400,
      );
      for (const cookie of [estagiario, visualizador]) {
        assert.equal((await enviar(cookie, arquivo)).status, 403);
        assert.equal((await chamar('/importacoes', cookie)).status, 403);
        assert.equal((await chamar('/importacoes/1', cookie)).status, 403);
      }
      const semSessao = await fetch(
        `${base}/api/importacoes?fonte=tabulacao_consolidado`,
        {
          method: 'POST',
          headers: {
            Origin: origem,
            'X-OTO-Request': '1',
            'content-type': 'application/octet-stream',
          },
          body: new Uint8Array(arquivo),
        },
      );
      assert.equal(semSessao.status, 401);
      assert.equal((await enviar(admin, arquivo)).status, 201);
      assert.equal(
        (await chamar('/importacoes/999999999', gestor)).status,
        404,
      );
      assert.equal(
        (await chamar('/importacoes/999999999/linhas', gestor)).status,
        404,
      );
      // Não existe rota que devolva o original.
      const id = (
        await prisma.importacaoLote.findFirstOrThrow({
          orderBy: { id: 'desc' },
        })
      ).id;
      for (const rota of [
        `/importacoes/${id}/arquivo`,
        `/importacoes/${id}/conteudo`,
      ])
        assert.equal((await chamar(rota, gestor)).status, 404);

      it('exclui um lote só com leitura: remove tudo, audita e permite reenviar o mesmo arquivo', async () => {
        const gestor = await sessao('gestor');
        const arquivo = planilha('exclusao');
        const r = await enviar(gestor, arquivo);
        const id = (r.json.data as { id: number }).id;
        assert.ok(
          (await prisma.importacaoLinha.count({ where: { loteId: id } })) > 0,
        );

        // Sem permissão de alteração não exclui; o lote continua.
        for (const perfil of ['estagiario', 'visualizador'] as const)
          assert.equal(
            (await chamar(`/importacoes/${id}`, await sessao(perfil), 'DELETE'))
              .status,
            403,
          );
        assert.equal(
          (await chamar('/importacoes/999999999', gestor, 'DELETE')).status,
          404,
        );
        assert.equal(await prisma.importacaoLote.count({ where: { id } }), 1);

        const excluida = await chamar(`/importacoes/${id}`, gestor, 'DELETE');
        assert.equal(excluida.status, 204);
        assert.equal((await chamar(`/importacoes/${id}`, gestor)).status, 404);
        const restos = await Promise.all([
          prisma.importacaoArquivo.count({ where: { loteId: id } }),
          prisma.importacaoLinha.count({ where: { loteId: id } }),
          prisma.importacaoOcorrencia.count({ where: { loteId: id } }),
        ]);
        assert.deepEqual(restos, [0, 0, 0]);
        const auditoria = await prisma.auditoria.findMany({
          where: { entidade: 'importacao_lote', entidadeId: id },
          orderBy: { id: 'asc' },
        });
        assert.deepEqual(
          auditoria.map((a) => a.acao),
          ['criar', 'alterar', 'excluir'],
        );
        assert.match(
          JSON.stringify(auditoria[2].antes),
          /Tabulação|nomeArquivo/,
        );
        assert.equal(auditoria[2].usuarioId, perfis.get('gestor'));

        // O mesmo arquivo volta a ser aceito depois da exclusão.
        const novo = await enviar(gestor, arquivo);
        assert.equal(novo.status, 201);
        assert.notEqual((novo.json.data as { id: number }).id, id);
      });

      it('não exclui lote em leitura recente', async () => {
        const gestor = await sessao('gestor');
        const r = await enviar(gestor, planilha('em-leitura'));
        const id = (r.json.data as { id: number }).id;
        await prisma.importacaoLote.update({
          where: { id },
          data: { estado: 'lendo', lidoEm: new Date() },
        });
        const bloqueada = await chamar(`/importacoes/${id}`, gestor, 'DELETE');
        assert.deepEqual(
          [bloqueada.status, bloqueada.json.error?.code],
          [409, 'LEITURA_EM_ANDAMENTO'],
        );
        assert.equal(await prisma.importacaoLote.count({ where: { id } }), 1);
      });
    });
  },
);
