import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLECOES,
  caminhoColecao,
  colunasCsv,
  definirColecao,
} from '@ssc0536/common';
test('coleções compartilham caminhos, projeção pública e capacidade de exportação', () => {
  assert.equal(
    caminhoColecao(COLECOES.contatos, { id: 12 }),
    '/empreendimentos/12/contatos',
  );
  assert.throws(() => caminhoColecao(COLECOES.contatos), /Parâmetro ausente/);
  assert.equal(
    caminhoColecao(COLECOES.contatos, { id: 'a/b' }),
    '/empreendimentos/a%2Fb/contatos',
  );
  assert.ok(
    colunasCsv(COLECOES.empreendimentos).every(
      (c) => !['identificacao', 'pendencia', 'senha'].includes(c.campo),
    ),
  );
  assert.equal(
    colunasCsv(COLECOES.empreendimentos)[1].rotulo,
    'Empreendimento',
  );
  assert.throws(() =>
    definirColecao({
      ...COLECOES.contatos,
      exportacao: { colunas: [{ campo: 'senha', rotulo: 'Senha' }] },
    }),
  );
  assert.equal(
    definirColecao({ ...COLECOES.contatos, exportacao: false }).exportacao,
    false,
  );
});
