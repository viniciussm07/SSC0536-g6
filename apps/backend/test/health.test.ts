import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { configureApp } from '../src/configure-app';
import { validateEnvironment } from '../src/config/env.validation';
import { PrismaService } from '../src/prisma/prisma.service';

describe('API de saúde', () => {
  let app: INestApplication;
  let baseUrl: string;
  let databaseAvailable = true;

  before(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        $queryRaw: async () => {
          if (!databaseAvailable) throw new Error('Database unavailable');
          return [{ '?column?': 1 }];
        },
      })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  after(async () => {
    await app?.close();
  });

  it('responde com o status da API e do banco em /api/health', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(
      typeof body === 'object' &&
        body !== null &&
        'status' in body &&
        'database' in body &&
        'timestamp' in body,
    );
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'connected');
    assert.ok(typeof body.timestamp === 'string');
    assert.ok(Number.isFinite(Date.parse(body.timestamp)));
  });

  it('retorna HTTP 503 quando o banco fica indisponível', async () => {
    databaseAvailable = false;
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        status: 'error',
        database: 'disconnected',
      });
    } finally {
      databaseAvailable = true;
    }
  });

  it('aplica a origem CORS configurada', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      'http://localhost:5173',
    );
  });

  it('mantém as rotas sob o prefixo /api', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 404);
  });
});

describe('Configuração de ambiente', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://app:app@localhost:5432/app',
  };

  it('usa padrões de desenvolvimento e converte a porta para número', () => {
    assert.equal(validateEnvironment(validConfig).PORT, 3000);
    assert.equal(
      validateEnvironment({ ...validConfig, PORT: '4000' }).PORT,
      4000,
    );
    assert.equal(
      validateEnvironment(validConfig).FRONTEND_URL,
      'http://localhost:5173',
    );
  });

  it('rejeita portas inválidas e URLs de outro tipo de banco', () => {
    assert.throws(
      () => validateEnvironment({ ...validConfig, PORT: 'invalid' }),
      /PORT/,
    );
    assert.throws(
      () => validateEnvironment({ ...validConfig, PORT: 70000 }),
      /PORT/,
    );
    assert.throws(
      () => validateEnvironment({ DATABASE_URL: 'file:./dev.db' }),
      /DATABASE_URL/,
    );
    assert.throws(() => validateEnvironment({}), /DATABASE_URL/);
    assert.throws(
      () =>
        validateEnvironment({
          ...validConfig,
          FRONTEND_URL: 'ftp://localhost',
        }),
      /FRONTEND_URL/,
    );
  });
});
