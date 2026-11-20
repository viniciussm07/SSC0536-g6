import assert from 'node:assert/strict';
import test from 'node:test';
import {
  conferirPeriodosCompativeis,
  dataNoFuso,
  recebeRespostas,
  situacaoPesquisa,
} from '@ssc0536/common';

const ABERTA = {
  status: 'aberta',
  abertura: '2026-11-01T03:00:00.000Z',
  prazo: '2026-11-11T03:00:00.000Z',
};

test('situação deriva do estado e do relógio, sem job de expiração', () => {
  assert.equal(
    situacaoPesquisa({ ...ABERTA, status: 'rascunho' }, new Date()),
    'rascunho',
  );
  assert.equal(
    situacaoPesquisa(ABERTA, new Date('2026-10-31T12:00:00Z')),
    'agendada',
  );
  assert.equal(
    situacaoPesquisa(ABERTA, new Date('2026-11-05T12:00:00Z')),
    'recebendo',
  );
  assert.equal(
    situacaoPesquisa(ABERTA, new Date('2026-11-20T12:00:00Z')),
    'expirada',
  );
  assert.equal(
    situacaoPesquisa(
      { ...ABERTA, status: 'encerrada' },
      new Date('2026-11-05T12:00:00Z'),
    ),
    'encerrada',
  );
});

test('abertura é inclusiva e prazo é exclusivo', () => {
  assert.equal(recebeRespostas(ABERTA, new Date(ABERTA.abertura)), true);
  assert.equal(
    recebeRespostas(ABERTA, new Date('2026-11-11T02:59:59.999Z')),
    true,
  );
  assert.equal(recebeRespostas(ABERTA, new Date(ABERTA.prazo)), false);
});

test('status desconhecido não recebe respostas', () => {
  assert.equal(
    situacaoPesquisa(
      { ...ABERTA, status: 'pausada' },
      new Date('2026-11-05T12:00:00Z'),
    ),
    'encerrada',
  );
});

test('data civil no fuso operacional muda após a meia-noite de Brasília', () => {
  assert.equal(dataNoFuso('2026-12-01T02:59:00Z'), '2026-11-30');
  assert.equal(dataNoFuso('2026-12-01T03:00:00Z'), '2026-12-01');
  assert.equal(dataNoFuso('2026-12-01T02:59:00Z', 'UTC'), '2026-12-01');
});

const NOVEMBRO = {
  id: 1,
  rotulo: 'Novembro',
  dataInicio: '2026-11-01',
  dataFim: '2026-11-30',
};

test('expectativa exige prazo até o fim do período (fuso operacional)', () => {
  // 30/11 23:59 em Brasília = 01/12 02:59 UTC: ainda dentro do período.
  assert.deepEqual(
    conferirPeriodosCompativeis(
      'expectativa',
      [NOVEMBRO],
      '2026-12-01T02:59:00Z',
    ),
    [],
  );
  const erros = conferirPeriodosCompativeis(
    'expectativa',
    [NOVEMBRO],
    '2026-12-01T03:00:00Z',
  );
  assert.equal(erros.length, 1);
  assert.equal(erros[0].field, 'periodoIds');
  assert.match(erros[0].message, /Novembro/);
});

test('consolidado exige período encerrado antes da data do prazo', () => {
  assert.deepEqual(
    conferirPeriodosCompativeis(
      'consolidado',
      [NOVEMBRO],
      '2026-12-01T03:00:00Z',
    ),
    [],
  );
  assert.equal(
    conferirPeriodosCompativeis(
      'consolidado',
      [NOVEMBRO],
      '2026-12-01T02:59:00Z',
    ).length,
    1,
  );
});
