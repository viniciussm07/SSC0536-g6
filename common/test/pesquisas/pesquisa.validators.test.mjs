import assert from 'node:assert/strict';
import test from 'node:test';
import { validarEntradaModelo, validarAlteracaoModelo } from '@ssc0536/common';

const campoOcupacao = {
  chave: 'ocupacao',
  rotulo: 'Taxa de ocupação (%)',
  tipoValor: 'percentual',
  obrigatorio: true,
  ordem: 1,
  opcoes: [],
};
const campoPublico = {
  chave: 'publico',
  rotulo: 'Perfil do público',
  tipoValor: 'escolha',
  obrigatorio: false,
  ordem: 2,
  opcoes: [
    { chave: 'familias', rotulo: 'Famílias', ordem: 1 },
    { chave: 'congresso', rotulo: 'Congresso', ordem: 2 },
  ],
};

test('modelo canônico com campos e opções é aceito', () => {
  const r = validarEntradaModelo({
    nome: 'Pesquisa de ocupação',
    publicoAlvo: 'Meios de hospedagem',
    campos: [campoOcupacao, campoPublico],
  });
  assert.equal(r.valido, true);
});

test('chaves e ordens repetidas são recusadas', () => {
  const r = validarEntradaModelo({
    nome: 'Modelo inválido',
    publicoAlvo: 'Hospedagens',
    campos: [campoOcupacao, { ...campoOcupacao, rotulo: 'Outro rótulo' }],
  });
  assert.equal(r.valido, false);
  if (!r.valido) {
    const mensagens = r.erros.map((e) => `${e.field}:${e.message}`).join('|');
    assert.match(mensagens, /chave repetida/i);
    assert.match(mensagens, /ordem repetida/i);
  }
});

test('opções são obrigatórias só em campo de escolha e proibidas nos demais', () => {
  const semOpcoes = validarEntradaModelo({
    nome: 'Modelo',
    publicoAlvo: 'Hospedagens',
    campos: [{ ...campoPublico, opcoes: [] }],
  });
  assert.equal(semOpcoes.valido, false);
  const comOpcoesEmPercentual = validarEntradaModelo({
    nome: 'Modelo',
    publicoAlvo: 'Hospedagens',
    campos: [
      { ...campoOcupacao, opcoes: [{ chave: 'sim', rotulo: 'Sim', ordem: 1 }] },
    ],
  });
  assert.equal(comOpcoesEmPercentual.valido, false);
});

test('opções com chave repetida são recusadas', () => {
  const r = validarEntradaModelo({
    nome: 'Modelo',
    publicoAlvo: 'Hospedagens',
    campos: [
      {
        ...campoPublico,
        opcoes: [
          { chave: 'familias', rotulo: 'Famílias', ordem: 1 },
          { chave: 'familias', rotulo: 'Famílias de novo', ordem: 2 },
        ],
      },
    ],
  });
  assert.equal(r.valido, false);
  if (!r.valido) assert.match(r.erros[0].message, /repetida/i);
});

test('alteração parcial não exige o conjunto inteiro de campos', () => {
  const soNome = validarAlteracaoModelo({ nome: 'Novo nome' });
  assert.equal(soNome.valido, true);
  const comMotivo = validarAlteracaoModelo({
    campos: [campoOcupacao],
    motivo: 'Ajuste do formulário aprovado',
  });
  assert.equal(comMotivo.valido, true);
});

test('motivo fora dos limites é recusado', () => {
  const r = validarAlteracaoModelo({ motivo: 'x'.repeat(301) });
  assert.equal(r.valido, false);
  if (!r.valido) assert.equal(r.erros[0].field, 'motivo');
});

test('conjunto de campos vazio é recusado', () => {
  const r = validarEntradaModelo({
    nome: 'Modelo',
    publicoAlvo: 'Hospedagens',
    campos: [],
  });
  assert.equal(r.valido, false);
});
