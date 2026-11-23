import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLECOES,
  ESQUEMA_COLETAS_DIARIAS,
  isColetaDiariaLinha,
  isParametroCalculoLinha,
  isRhcPeriodoLinha,
  validarAlteracaoColetaDiaria,
  validarAlteracaoParametroCalculo,
  validarAlteracaoRhcPeriodo,
  validarEntradaColetaDiaria,
  validarEntradaParametroCalculo,
  validarEntradaRhcPeriodo,
} from '@ssc0536/common';

const COLETA = {
  empreendimentoId: 900001,
  periodoId: 900002,
  fonte: 'booking',
  dataColeta: '2026-11-01',
  dataEstadia: '2026-11-15',
  tipoDia: 'fim_de_semana',
  valorDiaria: '199,90',
};

test('coleta de diária normaliza decimal e preenche defaults', () => {
  const resultado = validarEntradaColetaDiaria(COLETA);
  assert.equal(resultado.valido, true);
  assert.equal(resultado.data.valorDiaria, '199.90');
  assert.equal(resultado.data.moeda, 'BRL');
  assert.equal(resultado.data.unidadePreco, 'por_uh_diaria');
});

test('coleta recusa valor inválido, data inválida, campo desconhecido e tipo de dia', () => {
  const casos = [
    { ...COLETA, valorDiaria: '0' },
    { ...COLETA, valorDiaria: 'abc' },
    { ...COLETA, dataEstadia: '2026-02-30' },
    { ...COLETA, tipoDia: 'feriado' },
    { ...COLETA, campoExtra: true },
    { ...COLETA, fonte: ' ' },
  ];
  for (const caso of casos) {
    const resultado = validarEntradaColetaDiaria(caso);
    assert.equal(resultado.valido, false, JSON.stringify(caso));
    assert.ok(resultado.erros.length > 0);
  }
});

test('alteração de coleta exige ao menos um campo e aceita conferência', () => {
  assert.equal(validarAlteracaoColetaDiaria({}).valido, false);
  const conferida = validarAlteracaoColetaDiaria({
    situacaoConferencia: 'conferida',
  });
  assert.equal(conferida.valido, true);
  assert.equal(conferida.data.situacaoConferencia, 'conferida');
  assert.equal(
    validarAlteracaoColetaDiaria({ situacaoConferencia: 'invalida' }).valido,
    false,
  );
});

test('RHC aceita zero informado e recusa negativos', () => {
  const zero = validarEntradaRhcPeriodo({
    periodoId: 1,
    qtdRhc: 0,
    leitos: 0,
  });
  assert.equal(zero.valido, true);
  assert.equal(zero.data.qtdRhc, 0);
  const negativo = validarEntradaRhcPeriodo({
    periodoId: 1,
    qtdRhc: -1,
    leitos: 2,
  });
  assert.equal(negativo.valido, false);
  const conferencia = validarAlteracaoRhcPeriodo({
    situacaoConferencia: 'conferida',
  });
  assert.equal(conferencia.valido, true);
});

test('parâmetro preserva zero e vigência, com decimal em texto', () => {
  const resultado = validarEntradaParametroCalculo({
    chave: 'day_use.fator_hospedados',
    valor: '0',
    unidade: 'fator',
    vigenciaInicio: '2026-01-01',
    situacao: 'hipotese_pendente_homologacao',
  });
  assert.equal(resultado.valido, true);
  assert.equal(resultado.data.valor, '0');
  assert.equal(resultado.data.unidade, 'fator');
  assert.equal(resultado.data.situacao, 'hipotese_pendente_homologacao');
});

test('parâmetro recusa fim anterior ao início e alteração vazia', () => {
  const invalido = validarEntradaParametroCalculo({
    chave: 'x',
    valor: '1',
    vigenciaInicio: '2026-02-01',
    vigenciaFim: '2026-01-01',
  });
  assert.equal(invalido.valido, false);
  assert.equal(validarAlteracaoParametroCalculo({}).valido, false);
  const valido = validarAlteracaoParametroCalculo({
    situacao: 'homologado',
  });
  assert.equal(valido.valido, true);
});

test('validadores de resposta reconhecem as linhas e recusam formatos errados', () => {
  const coleta = {
    id: 1,
    empreendimentoId: 2,
    empreendimentoNome: 'Hotel',
    periodoId: 3,
    periodoRotulo: 'Novembro 2026',
    fonte: 'booking',
    dataColeta: '2026-11-01',
    dataEstadia: '2026-11-15',
    tipoDia: 'fim_de_semana',
    valorDiaria: '199.9',
    moeda: 'BRL',
    unidadePreco: 'por_uh_diaria',
    origem: 'manual',
    situacaoConferencia: 'pendente',
    referenciaOrigem: null,
    observacao: null,
    conferidoEm: null,
    conferidoPor: null,
  };
  assert.equal(isColetaDiariaLinha(coleta), true);
  assert.equal(
    isColetaDiariaLinha({ ...coleta, situacaoConferencia: 'x' }),
    false,
  );

  const rhc = {
    id: 1,
    periodoId: 3,
    periodoRotulo: 'Novembro 2026',
    qtdRhc: 2,
    leitos: 8,
    origem: 'manual',
    situacaoConferencia: 'pendente',
    revisao: 1,
    observacao: null,
    conferidoEm: null,
    conferidoPor: null,
  };
  assert.equal(isRhcPeriodoLinha(rhc), true);
  assert.equal(isRhcPeriodoLinha({ ...rhc, revisao: '1' }), false);

  const parametro = {
    id: 1,
    chave: 'x',
    valor: '1',
    unidade: 'fator',
    vigenciaInicio: '2026-01-01',
    vigenciaFim: null,
    fonte: null,
    situacao: 'homologado',
    observacao: null,
  };
  assert.equal(isParametroCalculoLinha(parametro), true);
  assert.equal(isParametroCalculoLinha({ ...parametro, valor: 1 }), false);
});

test('coleções declaradas usam os esquemas das fontes complementares', () => {
  assert.equal(COLECOES.coletasDiarias.caminho, '/coletas-diarias');
  assert.equal(COLECOES.coletasDiarias.esquema, ESQUEMA_COLETAS_DIARIAS);
  assert.equal(COLECOES.rhcPeriodos.caminho, '/rhc-periodos');
  assert.equal(COLECOES.parametrosCalculo.caminho, '/parametros-calculo');
});
