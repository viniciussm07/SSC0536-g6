import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';

const fixture = JSON.parse(
  await readFile(
    new URL('../../../fixtures/oto/contrato-dados.json', import.meta.url),
    'utf8',
  ),
);
const cjs = createRequire(import.meta.url)('@ssc0536/common');

for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  assert.equal(fixture.metadata.contractVersion, api.CONTRATO_DADOS_VERSAO);
  const validadores = {
    texto: api.normalizarTextoColetado,
    quantidade: api.normalizarQuantidadeColetada,
    booleano: api.normalizarBooleanoColetado,
    data: api.normalizarDataColetada,
    horario: api.normalizarHorarioColetado,
  };
  for (const caso of fixture.cases) {
    test(`${formato}: ${caso.id} entrada manual/importada mantém o mesmo significado`, () => {
      const esperado = { valido: true, data: caso.expected };
      assert.deepEqual(validadores[caso.validator](caso.manual), esperado);
      assert.deepEqual(validadores[caso.validator](caso.imported), esperado);
    });
  }

  test(`${formato}: recusa quantidades inválidas sem truncar ou converter falso em zero`, () => {
    for (const entrada of [
      -1,
      1.5,
      false,
      NaN,
      Infinity,
      2147483648,
      '1.000',
      '1,5',
      '1e3',
      '12 UH',
      [],
      {},
    ]) {
      assert.equal(api.normalizarQuantidadeColetada(entrada).valido, false);
    }
    assert.deepEqual(api.normalizarQuantidadeColetada('2147483647'), {
      valido: true,
      data: { estado: 'informado', valor: 2147483647 },
    });
  });

  test(`${formato}: estados explícitos passam pela validação e não perdem valor`, () => {
    assert.deepEqual(
      api.normalizarBooleanoColetado({ estado: 'informado', valor: false }),
      { valido: true, data: { estado: 'informado', valor: false } },
    );
    for (const entrada of [
      { estado: 'informado', valor: null },
      { estado: 'informado', valor: '' },
      { estado: 'informado' },
      { estado: 'nao_se_aplica', valor: 0 },
      { estado: 'vazio', extra: true },
      { estado: 'inexistente' },
      { estado: { toString: 'inválido' } },
      { estado: 'informado', valor: { estado: 'informado', valor: 1 } },
    ])
      assert.equal(api.normalizarQuantidadeColetada(entrada).valido, false);
  });

  test(`${formato}: marcações legadas desconhecidas exigem conferência`, () => {
    for (const entrada of ['X', 'N/A', '-', 2, 'talvez']) {
      assert.equal(api.normalizarBooleanoColetado(entrada).valido, false);
    }
    assert.equal(api.normalizarTextoColetado('N/A').data.valor, 'N/A');
  });

  test(`${formato}: valida calendário e horário sem inferir datas de seriais`, () => {
    for (const entrada of [
      '2026-02-29',
      '1900-02-29',
      '0000-01-01',
      '2026-04-31',
      '2026-00-10',
      '2026-01-00',
      '2026-13-01',
      '01/02/2026',
      '2026-01-01T00:00:00Z',
      46023,
    ]) {
      assert.equal(api.normalizarDataColetada(entrada).valido, false);
    }
    for (const entrada of ['2024-02-29', '2000-02-29', '2026-12-31']) {
      assert.equal(api.normalizarDataColetada(entrada).valido, true);
    }
    for (const entrada of ['24:00', '12:60', '9:00', 0.5]) {
      assert.equal(api.normalizarHorarioColetado(entrada).valido, false);
    }
    assert.equal(api.normalizarHorarioColetado('00:00').data.valor, '00:00');
  });

  test(`${formato}: decimal mantém precisão e recusa dinheiro numérico ou ambíguo`, () => {
    assert.equal(
      api.normalizarDecimalColetado('000123,4500').data.valor,
      '123.45',
    );
    assert.equal(
      api.normalizarDecimalColetado(
        '12345678901234567890.12345678901234567890123456789',
      ).data.valor,
      '12345678901234567890.12345678901234567890123456789',
    );
    for (const entrada of [
      1.25,
      '-1',
      '1.234,56',
      'R$ 100',
      '1e2',
      '1'.repeat(36),
      '0.' + '1'.repeat(31),
    ]) {
      assert.equal(api.normalizarDecimalColetado(entrada).valido, false);
    }
  });

  test(`${formato}: escala percentual explícita converte sem arredondar`, () => {
    assert.deepEqual(
      api.normalizarPercentualColetado('0,75321', 'fracao'),
      api.normalizarPercentualColetado('75.321', 'percentual'),
    );
    for (const [entrada, escala, esperado] of [
      ['0', 'fracao', '0'],
      ['1', 'fracao', '100'],
      ['0.5', 'percentual', '0.5'],
      ['0.005', 'fracao', '0.5'],
    ]) {
      assert.equal(
        api.normalizarPercentualColetado(entrada, escala).data.valor,
        esperado,
      );
    }
    for (const [entrada, escala] of [
      ['1.001', 'fracao'],
      ['100.000000000000000001', 'percentual'],
      ['75%', 'percentual'],
      ['75', undefined],
      [undefined, undefined],
      [null, 'auto'],
      ['0.5', 'auto'],
    ]) {
      assert.equal(
        api.normalizarPercentualColetado(entrada, escala).valido,
        false,
      );
    }
  });
}
