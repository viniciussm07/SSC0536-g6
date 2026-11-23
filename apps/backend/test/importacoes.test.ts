import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LIMITES_IMPORTACAO, normalizarNomeArquivo } from '@ssc0536/common';
import { lerTabulacaoConsolidado } from '../src/importacoes/tabulacao-consolidado.parser';
import { ErroLeitura, lerXlsx } from '../src/importacoes/xlsx.leitor';
import {
  abasReferenciaTeste,
  construirXlsx,
  tabulacaoFicticia,
  type AbaTeste,
  type CelulaTeste,
} from './xlsx-teste';

const ler = (abas: AbaTeste[], extras?: Record<string, string>) =>
  lerTabulacaoConsolidado(lerXlsx(construirXlsx(abas, extras)));
const codigos = (r: ReturnType<typeof ler>) =>
  r.ocorrencias.map((o) => o.codigo);
const erroDe = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof ErroLeitura, String(e));
    return e;
  }
  assert.fail('esperava ErroLeitura');
};

describe('Tabulação Consolidado: entradas válidas', () => {
  it('lê período, diárias e ocupações com escala explícita e ignora colunas calculadas', () => {
    const r = ler([
      tabulacaoFicticia([
        { nome: 'Hotel Fictício Alfa', ocupacao: { v: 0.755, pct: true } },
        { nome: 'Pousada Fictícia Beta', ocupacao: '50,5%' },
        { nome: 'Resort Fictício Gama', ocupacao: { v: 0, pct: true } },
      ]),
      ...abasReferenciaTeste(),
    ]);
    assert.equal(
      r.resumo.rotuloPeriodo,
      'TAXA OCUPAÇÃO – CONSOLIDADA CARNAVAL 2026',
    );
    assert.equal(r.resumo.diarias, 5);
    assert.equal(r.resumo.linhasEntrada, 3);
    assert.equal(r.resumo.linhasVaziasIgnoradas, 37);
    assert.equal(r.ocorrencias.length, 0);
    const entradas = r.linhas.filter((l) => l.tipo === 'entrada');
    assert.deepEqual(
      entradas.map((l) => l.canonico),
      [
        { nomeInformado: 'Hotel Fictício Alfa', ocupacaoPercentual: '75.5' },
        { nomeInformado: 'Pousada Fictícia Beta', ocupacaoPercentual: '50.5' },
        { nomeInformado: 'Resort Fictício Gama', ocupacaoPercentual: '0' },
      ],
    );
    // Zero informado é valor; célula L5 original preservada na linha bruta.
    assert.equal(entradas[0].celulas.L.bruto, '0.755');
    assert.equal(entradas[0].celulas.L.formatoPercentual, true);
    // Nada das colunas G e M (calculadas) vai para as linhas.
    assert.ok(
      r.linhas.every((l) => !('G' in l.celulas && l.tipo === 'entrada')),
    );
    assert.deepEqual(
      r.resumo.abas.map((a) => [a.nome, a.situacao]),
      [
        ['TABULAÇÃO', 'lida'],
        ['MH', 'ignorada'],
        ['ACUMULADO', 'ignorada'],
      ],
    );
  });

  it('remove ruído binário de ponto flutuante sem arredondar valores reais', () => {
    const r = ler([
      tabulacaoFicticia([
        { nome: 'A', ocupacao: { v: 0.7500000000000001, pct: true } },
      ]),
    ]);
    assert.equal(
      r.linhas.find((l) => l.tipo === 'entrada')!.canonico!.ocupacaoPercentual,
      '75',
    );
  });
});

describe('Tabulação Consolidado: valores ambíguos e inválidos', () => {
  const valor = (ocupacao: CelulaTeste | undefined) =>
    ler([tabulacaoFicticia([{ nome: 'Hotel Fictício', ocupacao }])]);

  it('número sem formato de porcentagem é ambíguo, nunca aceito por acaso', () => {
    for (const v of [0.75, 75, 1])
      assert.deepEqual(codigos(valor(v)), ['ESCALA_AMBIGUA'], String(v));
    assert.equal(
      valor(0.75).linhas.find((l) => l.tipo === 'entrada')!.canonico,
      null,
    );
  });

  it('texto sem % é ambíguo e valores fora de 0–100 são inválidos', () => {
    assert.deepEqual(codigos(valor('75')), ['ESCALA_AMBIGUA']);
    assert.deepEqual(codigos(valor('abc')), ['ESCALA_AMBIGUA']);
    assert.deepEqual(codigos(valor('150%')), ['VALOR_INVALIDO']);
    assert.deepEqual(codigos(valor({ v: 1.5, pct: true })), ['VALOR_INVALIDO']);
    assert.deepEqual(codigos(valor('1.250%')), ['VALOR_INVALIDO']);
  });

  it('fórmula sem valor guardado e erro de célula viram erro acionável', () => {
    assert.deepEqual(codigos(valor({ f: 'A1*2' })), ['FORMULA_SEM_VALOR']);
    assert.deepEqual(codigos(valor({ t: 'e', v: '#DIV/0!' })), [
      'VALOR_DE_ERRO',
    ]);
    assert.deepEqual(codigos(valor({ t: 'b', v: 1 })), ['VALOR_INVALIDO']);
  });

  it('fórmula com valor guardado é lida sem recalcular, com aviso', () => {
    const r = valor({ f: 'SUM(A1:A2)', v: 0.6, pct: true });
    assert.deepEqual(codigos(r), ['FORMULA_EM_ENTRADA']);
    assert.equal(
      r.linhas.find((l) => l.tipo === 'entrada')!.canonico!.ocupacaoPercentual,
      '60',
    );
  });

  it('ausência de ocupação não vira zero; nome ausente e duplicado são sinalizados', () => {
    const r = ler([
      tabulacaoFicticia([
        { nome: 'Hotel Fictício' },
        { ocupacao: { v: 0.5, pct: true } },
        { nome: 'hotel  fictício', ocupacao: { v: 0.4, pct: true } },
      ]),
    ]);
    assert.deepEqual(codigos(r), [
      'OCUPACAO_AUSENTE',
      'NOME_AUSENTE',
      'NOME_DUPLICADO',
    ]);
    const [a, b, c] = r.linhas.filter((l) => l.tipo === 'entrada');
    assert.deepEqual(a.canonico, {
      nomeInformado: 'Hotel Fictício',
      ocupacaoPercentual: null,
    });
    assert.equal(b.situacao, 'erro');
    assert.equal(c.situacao, 'aviso');
  });

  it('diárias e título do período inválidos são erros; planilha vazia avisa', () => {
    const r = ler([tabulacaoFicticia([], { G59: 'cinco', B2: '' })]);
    assert.deepEqual(codigos(r).sort(), [
      'DIARIAS_INVALIDAS',
      'PERIODO_AUSENTE',
      'SEM_DADOS',
    ]);
    assert.deepEqual(
      codigos(ler([tabulacaoFicticia([], { G59: 0 })])).includes(
        'DIARIAS_INVALIDAS',
      ),
      true,
    );
  });

  it('células mescladas nas colunas de entrada são recusadas', () => {
    const aba = tabulacaoFicticia([
      { nome: 'Hotel', ocupacao: { v: 0.5, pct: true } },
      { nome: 'Outro' },
    ]);
    aba.mesclas = ['C5:C6'];
    const r = ler([{ ...aba, celulas: { ...aba.celulas, C6: 'Mesclada' } }]);
    assert.ok(codigos(r).includes('LAYOUT_DESCONHECIDO'));
  });
});

describe('Tabulação Consolidado: layout e arquivo', () => {
  it('aba ausente e cabeçalho alterado são detectados explicitamente', () => {
    const semAba = erroDe(() =>
      lerTabulacaoConsolidado(lerXlsx(construirXlsx(abasReferenciaTeste()))),
    );
    assert.equal(semAba.codigo, 'ABA_AUSENTE');
    const alterado = tabulacaoFicticia([], { L4: '% OCUPAÇÃO NOVA' });
    assert.equal(erroDe(() => ler([alterado])).codigo, 'CABECALHO_ALTERADO');
    const semRotulo = tabulacaoFicticia([], { B59: 'OUTRA COISA' });
    assert.equal(erroDe(() => ler([semRotulo])).codigo, 'CABECALHO_ALTERADO');
  });

  it('formatos não homologados, macros, links externos e lixo são recusados', () => {
    assert.equal(
      erroDe(() => lerXlsx(Buffer.from('não sou planilha'))).codigo,
      'FORMATO_NAO_HOMOLOGADO',
    );
    assert.equal(
      erroDe(() => lerXlsx(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 1, 2, 3])))
        .codigo,
      'FORMATO_NAO_HOMOLOGADO',
    );
    const aba = [tabulacaoFicticia([])];
    assert.equal(
      erroDe(() => lerXlsx(construirXlsx(aba, { 'xl/vbaProject.bin': 'x' })))
        .codigo,
      'MACRO_PRESENTE',
    );
    assert.equal(
      erroDe(() =>
        lerXlsx(
          construirXlsx(aba, { 'xl/externalLinks/externalLink1.xml': '<x/>' }),
        ),
      ).codigo,
      'LINK_EXTERNO',
    );
    assert.equal(
      erroDe(() =>
        lerXlsx(
          construirXlsx(aba, {
            mimetype: 'application/vnd.oasis.opendocument.spreadsheet',
          }),
        ),
      ).codigo,
      'FORMATO_NAO_HOMOLOGADO',
    );
    const corrompido = Buffer.from(construirXlsx(aba));
    corrompido.fill(0x41, 40, 120);
    assert.ok(
      ['ARQUIVO_INVALIDO', 'FORMATO_NAO_HOMOLOGADO'].includes(
        erroDe(() => lerXlsx(corrompido)).codigo,
      ),
    );
  });

  it('limita o conteúdo descompactado e o tamanho de célula', () => {
    const grande = tabulacaoFicticia([], {
      B2: 'x'.repeat(LIMITES_IMPORTACAO.celulaMaximaCaracteres + 1),
    });
    assert.equal(
      erroDe(() => lerXlsx(construirXlsx([grande]))).codigo,
      'LIMITE_EXCEDIDO',
    );
    const bomba = construirXlsx([tabulacaoFicticia([])], {
      'xl/media/imagem.bin': 'a'.repeat(
        LIMITES_IMPORTACAO.descompactadoMaximoBytes + 1,
      ),
    });
    assert.equal(erroDe(() => lerXlsx(bomba)).codigo, 'LIMITE_EXCEDIDO');
  });

  it('é determinístico: repetir a leitura produz o mesmo resultado', () => {
    const pasta = construirXlsx([
      tabulacaoFicticia([{ nome: 'A', ocupacao: { v: 0.5, pct: true } }]),
    ]);
    assert.deepEqual(
      lerTabulacaoConsolidado(lerXlsx(pasta)),
      lerTabulacaoConsolidado(lerXlsx(pasta)),
    );
  });
});

describe('nome do arquivo', () => {
  it('aceita rótulo decodificado e recusa caminhos e controles', () => {
    assert.deepEqual(
      normalizarNomeArquivo(encodeURIComponent('Tabulação 2026.xlsx')),
      {
        valido: true,
        nome: 'Tabulação 2026.xlsx',
      },
    );
    for (const ruim of [
      undefined,
      '',
      '..%2Fx.xlsx',
      '%00x',
      '%E0%A4%A',
      'a'.repeat(300),
    ])
      assert.equal(normalizarNomeArquivo(ruim).valido, false, String(ruim));
  });
});
