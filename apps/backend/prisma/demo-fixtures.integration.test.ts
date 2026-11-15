import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';
import {
  assertSeedTarget,
  scenarioHash,
  seedDemoFixtures,
  seedMarkerId,
} from './demo-fixtures';

const databaseUrl = process.env.DATABASE_TEST_URL;
describe(
  'Carga da massa fictícia no PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let prisma: PrismaClient;
    before(async () => {
      assert.ok(databaseUrl);
      assert.match(new URL(databaseUrl).pathname, /_test$/);
      assertSeedTarget(databaseUrl, 'test');
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
      });
      await prisma.$connect();
    });
    after(async () => {
      await prisma?.$disconnect();
    });

    async function rollback(
      work: (tx: Prisma.TransactionClient) => Promise<void>,
    ) {
      const marker = new Error('rollback da massa fictícia');
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

    it('carrega os relacionamentos e repete sem duplicar nem sobrescrever alterações', async () => {
      await rollback(async (tx) => {
        assert.equal(await seedDemoFixtures(tx), 'seeded');
        assert.equal(await tx.empreendimento.count(), 4);
        const zero = await tx.respostaItem.findUniqueOrThrow({
          where: {
            respostaId_perguntaId: { respostaId: 900003, perguntaId: 900002 },
          },
        });
        assert.equal(zero.valorNumerico?.toString(), '0');
        const resultado = await tx.indicadorResultado.findUniqueOrThrow({
          where: { id: 900001 },
          include: { versoes: true, parametros: true },
        });
        assert.equal(resultado.versoes.length, 2);
        assert.equal(resultado.parametros.length, 1);
        await tx.empreendimento.update({
          where: { id: 900001 },
          data: { nomeFantasia: 'Edição local fictícia' },
        });
        assert.equal(await seedDemoFixtures(tx), 'already-seeded');
        assert.equal(await tx.empreendimento.count(), 4);
        assert.equal(
          (await tx.empreendimento.findUniqueOrThrow({ where: { id: 900001 } }))
            .nomeFantasia,
          'Edição local fictícia',
        );
        const marker = await tx.auditoria.findUniqueOrThrow({
          where: { id: seedMarkerId },
        });
        assert.equal(
          (marker.depois as { sha256: string }).sha256,
          scenarioHash,
        );
      });
    });

    it('recusa banco preenchido sem apagar os dados existentes', async () => {
      await rollback(async (tx) => {
        const user = await tx.usuario.create({
          data: {
            nome: 'Preservado',
            email: 'preservado@example.test',
            perfil: 'gestor',
          },
        });
        await assert.rejects(seedDemoFixtures(tx), /contém dados/);
        assert.equal(await tx.usuario.count(), 1);
        assert.ok(await tx.usuario.findUnique({ where: { id: user.id } }));
        assert.equal(await tx.empreendimento.count(), 0);
      });
    });

    it('recusa marcador incompatível sem substituir dados', async () => {
      await rollback(async (tx) => {
        await seedDemoFixtures(tx);
        await tx.auditoria.update({
          where: { id: seedMarkerId },
          data: { depois: { sha256: 'outra-versao' } },
        });
        await assert.rejects(seedDemoFixtures(tx), /incompatível/);
        assert.equal(await tx.empreendimento.count(), 4);
      });
    });
  },
);
