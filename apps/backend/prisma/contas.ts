import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  administrarConta,
  type OperacaoConta,
} from '../src/autenticacao/administrar-conta';

async function main() {
  // Dados de operação via stdin JSON, nunca senha em argumentos de shell.
  let texto = '';
  for await (const parte of process.stdin) texto += parte;
  const entrada = JSON.parse(texto) as OperacaoConta;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL obrigatória.');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    console.log(JSON.stringify(await administrarConta(prisma, entrada)));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error(
    'Operação de conta recusada. Confira os dados, permissões e disponibilidade do banco.',
  );
  process.exitCode = 1;
});
