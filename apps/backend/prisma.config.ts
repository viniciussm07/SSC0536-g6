import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // A geração e o build não precisam de um banco ativo ou de um arquivo .env.
  datasource: { url: process.env.DATABASE_URL },
});
