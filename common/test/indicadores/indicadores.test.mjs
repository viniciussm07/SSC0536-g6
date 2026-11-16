import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');

const massa = JSON.parse(
  readFileSync(
    new URL(
      '../../../fixtures/oto/indicadores-referencia.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const hipotese = Object.fromEntries(
  massa.parametros.map((parametro) => [parametro.chave, parametro.valor]),
);
const CHAVES = {
  percentualDayUse: 'day_use.percentual',
  fatorHospedadosDayUse: 'day_use.fator_hospedados',
  faixasOcupacao: 'faixas_ocupacao.limites',
};

/** Monta a entrada do caso; "hipotese" busca o valor registrado na massa. */
function entradaTabulacao(caso) {
  const populacao = massa.populacoes[caso.populacao];
  return {
    diasPeriodo: caso.diasPeriodo,
    meios: populacao.meios.map((meio) => ({
      ...meio,
      taxaOcupacao: caso.taxas[meio.id] ?? null,
    })),
    rhc: populacao.rhc,
    parametros: Object.fromEntries(
      Object.entries(caso.parametros).map(([campo, valor]) => [
        campo,
        valor === 'hipotese' ? hipotese[CHAVES[campo]] : valor,
      ]),
    ),
  };
}

/** Reduz o resultado ao formato da massa: valor em texto ou motivo. */
const resumir = (valor) =>
  valor.estado === 'disponivel' ? valor.valor : { indisponivel: valor.motivo };
const resumirFaixas = (faixas) =>
  faixas.estado === 'indisponivel'
    ? { indisponivel: faixas.motivo }
    : {
        meiosSemFaixa: faixas.meiosSemFaixa,
        faixas: faixas.faixas.map((faixa) => ({
          ...faixa,
          leitos: resumir(faixa.leitos),
          percentualLeitos: resumir(faixa.percentualLeitos),
        })),
      };

const referencia = () =>
  entradaTabulacao(massa.tabulacao.find((caso) => caso.id === 'T01'));

for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  for (const caso of massa.tabulacao) {
    test(`${formato}: tabulação ${caso.id} — ${caso.descricao}`, () => {
      const resultado = api.calcularTabulacaoOcupacao(entradaTabulacao(caso));
      assert.deepEqual(resultado.erros, []);
      assert.equal(resultado.versaoFormula, massa.metadata.versaoFormula);
      assert.equal(resultado.respondentes, caso.esperado.respondentes);
      for (const [codigo, esperado] of Object.entries(
        caso.esperado.indicadores,
      )) {
        assert.deepEqual(
          resumir(resultado.indicadores[codigo]),
          esperado,
          codigo,
        );
      }
      if (caso.esperado.faixasOcupacao) {
        assert.deepEqual(
          resumirFaixas(resultado.faixasOcupacao),
          caso.esperado.faixasOcupacao,
        );
      }
      if (caso.esperado.ocupacaoPorTipo) {
        assert.deepEqual(
          resultado.ocupacaoPorTipo.map((item) => ({
            ...item,
            taxaOcupacao: resumir(item.taxaOcupacao),
          })),
          caso.esperado.ocupacaoPorTipo,
        );
      }
    });
  }

  test(`${formato}: a massa de referência cobre todos os indicadores da tabulação`, () => {
    const codigos = api.INDICADORES_TABULACAO.map((item) => item.codigo);
    const caso = massa.tabulacao.find((item) => item.id === 'T01');
    assert.deepEqual(Object.keys(caso.esperado.indicadores), codigos);
    assert.deepEqual(
      Object.keys(
        api.calcularTabulacaoOcupacao(entradaTabulacao(caso)).indicadores,
      ),
      codigos,
    );
    const todos = [
      ...api.INDICADORES_TABULACAO,
      ...api.INDICADORES_COMPLEMENTARES,
    ];
    assert.equal(new Set(todos.map((item) => item.codigo)).size, todos.length);
    assert.ok(
      todos.every(
        (item) => item.versaoFormula === api.INDICADORES_VERSAO_FORMULA,
      ),
    );
  });

  test(`${formato}: ausência nunca é publicada como zero`, () => {
    const entrada = referencia();
    entrada.meios[3].leitosMedia = null; // não respondente sem capacidade ajustada
    entrada.diasPeriodo = null;
    const { indicadores } = api.calcularTabulacaoOcupacao(entrada);
    assert.equal(indicadores.taxa_ocupacao_uh.valor, '57.5');
    for (const codigo of [
      'cobertura_leitos_media',
      'leitos_media_nao_respondentes',
      'turistas_mh_respondentes',
      'turistas_mh_nao_respondentes',
      'turistas_total',
    ]) {
      assert.equal(indicadores[codigo].estado, 'indisponivel', codigo);
      assert.equal(indicadores[codigo].motivo, 'dado_ausente', codigo);
      assert.equal('valor' in indicadores[codigo], false, codigo);
    }
    assert.match(indicadores.leitos_media_nao_respondentes.detalhe, /mh-d/);

    const semUh = referencia();
    semUh.meios[0].uhs = null; // respondente sem UH vigente
    const parcial = api.calcularTabulacaoOcupacao(semUh);
    assert.equal(parcial.indicadores.taxa_ocupacao_uh.motivo, 'dado_ausente');
    assert.equal(
      parcial.ocupacaoPorTipo.find((item) => item.tipo === 'pousada')
        .taxaOcupacao.valor,
      '20',
    );
  });

  test(`${formato}: resposta zero é dado informado, diferente de não responder`, () => {
    const entrada = referencia();
    entrada.meios[3].taxaOcupacao = '0';
    const resultado = api.calcularTabulacaoOcupacao(entrada);
    assert.equal(resultado.respondentes, 4);
    // (8000 + 2500 + 1000 + 0) ÷ 400 UH
    assert.equal(resultado.indicadores.taxa_ocupacao_uh.valor, '28.75');
    assert.equal(
      resultado.ocupacaoPorTipo.find((item) => item.tipo === 'resort')
        .taxaOcupacao.valor,
      '0',
    );
  });

  test(`${formato}: taxa fora de todas as faixas é contada à parte`, () => {
    const entrada = referencia();
    entrada.meios[0].taxaOcupacao = '80.995'; // lacuna entre 80,99 e 81
    const { faixasOcupacao } = api.calcularTabulacaoOcupacao(entrada);
    assert.equal(faixasOcupacao.meiosSemFaixa, 1);
    assert.deepEqual(
      faixasOcupacao.faixas.map((faixa) => [faixa.codigo, faixa.meios]),
      [
        ['excelente', 0],
        ['otima', 0],
        ['boa', 1],
        ['regular', 0],
        ['ruim', 1],
      ],
    );
    assert.equal(faixasOcupacao.faixas[2].percentualMeios, '50');
  });

  test(`${formato}: entrada inválida bloqueia o cálculo com erro por campo`, () => {
    const invalida = (alterar) => {
      const entrada = referencia();
      alterar(entrada);
      const resultado = api.calcularTabulacaoOcupacao(entrada);
      assert.ok(
        Object.values(resultado.indicadores).every(
          (valor) => valor.motivo === 'entrada_invalida',
        ),
      );
      assert.equal(resultado.faixasOcupacao.motivo, 'entrada_invalida');
      return resultado.erros.map((erro) => erro.field);
    };
    assert.deepEqual(
      invalida((e) => (e.meios[0].taxaOcupacao = '100.01')),
      ['meios[0].taxaOcupacao'],
    );
    // número JS é recusado: decimais só em texto, sem ponto flutuante
    assert.deepEqual(
      invalida((e) => (e.meios[1].taxaOcupacao = 57.5)),
      ['meios[1].taxaOcupacao'],
    );
    assert.deepEqual(
      invalida((e) => (e.meios[1].leitosMedia = 100)),
      ['meios[1].leitosMedia'],
    );
    assert.deepEqual(
      invalida((e) => (e.diasPeriodo = 0)),
      ['diasPeriodo'],
    );
    assert.deepEqual(
      invalida((e) => (e.meios[2].uhs = -1)),
      ['meios[2].uhs'],
    );
    assert.deepEqual(
      invalida((e) => (e.meios[1].id = 'mh-a')),
      ['meios[1].id'],
    );
    assert.deepEqual(
      invalida((e) => (e.parametros.fatorHospedadosDayUse = '0')),
      ['parametros.fatorHospedadosDayUse'],
    );
    assert.deepEqual(
      invalida(
        (e) =>
          (e.parametros.faixasOcupacao = [
            { codigo: 'a', minimo: '0', maximo: '50' },
            { codigo: 'b', minimo: '50', maximo: '100' },
          ]),
      ),
      ['parametros.faixasOcupacao'],
    );
    assert.deepEqual(api.validarEntradaTabulacao(referencia()), []);
  });

  test(`${formato}: fator que torna o day use negativo não gera estimativa`, () => {
    const entrada = referencia();
    entrada.parametros.fatorHospedadosDayUse = '0.5';
    const { indicadores } = api.calcularTabulacaoOcupacao(entrada);
    assert.equal(indicadores.turistas_hospedados.valor, '3130');
    for (const codigo of [
      'turistas_day_use',
      'turistas_day_use_dia',
      'turistas_total',
      'turistas_total_dia',
    ]) {
      assert.equal(indicadores[codigo].motivo, 'entrada_invalida', codigo);
    }
  });

  test(`${formato}: decimais longos não perdem precisão`, () => {
    const meio = (id, taxaOcupacao) => ({
      id,
      tipo: null,
      uhs: 1,
      leitos: 1,
      leitosMedia: '1',
      taxaOcupacao,
    });
    const { indicadores } = api.calcularTabulacaoOcupacao({
      diasPeriodo: 1,
      meios: [meio('a', '0.1'), meio('b', '0.2')],
      rhc: null,
      parametros: {
        percentualDayUse: null,
        fatorHospedadosDayUse: null,
        faixasOcupacao: null,
      },
    });
    // em ponto flutuante, (0.1 + 0.2) / 2 = 0.15000000000000002
    assert.equal(indicadores.taxa_ocupacao_uh.valor, '0.15');
    assert.equal(indicadores.turistas_mh.valor, '0.003');
  });

  for (const caso of massa.diaria) {
    test(`${formato}: diária ${caso.id} — ${caso.descricao}`, () => {
      const resultado = api.calcularDiariaMedia({
        empreendimentos: caso.empreendimentos,
      });
      assert.deepEqual(resultado.erros, []);
      assert.deepEqual(
        Object.fromEntries(
          resultado.porEmpreendimento.map((item) => [
            item.id,
            resumir(item.diariaMedia),
          ]),
        ),
        caso.esperado.porEmpreendimento,
      );
      assert.deepEqual(resumir(resultado.aritmetica), caso.esperado.aritmetica);
      assert.deepEqual(resumir(resultado.ponderada), caso.esperado.ponderada);
    });
  }

  test(`${formato}: diária inválida é recusada`, () => {
    const resultado = api.calcularDiariaMedia({
      empreendimentos: [{ id: 'mh-a', diarias: [199.9, 'R$ 10'], leitos: 1.5 }],
    });
    assert.deepEqual(
      resultado.erros.map((erro) => erro.field),
      ['empreendimentos[0].leitos', 'empreendimentos[0].diarias'],
    );
    assert.equal(resultado.aritmetica.motivo, 'entrada_invalida');
    assert.equal(resultado.ponderada.motivo, 'entrada_invalida');
  });

  for (const caso of massa.revpar) {
    test(`${formato}: RevPAR ${caso.id} — ${caso.descricao}`, () => {
      assert.deepEqual(
        resumir(api.calcularRevpar(caso.entrada)),
        caso.esperado,
      );
    });
  }

  for (const caso of massa.leitosMedia) {
    test(`${formato}: leitos média ${caso.id} — ${caso.descricao}`, () => {
      assert.deepEqual(
        resumir(api.calcularLeitosMedia(caso.entrada)),
        caso.esperado,
      );
    });
  }

  test(`${formato}: RevPAR e leitos média recusam valores malformados`, () => {
    assert.equal(
      api.calcularRevpar({ diariaMedia: 405, taxaOcupacao: '70' }).motivo,
      'entrada_invalida',
    );
    assert.equal(
      api.calcularRevpar({ diariaMedia: '405', taxaOcupacao: '170' }).motivo,
      'entrada_invalida',
    );
    assert.equal(
      api.calcularLeitosMedia({
        uhs: 2,
        leitosMinimoPorUh: '5',
        leitosMaximoPorUh: 4,
      }).motivo,
      'entrada_invalida',
    );
  });
}

test('parâmetros são hipóteses registradas na massa, nunca valores fixos no código', () => {
  assert.deepEqual(
    massa.parametros.map((parametro) => parametro.chave),
    esm.PARAMETROS_INDICADORES.map((parametro) => parametro.chave),
  );
  for (const parametro of [
    ...massa.parametros,
    ...esm.PARAMETROS_INDICADORES,
  ]) {
    assert.equal(parametro.situacao, 'hipotese_pendente_homologacao');
  }
  assert.equal(esm.INDICADORES_SITUACAO_METODOLOGIA, 'pendente_homologacao');
  assert.equal(massa.metadata.ficticio, true);

  const pasta = new URL('../../src/indicadores/', import.meta.url);
  for (const arquivo of readdirSync(pasta)) {
    const fonte = readFileSync(new URL(arquivo, pasta), 'utf8');
    assert.doesNotMatch(fonte, /15[.,]15|0?[.,]8485|80[.,]99/, arquivo);
  }
});
