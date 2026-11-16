import assert from 'node:assert/strict';
import test from 'node:test';
import {
  duracaoDias,
  validarEntradaPeriodo,
  validarAlteracaoPeriodo,
} from '@ssc0536/common';
import { dataCivilValida } from '@ssc0536/common';

test('duração inclusiva de mês, mudança de ano e feriado de um dia', () => {
  assert.equal(duracaoDias('2026-01-01', '2026-01-31'), 31);
  assert.equal(duracaoDias('2025-12-01', '2026-01-31'), 62);
  assert.equal(duracaoDias('2026-11-20', '2026-11-20'), 1);
  assert.equal(duracaoDias('2025-12-24', '2026-01-01'), 9);
});

test('fevereiro bissexto tem 29 dias e datas impossíveis são recusadas', () => {
  assert.equal(duracaoDias('2024-02-01', '2024-02-29'), 29);
  assert.equal(dataCivilValida('2024-02-29'), true);
  assert.equal(dataCivilValida('2026-02-29'), false);
  assert.equal(dataCivilValida('2026-04-31'), false);
  assert.equal(dataCivilValida('2026-13-01'), false);
  assert.equal(dataCivilValida('01/01/2026'), false);
});

test('entrada válida de mês e de feriado prolongado', () => {
  const mes = validarEntradaPeriodo({
    tipo: 'mes',
    rotulo: 'Janeiro 2026',
    dataInicio: '2026-01-01',
    dataFim: '2026-01-31',
  });
  assert.equal(mes.valido, true);
  const feriado = validarEntradaPeriodo({
    tipo: 'feriado_prolongado',
    rotulo: 'Carnaval 2026',
    dataInicio: '2026-02-14',
    dataFim: '2026-02-17',
  });
  assert.equal(feriado.valido, true);
});

test('entrada inválida acumula erros por campo', () => {
  const r = validarEntradaPeriodo({
    tipo: 'bimestre',
    rotulo: '',
    dataInicio: '2026-01-31',
    dataFim: '2026-01-01',
  });
  assert.equal(r.valido, false);
  if (!r.valido) {
    const campos = r.erros.map((e) => e.field).sort();
    assert.deepEqual(campos, ['dataFim', 'rotulo', 'tipo']);
  }
});

test('fim anterior ao início é recusado mesmo em alteração parcial', () => {
  const atual = {
    tipo: 'mes',
    dataInicio: '2026-01-01',
    dataFim: '2026-01-31',
  };
  const r = validarAlteracaoPeriodo({ dataFim: '2025-12-31' }, atual);
  assert.equal(r.valido, false);
  if (!r.valido) assert.equal(r.erros[0].field, 'dataFim');
});

test('alteração combina datas novas com as atuais para conferir o intervalo', () => {
  const atual = {
    tipo: 'mes',
    dataInicio: '2026-01-01',
    dataFim: '2026-01-31',
  };
  const r = validarAlteracaoPeriodo({ rotulo: 'Janeiro/2026' }, atual);
  assert.equal(r.valido, true);
  const esticar = validarAlteracaoPeriodo({ dataFim: '2026-02-28' }, atual);
  assert.equal(esticar.valido, true);
});

test('duração acima do limite de sanidade é recusada', () => {
  const r = validarEntradaPeriodo({
    tipo: 'mes',
    rotulo: 'Período impossível',
    dataInicio: '2020-01-01',
    dataFim: '2026-01-01',
  });
  assert.equal(r.valido, false);
  if (!r.valido) assert.equal(r.erros[0].field, 'dataFim');
});
