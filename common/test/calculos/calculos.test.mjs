import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLECOES,
  ESQUEMAS_ODATA,
  SITUACOES_EXECUCAO,
  SITUACOES_PUBLICACAO,
  isExecucaoCalculoDetalhe,
  isExecucaoCalculoLinha,
  isSolicitacaoCalculo,
  isValorIndicador,
  lerConsultaOData,
  validarEntradaExecucaoCalculo,
  validarEntradaPublicacaoCalculo,
} from '@ssc0536/common';

const campos = (r) => (r.valido ? [] : r.erros.map((e) => e.field).sort());

test('execução: só a pergunta e um motivo opcional; autoria e período não vêm do payload', () => {
  assert.deepEqual(validarEntradaExecucaoCalculo({ perguntaId: 3 }), {
    valido: true,
    data: { perguntaId: 3 },
  });
  assert.deepEqual(
    validarEntradaExecucaoCalculo({ perguntaId: 3, motivo: '  Correção  ' })
      .data,
    { perguntaId: 3, motivo: 'Correção' },
  );
  assert.deepEqual(
    validarEntradaExecucaoCalculo({ perguntaId: 3, motivo: '   ' }).data,
    { perguntaId: 3 },
  );
  assert.deepEqual(
    campos(
      validarEntradaExecucaoCalculo({
        perguntaId: '3',
        periodoId: 1,
        solicitadaPorId: 9,
        motivo: 'x'.repeat(501),
      }),
    ),
    ['motivo', 'perguntaId', 'periodoId', 'solicitadaPorId'],
  );
  for (const perguntaId of [0, -1, 1.5, 2147483648, null])
    assert.deepEqual(campos(validarEntradaExecucaoCalculo({ perguntaId })), [
      'perguntaId',
    ]);
  assert.equal(validarEntradaExecucaoCalculo([]).valido, false);
});

test('publicação: corpo vazio é aceito; só o motivo é permitido', () => {
  assert.deepEqual(validarEntradaPublicacaoCalculo(undefined), {
    valido: true,
    data: {},
  });
  assert.deepEqual(validarEntradaPublicacaoCalculo({}), {
    valido: true,
    data: {},
  });
  assert.deepEqual(
    validarEntradaPublicacaoCalculo({ motivo: 'Revisão' }).data,
    {
      motivo: 'Revisão',
    },
  );
  assert.deepEqual(
    campos(validarEntradaPublicacaoCalculo({ motivo: 1, revisao: 2 })),
    ['motivo', 'revisao'],
  );
});

test('valor indisponível tem motivo conhecido e detalhe; zero disponível é valor', () => {
  assert.equal(isValorIndicador({ estado: 'disponivel', valor: '0' }), true);
  assert.equal(
    isValorIndicador({
      estado: 'indisponivel',
      motivo: 'dado_ausente',
      detalhe: 'x',
    }),
    true,
  );
  assert.equal(
    isValorIndicador({ estado: 'indisponivel', motivo: 'zero', detalhe: 'x' }),
    false,
  );
  assert.equal(isValorIndicador({ estado: 'disponivel', valor: 0 }), false);
});

const LINHA = {
  id: 1,
  periodoId: 2,
  periodo: 'Janeiro fictício',
  tipoColeta: 'consolidado',
  pesquisaId: 3,
  pesquisa: 'Consolidado fictício',
  perguntaId: 4,
  revisao: 1,
  versaoFormula: 1,
  situacao: 'concluido',
  publicacao: 'calculado',
  motivo: null,
  erro: null,
  solicitadaEm: '2026-11-22T12:00:00.000Z',
  solicitadaPor: 'Gestora fictícia',
  concluidaEm: '2026-11-22T12:00:01.000Z',
  publicadaEm: null,
  publicadaPorId: null,
};
const DETALHE = {
  ...LINHA,
  motivoPublicacao: null,
  substituidaPorId: null,
  insumosAtuais: 'iguais',
  insumos: {
    versaoFormula: 1,
    periodo: {
      id: 2,
      rotulo: 'x',
      dataInicio: '2091-01-01',
      dataFim: '2091-01-31',
      diasPeriodo: 31,
    },
    pesquisa: { id: 3, titulo: 'x', tipoColeta: 'consolidado' },
    pergunta: { id: 4, rotulo: 'x' },
    populacao: 'destinatarios',
    meios: [],
    rhc: { situacao: 'ausente', rhcPeriodoIds: [], qtdRhc: null, leitos: null },
    parametros: [],
  },
  resultados: [
    {
      id: 9,
      indicadorId: 5,
      codigo: 'taxa_ocupacao_uh',
      nome: 'Taxa',
      unidade: 'percentual_0_100',
      recorte: 'total',
      metodo: 'ponderada',
      valor: {
        estado: 'indisponivel',
        motivo: 'sem_respondentes',
        detalhe: 'x',
      },
    },
  ],
};

test('guardas das respostas de /calculos', () => {
  assert.equal(isExecucaoCalculoLinha(LINHA), true);
  assert.equal(
    isExecucaoCalculoLinha({ ...LINHA, situacao: 'cancelado' }),
    false,
  );
  assert.equal(isExecucaoCalculoLinha({ ...LINHA, revisao: '1' }), false);
  assert.equal(isExecucaoCalculoDetalhe(DETALHE), true);
  assert.equal(
    isExecucaoCalculoDetalhe({ ...DETALHE, insumosAtuais: 'talvez' }),
    false,
  );
  assert.equal(
    isExecucaoCalculoDetalhe({
      ...DETALHE,
      resultados: [
        { ...DETALHE.resultados[0], valor: { estado: 'disponivel', valor: 1 } },
      ],
    }),
    false,
  );
  assert.equal(
    isSolicitacaoCalculo({ execucao: DETALHE, reaproveitada: false }),
    true,
  );
  assert.equal(isSolicitacaoCalculo({ execucao: DETALHE }), false);
});

test('coleção /calculos: recurso calculos, enums do ciclo e padrão OData válido', () => {
  const esquema = ESQUEMAS_ODATA.calculos;
  assert.equal(COLECOES.calculos.recursoAcesso, 'calculos');
  assert.equal(COLECOES.calculos.esquema, esquema);
  assert.deepEqual(
    esquema.campos.find((c) => c.nome === 'situacao').valores,
    SITUACOES_EXECUCAO,
  );
  assert.deepEqual(
    esquema.campos.find((c) => c.nome === 'publicacao').valores,
    SITUACOES_PUBLICACAO,
  );
  assert.equal(
    lerConsultaOData(
      { $filter: "publicacao eq 'publicado' and revisao ge 1" },
      esquema,
    ).valido,
    true,
  );
  assert.equal(
    lerConsultaOData({ $filter: 'insumosHash eq null' }, esquema).valido,
    false,
  );
});
