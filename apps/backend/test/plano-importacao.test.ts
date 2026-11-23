import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chaveNome,
  decimalCanonico,
  planejar,
  type DecisaoPlano,
  type EntradaPlano,
  type LinhaPlano,
} from '../src/importacoes/plano';

const emps = new Map([
  [1, { id: 1, nomeFantasia: 'Hotel Fictício Alfa' }],
  [2, { id: 2, nomeFantasia: 'Pousada Fictícia Beta' }],
  [3, { id: 3, nomeFantasia: 'Resort Fictício Gama' }],
]);
const linha = (
  id: number,
  nome: string | null,
  ocupacao: string | null,
  leitura: LinhaPlano['situacaoLeitura'] = 'valida',
): LinhaPlano => ({
  id,
  linha: id + 4,
  situacaoLeitura: leitura,
  nomeInformado: nome,
  ocupacao,
});
const vincular = (
  empreendimentoId: number,
  conflito: DecisaoPlano['conflito'] = null,
): DecisaoPlano => ({
  tipo: 'vincular',
  empreendimentoId,
  conflito,
});
const base = (sobre: Partial<EntradaPlano> = {}): EntradaPlano => ({
  linhas: [],
  decisoes: new Map(),
  salvas: new Map(),
  empreendimentos: emps,
  publico: null,
  existentes: new Map(),
  aplicadas: new Map(),
  temDestino: true,
  candidatos: () => [],
  ...sobre,
});
const situacoes = (e: EntradaPlano) =>
  planejar(e).itens.map((i) => [i.situacao, i.motivo]);

describe('plano de importação: normalização', () => {
  it('chave de nome ignora acento, caixa e espaços; decimais ignoram zeros finais', () => {
    assert.equal(chaveNome('  Hotel   Fictício  Álfa '), 'HOTEL FICTICIO ALFA');
    assert.equal(decimalCanonico('75.50'), '75.5');
    assert.equal(decimalCanonico('80.0'), '80');
    assert.equal(decimalCanonico('100'), '100');
    assert.equal(decimalCanonico('0'), '0');
  });
});

describe('plano de importação: conciliação', () => {
  it('nome igual NUNCA vincula sozinho: fica pendente com sugestões', () => {
    const r = planejar(
      base({
        linhas: [linha(1, 'Hotel Fictício Alfa', '70')],
        candidatos: () => [
          {
            id: 1,
            nomeFantasia: 'Hotel Fictício Alfa',
            situacao: 'ativo',
            motivo: 'nome_igual',
          },
        ],
      }),
    );
    assert.equal(r.itens[0].situacao, 'pendente');
    assert.equal(r.itens[0].motivo, 'SEM_CORRESPONDENCIA');
    assert.equal(r.itens[0].empreendimento, null);
    assert.equal(r.itens[0].candidatos.length, 1);
  });

  it('decisão manual e correspondência salva vinculam; a decisão prevalece sobre a salva', () => {
    const linhas = [
      linha(1, 'Hotel Fictício Alfa', '70'),
      linha(2, 'Pousada Beta', '50'),
    ];
    const r = planejar(
      base({
        linhas,
        salvas: new Map([
          ['HOTEL FICTICIO ALFA', 1],
          ['POUSADA BETA', 2],
        ]),
        decisoes: new Map([[2, vincular(3)]]),
      }),
    );
    assert.deepEqual(
      r.itens.map((i) => [i.empreendimento?.id, i.origemDecisao]),
      [
        [1, 'correspondencia_salva'],
        [3, 'manual'],
      ],
    );
  });

  it('correspondência salva para empreendimento inexistente é ignorada', () => {
    const r = planejar(
      base({
        linhas: [linha(1, 'Fantasma', '10')],
        salvas: new Map([['FANTASMA', 99]]),
      }),
    );
    assert.equal(r.itens[0].situacao, 'pendente');
  });

  it('linhas com erro de leitura, sem ocupação ou rejeitadas ficam rejeitadas, nunca zero', () => {
    const e = base({
      linhas: [
        linha(1, 'A', null, 'erro'),
        linha(2, 'B', null, 'aviso'),
        linha(3, 'C', '10'),
      ],
      decisoes: new Map([
        [3, { tipo: 'rejeitar', empreendimentoId: null, conflito: null }],
      ]),
    });
    assert.deepEqual(situacoes(e), [
      ['rejeitado', 'ERRO_DE_LEITURA'],
      ['rejeitado', 'SEM_OCUPACAO'],
      ['rejeitado', 'REJEITADO_MANUALMENTE'],
    ]);
  });

  it('dois vínculos ao mesmo empreendimento no lote bloqueiam ambos', () => {
    const e = base({
      linhas: [linha(1, 'A', '10'), linha(2, 'A2', '20')],
      decisoes: new Map([
        [1, vincular(1)],
        [2, vincular(1)],
      ]),
    });
    assert.deepEqual(situacoes(e), [
      ['pendente', 'EMPREENDIMENTO_DUPLICADO_NO_LOTE'],
      ['pendente', 'EMPREENDIMENTO_DUPLICADO_NO_LOTE'],
    ]);
  });

  it('público congelado rejeita quem não faz parte; sem destino, vínculo fica pendente', () => {
    const decisoes = new Map([
      [1, vincular(1)],
      [2, vincular(2)],
    ]);
    const linhas = [linha(1, 'A', '10'), linha(2, 'B', '20')];
    assert.deepEqual(
      situacoes(base({ linhas, decisoes, publico: new Set([1]) })),
      [
        ['novo', null],
        ['rejeitado', 'FORA_DO_PUBLICO'],
      ],
    );
    assert.deepEqual(situacoes(base({ linhas, decisoes, temDestino: false })), [
      ['pendente', 'SEM_DESTINO'],
      ['pendente', 'SEM_DESTINO'],
    ]);
  });
});

describe('plano de importação: política de criação e conflito', () => {
  const um = (
    existente: string | null | undefined,
    conflito: DecisaoPlano['conflito'] = null,
  ) =>
    planejar(
      base({
        linhas: [linha(1, 'A', '75.5')],
        decisoes: new Map([[1, vincular(1, conflito)]]),
        existentes:
          existente === undefined ? new Map() : new Map([[1, existente]]),
      }),
    ).itens[0];

  it('sem resposta é novo; resposta sem o item acrescenta; mesmo valor não muda', () => {
    assert.equal(um(undefined).situacao, 'novo');
    assert.equal(um(null).situacao, 'atualizar');
    assert.equal(um('75.50').situacao, 'sem_mudanca');
    assert.equal(um('75.5').valorAtual, '75.5');
  });

  it('valor diferente é conflito até haver escolha explícita; ausência no arquivo não apaga nada', () => {
    const c = um('60');
    assert.equal(c.situacao, 'conflito');
    assert.equal(c.motivo, 'DIVERGE_DA_EXISTENTE');
    assert.equal(c.valorAtual, '60');
    assert.equal(um('60', 'substituir').situacao, 'atualizar');
    const manter = um('60', 'manter');
    assert.deepEqual(
      [manter.situacao, manter.motivo],
      ['rejeitado', 'MANTIDA_EXISTENTE'],
    );
    // Empreendimento sem linha no arquivo não aparece no plano: ausência não é exclusão.
    assert.equal(
      planejar(base({ linhas: [], existentes: new Map([[1, '60']]) })).itens
        .length,
      0,
    );
  });

  it('linhas já aplicadas ficam aplicadas e não são replanejadas', () => {
    const e = base({
      linhas: [linha(1, 'A', '10')],
      decisoes: new Map([[1, vincular(1)]]),
      aplicadas: new Map([[1, 'criar']]),
      existentes: new Map([[1, '10']]),
    });
    const [i] = planejar(e).itens;
    assert.deepEqual([i.situacao, i.acaoAplicada], ['aplicado', 'criar']);
  });

  it('os totais reconciliam: lidas = soma de todas as situações', () => {
    const e = base({
      linhas: [
        linha(1, 'A', '10'),
        linha(2, 'B', '20'),
        linha(3, 'C', '30'),
        linha(4, 'D', null),
        linha(5, 'E', '50', 'erro'),
        linha(6, 'F', '60'),
        linha(7, 'G', '70'),
      ],
      decisoes: new Map([
        [1, vincular(1)],
        [2, vincular(2)],
        [3, vincular(3)],
        [7, vincular(3)],
      ]),
      existentes: new Map([
        [2, '20'],
        [3, '99'],
      ]),
      aplicadas: new Map(),
    });
    const { totais: t } = planejar(e);
    assert.equal(
      t.lidas,
      t.novos +
        t.atualizados +
        t.semMudanca +
        t.conflitos +
        t.rejeitados +
        t.pendentes +
        t.aplicados,
    );
    assert.equal(t.lidas, 7);
  });

  it('é determinístico', () => {
    const e = base({
      linhas: [linha(1, 'A', '10')],
      decisoes: new Map([[1, vincular(1)]]),
    });
    assert.deepEqual(planejar(e), planejar(e));
  });
});
