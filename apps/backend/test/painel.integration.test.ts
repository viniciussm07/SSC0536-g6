import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  isOpcaoPainel,
  isPainel,
  isParticipacaoPainel,
  isSeriePainel,
  type Perfil,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';

const databaseUrl = process.env.DATABASE_TEST_URL;
const data = (d: string) => new Date(`${d}T00:00:00Z`);
interface Corpo {
  data?: unknown;
  error?: { code: string };
}

describe(
  'Painel de indicadores HTTP/PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const perfis = new Map<Perfil, number>();
    const periodos: number[] = [];
    const definicoes: number[] = [];

    async function chamar(caminho: string, perfil: Perfil) {
      const token = novoToken();
      await prisma.sessao.create({
        data: {
          tokenHash: hashToken(token),
          usuarioId: perfis.get(perfil)!,
          criadaEm: new Date(),
          expiraEm: new Date(Date.now() + 3600000),
        },
      });
      const r = await fetch(`${base}/api${caminho}`, {
        headers: {
          Origin: origem,
          Cookie: `oto_sessao=${token}`,
          'X-OTO-Request': '1',
        },
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
      for (const perfil of ['gestor', 'visualizador'] as const) {
        const u = await prisma.usuario.create({
          data: {
            nome: `Painel ${perfil}`,
            email: `painel-${perfil}-${Date.now()}@example.test`,
            perfil,
          },
        });
        perfis.set(perfil, u.id);
      }
      for (const [rotulo, inicio, fim] of [
        ['Setembro 2093 (painel)', '2093-09-01', '2093-09-30'],
        ['Outubro 2093 (painel)', '2093-10-01', '2093-10-31'],
      ] as const) {
        const p = await prisma.periodo.create({
          data: {
            tipo: 'mes',
            rotulo,
            dataInicio: data(inicio),
            dataFim: data(fim),
          },
        });
        periodos.push(p.id);
      }
      const sufixo = Date.now();
      for (const [codigo, perfisVisiveis] of [
        [`painel_aberto_${sufixo}`, ['gestor', 'visualizador']],
        [`painel_restrito_${sufixo}`, ['gestor']],
      ] as const) {
        const d = await prisma.indicadorDefinicao.create({
          data: {
            codigo,
            nome: codigo,
            unidade: 'percentual_0_100',
            formulaDescricao: 'teste',
            versaoFormula: 1,
            visibilidades: {
              create: perfisVisiveis.map((perfil) => ({
                perfil,
                permitido: true,
              })),
            },
          },
        });
        definicoes.push(d.id);
        for (const [i, valor] of [60, 66.5].entries())
          await prisma.indicadorResultado.create({
            data: {
              definicaoId: d.id,
              periodoId: periodos[i],
              tipoColeta: 'consolidado',
              recorte: 'total',
              metodo: 'ponderada',
              valor,
              calculadoEm: new Date(),
            },
          });
      }
    });

    after(async () => {
      if (prisma) {
        await prisma.indicadorResultado.deleteMany({
          where: { definicaoId: { in: definicoes } },
        });
        await prisma.visibilidadeIndicadorPerfil.deleteMany({
          where: { indicadorId: { in: definicoes } },
        });
        await prisma.indicadorDefinicao.deleteMany({
          where: { id: { in: definicoes } },
        });
        await prisma.periodo.deleteMany({ where: { id: { in: periodos } } });
      }
      await app?.close();
    });

    it('painel e grade respeitam a mesma visibilidade e mostram o mesmo valor', async () => {
      const q = `periodoId=${periodos[1]}&tipoColeta=consolidado&comparacaoPeriodoId=${periodos[0]}`;
      const visual = await chamar(`/indicadores/painel?${q}`, 'visualizador');
      assert.equal(visual.status, 200);
      assert.ok(isPainel(visual.json.data));
      assert.equal(visual.json.data.itens.length, 1);
      const [item] = visual.json.data.itens;
      assert.deepEqual(item.valor, { estado: 'disponivel', valor: '66.5' });
      assert.equal(item.comparacao?.estado, 'disponivel');
      if (item.comparacao?.estado === 'disponivel') {
        assert.equal(item.comparacao.valor, '60');
        assert.equal(item.comparacao.variacao, '6.5');
        assert.equal(item.comparacao.fonte.origem, 'carga');
      }
      const grade = await chamar(
        `/indicadores?$filter=periodoId eq ${periodos[1]}`,
        'visualizador',
      );
      const linhas = grade.json.data as {
        valor: string;
        indicadorId: number;
      }[];
      assert.deepEqual(
        linhas.map((l) => [l.indicadorId, l.valor]),
        [[item.indicadorId, '66.5']],
      );
      const gestor = await chamar(`/indicadores/painel?${q}`, 'gestor');
      assert.equal((gestor.json.data as { itens: unknown[] }).itens.length, 2);
    });

    it('opções listam só períodos com resultado visível', async () => {
      const r = await chamar('/indicadores/painel/opcoes', 'visualizador');
      assert.equal(r.status, 200);
      const ops = (r.json.data as unknown[]).filter(isOpcaoPainel);
      assert.ok(
        ops.some(
          (o) => o.periodoId === periodos[1] && o.tipoColeta === 'consolidado',
        ),
      );
    });

    it('entrada inválida, período inexistente e coleta sem dados', async () => {
      const ruim = await chamar('/indicadores/painel?periodoId=x', 'gestor');
      assert.equal(ruim.status, 400);
      const ausente = await chamar(
        '/indicadores/painel?periodoId=2147483647&tipoColeta=consolidado',
        'gestor',
      );
      assert.equal(ausente.status, 404);
      const vazio = await chamar(
        `/indicadores/painel?periodoId=${periodos[1]}&tipoColeta=expectativa`,
        'gestor',
      );
      assert.equal(vazio.status, 200);
      assert.equal(
        (vazio.json.data as { situacao: string }).situacao,
        'sem_dados',
      );
    });

    it('série respeita a visibilidade e separa o tipo de coleta', async () => {
      const visual = await chamar(
        '/indicadores/painel/serie?tipoColeta=consolidado',
        'visualizador',
      );
      assert.equal(visual.status, 200);
      assert.ok(isSeriePainel(visual.json.data));
      const nossos = visual.json.data.series.filter((s) =>
        s.codigo.startsWith('painel_'),
      );
      assert.deepEqual(
        nossos.map((s) => s.codigo.replace(/_\d+$/, '')),
        ['painel_aberto'],
      );
      assert.deepEqual(
        nossos[0].pontos
          .filter((p) => periodos.includes(p.periodoId))
          .map((p) => p.valor),
        ['60', '66.5'],
      );
      const ruim = await chamar('/indicadores/painel/serie', 'gestor');
      assert.equal(ruim.status, 400);
    });

    it('exportação respeita a permissão e entrega PDF e XLSX', async () => {
      const q = `periodoId=${periodos[1]}&tipoColeta=consolidado`;
      const token = novoToken();
      await prisma.sessao.create({
        data: {
          tokenHash: hashToken(token),
          usuarioId: perfis.get('gestor')!,
          criadaEm: new Date(),
          expiraEm: new Date(Date.now() + 3600000),
        },
      });
      const baixar = (formato: string) =>
        fetch(
          `${base}/api/indicadores/painel/exportacao?${q}&formato=${formato}`,
          {
            headers: {
              Origin: origem,
              Cookie: `oto_sessao=${token}`,
              'X-OTO-Request': '1',
            },
          },
        );
      const pdf = await baixar('pdf');
      assert.equal(pdf.status, 200);
      assert.equal(pdf.headers.get('content-type'), 'application/pdf');
      assert.match(pdf.headers.get('content-disposition') ?? '', /\.pdf"$/);
      assert.equal(
        Buffer.from(await pdf.arrayBuffer())
          .subarray(0, 5)
          .toString(),
        '%PDF-',
      );
      const xlsx = await baixar('xlsx');
      assert.equal(xlsx.status, 200);
      assert.equal(
        Buffer.from(await xlsx.arrayBuffer())
          .subarray(0, 2)
          .toString(),
        'PK',
      );
      assert.equal((await baixar('csv')).status, 400);
      // Visualizador consulta, mas não exporta.
      const negado = await chamar(
        `/indicadores/painel/exportacao?${q}&formato=pdf`,
        'visualizador',
      );
      assert.equal(negado.status, 403);
    });

    it('participação: gestor consulta, visualizador não', async () => {
      const gestor = await chamar(
        '/indicadores/painel/participacao?tipoColeta=consolidado',
        'gestor',
      );
      assert.equal(gestor.status, 200);
      assert.ok(isParticipacaoPainel(gestor.json.data));
      const negado = await chamar(
        '/indicadores/painel/participacao?tipoColeta=consolidado',
        'visualizador',
      );
      assert.equal(negado.status, 403);
    });
  },
);
