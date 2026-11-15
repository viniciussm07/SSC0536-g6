import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GRUPOS_HOSPEDAGEM_V1,
  chavesCargaHospedagem,
} from '../src/catalogo/carga-hospedagem';

describe('Carga inicial do catálogo de hospedagem (dicionário técnico v1)', () => {
  it('chaves estáveis e únicas; rótulos repetidos não colidem entre grupos', () => {
    const chaves = chavesCargaHospedagem();
    assert.equal(new Set(chaves).size, chaves.length);
    assert.ok(
      chaves.every(
        (c) => /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(c) && c.length <= 120,
      ),
    );
    // "Não", "Outros" e "Sanitário PCD" aparecem em vários grupos e são itens distintos.
    assert.ok(chaves.includes('hospedagem.recepcao.nao'));
    assert.ok(chaves.includes('hospedagem.eventos.nao'));
    assert.ok(chaves.includes('hospedagem.recepcao.sanitario-pcd'));
    assert.ok(
      chaves.includes(
        'hospedagem.eventos.sanitario-pcd-exclusivo-area-de-eventos',
      ),
    );
  });

  it('cobre os cabeçalhos de serviços, equipamentos e acessibilidade sem inventar opções', () => {
    const itens = GRUPOS_HOSPEDAGEM_V1.reduce((n, g) => n + g.itens.length, 0);
    assert.equal(GRUPOS_HOSPEDAGEM_V1.length, 26);
    assert.equal(itens, 160); // uma opção por coluna AZ:HC
    // Reservas e formas de pagamento (AX:AY) não têm opções no cabeçalho: ficam de fora.
    assert.ok(
      !GRUPOS_HOSPEDAGEM_V1.some((g) => /reserva|pagamento/i.test(g.pergunta)),
    );
    assert.deepEqual(
      [...new Set(GRUPOS_HOSPEDAGEM_V1.map((g) => g.secao))],
      ['Serviços e equipamentos', 'Acessibilidade'],
    );
    // Grupos de seleção única são perguntas binárias; "Sim"/"Não" nunca são "outro".
    for (const g of GRUPOS_HOSPEDAGEM_V1.filter((x) => x.selecao === 'unica'))
      assert.ok(g.itens.length === 2, g.slug);
  });
});
