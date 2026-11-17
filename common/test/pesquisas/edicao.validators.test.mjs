import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDestinatarioLinha,
  isPesquisaDetalhe,
  lerInstante,
  validarAlteracaoPesquisa,
  validarEntradaPesquisa,
} from '@ssc0536/common';

const ENTRADA = {
  titulo: '  Expectativa de dezembro  ',
  tipoColeta: 'expectativa',
  modeloId: 1,
  periodoIds: [3, 1],
  abertura: '2026-11-20T09:00:00-03:00',
  prazo: '2026-11-30T23:59:00-03:00',
};

test('entrada válida normaliza título, ids e instantes em UTC', () => {
  const r = validarEntradaPesquisa(ENTRADA);
  assert.equal(r.valido, true);
  assert.deepEqual(r.data, {
    titulo: 'Expectativa de dezembro',
    tipoColeta: 'expectativa',
    modeloId: 1,
    periodoIds: [1, 3],
    abertura: '2026-11-20T12:00:00.000Z',
    prazo: '2026-12-01T02:59:00.000Z',
    segmentoIds: [],
  });
});

test('campos obrigatórios, desconhecidos e tipos inválidos são apontados', () => {
  const r = validarEntradaPesquisa({
    titulo: '',
    tipoColeta: 'misto',
    extra: 1,
  });
  assert.equal(r.valido, false);
  const campos = r.erros.map((e) => e.field);
  for (const c of ['extra', 'titulo', 'tipoColeta', 'modeloId', 'periodoIds'])
    assert.ok(campos.includes(c), c);
  assert.ok(!campos.includes('segmentoIds'));
});

test('prazo anterior ou igual à abertura é recusado', () => {
  const r = validarEntradaPesquisa({ ...ENTRADA, prazo: ENTRADA.abertura });
  assert.equal(r.valido, false);
  assert.deepEqual(
    r.erros.map((e) => e.field),
    ['prazo'],
  );
});

test('ids repetidos ou não inteiros e lista vazia de períodos são recusados', () => {
  for (const periodoIds of [[], [1, 1], [1.5], ['1']]) {
    const r = validarEntradaPesquisa({ ...ENTRADA, periodoIds });
    assert.equal(r.valido, false, JSON.stringify(periodoIds));
  }
  assert.equal(
    validarEntradaPesquisa({ ...ENTRADA, segmentoIds: [] }).valido,
    true,
  );
});

test('instante exige fuso explícito e data real', () => {
  assert.equal(lerInstante('2026-11-20T09:00:00Z'), '2026-11-20T09:00:00.000Z');
  assert.equal(lerInstante('2026-11-20T09:00:00'), null);
  assert.equal(lerInstante('2026-11-20'), null);
  assert.equal(lerInstante('2026-13-40T09:00:00Z'), null);
  assert.equal(lerInstante('2026-02-30T09:00:00Z'), null);
  assert.equal(lerInstante('2026-02-28T24:00:00Z'), null);
  assert.equal(
    lerInstante('2028-02-29T23:59:59-03:00'),
    '2028-03-01T02:59:59.000Z',
  );
});

test('alteração parcial aceita motivo e exige ao menos um campo', () => {
  const r = validarAlteracaoPesquisa({
    prazo: '2026-12-05T03:00:00Z',
    motivo: ' Prorrogação pedida pelo OTO ',
  });
  assert.equal(r.valido, true);
  assert.deepEqual(r.data, {
    prazo: '2026-12-05T03:00:00.000Z',
    motivo: 'Prorrogação pedida pelo OTO',
  });
  assert.equal(validarAlteracaoPesquisa({}).valido, false);
  assert.equal(validarAlteracaoPesquisa({ status: 'aberta' }).valido, false);
});

const DETALHE = {
  id: 1,
  titulo: 'Edição',
  tipoColeta: 'consolidado',
  status: 'aberta',
  abertura: '2026-11-01T03:00:00.000Z',
  prazo: '2026-12-01T03:00:00.000Z',
  modeloId: 1,
  modeloVersao: 2,
  situacao: 'recebendo',
  modeloNome: 'Modelo',
  segmentoIds: [],
  criadaEm: '2026-10-30T12:00:00.000Z',
  abertaEm: '2026-11-01T03:00:00.000Z',
  encerradaEm: null,
  periodos: [
    {
      id: 1,
      tipo: 'mes',
      rotulo: 'Outubro',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
    },
  ],
  perguntas: [
    {
      id: 9,
      periodoId: 1,
      campoId: 4,
      chave: 'ocupacao',
      rotulo: 'Ocupação (%)',
      tipoValor: 'percentual',
      obrigatorio: true,
    },
  ],
  participacao: {
    elegiveis: 3,
    destinatarios: 3,
    respondentes: 1,
    pendentes: 2,
  },
};

test('guarda do detalhe aceita contagens nulas de edição legada', () => {
  assert.equal(isPesquisaDetalhe(DETALHE), true);
  assert.equal(
    isPesquisaDetalhe({
      ...DETALHE,
      participacao: {
        elegiveis: null,
        destinatarios: null,
        respondentes: 2,
        pendentes: null,
      },
    }),
    true,
  );
  assert.equal(isPesquisaDetalhe({ ...DETALHE, situacao: 'pausada' }), false);
  assert.equal(
    isPesquisaDetalhe({
      ...DETALHE,
      participacao: { ...DETALHE.participacao, respondentes: null },
    }),
    false,
  );
});

test('guarda do destinatário distingue respondeu e pendente', () => {
  assert.equal(
    isDestinatarioLinha({
      empreendimentoId: 1,
      nomeFantasia: 'Hotel',
      situacaoResposta: 'pendente',
      respondidaEm: null,
    }),
    true,
  );
  assert.equal(
    isDestinatarioLinha({
      empreendimentoId: 1,
      nomeFantasia: 'Hotel',
      situacaoResposta: 'atrasado',
      respondidaEm: null,
    }),
    false,
  );
});
