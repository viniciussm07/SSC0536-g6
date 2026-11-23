import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLECOES,
  FONTES_IMPORTACAO,
  isFonteImportacao,
  isLinhaImportacaoLinha,
  isLoteImportacaoDetalhe,
  isLoteImportacaoLinha,
  isOcorrenciaImportacaoLinha,
  normalizarNomeArquivo,
} from '@ssc0536/common';

const lote = {
  id: 1,
  fonte: 'tabulacao_consolidado',
  nomeArquivo: 'a.xlsx',
  tamanhoBytes: 10,
  versaoParser: 'tabulacao-consolidado/1',
  estado: 'lido',
  criadoEm: '2026-11-22T12:00:00.000Z',
  lidoEm: null,
};

test('fontes e guardas de contrato da importação', () => {
  assert.deepEqual([...FONTES_IMPORTACAO], ['tabulacao_consolidado']);
  assert.equal(isFonteImportacao('tabulacao_consolidado'), true);
  assert.equal(isFonteImportacao('inventario'), false);
  assert.equal(isLoteImportacaoLinha(lote), true);
  assert.equal(isLoteImportacaoLinha({ ...lote, estado: 'pronto' }), false);
  assert.equal(isLoteImportacaoLinha({ ...lote, criadoEm: 'ontem' }), false);
  const detalhe = {
    ...lote,
    sha256: 'a'.repeat(64),
    destino: null,
    confirmacao: 'nao_confirmado',
    confirmadoEm: null,
    recalculoPendente: false,
    erroMensagem: null,
    resumo: null,
    totais: { linhas: 0, erros: 0, avisos: 0 },
  };
  assert.equal(isLoteImportacaoDetalhe(detalhe), true);
  assert.equal(isLoteImportacaoDetalhe({ ...detalhe, totais: {} }), false);
  assert.equal(
    isLinhaImportacaoLinha({
      id: 1,
      aba: 'A',
      linha: 5,
      tipo: 'entrada',
      situacao: 'valida',
      celulas: {},
      canonico: null,
    }),
    true,
  );
  assert.equal(
    isOcorrenciaImportacaoLinha({
      id: 1,
      aba: null,
      linha: null,
      coluna: null,
      severidade: 'erro',
      codigo: 'X',
      mensagem: 'm',
      orientacao: 'o',
    }),
    true,
  );
});

test('nome do arquivo é rótulo de exibição, nunca caminho', () => {
  assert.deepEqual(
    normalizarNomeArquivo(encodeURIComponent('Tabulação.xlsx')),
    { valido: true, nome: 'Tabulação.xlsx' },
  );
  for (const ruim of [
    undefined,
    '  ',
    '..',
    '%2E%2E',
    'a%2Fb.xlsx',
    '%00',
    'a'.repeat(256),
  ])
    assert.equal(normalizarNomeArquivo(ruim).valido, false, String(ruim));
});

test('coleções de importação usam o recurso de acesso importacoes', () => {
  for (const c of [
    COLECOES.importacoes,
    COLECOES.linhasImportacao,
    COLECOES.ocorrenciasImportacao,
  ])
    assert.equal(c.recursoAcesso, 'importacoes');
  assert.equal(COLECOES.linhasImportacao.caminho, '/importacoes/:id/linhas');
});

test('entradas de conciliação: destino, decisão, conflito e confirmação', async () => {
  const c = await import('@ssc0536/common');
  assert.deepEqual(c.validarEntradaDestino({ pesquisaId: 3, perguntaId: 9 }), {
    valido: true,
    data: { pesquisaId: 3, perguntaId: 9 },
  });
  for (const ruim of [
    null,
    [],
    {},
    { pesquisaId: 0, perguntaId: 1 },
    { pesquisaId: 1, perguntaId: '2' },
    { pesquisaId: 1, perguntaId: 2, x: 1 },
  ])
    assert.equal(
      c.validarEntradaDestino(ruim).valido,
      false,
      JSON.stringify(ruim),
    );
  assert.deepEqual(
    c.validarEntradaDecisao({ tipo: 'vincular', empreendimentoId: 5 }).data,
    { tipo: 'vincular', empreendimentoId: 5 },
  );
  assert.deepEqual(
    c.validarEntradaDecisao({ tipo: 'rejeitar', motivo: '  fora  ' }).data,
    { tipo: 'rejeitar', motivo: 'fora' },
  );
  assert.deepEqual(
    c.validarEntradaDecisao({ tipo: 'rejeitar', motivo: '   ' }).data,
    { tipo: 'rejeitar' },
  );
  for (const ruim of [
    { tipo: 'vincular' },
    { tipo: 'vincular', empreendimentoId: 1.5 },
    { tipo: 'vincular', empreendimentoId: 1, motivo: 'x' },
    { tipo: 'rejeitar', motivo: 'x'.repeat(501) },
    { tipo: 'apagar' },
    'x',
  ])
    assert.equal(
      c.validarEntradaDecisao(ruim).valido,
      false,
      JSON.stringify(ruim),
    );
  assert.equal(
    c.validarEntradaConflito({ resolucao: 'substituir' }).valido,
    true,
  );
  assert.equal(c.validarEntradaConflito({ resolucao: 'fundir' }).valido, false);
  assert.deepEqual(
    c.validarEntradaConfirmacao({ novos: 2, atualizados: 0 }).data,
    { novos: 2, atualizados: 0 },
  );
  for (const ruim of [
    { novos: -1, atualizados: 0 },
    { novos: 1 },
    { novos: 1, atualizados: 1.5 },
    { novos: 1, atualizados: 0, a: 1 },
  ])
    assert.equal(
      c.validarEntradaConfirmacao(ruim).valido,
      false,
      JSON.stringify(ruim),
    );
});

test('as sete situações do plano e os motivos são contratos estáveis', async () => {
  const c = await import('@ssc0536/common');
  assert.deepEqual(
    [...c.SITUACOES_PLANO],
    [
      'novo',
      'atualizar',
      'sem_mudanca',
      'conflito',
      'rejeitado',
      'pendente',
      'aplicado',
    ],
  );
  assert.ok(c.MOTIVOS_PLANO.includes('SEM_CORRESPONDENCIA'));
  assert.equal(c.CANAL_RESPOSTA_IMPORTACAO, 'importacao');
  const totais = {
    lidas: 0,
    novos: 0,
    atualizados: 0,
    semMudanca: 0,
    conflitos: 0,
    rejeitados: 0,
    pendentes: 0,
    aplicados: 0,
  };
  assert.equal(
    c.isPlanoImportacao({
      loteId: 1,
      confirmacao: 'parcial',
      avisos: [],
      podeConfirmar: false,
      totais,
      itens: [],
    }),
    true,
  );
  assert.equal(
    c.isPlanoImportacao({
      loteId: 1,
      confirmacao: 'x',
      avisos: [],
      podeConfirmar: false,
      totais,
      itens: [],
    }),
    false,
  );
  assert.equal(
    c.isResultadoConfirmacao({
      confirmacao: 'concluido',
      criadas: 1,
      atualizadas: 0,
      semMudanca: 0,
      pendentes: 0,
      conflitos: 0,
      rejeitadas: 0,
      recalculoPendente: true,
    }),
    true,
  );
});
