import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chaveNome, chaveNomeSql } from '../src/cadastro/duplicidade';

describe('Chave de comparação de nomes (duplicidade)', () => {
  it('ignora acentos, caixa, pontuação e espaços repetidos', () => {
    const chave = chaveNome('Hotel Fictício Gama');
    assert.equal(chave, 'hotel ficticio gama');
    for (const igual of [
      'HOTEL FICTICIO GAMA',
      '  hotel   fictício-gama  ',
      'Hotel, Fictício. Gama!',
      'hotel ficticio gama',
    ])
      assert.equal(chaveNome(igual), chave, igual);
  });
  it('nomes apenas parecidos têm chaves diferentes', () => {
    assert.notEqual(
      chaveNome('Hotel Fictício Gama'),
      chaveNome('Hotel Fictício Gama II'),
    );
    assert.notEqual(chaveNome('Alfa'), chaveNome('Alfa Plus'));
  });
  it('cobre os acentos do português e nome sem letras vira chave vazia', () => {
    assert.equal(
      chaveNome('ÁÀÂÃÄ ÉÈÊË ÍÌÎÏ ÓÒÔÕÖ ÚÙÛÜ Ç'),
      'aaaaa eeee iiii ooooo uuuu c',
    );
    assert.equal(chaveNome('---'), '');
  });
  it('a versão SQL usa o mesmo mapeamento e coluna indicada', () => {
    const sql = chaveNomeSql('nome_fantasia');
    assert.match(sql, /translate\(nome_fantasia, '[^']+', '[^']+'\)/);
    const [, de, para] = sql.match(
      /translate\(nome_fantasia, '([^']+)', '([^']+)'\)/,
    )!;
    assert.equal([...de].length, [...para].length);
  });
});
