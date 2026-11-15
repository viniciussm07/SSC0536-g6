import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { assertSeedTarget, seedDemoFixtures } from './demo-fixtures';

async function main() {
  assertSeedTarget(process.env.DATABASE_URL, process.env.NODE_ENV);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Serializa duas cargas concorrentes deste cenário no mesmo banco.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(536006)`;
        return seedDemoFixtures(tx);
      },
      { timeout: 30000 },
    );
    console.log(
      result === 'seeded'
        ? 'Massa fictícia OTO carregada.'
        : 'Massa já carregada; nenhum dado foi modificado.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Falha na carga fictícia.',
  );
  process.exitCode = 1;
});
