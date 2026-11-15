import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');
for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  test(`${formato}: cabeçalho de contexto tem nome estável e ausência não é erro`, () => {
    assert.equal(api.CABECALHO_CONTEXTO, 'x-identification');
    assert.deepEqual(api.interpretarContextoEntidade(undefined), {
      valido: true,
      id: null,
    });
  });
  test(`${formato}: aceita somente inteiros positivos de 32 bits sem formatação`, () => {
    assert.deepEqual(api.interpretarContextoEntidade('900001'), {
      valido: true,
      id: 900001,
    });
    assert.deepEqual(api.interpretarContextoEntidade('2147483647'), {
      valido: true,
      id: 2147483647,
    });
    for (const invalido of [
      '',
      '0',
      '-1',
      '01',
      '1.5',
      '1e3',
      ' 1',
      '1 ',
      '0x10',
      'abc',
      '2147483648',
      '99999999999',
      ['1', '2'],
      1,
      null,
    ])
      assert.deepEqual(api.interpretarContextoEntidade(invalido), {
        valido: false,
      });
  });
}

for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  test(`${formato}: resumo de empreendimento exige CNPJ texto ou null, nunca ausente`, () => {
    const base = { id: 1, nomeFantasia: 'Hotel fictício', situacao: 'ativo' };
    assert.equal(api.isEmpreendimentoResumo({ ...base, cnpj: null }), true);
    assert.equal(
      api.isEmpreendimentoResumo({ ...base, cnpj: '11222333000181' }),
      true,
    );
    assert.equal(api.isEmpreendimentoResumo(base), false);
    assert.equal(api.isEmpreendimentoResumo({ ...base, cnpj: 1 }), false);
  });
}
