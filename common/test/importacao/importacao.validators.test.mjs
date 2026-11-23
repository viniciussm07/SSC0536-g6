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
