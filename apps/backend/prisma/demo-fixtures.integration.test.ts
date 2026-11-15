import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';
import {
  assertSeedTarget,
  scenarioHash,
  seedDemoFixtures,
  seedMarkerId,
  acessoDemo,
  acessosPerfis,
  demoAccessMarkerId,
  profileAccessMarkerId,
} from './demo-fixtures';
import { conferirSenha, hashSenha } from '../src/autenticacao/segredos';

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
        assert.equal(await seedDemoFixtures(tx, databaseUrl, 'test'), 'seeded');
        assert.equal(await tx.empreendimento.count(), 4);
        const credencial = await tx.credencialLocal.findUniqueOrThrow({
          where: { usuarioId: acessoDemo.usuarioId },
        });
        assert.equal(
          await conferirSenha(acessoDemo.senha, credencial.senhaHash),
          true,
        );
        assert.notEqual(credencial.senhaHash, acessoDemo.senha);
        const auditoriaAcesso = await tx.auditoria.findUniqueOrThrow({
          where: { id: demoAccessMarkerId },
        });
        assert.ok(!JSON.stringify(auditoriaAcesso).includes(acessoDemo.senha));
        for (const acesso of acessosPerfis.acessos) {
          const cred = await tx.credencialLocal.findUniqueOrThrow({
            where: { usuarioId: acesso.usuarioId },
          });
          assert.equal(await conferirSenha(acesso.senha, cred.senhaHash), true);
          assert.notEqual(cred.senhaHash, acesso.senha);
        }
        const auditoriaPerfis = await tx.auditoria.findUniqueOrThrow({
          where: { id: profileAccessMarkerId },
        });
        assert.ok(
          !acessosPerfis.acessos.some((a) =>
            JSON.stringify(auditoriaPerfis).includes(a.senha),
          ),
        );
        assert.equal(
          await tx.credencialLocal.count({ where: { usuarioId: 900007 } }),
          0,
        );
        assert.equal(
          await tx.visibilidadeIndicadorPerfil.count({
            where: { permitido: true, perfil: 'visualizador' },
          }),
          1,
        );
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
        const senhaAlterada = await hashSenha('Senha alterada fictícia');
        await tx.credencialLocal.update({
          where: { usuarioId: acessoDemo.usuarioId },
          data: { senhaHash: senhaAlterada },
        });
        await tx.usuario.update({
          where: { id: acessoDemo.usuarioId },
          data: { ativo: false },
        });
        assert.equal(
          await seedDemoFixtures(tx, databaseUrl, 'test'),
          'already-seeded',
        );
        assert.equal(
          (
            await tx.credencialLocal.findUniqueOrThrow({
              where: { usuarioId: acessoDemo.usuarioId },
            })
          ).senhaHash,
          senhaAlterada,
        );
        assert.equal(
          (
            await tx.usuario.findUniqueOrThrow({
              where: { id: acessoDemo.usuarioId },
            })
          ).ativo,
          false,
        );
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

    it('habilita acesso em massa anterior sem trocar o hash do cenário e não restaura senha revogada', async () => {
      await rollback(async (tx) => {
        await seedDemoFixtures(tx, databaseUrl, 'test');
        // Simula a massa anterior ao acesso demo, mantendo seu marcador original.
        await tx.auditoria.delete({ where: { id: demoAccessMarkerId } });
        await tx.credencialLocal.delete({
          where: { usuarioId: acessoDemo.usuarioId },
        });
        assert.equal(
          await seedDemoFixtures(tx, databaseUrl, 'test'),
          'already-seeded',
        );
        assert.ok(
          await tx.credencialLocal.findUnique({
            where: { usuarioId: acessoDemo.usuarioId },
          }),
        );
        await tx.credencialLocal.delete({
          where: { usuarioId: acessoDemo.usuarioId },
        });
        await seedDemoFixtures(tx, databaseUrl, 'test');
        assert.equal(
          await tx.credencialLocal.findUnique({
            where: { usuarioId: acessoDemo.usuarioId },
          }),
          null,
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

    it('não substitui credencial ou código de recuperação previamente gerenciados', async () => {
      await rollback(async (tx) => {
        await seedDemoFixtures(tx, databaseUrl, 'test');
        await tx.auditoria.delete({ where: { id: demoAccessMarkerId } });
        await assert.rejects(
          seedDemoFixtures(tx, databaseUrl, 'test'),
          /já foi gerenciado/,
        );
        await tx.credencialLocal.delete({
          where: { usuarioId: acessoDemo.usuarioId },
        });
        await tx.ativacaoConta.create({
          data: {
            tokenHash: 'fixture-recovery',
            usuarioId: acessoDemo.usuarioId,
            expiraEm: new Date('2099-01-01'),
          },
        });
        await assert.rejects(
          seedDemoFixtures(tx, databaseUrl, 'test'),
          /já foi gerenciado/,
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
        await assert.rejects(
          seedDemoFixtures(tx, databaseUrl, 'test'),
          /contém dados/,
        );
        assert.equal(await tx.usuario.count(), 1);
        assert.ok(await tx.usuario.findUnique({ where: { id: user.id } }));
        assert.equal(await tx.empreendimento.count(), 0);
      });
    });

    it('recusa marcador incompatível sem substituir dados', async () => {
      await rollback(async (tx) => {
        await seedDemoFixtures(tx, databaseUrl, 'test');
        await tx.auditoria.update({
          where: { id: seedMarkerId },
          data: { depois: { sha256: 'outra-versao' } },
        });
        await assert.rejects(
          seedDemoFixtures(tx, databaseUrl, 'test'),
          /incompatível/,
        );
        assert.equal(await tx.empreendimento.count(), 4);
      });
    });
  },
);
