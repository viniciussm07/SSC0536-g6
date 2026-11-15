import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');

const campos = (r) => r.erros.map((e) => e.field).sort();
const valor = (v) => ({ estado: 'informado', valor: v });
const vazio = (estado) => ({ estado, valor: null });
const capacidade = (extra = {}) => ({
  totalUh: valor(10),
  leitos: valor(20),
  maxLeitosPorUh: vazio('desconhecido'),
  uhsPcd: vazio('nao_se_aplica'),
  funcFixos: valor(0),
  funcTemporarios: vazio('desconhecido'),
  funciona24h: valor(false),
  checkin: valor('14:00'),
  checkout: valor('11:00'),
  ...extra,
});
const versao = (extra = {}) => ({
  id: 1,
  empreendimentoId: 10,
  vigenciaInicio: '2026-01-01',
  vigenciaFim: null,
  tipoAlteracao: 'mudanca_real',
  situacaoConferencia: 'parcial',
  motivo: null,
  criadaEm: '2026-01-01T12:00:00.000Z',
  autor: 'Pessoa fictícia',
  substituidaPorId: null,
  capacidade: capacidade(),
  itens: [],
  ...extra,
});

for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  test(`${formato}: datas civis somam e subtraem dias sem fuso, inclusive em virada de mês e ano bissexto`, () => {
    assert.equal(api.diaAnterior('2026-03-01'), '2026-02-28');
    assert.equal(api.diaAnterior('2028-03-01'), '2028-02-29');
    assert.equal(api.diaSeguinte('2026-12-31'), '2027-01-01');
    assert.equal(api.diaAnterior('2026-01-01'), '2025-12-31');
  });

  test(`${formato}: vigente na data usa fim inclusivo e fim nulo como aberto`, () => {
    const v = [
      { id: 1, inicio: '2026-01-01', fim: '2026-03-31' },
      { id: 2, inicio: '2026-04-01', fim: null },
    ];
    assert.equal(api.localizarVigente(v, '2026-03-31').id, 1);
    assert.equal(api.localizarVigente(v, '2026-04-01').id, 2);
    assert.equal(api.localizarVigente(v, '2099-01-01').id, 2);
    assert.equal(api.localizarVigente(v, '2025-12-31'), undefined);
  });

  test(`${formato}: mudança real em versão aberta fecha a anterior no dia anterior`, () => {
    const plano = api.planejarMudancaReal(
      [{ id: 1, inicio: '2026-01-01', fim: null }],
      '2026-04-01',
      null,
    );
    assert.deepEqual(plano, {
      valido: true,
      fechar: [{ id: 1, fim: '2026-03-31' }],
      fim: null,
    });
  });

  test(`${formato}: mudança no meio de uma versão fechada divide o intervalo e herda o fim`, () => {
    const plano = api.planejarMudancaReal(
      [{ id: 1, inicio: '2026-01-01', fim: '2026-06-30' }],
      '2026-03-15',
      null,
    );
    assert.deepEqual(plano, {
      valido: true,
      fechar: [{ id: 1, fim: '2026-03-14' }],
      fim: '2026-06-30',
    });
    // Fim diferente do da versão dividida abriria lacuna silenciosa.
    assert.deepEqual(
      campos(
        api.planejarMudancaReal(
          [{ id: 1, inicio: '2026-01-01', fim: '2026-06-30' }],
          '2026-03-15',
          '2026-04-30',
        ),
      ),
      ['vigenciaFim'],
    );
  });

  test(`${formato}: fronteira, mesmo dia de início e invasão da próxima versão`, () => {
    const v = [
      { id: 1, inicio: '2026-01-01', fim: '2026-03-31' },
      { id: 2, inicio: '2026-06-01', fim: null },
    ];
    // Começar no último dia (fim inclusivo) divide a versão 1.
    assert.deepEqual(api.planejarMudancaReal(v, '2026-03-31', null).fechar, [
      { id: 1, fim: '2026-03-30' },
    ]);
    // Começar no mesmo dia de uma versão existente é correção, não mudança real.
    assert.deepEqual(campos(api.planejarMudancaReal(v, '2026-01-01', null)), [
      'vigenciaInicio',
    ]);
    assert.deepEqual(campos(api.planejarMudancaReal(v, '2026-06-01', null)), [
      'vigenciaInicio',
    ]);
    // Em lacuna, vai até o dia anterior à próxima versão.
    const lacuna = api.planejarMudancaReal(v, '2026-04-10', null);
    assert.deepEqual(lacuna, { valido: true, fechar: [], fim: '2026-05-31' });
    assert.deepEqual(
      campos(api.planejarMudancaReal(v, '2026-04-10', '2026-06-01')),
      ['vigenciaFim'],
    );
    assert.equal(
      api.planejarMudancaReal(v, '2026-04-10', '2026-05-31').valido,
      true,
    );
    // Antes da primeira versão.
    assert.equal(
      api.planejarMudancaReal(v, '2025-01-01', null).fim,
      '2025-12-31',
    );
    assert.deepEqual(
      campos(api.planejarMudancaReal(v, '2026-04-10', '2026-04-09')),
      ['vigenciaFim'],
    );
  });

  test(`${formato}: correção exige versão existente não substituída e retroatividade usa a data de hoje`, () => {
    const v = [{ id: 7, inicio: '2026-01-01', fim: null }];
    assert.equal(api.planejarCorrecao(v, 7).valido, true);
    assert.deepEqual(campos(api.planejarCorrecao(v, 8)), ['corrigeId']);
    assert.equal(api.ehRetroativa('2026-01-01', '2026-01-02'), true);
    assert.equal(api.ehRetroativa('2026-01-02', '2026-01-02'), false);
  });

  test(`${formato}: entrada de mudança real valida datas e herda campos omitidos`, () => {
    const r = api.validarEntradaVersaoInventario({
      tipoAlteracao: 'mudanca_real',
      vigenciaInicio: '2026-04-01',
      capacidade: {
        totalUh: 12,
        leitos: null,
        uhsPcd: { estado: 'nao_se_aplica' },
        funcFixos: 0,
      },
      itens: [{ itemId: 1, estado: 'sim' }],
    });
    assert.equal(r.valido, true);
    assert.deepEqual(r.data.capacidade.totalUh, {
      estado: 'informado',
      valor: 12,
    });
    assert.deepEqual(r.data.capacidade.leitos, { estado: 'desconhecido' });
    assert.deepEqual(r.data.capacidade.uhsPcd, { estado: 'nao_se_aplica' });
    assert.deepEqual(r.data.capacidade.funcFixos, {
      estado: 'informado',
      valor: 0,
    });
    assert.deepEqual(r.data.capacidade.checkin, { estado: 'ausente' });
    assert.equal(r.data.itens.length, 1);
    for (const inicio of [undefined, '2026-02-30', '01/04/2026', 20260401])
      assert.deepEqual(
        campos(
          api.validarEntradaVersaoInventario({
            tipoAlteracao: 'mudanca_real',
            vigenciaInicio: inicio,
          }),
        ),
        ['vigenciaInicio'],
        String(inicio),
      );
    assert.deepEqual(
      campos(
        api.validarEntradaVersaoInventario({
          tipoAlteracao: 'mudanca_real',
          vigenciaInicio: '2026-04-01',
          vigenciaFim: '2026-13-01',
        }),
      ),
      ['vigenciaFim'],
    );
  });

  test(`${formato}: correção exige motivo e versão, e não aceita nova vigência`, () => {
    assert.deepEqual(
      campos(api.validarEntradaVersaoInventario({ tipoAlteracao: 'correcao' })),
      ['corrigeId', 'motivo'],
    );
    assert.deepEqual(
      campos(
        api.validarEntradaVersaoInventario({
          tipoAlteracao: 'correcao',
          corrigeId: 3,
          motivo: 'Digitação',
          vigenciaInicio: '2026-01-01',
        }),
      ),
      ['vigenciaInicio'],
    );
    const ok = api.validarEntradaVersaoInventario({
      tipoAlteracao: 'correcao',
      corrigeId: 3,
      motivo: '  Leitos digitados errado  ',
      capacidade: { leitos: 18 },
    });
    assert.equal(ok.valido, true);
    assert.equal(ok.data.motivo, 'Leitos digitados errado');
    assert.equal(ok.data.corrigeId, 3);
  });

  test(`${formato}: capacidade recusa valores inválidos, campos alheios e autoria no corpo`, () => {
    const r = api.validarEntradaVersaoInventario({
      tipoAlteracao: 'mudanca_real',
      vigenciaInicio: '2026-04-01',
      criadaPor: 99,
      capacidade: {
        totalUh: -1,
        leitos: '1,5',
        checkin: '25:00',
        funciona24h: 'talvez',
        camada: 1,
      },
    });
    assert.deepEqual(campos(r), [
      'capacidade.camada',
      'capacidade.checkin',
      'capacidade.funciona24h',
      'capacidade.leitos',
      'capacidade.totalUh',
      'criadaPor',
    ]);
    assert.deepEqual(campos(api.validarEntradaVersaoInventario([])), ['corpo']);
    assert.deepEqual(
      campos(api.validarEntradaVersaoInventario({ tipoAlteracao: 'x' })),
      ['tipoAlteracao'],
    );
  });

  test(`${formato}: conferência valida a situação; completo exige UH e leitos informados (zero conta)`, () => {
    assert.equal(
      api.validarEntradaConferenciaInventario({
        situacaoConferencia: 'completo',
        motivo: 'Conferido por telefone',
      }).valido,
      true,
    );
    assert.deepEqual(
      campos(
        api.validarEntradaConferenciaInventario({ situacaoConferencia: 'ok' }),
      ),
      ['situacaoConferencia'],
    );
    assert.equal(api.podeSerCompleta(capacidade()), true);
    assert.equal(
      api.podeSerCompleta(capacidade({ totalUh: valor(0), leitos: valor(0) })),
      true,
    );
    assert.equal(
      api.podeSerCompleta(capacidade({ leitos: vazio('desconhecido') })),
      false,
    );
    assert.equal(
      api.podeSerCompleta(capacidade({ totalUh: vazio('nao_se_aplica') })),
      false,
    );
  });

  test(`${formato}: diferenças distinguem zero, não se aplica e desconhecido e listam itens`, () => {
    const antes = versao({
      itens: [
        {
          itemId: 1,
          itemVersao: 1,
          rotulo: 'Item',
          pergunta: 'Pergunta?',
          estado: 'sim',
          detalhe: null,
          quantidade: null,
        },
        {
          itemId: 2,
          itemVersao: 1,
          rotulo: 'Item',
          pergunta: 'Pergunta?',
          estado: 'nao',
          detalhe: null,
          quantidade: null,
        },
        {
          itemId: 3,
          itemVersao: 1,
          rotulo: 'Item',
          pergunta: 'Pergunta?',
          estado: 'sim',
          detalhe: null,
          quantidade: null,
        },
      ],
    });
    const depois = versao({
      id: 2,
      vigenciaInicio: '2026-04-01',
      capacidade: capacidade({
        leitos: valor(0),
        uhsPcd: vazio('desconhecido'),
        funcTemporarios: vazio('desconhecido'),
      }),
      itens: [
        {
          itemId: 1,
          itemVersao: 1,
          rotulo: 'Item',
          pergunta: 'Pergunta?',
          estado: 'sim',
          detalhe: null,
          quantidade: null,
        },
        {
          itemId: 2,
          itemVersao: 1,
          rotulo: 'Item',
          pergunta: 'Pergunta?',
          estado: 'sim',
          detalhe: null,
          quantidade: null,
        },
        {
          itemId: 4,
          itemVersao: 1,
          rotulo: 'Item',
          pergunta: 'Pergunta?',
          estado: 'sim',
          detalhe: 'Lavanderia',
          quantidade: null,
        },
      ],
    });
    const d = api.compararVersoesInventario(antes, depois);
    assert.deepEqual(
      d.campos.map((c) => [c.campo, c.antes.estado, c.depois.estado]),
      [
        ['leitos', 'informado', 'informado'],
        ['uhsPcd', 'nao_se_aplica', 'desconhecido'],
      ],
    );
    assert.equal(d.campos[0].depois.valor, 0);
    assert.deepEqual(
      d.itens.map((i) => [i.itemId, i.tipo]),
      [
        [2, 'alterado'],
        [3, 'removido'],
        [4, 'adicionado'],
      ],
    );
    assert.deepEqual(d.vigencia, {
      antes: ['2026-01-01', null],
      depois: ['2026-04-01', null],
    });
    assert.deepEqual(api.compararVersoesInventario(antes, antes), {
      campos: [],
      itens: [],
      vigencia: null,
    });
  });

  test(`${formato}: guarda do detalhe exige estado coerente com o valor`, () => {
    assert.equal(api.isVersaoInventarioDetalhe(versao()), true);
    assert.equal(
      api.isVersaoInventarioDetalhe(
        versao({
          capacidade: capacidade({
            leitos: { estado: 'informado', valor: null },
          }),
        }),
      ),
      false,
    );
    assert.equal(
      api.isVersaoInventarioDetalhe(
        versao({
          capacidade: capacidade({
            leitos: { estado: 'desconhecido', valor: 3 },
          }),
        }),
      ),
      false,
    );
    assert.equal(
      api.isVersaoInventarioDetalhe(versao({ tipoAlteracao: 'x' })),
      false,
    );
    assert.equal(
      api.isVersaoInventarioDetalhe(versao({ criadaEm: 'ontem' })),
      false,
    );
    assert.ok(
      api.ESQUEMAS_ODATA.inventarios.campos.some(
        (c) => c.nome === 'substituidaPorId',
      ),
    );
  });
}
