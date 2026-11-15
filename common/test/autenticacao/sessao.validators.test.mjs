import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');
for (const [nome, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  test(`${nome}: sessão exige identidade individual e timestamp UTC`, () => {
    const data = {
      usuario: {
        id: 900001,
        nome: 'Pessoa Fictícia',
        email: 'conta@example.test',
        perfil: 'empresario',
      },
      expiraEm: '2026-11-15T12:00:00.000Z',
    };
    assert.equal(api.isSessaoAtual(data), true);
    for (const valor of [
      null,
      {},
      { ...data, usuario: { ...data.usuario, id: 0 } },
      { ...data, expiraEm: 'inválida' },
      { ...data, expiraEm: '2026-11-15' },
    ])
      assert.equal(api.isSessaoAtual(valor), false);
  });
}
