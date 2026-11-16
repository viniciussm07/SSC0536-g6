import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { assertSeedTarget } from './demo-fixtures';
import { carregarIndicadoresDemo, indicadoresDemo } from './indicadores-demo';

// Executado só por comando explícito (`pnpm db:indicadores-demo`), nunca na inicialização.
async function main() {
  assertSeedTarget(process.env.DATABASE_URL, process.env.NODE_ENV);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const resultado = await prisma.$transaction(
      async (tx) => {
        // Serializa duas cargas concorrentes desta massa no mesmo banco.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(536008)`;
        return carregarIndicadoresDemo(
          tx,
          process.env.DATABASE_URL,
          process.env.NODE_ENV,
        );
      },
      { timeout: 30000 },
    );
    console.log(
      resultado === 'loaded'
        ? `Massa fictícia de indicadores carregada: ${indicadoresDemo.periodos.length} períodos e ${indicadoresDemo.resultados.length} resultados (não homologados).`
        : 'Massa fictícia de indicadores já carregada; nada foi alterado.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Falha na carga fictícia de indicadores.',
  );
  process.exitCode = 1;
});
