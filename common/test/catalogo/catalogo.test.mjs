import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');

const item = (id, extra = {}) => ({
  id,
  grupoId: 1,
  chave: `fixture.item${id}`,
  rotulo: `Item ${id}`,
  exclusivo: false,
  outro: false,
  aceitaQuantidade: false,
  ordem: id,
  ativo: true,
  versao: 1,
  ...extra,
});
const grupo = (id, itens, extra = {}) => ({
  id,
  segmentoId: 1,
  chave: `fixture.grupo${id}`,
  pergunta: `Pergunta ${id}?`,
  selecao: 'multipla',
  permiteOutro: true,
  secao: 'Seção',
  ordem: id,
  ativo: true,
  itens: itens.map((i) => ({ ...i, grupoId: id })),
  ...extra,
});
const campos = (r) => r.erros.map((e) => e.field).sort();

for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  const formulario = () => [
    grupo(1, [
      item(1),
      item(2, { exclusivo: true, rotulo: 'Não possui' }),
      item(3, { outro: true, rotulo: 'Outros' }),
      item(4, { aceitaQuantidade: true }),
      item(5, { ativo: false }),
    ]),
    grupo(2, [item(10), item(11)], { selecao: 'unica' }),
    grupo(3, [item(20)], { ativo: false }),
  ];
  const validar = (itens, opcoes) =>
    api.validarRespostasCatalogo(formulario(), itens, opcoes);

  test(`${formato}: respostas válidas preservam estados e não convertem desconhecido em não`, () => {
    const r = validar([
      { itemId: 1, estado: 'sim' },
      { itemId: 4, estado: 'sim', quantidade: 0 },
      { itemId: 10, estado: 'nao_informado' },
      { itemId: 11, estado: 'nao_se_aplica' },
    ]);
    assert.equal(r.valido, true);
    assert.deepEqual(
      r.data.map((x) => x.estado),
      ['sim', 'sim', 'nao_informado', 'nao_se_aplica'],
    );
    assert.equal(r.data[1].quantidade, 0);
    assert.equal(validar([]).valido, true);
  });

  test(`${formato}: item exclusivo não combina com outra opção marcada`, () => {
    const r = validar([
      { itemId: 2, estado: 'sim' },
      { itemId: 1, estado: 'sim' },
    ]);
    assert.deepEqual(campos(r), ['grupos.fixture.grupo1']);
    assert.match(r.erros[0].message, /Não possui/);
    // Exclusivo sim com os demais negados/desconhecidos é válido.
    assert.equal(
      validar([
        { itemId: 2, estado: 'sim' },
        { itemId: 1, estado: 'nao' },
        { itemId: 4, estado: 'nao_informado' },
      ]).valido,
      true,
    );
  });

  test(`${formato}: seleção única aceita no máximo um sim`, () => {
    assert.deepEqual(
      campos(
        validar([
          { itemId: 10, estado: 'sim' },
          { itemId: 11, estado: 'sim' },
        ]),
      ),
      ['grupos.fixture.grupo2'],
    );
    assert.equal(
      validar([
        { itemId: 10, estado: 'sim' },
        { itemId: 11, estado: 'nao' },
      ]).valido,
      true,
    );
  });

  test(`${formato}: "outro" exige detalhe; detalhe e quantidade só onde se aplicam`, () => {
    assert.deepEqual(campos(validar([{ itemId: 3, estado: 'sim' }])), [
      'itens[0].detalhe',
    ]);
    assert.equal(
      validar([{ itemId: 3, estado: 'sim', detalhe: ' Lavanderia ' }]).valido,
      true,
    );
    assert.deepEqual(
      campos(validar([{ itemId: 3, estado: 'nao', detalhe: 'x' }])),
      ['itens[0].detalhe'],
    );
    assert.deepEqual(
      campos(validar([{ itemId: 1, estado: 'sim', detalhe: 'x' }])),
      ['itens[0].detalhe'],
    );
    assert.deepEqual(
      campos(validar([{ itemId: 1, estado: 'sim', quantidade: 2 }])),
      ['itens[0].quantidade'],
    );
    for (const quantidade of [-1, 1.5, '2', Number.NaN])
      assert.deepEqual(
        campos(validar([{ itemId: 4, estado: 'sim', quantidade }])),
        ['itens[0].quantidade'],
        String(quantidade),
      );
    assert.deepEqual(
      campos(validar([{ itemId: 4, estado: 'nao', quantidade: 1 }])),
      ['itens[0].quantidade'],
    );
  });

  test(`${formato}: item desconhecido, repetido, estado inválido e campos extras são recusados`, () => {
    assert.deepEqual(campos(validar([{ itemId: 999, estado: 'sim' }])), [
      'itens[0].itemId',
    ]);
    assert.deepEqual(
      campos(
        validar([
          { itemId: 1, estado: 'sim' },
          { itemId: 1, estado: 'nao' },
        ]),
      ),
      ['itens[1].itemId'],
    );
    assert.deepEqual(campos(validar([{ itemId: 1, estado: 'talvez' }])), [
      'itens[0].estado',
    ]);
    assert.deepEqual(
      campos(validar([{ itemId: 1, estado: 'sim', extra: 1 }])),
      ['itens[0].extra'],
    );
    assert.deepEqual(campos(validar('x')), ['itens']);
    assert.deepEqual(campos(validar([null])), ['itens[0]']);
  });

  test(`${formato}: itens e grupos inativos não aceitam novas respostas, mas a leitura histórica sim`, () => {
    assert.deepEqual(campos(validar([{ itemId: 5, estado: 'sim' }])), [
      'itens[0].itemId',
    ]);
    assert.deepEqual(campos(validar([{ itemId: 20, estado: 'nao' }])), [
      'itens[0].itemId',
    ]);
    assert.equal(
      validar([{ itemId: 5, estado: 'sim' }], { somenteAtivos: false }).valido,
      true,
    );
  });

  test(`${formato}: entrada de grupo e item normaliza e valida chaves, tipos e contradições`, () => {
    const g = api.validarEntradaGrupoCatalogo({
      segmentoId: 1,
      chave: 'hospedagem.recepcao',
      pergunta: '  Recepção?  ',
      selecao: 'multipla',
      permiteOutro: true,
      secao: 'Recepção',
      ordem: 3,
    });
    assert.equal(g.valido, true);
    assert.equal(g.data.pergunta, 'Recepção?');
    assert.deepEqual(
      campos(
        api.validarEntradaGrupoCatalogo({
          segmentoId: 0,
          chave: 'Chave Inválida',
          pergunta: '',
          selecao: 'varias',
          ordem: -1,
          extra: true,
        }),
      ),
      [
        'chave',
        'extra',
        'ordem',
        'pergunta',
        'permiteOutro',
        'segmentoId',
        'selecao',
      ].sort(),
    );
    const base = {
      grupoId: 1,
      chave: 'hospedagem.recepcao.sanitario',
      rotulo: 'Sanitário',
      exclusivo: false,
      outro: false,
      aceitaQuantidade: false,
      ordem: 1,
    };
    assert.equal(api.validarEntradaItemCatalogo(base).valido, true);
    assert.deepEqual(
      campos(
        api.validarEntradaItemCatalogo({
          ...base,
          exclusivo: true,
          outro: true,
        }),
      ),
      ['exclusivo'],
    );
    assert.deepEqual(
      campos(
        api.validarEntradaItemCatalogo({
          ...base,
          exclusivo: true,
          aceitaQuantidade: true,
        }),
      ),
      ['aceitaQuantidade'],
    );
    assert.deepEqual(
      api
        .consistenciaItemFinal(
          { exclusivo: false, outro: true, aceitaQuantidade: false },
          false,
        )
        .map((e) => e.field),
      ['outro'],
    );
  });

  test(`${formato}: alteração parcial exige algum campo e ignora motivo isolado`, () => {
    assert.deepEqual(campos(api.validarAlteracaoItemCatalogo({})), ['corpo']);
    assert.deepEqual(
      campos(
        api.validarAlteracaoItemCatalogo({ motivo: 'Correção ortográfica' }),
      ),
      ['corpo'],
    );
    const r = api.validarAlteracaoItemCatalogo({
      rotulo: ' Sanitário PCD ',
      motivo: 'Padronização',
    });
    assert.deepEqual(r.data, {
      rotulo: 'Sanitário PCD',
      motivo: 'Padronização',
    });
    assert.deepEqual(
      campos(api.validarAlteracaoItemCatalogo({ ativo: 'sim' })),
      ['ativo'],
    );
    assert.equal(
      api.validarAlteracaoGrupoCatalogo({ ativo: false }).valido,
      true,
    );
    assert.deepEqual(
      campos(api.validarAlteracaoGrupoCatalogo({ selecao: 'unica' })),
      ['selecao'],
    );
  });

  test(`${formato}: guardas e esquemas OData do catálogo`, () => {
    assert.equal(
      api.isFormularioCatalogo({ segmentoId: 1, grupos: formulario() }),
      true,
    );
    assert.equal(
      api.isFormularioCatalogo({
        segmentoId: 1,
        grupos: [{ ...formulario()[0], selecao: 'x' }],
      }),
      false,
    );
    assert.equal(api.isVersaoItemCatalogo({ numero: 1 }), false);
    for (const nome of ['catalogoGrupos', 'catalogoItens', 'catalogoVersoes'])
      assert.ok(
        api.ESQUEMAS_ODATA[nome].campos.every((c) => c.filtravel),
        nome,
      );
    assert.ok(api.RECURSOS_ACESSO.includes('catalogos'));
    assert.equal(
      api.permissaoCompativel('gestor', {
        recurso: 'catalogos',
        acao: 'alterar',
        escopo: 'todos',
      }),
      false,
    );
    assert.equal(
      api.permissaoCompativel('administrador', {
        recurso: 'catalogos',
        acao: 'alterar',
        escopo: 'todos',
      }),
      true,
    );
  });
}
