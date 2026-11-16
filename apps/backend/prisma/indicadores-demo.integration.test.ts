import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';
import { assertSeedTarget } from './demo-fixtures';
import {
  carregarIndicadoresDemo,
  indicadoresDemo,
  indicadoresDemoHash,
  indicadoresDemoMarkerId,
} from './indicadores-demo';

const databaseUrl = process.env.DATABASE_TEST_URL;
describe(
  'Carga da massa fictícia de indicadores no PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let prisma: PrismaClient;
    before(async () => {
      assert.ok(databaseUrl);
      assertSeedTarget(databaseUrl, 'test');
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
      });
      await prisma.$connect();
    });
    after(async () => {
      await prisma?.$disconnect();
    });

    // Tudo roda numa transação revertida: a base de teste não guarda a massa.
    async function rollback(
      work: (tx: Prisma.TransactionClient) => Promise<void>,
    ) {
      const marker = new Error('rollback da massa de indicadores');
      await assert.rejects(
        prisma.$transaction(
          async (tx) => {
            await work(tx);
            throw marker;
          },
          { timeout: 30000 },
        ),
        (error) => error === marker,
      );
    }
    const { definicoes, periodos, resultados } = indicadoresDemo;
    const idsDefinicoes = definicoes.map((d) => d.id);

    it('carrega uma vez, com marcador e visibilidade; repetir é no-op', async () => {
      await rollback(async (tx) => {
        assert.equal(
          await carregarIndicadoresDemo(tx, databaseUrl, 'test'),
          'loaded',
        );
        assert.equal(
          await tx.indicadorResultado.count({
            where: { definicaoId: { in: idsDefinicoes } },
          }),
          resultados.length,
        );
        assert.equal(
          await tx.periodo.count({
            where: { id: { in: periodos.map((p) => p.id) } },
          }),
          periodos.length,
        );
        const marcador = await tx.auditoria.findUniqueOrThrow({
          where: { id: indicadoresDemoMarkerId },
        });
        assert.equal(marcador.entidade, 'fixture_indicadores_demo');
        assert.equal(marcador.processo, 'db:indicadores-demo');
        assert.deepEqual(marcador.depois, {
          synthetic: true,
          version: indicadoresDemo.metadata.version,
          sha256: indicadoresDemoHash,
        });
        const liberadas = await tx.visibilidadeIndicadorPerfil.findMany({
          where: { indicadorId: { in: idsDefinicoes }, permitido: true },
          orderBy: [{ perfil: 'asc' }, { indicadorId: 'asc' }],
        });
        assert.deepEqual(
          [...new Set(liberadas.map((v) => v.perfil))],
          ['gestor', 'visualizador'],
        );
        // Datas civis do período preservadas (sem deslocamento de fuso).
        const fev = await tx.periodo.findUniqueOrThrow({
          where: { id: 910005 },
        });
        assert.equal(fev.dataFim.toISOString().slice(0, 10), '2026-02-28');

        // Alteração local posterior não é sobrescrita na repetição.
        await tx.visibilidadeIndicadorPerfil.update({
          where: {
            perfil_indicadorId: { perfil: 'visualizador', indicadorId: 910002 },
          },
          data: { permitido: false },
        });
        assert.equal(
          await carregarIndicadoresDemo(tx, databaseUrl, 'test'),
          'already-loaded',
        );
        assert.equal(
          await tx.indicadorResultado.count({
            where: { definicaoId: { in: idsDefinicoes } },
          }),
          resultados.length,
        );
        const mantida = await tx.visibilidadeIndicadorPerfil.findUniqueOrThrow({
          where: {
            perfil_indicadorId: {
              perfil: 'visualizador',
              indicadorId: 910002,
            },
          },
        });
        assert.equal(mantida.permitido, false);
      });
    });

    it('recusa marcador de outra versão sem alterar dados', async () => {
      await rollback(async (tx) => {
        await tx.auditoria.create({
          data: {
            id: indicadoresDemoMarkerId,
            origem: 'automatica',
            processo: 'db:indicadores-demo',
            entidade: 'fixture_indicadores_demo',
            entidadeId: 1,
            acao: 'criar',
            depois: { synthetic: true, version: 1, sha256: 'outro' },
          },
        });
        await assert.rejects(
          carregarIndicadoresDemo(tx, databaseUrl, 'test'),
          /incompatível/,
        );
        assert.equal(
          await tx.indicadorDefinicao.count({
            where: { id: { in: idsDefinicoes } },
          }),
          0,
        );
      });
    });

    it('recusa período equivalente já cadastrado (mesmo tipo e datas)', async () => {
      await rollback(async (tx) => {
        await tx.periodo.create({
          data: {
            tipo: 'mes',
            rotulo: 'Período local preexistente',
            dataInicio: new Date(periodos[0].dataInicio),
            dataFim: new Date(periodos[0].dataFim),
          },
        });
        await assert.rejects(
          carregarIndicadoresDemo(tx, databaseUrl, 'test'),
          /mesmo tipo e datas/,
        );
        assert.equal(
          await tx.auditoria.count({ where: { id: indicadoresDemoMarkerId } }),
          0,
        );
      });
    });
  },
);
