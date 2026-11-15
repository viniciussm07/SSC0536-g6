import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';

const cjs = createRequire(import.meta.url)('@ssc0536/common');
for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  test(`${formato}: capacidade manual e importada convergem sem imputar campos ausentes`, () => {
    const manual = api.normalizarCapacidadeInventario({
      totalUh: '10',
      leitos: '0',
      funciona24h: 'não',
      checkin: '14:00',
      funcTemporarios: null,
      uhsPcd: { estado: 'nao_se_aplica' },
    });
    // Exemplo após mapear AS/AT/AV/AW/AR/AU; a leitura e o mapeamento são da parte 08.
    const importada = api.normalizarCapacidadeInventario({
      totalUh: 10,
      leitos: 0,
      funciona24h: false,
      checkin: '14:00',
      funcTemporarios: null,
      uhsPcd: { estado: 'nao_se_aplica' },
    });
    assert.deepEqual(manual, importada);
    assert.equal(manual.valido, true);
    assert.deepEqual(manual.data.leitos, { estado: 'informado', valor: 0 });
    assert.deepEqual(manual.data.funciona24h, {
      estado: 'informado',
      valor: false,
    });
    assert.deepEqual(manual.data.funcTemporarios, { estado: 'desconhecido' });
    assert.deepEqual(manual.data.uhsPcd, { estado: 'nao_se_aplica' });
    assert.deepEqual(manual.data.checkout, { estado: 'ausente' });
  });
  test(`${formato}: contrato rejeita campos alheios e agrega erros por campo`, () => {
    const resultado = api.normalizarCapacidadeInventario({
      leitos: -1,
      totalUh: '1.5',
      checkin: '24:00',
      criadaPor: 900005,
    });
    assert.equal(resultado.valido, false);
    assert.deepEqual(resultado.erros.map(({ field }) => field).sort(), [
      'checkin',
      'criadaPor',
      'leitos',
      'totalUh',
    ]);
    for (const entrada of [null, [], 1, 'capacidade'])
      assert.equal(api.normalizarCapacidadeInventario(entrada).valido, false);
  });
}
