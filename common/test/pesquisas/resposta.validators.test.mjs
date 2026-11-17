import assert from 'node:assert/strict';
import test from 'node:test';
import {
  campoPergunta,
  conferirItensResposta,
  isFormularioResposta,
  validarEnvioResposta,
} from '@ssc0536/common';

const PERGUNTAS = [
  {
    id: 10,
    periodoId: 1,
    chave: 'ocupacao',
    rotulo: 'Ocupação (%)',
    tipoValor: 'percentual',
    obrigatorio: true,
    opcoes: null,
  },
  {
    id: 11,
    periodoId: 1,
    chave: 'canal',
    rotulo: 'Canal principal',
    tipoValor: 'escolha',
    obrigatorio: false,
    opcoes: [
      { chave: 'direto', rotulo: 'Direto' },
      { chave: 'agencia', rotulo: 'Agência' },
    ],
  },
  {
    id: 12,
    periodoId: 1,
    chave: 'obs',
    rotulo: 'Observações',
    tipoValor: 'texto',
    obrigatorio: false,
    opcoes: null,
  },
];

test('envio aceita só itens com perguntaId inteiro único e valor texto', () => {
  assert.deepEqual(
    validarEnvioResposta({ itens: [{ perguntaId: 10, valor: '50' }] }),
    { valido: true, data: { itens: [{ perguntaId: 10, valor: '50' }] } },
  );
  const r = validarEnvioResposta({
    itens: [
      { perguntaId: 10, valor: 50 },
      { perguntaId: 11, valor: 'a' },
      { perguntaId: 11, valor: 'b' },
      { perguntaId: 0, valor: 'x' },
    ],
    empreendimentoId: 9,
  });
  assert.equal(r.valido, false);
  const campos = r.erros.map((e) => e.field).sort();
  assert.deepEqual(campos, [
    'empreendimentoId',
    'itens[3].perguntaId',
    'perguntas.10',
    'perguntas.11',
  ]);
  assert.equal(validarEnvioResposta([]).valido, false);
});

test('normaliza percentual, escolha e texto; vazio opcional não gera item', () => {
  const r = conferirItensResposta(PERGUNTAS, [
    { perguntaId: 10, valor: ' 72,50 ' },
    { perguntaId: 11, valor: 'agencia' },
    { perguntaId: 12, valor: '  ' },
  ]);
  assert.deepEqual(r, {
    valido: true,
    data: [
      { perguntaId: 10, valorNumerico: '72.5', valorTexto: null },
      { perguntaId: 11, valorNumerico: null, valorTexto: 'agencia' },
    ],
  });
});

test('rejeita pergunta alheia, obrigatória vazia, percentual e opção inválidos', () => {
  const r = conferirItensResposta(PERGUNTAS, [
    { perguntaId: 99, valor: '1' },
    { perguntaId: 11, valor: 'telefone' },
  ]);
  assert.equal(r.valido, false);
  const porCampo = Object.fromEntries(r.erros.map((e) => [e.field, e.message]));
  assert.match(porCampo[campoPergunta(99)], /não pertence/);
  assert.match(porCampo[campoPergunta(10)], /obrigatória/);
  assert.match(porCampo[campoPergunta(11)], /opções/);
  for (const valor of ['100.01', '-1', '0.5%', 'abc', '1e2']) {
    const x = conferirItensResposta(PERGUNTAS, [{ perguntaId: 10, valor }]);
    assert.equal(x.valido, false, valor);
  }
  for (const [valor, canonico] of [
    ['0', '0'],
    ['100', '100'],
    ['0.5', '0.5'],
  ]) {
    const x = conferirItensResposta(PERGUNTAS, [{ perguntaId: 10, valor }]);
    assert.equal(x.data[0].valorNumerico, canonico);
  }
});

test('guarda do formulário confere perguntas, opções e resposta', () => {
  const base = {
    pesquisaId: 1,
    titulo: 'Expectativa',
    tipoColeta: 'expectativa',
    abertura: '2026-11-01T03:00:00.000Z',
    prazo: '2026-11-11T03:00:00.000Z',
    situacao: 'recebendo',
    periodos: [],
    perguntas: PERGUNTAS,
    resposta: null,
  };
  assert.equal(isFormularioResposta(base), true);
  assert.equal(
    isFormularioResposta({
      ...base,
      resposta: {
        id: 1,
        respondidaEm: '2026-11-02T10:00:00.000Z',
        atualizadaEm: null,
        canal: 'sistema',
        itens: [{ perguntaId: 10, valor: '50' }],
      },
    }),
    true,
  );
  assert.equal(isFormularioResposta({ ...base, situacao: 'x' }), false);
  assert.equal(
    isFormularioResposta({
      ...base,
      perguntas: [{ ...PERGUNTAS[1], opcoes: [{ chave: 1 }] }],
    }),
    false,
  );
});
