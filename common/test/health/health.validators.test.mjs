import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';

const cjs = createRequire(import.meta.url)('@ssc0536/common');
for (const [runtime, api] of [
  ['ESM (frontend)', esm],
  ['CommonJS (backend)', cjs],
]) {
  test(`${runtime}: contrato operacional aceita sucesso e rejeita falhas/payload incompleto`, () => {
    assert.equal(
      api.isHealthResponse({
        status: api.HEALTH_STATUS.ok,
        database: api.DATABASE_STATUS.connected,
        timestamp: '2026-11-15T00:00:00.000Z',
      }),
      true,
    );
    for (const value of [
      null,
      {},
      { status: 'ok', database: 'connected' },
      { status: 'error', database: 'disconnected' },
      { status: 'ok', database: 'connected', timestamp: 1 },
    ]) {
      assert.equal(api.isHealthResponse(value), false);
    }
  });
}
