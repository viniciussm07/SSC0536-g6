import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';

const cjs = createRequire(import.meta.url)('@ssc0536/common');
test('os dois ambientes publicam os mesmos valores de contrato', () => {
  assert.deepEqual(
    Object.keys(esm).sort(),
    Object.keys(cjs)
      .filter((key) => key !== 'default')
      .sort(),
  );
  assert.deepEqual(esm.PAGINATION, cjs.PAGINATION);
  assert.equal(esm.API_PREFIX, cjs.API_PREFIX);
  assert.equal(esm.HEALTH_RESOURCE, cjs.HEALTH_RESOURCE);
  assert.equal(esm.CONTRATO_DADOS_VERSAO, cjs.CONTRATO_DADOS_VERSAO);
  assert.equal(esm.FUSO_OPERACIONAL, cjs.FUSO_OPERACIONAL);
});
