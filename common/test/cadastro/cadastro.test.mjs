import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');

const base = {
  nomeFantasia: '  Hotel Fictício Gama  ',
  situacao: 'ativo',
  segmentoIds: [900001],
};
const campos = (r) => r.erros.map((e) => e.field).sort();

for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  const criar = (extra = {}) =>
    api.validarEntradaEmpreendimento({ ...base, ...extra }, 'criar');

  test(`${formato}: criação mínima normaliza texto e aceita cadastro parcial sem CNPJ`, () => {
    const r = criar();
    assert.equal(r.valido, true);
    assert.deepEqual(r.data, {
      nomeFantasia: 'Hotel Fictício Gama',
      situacao: 'ativo',
      segmentoIds: [900001],
    });
    assert.equal('cnpj' in r.data, false);
  });

  test(`${formato}: exige nome, situação e ao menos um segmento; rejeita campo desconhecido`, () => {
    const r = api.validarEntradaEmpreendimento(
      { usuarioId: 1, nomeFantasia: ' ', segmentoIds: [] },
      'criar',
    );
    assert.equal(r.valido, false);
    assert.deepEqual(campos(r), [
      'nomeFantasia',
      'segmentoIds',
      'situacao',
      'usuarioId',
    ]);
    assert.equal(api.validarEntradaEmpreendimento('x', 'criar').valido, false);
    assert.equal(api.validarEntradaEmpreendimento([], 'alterar').valido, false);
  });

  test(`${formato}: CNPJ aceita máscara, guarda 14 dígitos e distingue omitido de null`, () => {
    assert.equal(
      criar({ cnpj: '11.222.333/0001-81' }).data.cnpj,
      '11222333000181',
    );
    assert.equal(criar({ cnpj: null }).data.cnpj, null);
    for (const ruim of ['123', '1122233300018', 'abc', '11222333000181x', 5])
      assert.deepEqual(campos(criar({ cnpj: ruim })), ['cnpj']);
    const alterar = api.validarEntradaEmpreendimento({ cnpj: null }, 'alterar');
    assert.deepEqual(alterar.data, { cnpj: null });
  });

  test(`${formato}: texto vazio é erro; null limpa; omitido não altera`, () => {
    assert.deepEqual(campos(criar({ razaoSocial: '  ' })), ['razaoSocial']);
    assert.equal(criar({ razaoSocial: null }).data.razaoSocial, null);
    assert.equal('razaoSocial' in criar().data, false);
    assert.deepEqual(campos(criar({ endereco: 'x'.repeat(301) })), [
      'endereco',
    ]);
  });

  test(`${formato}: atualização vazia é rejeitada e parcial só devolve o informado`, () => {
    assert.equal(api.validarEntradaEmpreendimento({}, 'alterar').valido, false);
    const r = api.validarEntradaEmpreendimento(
      { endereco: ' Rua A, 1 ' },
      'alterar',
    );
    assert.deepEqual(r.data, { endereco: 'Rua A, 1' });
  });

  test(`${formato}: datas civis reais, encerramento e coerência com a situação`, () => {
    assert.deepEqual(campos(criar({ dataInicioAtividades: '2026-02-30' })), [
      'dataInicioAtividades',
    ]);
    assert.deepEqual(campos(criar({ dataInicioAtividades: '01/02/2026' })), [
      'dataInicioAtividades',
    ]);
    assert.equal(criar({ dataInicioAtividades: '2024-02-29' }).valido, true);
    assert.deepEqual(campos(criar({ situacao: 'encerrado' })), [
      'dataEncerramento',
    ]);
    assert.equal(
      criar({ situacao: 'encerrado', dataEncerramento: '2026-09-30' }).valido,
      true,
    );
    assert.deepEqual(campos(criar({ dataEncerramento: '2026-09-30' })), [
      'dataEncerramento',
    ]);
    assert.deepEqual(
      campos(
        criar({
          situacao: 'encerrado',
          dataInicioAtividades: '2026-05-01',
          dataEncerramento: '2026-04-30',
        }),
      ),
      ['dataEncerramento'],
    );
  });

  test(`${formato}: coordenadas WGS84 validam limites e aceitam null`, () => {
    assert.deepEqual(
      criar({ localizacao: { longitude: -49.0, latitude: -20.0 } }).data
        .localizacao,
      { longitude: -49, latitude: -20 },
    );
    assert.equal(criar({ localizacao: null }).data.localizacao, null);
    for (const ruim of [
      { longitude: 181, latitude: 0 },
      { longitude: 0, latitude: -91 },
      { longitude: '1', latitude: 0 },
      { longitude: NaN, latitude: 0 },
      { longitude: 0 },
      'x',
    ])
      assert.equal(criar({ localizacao: ruim }).valido, false);
    assert.equal(
      criar({ localizacao: { longitude: 0, latitude: 0, altitude: 1 } }).valido,
      false,
    );
  });

  test(`${formato}: contatos validam tipo, valor e rejeitam esquemas perigosos`, () => {
    const contato = (valor, tipo) => ({ tipo, valor, finalidade: 'publico' });
    for (const [tipo, valor] of [
      ['email', 'contato@example.test'],
      ['telefone', '+55 (17) 99999-0000 ramal 12'.replace(' ramal 12', '')],
      ['site', 'https://example.test/pagina'],
      ['rede_social', 'https://example.test/perfil'],
      ['rede_social', '@perfil_ficticio'],
    ])
      assert.equal(
        criar({ contatos: [contato(valor, tipo)] }).valido,
        true,
        `${tipo} ${valor}`,
      );
    for (const [tipo, valor] of [
      ['email', 'sem-arroba'],
      ['telefone', 'abc'],
      ['telefone', '12'],
      ['site', 'javascript:alert(1)'],
      ['site', 'ftp://example.test'],
      ['rede_social', 'javascript:alert(1)'],
    ])
      assert.equal(
        criar({ contatos: [contato(valor, tipo)] }).valido,
        false,
        `${tipo} ${valor}`,
      );
    const r = criar({
      contatos: [{ tipo: 'fax', valor: 'x', finalidade: 'oculto', extra: 1 }],
    });
    assert.deepEqual(campos(r), [
      'contatos[0].extra',
      'contatos[0].finalidade',
      'contatos[0].tipo',
      'contatos[0].valor',
    ]);
    assert.deepEqual(
      campos(
        criar({
          contatos: [
            { id: 1, ...contato('a@example.test', 'email') },
            { id: 1, ...contato('b@example.test', 'email') },
          ],
        }),
      ),
      ['contatos[1].id'],
    );
    assert.equal(
      criar({
        contatos: Array.from({ length: 21 }, () =>
          contato('a@example.test', 'email'),
        ),
      }).valido,
      false,
    );
  });

  test(`${formato}: Cadastur coerente com a situação e número como texto`, () => {
    const ok = (c) => criar({ cadastur: [c] }).valido;
    assert.equal(ok({ situacao: 'nao_possui' }), true);
    assert.equal(ok({ situacao: 'nao_possui', numero: '000123' }), false);
    assert.equal(
      ok({
        situacao: 'numero_proprio',
        numero: '000123-FIC',
        vencimento: '2027-01-31',
      }),
      true,
    );
    assert.equal(ok({ situacao: 'numero_proprio' }), false);
    assert.equal(ok({ situacao: 'igual_cnpj' }), true);
    assert.equal(ok({ situacao: 'igual_cnpj', numero: '1' }), false);
    assert.equal(ok({ situacao: 'talvez' }), false);
    assert.equal(
      criar({ cadastur: [{ situacao: 'numero_proprio', numero: '000123' }] })
        .data.cadastur[0].numero,
      '000123',
    );
  });

  test(`${formato}: segmentos sem repetição e IDs positivos`, () => {
    for (const ruim of [[], [1, 1], [0], [-1], ['1'], [1.5]])
      assert.equal(criar({ segmentoIds: ruim }).valido, false);
  });

  test(`${formato}: consistência do estado final e pendências informativas`, () => {
    const estado = {
      situacao: 'encerrado',
      cnpj: null,
      dataInicioAtividades: null,
      dataEncerramento: null,
      cadastur: [{ situacao: 'igual_cnpj' }],
    };
    assert.deepEqual(
      api
        .validarConsistenciaCadastro(estado)
        .map((e) => e.field)
        .sort(),
      ['cadastur', 'dataEncerramento'],
    );
    assert.deepEqual(
      api.validarConsistenciaCadastro({
        ...estado,
        situacao: 'ativo',
        cnpj: '11222333000181',
        cadastur: [],
      }),
      [],
    );
    assert.deepEqual(
      api.calcularPendencias({
        cnpj: null,
        razaoSocial: null,
        tipoHospedagem: null,
        categoriaIndicador: null,
        endereco: null,
        segmentos: 0,
        contatos: 0,
        cadastur: 0,
      }),
      [
        'sem_cnpj',
        'sem_razao_social',
        'sem_tipo_hospedagem',
        'sem_categoria_indicador',
        'sem_endereco',
        'sem_segmento',
        'sem_contato',
        'sem_cadastur',
      ],
    );
    assert.deepEqual(
      api.calcularPendencias({
        cnpj: '1',
        razaoSocial: 'x',
        tipoHospedagem: 'HOTEL',
        categoriaIndicador: 'hotel',
        endereco: 'x',
        segmentos: 1,
        contatos: 1,
        cadastur: 1,
      }),
      [],
    );
  });

  test(`${formato}: guardas do detalhe exigem null explícito e rejeitam valores inesperados`, () => {
    const detalhe = {
      id: 1,
      nomeFantasia: 'Hotel',
      cnpj: null,
      situacao: 'ativo',
      tipoHospedagem: null,
      pendencias: ['sem_cnpj'],
      razaoSocial: null,
      idOrigem: null,
      categoriaIndicador: null,
      endereco: null,
      zona: null,
      localizacao: null,
      dataInicioAtividades: null,
      dataEncerramento: null,
      segmentos: [{ id: 1, chave: 'x', nome: 'X', nivelCadastro: 'completo' }],
      contatos: [
        {
          id: 1,
          tipo: 'email',
          valor: 'a@example.test',
          finalidade: 'publico',
          responsavelNome: null,
          responsavelCargo: null,
        },
      ],
      cadastur: [
        { id: 1, situacao: 'nao_possui', numero: null, vencimento: null },
      ],
    };
    assert.equal(api.isEmpreendimentoDetalhe(detalhe), true);
    assert.equal(api.isEmpreendimentoListado(detalhe), true);
    const semZona = { ...detalhe };
    delete semZona.zona;
    assert.equal(api.isEmpreendimentoDetalhe(semZona), false);
    assert.equal(
      api.isEmpreendimentoDetalhe({ ...detalhe, pendencias: ['inventada'] }),
      false,
    );
    assert.equal(
      api.isEmpreendimentoDetalhe({
        ...detalhe,
        localizacao: { longitude: '1', latitude: 2 },
      }),
      false,
    );
  });
}
