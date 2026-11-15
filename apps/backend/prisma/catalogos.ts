import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { carregarCatalogoHospedagem } from '../src/catalogo/carga-hospedagem';

// Dados de referência (sem pessoas): a carga é idempotente e nunca altera o que já existe.
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL obrigatória.');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const resumo = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(536007)`;
        return carregarCatalogoHospedagem(tx);
      },
      { timeout: 60000 },
    );
    console.log(
      `Catálogo de hospedagem (dicionário técnico v1, não homologado): ${resumo.gruposCriados} grupos e ${resumo.itensCriados} itens criados; ${resumo.jaExistentes} já existiam.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((erro: unknown) => {
  console.error(
    erro instanceof Error ? erro.message : 'Falha na carga dos catálogos.',
  );
  process.exitCode = 1;
});
