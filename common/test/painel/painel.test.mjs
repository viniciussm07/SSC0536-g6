import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PAINEL_RECURSOS,
  isOpcaoPainel,
  isPainel,
  isValorPainel,
  validarConsultaPainel,
} from '@ssc0536/common';

const campos = (r) => (r.valido ? [] : r.erros.map((e) => e.field).sort());
const fonte = {
  origem: 'calculo',
  execucaoId: 4,
  revisao: 2,
  publicadaEm: '2026-11-23T10:00:00.000Z',
  calculadoEm: '2026-11-23T09:00:00.000Z',
};
const periodo = (id) => ({
  id,
  rotulo: `P${id}`,
  tipo: 'mes',
  dataInicio: '2026-01-01',
  dataFim: '2026-01-31',
});

test('consulta: período e tipo de coleta obrigatórios; comparação diferente do período', () => {
  assert.deepEqual(
    validarConsultaPainel({ periodoId: '3', tipoColeta: 'consolidado' }),
    { valido: true, data: { periodoId: 3, tipoColeta: 'consolidado' } },
  );
  assert.deepEqual(
    validarConsultaPainel({
      periodoId: '3',
      tipoColeta: 'expectativa',
      comparacaoPeriodoId: '2',
    }),
    {
      valido: true,
      data: { periodoId: 3, tipoColeta: 'expectativa', comparacaoPeriodoId: 2 },
    },
  );
  assert.deepEqual(campos(validarConsultaPainel({})), [
    'periodoId',
    'tipoColeta',
  ]);
  assert.deepEqual(
    campos(
      validarConsultaPainel({
        periodoId: '3',
        tipoColeta: 'consolidado',
        comparacaoPeriodoId: '3',
      }),
    ),
    ['comparacaoPeriodoId'],
  );
  assert.deepEqual(
    campos(
      validarConsultaPainel({
        periodoId: '0',
        tipoColeta: 'previsao',
        $filter: 'x',
      }),
    ),
    ['$filter', 'periodoId', 'tipoColeta'],
  );
  assert.deepEqual(
    campos(
      validarConsultaPainel({
        periodoId: '99999999999',
        tipoColeta: 'consolidado',
      }),
    ),
    ['periodoId'],
  );
});

test('valor: zero é valor; indisponível exige motivo conhecido', () => {
  assert.equal(isValorPainel({ estado: 'disponivel', valor: '0' }), true);
  assert.equal(isValorPainel({ estado: 'disponivel', valor: 0 }), false);
  assert.equal(
    isValorPainel({
      estado: 'indisponivel',
      motivo: 'dado_ausente',
      detalhe: null,
    }),
    true,
  );
  assert.equal(
    isValorPainel({ estado: 'indisponivel', motivo: 'x', detalhe: null }),
    false,
  );
});

test('painel e opções: guardas de formato', () => {
  const item = {
    indicadorId: 1,
    codigo: 'taxa_ocupacao_uh',
    nome: 'Taxa',
    unidade: 'percentual_0_100',
    grupo: 'indicador',
    recorte: 'total',
    metodo: 'ponderada',
    valor: { estado: 'disponivel', valor: '66.5' },
    fonte,
    comparacao: {
      estado: 'disponivel',
      valor: '60',
      variacao: '6.5',
      fonte,
    },
  };
  const painel = {
    periodo: periodo(3),
    tipoColeta: 'consolidado',
    comparacao: periodo(2),
    situacao: 'disponivel',
    itens: [item],
    atualizadoEm: fonte.calculadoEm,
    aviso: 'x',
  };
  assert.equal(isPainel(painel), true);
  assert.equal(isPainel({ ...painel, situacao: 'outra' }), false);
  assert.equal(
    isPainel({
      ...painel,
      itens: [{ ...item, valor: { estado: 'disponivel', valor: 1 } }],
    }),
    false,
  );
  assert.equal(
    isOpcaoPainel({
      periodoId: 1,
      periodo: 'Jan',
      periodoTipo: 'mes',
      tipoColeta: 'consolidado',
    }),
    true,
  );
  assert.equal(PAINEL_RECURSOS.painel, '/indicadores/painel');
});

test('série: só tipoColeta; pontos nulos são aceitos, zero textual também', async () => {
  const { validarConsultaSerie, isSeriePainel } =
    await import('@ssc0536/common');
  assert.deepEqual(validarConsultaSerie({ tipoColeta: 'consolidado' }), {
    valido: true,
    data: { tipoColeta: 'consolidado' },
  });
  assert.deepEqual(campos(validarConsultaSerie({ periodoId: '1' })), [
    'periodoId',
    'tipoColeta',
  ]);
  const serie = {
    tipoColeta: 'consolidado',
    periodos: [periodo(1)],
    feriados: [],
    series: [
      {
        indicadorId: 1,
        codigo: 'taxa_ocupacao_uh',
        nome: 'Taxa',
        unidade: 'percentual_0_100',
        recorte: 'total',
        metodo: 'ponderada',
        pontos: [
          { periodoId: 1, valor: '0' },
          { periodoId: 2, valor: null },
        ],
      },
    ],
  };
  assert.equal(isSeriePainel(serie), true);
  serie.series[0].pontos[0].valor = 0;
  assert.equal(isSeriePainel(serie), false);
});

test('exportação: formato pdf ou xlsx além da consulta do painel', async () => {
  const { validarConsultaExportacaoPainel } = await import('@ssc0536/common');
  assert.deepEqual(
    validarConsultaExportacaoPainel({
      periodoId: '3',
      tipoColeta: 'consolidado',
      formato: 'xlsx',
    }),
    {
      valido: true,
      data: { periodoId: 3, tipoColeta: 'consolidado', formato: 'xlsx' },
    },
  );
  assert.deepEqual(
    campos(
      validarConsultaExportacaoPainel({
        periodoId: '3',
        tipoColeta: 'consolidado',
        formato: 'csv',
      }),
    ),
    ['formato'],
  );
  assert.deepEqual(
    campos(validarConsultaExportacaoPainel({ formato: 'pdf' })),
    ['periodoId', 'tipoColeta'],
  );
});

test('participação: contagens inteiras não negativas', async () => {
  const { isParticipacaoPainel } = await import('@ssc0536/common');
  const base = {
    tipoColeta: 'consolidado',
    edicoes: [
      {
        pesquisaId: 1,
        periodoId: 2,
        periodo: 'Jan',
        dataInicio: '2026-01-01',
        destinatarios: 10,
        respondentes: 0,
      },
    ],
  };
  assert.equal(isParticipacaoPainel(base), true);
  base.edicoes[0].respondentes = -1;
  assert.equal(isParticipacaoPainel(base), false);
});
