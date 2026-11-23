import {
  normalizarPercentualColetado,
  type FonteImportacao,
  normalizarQuantidadeColetada,
  type CanonicoLinha,
  type CelulaBruta,
  type CodigoOcorrencia,
  type ResumoLeitura,
  type SeveridadeOcorrencia,
  type SituacaoLinhaImportacao,
  type TipoLinhaImportacao,
} from '@ssc0536/common';
import {
  colunaParaNumero,
  ErroLeitura,
  type CelulaXlsx,
  type PastaXlsx,
  type PlanilhaXlsx,
} from './xlsx.leitor';

/**
 * Mapeamento da aba `TABULAÇÃO` das planilhas de tabulação. Consolidado e Expectativa têm o mesmo
 * layout nas células lidas (conferido nos originais); diferem no título, nas diárias, nas abas de
 * referência e no significado: Consolidado é ocupação realizada, Expectativa é intenção declarada
 * para período futuro (não é previsão estatística).
 *
 * Mapeamento aprovado para a aba `TABULAÇÃO` da planilha "Tabulação de ocupação consolidada".
 * Só entradas primárias são lidas: título do período (B2), nome do meio de hospedagem (C),
 * % de ocupação (L) e quantidade de diárias (G59). Colunas calculadas, `MH` e `ACUMULADO`
 * são derivadas ou referência e não viram respostas.
 */
const ABA = 'TABULAÇÃO';
const PRIMEIRA_LINHA = 5;
const ULTIMA_LINHA = 44;
const LINHA_CABECALHO = 4;
const LINHA_TOTAL = 45;
const LINHA_DIARIAS = 59;
const MAXIMO_DIARIAS = 60;

const CABECALHOS: ReadonlyArray<[string, string]> = [
  ['B', 'CONTROLE'],
  ['C', 'MEIO DE HOSPEDAGEM'],
  ['G', 'QTDE DE UH'],
  ['L', '% TAXA DE OCUPAÇÃO'],
  ['M', 'TOTAL NÚMERO TURISTAS PERÍODO'],
];
const COLUNAS_CALCULADAS = ['G', 'H', 'I', 'J', 'K', 'M'];

interface ConfiguracaoFonte {
  /** Palavra que o título (B2) deve conter; evita enviar a planilha de um tipo como se fosse de outro. */
  tituloContem: RegExp;
  tituloNaoContem: RegExp;
  nomeTipo: string;
  abasReferencia: Readonly<Record<string, string>>;
}
const CONFIGURACOES: Readonly<Record<FonteImportacao, ConfiguracaoFonte>> = {
  tabulacao_consolidado: {
    tituloContem: /CONSOLIDAD/,
    tituloNaoContem: /EXPECTATIV/,
    nomeTipo: 'consolidada',
    abasReferencia: {
      MH: 'Capacidade de referência: conciliada com o inventário.',
      ACUMULADO: 'Resultados derivados; não são novas respostas.',
    },
  },
  tabulacao_expectativa: {
    tituloContem: /EXPECTATIV/,
    tituloNaoContem: /CONSOLIDAD/,
    nomeTipo: 'de expectativa',
    abasReferencia: {
      MH: 'Capacidade de referência: conciliada com o inventário.',
      'ACUMULADO MENSAL': 'Resultados derivados; não são novas respostas.',
      'CÁLCULO DA RECEITA ESTIMADA':
        'Receita estimada: fora desta etapa (usa vínculo externo e valores digitados).',
    },
  },
};

export interface LinhaLida {
  aba: string;
  linha: number;
  tipo: TipoLinhaImportacao;
  situacao: SituacaoLinhaImportacao;
  celulas: Record<string, CelulaBruta>;
  canonico: CanonicoLinha | null;
}
export interface OcorrenciaLida {
  aba: string | null;
  linha: number | null;
  coluna: string | null;
  severidade: SeveridadeOcorrencia;
  codigo: CodigoOcorrencia;
  mensagem: string;
  orientacao: string;
}
export interface ResultadoLeitura {
  resumo: ResumoLeitura;
  linhas: LinhaLida[];
  ocorrencias: OcorrenciaLida[];
}

const chave = (s: string) =>
  s.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
const semAcento = (s: string) =>
  chave(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
const bruta = ({
  bruto,
  tipo,
  formula,
  formatoPercentual,
}: CelulaXlsx): CelulaBruta => ({
  bruto,
  tipo,
  formula,
  formatoPercentual,
});

function naoAncora(aba: PlanilhaXlsx, coluna: string, linha: number): boolean {
  const c = colunaParaNumero(coluna);
  return aba.mesclas.some(
    (m) =>
      c >= m.c1 &&
      c <= m.c2 &&
      linha >= m.r1 &&
      linha <= m.r2 &&
      !(c === m.c1 && linha === m.r1),
  );
}

function conferirTipo(aba: PlanilhaXlsx, config: ConfiguracaoFonte) {
  const celula = aba.celulas.get('B2');
  const titulo = celula?.tipo === 'texto' ? chave(celula.bruto ?? '') : '';
  if (titulo === '') return; // título ausente é tratado como erro de período
  if (!config.tituloContem.test(titulo) || config.tituloNaoContem.test(titulo))
    throw new ErroLeitura(
      'TIPO_DIVERGENTE',
      `O título da planilha ("${(celula?.bruto ?? '').replace(/\s+/g, ' ').trim()}") não corresponde a uma tabulação ${config.nomeTipo}.`,
      `Escolha o tipo de planilha correspondente ao arquivo ou envie a tabulação ${config.nomeTipo}.`,
    );
}

function conferirLayout(aba: PlanilhaXlsx) {
  const divergencias: string[] = [];
  for (const [col, esperado] of CABECALHOS) {
    const cel = aba.celulas.get(`${col}${LINHA_CABECALHO}`);
    const lido = cel?.tipo === 'texto' ? chave(cel.bruto ?? '') : '';
    if (!lido.startsWith(chave(esperado)))
      divergencias.push(`${col}${LINHA_CABECALHO} (esperado "${esperado}")`);
  }
  const total = aba.celulas.get(`B${LINHA_TOTAL}`);
  if (!chave(total?.bruto ?? '').startsWith('TOTAL MH RESP'))
    divergencias.push(`B${LINHA_TOTAL} (esperado "TOTAL MH RESP.")`);
  const rotuloDiarias = aba.celulas.get(`B${LINHA_DIARIAS}`);
  if (
    !semAcento(rotuloDiarias?.bruto ?? '').startsWith('QUANTIDADE DE DIARIAS')
  )
    divergencias.push(
      `B${LINHA_DIARIAS} (esperado "QUANTIDADE DE DIÁRIAS...")`,
    );
  if (divergencias.length > 0)
    throw new ErroLeitura(
      'CABECALHO_ALTERADO',
      `O cabeçalho da aba ${ABA} difere do layout homologado: ${divergencias.join('; ')}.`,
      'Use a planilha oficial de tabulação consolidada sem inserir, mover ou renomear colunas e linhas de controle.',
    );
}

type Percentual =
  | { ok: true; valor: string; aviso?: OcorrenciaCampo }
  | { ok: false; ocorrencia: OcorrenciaCampo };
type OcorrenciaCampo = Pick<
  OcorrenciaLida,
  'codigo' | 'mensagem' | 'orientacao'
> & {
  severidade: SeveridadeOcorrencia;
};

const ESCALA_ORIENTACAO =
  'Formate a célula como porcentagem (ex.: 75%) ou digite o valor com o símbolo %.';

/** Decimais de ponto flutuante sem ruído binário, para números lidos do XML. */
const decimalDe = (bruto: string): string | undefined => {
  const n = Number(bruto);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
};

function lerOcupacao(celula: CelulaXlsx | undefined): Percentual | 'vazia' {
  if (!celula || (celula.tipo === 'vazio' && celula.formula === null))
    return 'vazia';
  let aviso: OcorrenciaCampo | undefined;
  if (celula.formula !== null) {
    if (celula.tipo === 'vazio')
      return {
        ok: false,
        ocorrencia: {
          severidade: 'erro',
          codigo: 'FORMULA_SEM_VALOR',
          mensagem: 'A célula tem fórmula sem valor calculado armazenado.',
          orientacao:
            'Abra a planilha, deixe o programa recalcular, salve e envie novamente, ou digite o valor.',
        },
      };
    aviso = {
      severidade: 'aviso',
      codigo: 'FORMULA_EM_ENTRADA',
      mensagem:
        'A ocupação vem de uma fórmula; foi lido o valor armazenado, sem recalcular.',
      orientacao:
        'Confirme o valor com o OTO; entradas devem ser digitadas, não calculadas.',
    };
  }
  if (celula.tipo === 'erro')
    return {
      ok: false,
      ocorrencia: {
        severidade: 'erro',
        codigo: 'VALOR_DE_ERRO',
        mensagem: `A célula contém o erro ${celula.bruto}.`,
        orientacao: 'Corrija a origem do erro na planilha e envie novamente.',
      },
    };
  let texto: string | undefined;
  let escala: 'fracao' | 'percentual' | undefined;
  if (celula.tipo === 'numero') {
    if (celula.formatoPercentual) {
      texto = decimalDe(celula.bruto ?? '');
      escala = 'fracao';
    }
  } else if (celula.tipo === 'texto') {
    const m = /^\s*([\d.,]+)\s*%\s*$/.exec(celula.bruto ?? '');
    if (m) {
      // "1.250%" pode ser milhar (pt-BR) ou decimal: nunca é aceito por acaso.
      if (/^\d*[.,]\d{3}$/.test(m[1]) || /[.,].*[.,]/.test(m[1]))
        return {
          ok: false,
          ocorrencia: {
            severidade: 'erro',
            codigo: 'VALOR_INVALIDO',
            mensagem: `O valor "${celula.bruto}" tem separador decimal ou de milhar ambíguo.`,
            orientacao:
              'Use um único separador decimal e, no máximo, duas casas, como 75,5%.',
          },
        };
      texto = m[1];
      escala = 'percentual';
    }
  } else
    return {
      ok: false,
      ocorrencia: {
        severidade: 'erro',
        codigo: 'VALOR_INVALIDO',
        mensagem: 'A ocupação deve ser um número em porcentagem.',
        orientacao: ESCALA_ORIENTACAO,
      },
    };
  if (escala === undefined)
    return {
      ok: false,
      ocorrencia: {
        severidade: 'erro',
        codigo: 'ESCALA_AMBIGUA',
        mensagem: `O valor "${celula.bruto}" não indica se está em fração (0 a 1) ou em porcentagem (0 a 100).`,
        orientacao: ESCALA_ORIENTACAO,
      },
    };
  const n = normalizarPercentualColetado(texto, escala);
  if (!n.valido || n.data.estado !== 'informado')
    return {
      ok: false,
      ocorrencia: {
        severidade: 'erro',
        codigo: 'VALOR_INVALIDO',
        mensagem: `O valor "${celula.bruto}" não é uma ocupação válida entre 0% e 100%.`,
        orientacao:
          'Informe um percentual de 0% a 100%, com ponto ou vírgula como separador decimal.',
      },
    };
  return { ok: true, valor: n.data.valor, aviso };
}

export function lerTabulacao(
  pasta: PastaXlsx,
  fonte: FonteImportacao,
): ResultadoLeitura {
  const config = CONFIGURACOES[fonte];
  const alvo = pasta.abas.find((a) => chave(a.nome) === chave(ABA));
  if (!alvo)
    throw new ErroLeitura(
      'ABA_AUSENTE',
      `A aba ${ABA} não foi encontrada. Abas presentes: ${pasta.abas.map((a) => a.nome).join(', ')}.`,
      'Envie a planilha oficial de tabulação consolidada, que contém a aba TABULAÇÃO.',
    );
  conferirLayout(alvo);
  conferirTipo(alvo, config);

  const linhas: LinhaLida[] = [];
  const ocorrencias: OcorrenciaLida[] = [];
  const registrar = (
    linha: number | null,
    coluna: string | null,
    o: OcorrenciaCampo,
  ) => ocorrencias.push({ aba: ABA, linha, coluna, ...o });
  const erro = (
    codigo: CodigoOcorrencia,
    mensagem: string,
    orientacao: string,
  ): OcorrenciaCampo => ({
    severidade: 'erro',
    codigo,
    mensagem,
    orientacao,
  });

  // Cabeçalho: rótulo do período. A identificação do período oficial é feita na parte 09.
  const titulo = alvo.celulas.get('B2');
  let rotuloPeriodo: string | null = null;
  if (titulo?.tipo === 'texto' && (titulo.bruto ?? '').trim() !== '') {
    rotuloPeriodo = (titulo.bruto ?? '').replace(/\s+/g, ' ').trim();
    linhas.push({
      aba: ABA,
      linha: 2,
      tipo: 'cabecalho',
      situacao: 'valida',
      celulas: { B: bruta(titulo) },
      canonico: { rotuloPeriodo },
    });
  } else
    registrar(
      2,
      'B',
      erro(
        'PERIODO_AUSENTE',
        'O título do período (B2) está vazio.',
        'Preencha o título da edição, como "TAXA OCUPAÇÃO – CONSOLIDADA CARNAVAL 2026".',
      ),
    );

  // Diárias do período.
  const dcel = alvo.celulas.get(`G${LINHA_DIARIAS}`);
  let diarias: number | null = null;
  if (dcel && dcel.tipo === 'numero' && /^\d+$/.test(dcel.bruto ?? '')) {
    const q = normalizarQuantidadeColetada(dcel.bruto);
    const valor =
      q.valido && q.data.estado === 'informado' ? Number(q.data.valor) : NaN;
    if (valor >= 1 && valor <= MAXIMO_DIARIAS) diarias = valor;
  }
  if (diarias === null)
    registrar(
      LINHA_DIARIAS,
      'G',
      erro(
        'DIARIAS_INVALIDAS',
        `A quantidade de diárias do período (G${LINHA_DIARIAS}) deve ser um inteiro de 1 a ${MAXIMO_DIARIAS}.`,
        'Informe os dias do período pesquisado como número inteiro.',
      ),
    );
  else
    linhas.push({
      aba: ABA,
      linha: LINHA_DIARIAS,
      tipo: 'cabecalho',
      situacao: 'valida',
      celulas: { G: bruta(dcel!) },
      canonico: { diarias },
    });

  // Linhas de meios de hospedagem.
  let vazias = 0;
  const vistos = new Map<string, number>();
  for (let n = PRIMEIRA_LINHA; n <= ULTIMA_LINHA; n++) {
    const nome = alvo.celulas.get(`C${n}`);
    const ocup = alvo.celulas.get(`L${n}`);
    const temNome =
      !!nome && nome.tipo !== 'vazio' && (nome.bruto ?? '').trim() !== '';
    const temOcup = !!ocup && (ocup.tipo !== 'vazio' || ocup.formula !== null);
    if (!temNome && !temOcup) {
      vazias += 1;
      continue;
    }
    const celulas: Record<string, CelulaBruta> = {};
    const controle = alvo.celulas.get(`A${n}`);
    if (controle) celulas.A = bruta(controle);
    if (nome) celulas.C = bruta(nome);
    if (ocup) celulas.L = bruta(ocup);
    const locais: OcorrenciaCampo[] = [];
    const colunas: Array<string | null> = [];
    const add = (c: string | null, o: OcorrenciaCampo) => {
      locais.push(o);
      colunas.push(c);
    };

    if (naoAncora(alvo, 'C', n) || naoAncora(alvo, 'L', n))
      add(
        'C',
        erro(
          'LAYOUT_DESCONHECIDO',
          'Há células mescladas nas colunas de entrada.',
          'Desfaça a mesclagem das colunas C e L.',
        ),
      );

    let nomeLido: string | null = null;
    if (temNome && nome!.tipo === 'texto') {
      nomeLido = nome!.bruto!.normalize('NFC').replace(/\s+/g, ' ').trim();
      const k = semAcento(nomeLido);
      const anterior = vistos.get(k);
      if (anterior !== undefined)
        add('C', {
          severidade: 'aviso',
          codigo: 'NOME_DUPLICADO',
          mensagem: `O nome já aparece na linha ${anterior}.`,
          orientacao:
            'Confirme se são empreendimentos distintos; a conciliação não presume identidade por nome.',
        });
      else vistos.set(k, n);
    } else if (temNome)
      add(
        'C',
        erro(
          'VALOR_INVALIDO',
          'O nome do meio de hospedagem deve ser texto.',
          'Digite o nome fantasia do empreendimento.',
        ),
      );
    else
      add(
        'C',
        erro(
          'NOME_AUSENTE',
          'Há ocupação informada sem o nome do meio de hospedagem.',
          'Preencha o nome do empreendimento na coluna C.',
        ),
      );

    let ocupacao: string | null = null;
    const o = lerOcupacao(ocup);
    if (o === 'vazia')
      add('L', {
        severidade: 'aviso',
        codigo: 'OCUPACAO_AUSENTE',
        mensagem:
          'Meio de hospedagem listado sem taxa de ocupação; ausência não é zero.',
        orientacao:
          'Informe 0% se a ocupação foi nula, ou deixe fora da lista se não respondeu.',
      });
    else if (!o.ok) add('L', o.ocorrencia);
    else {
      ocupacao = o.valor;
      if (o.aviso) add('L', o.aviso);
    }

    const comErro = locais.some((l) => l.severidade === 'erro');
    for (let i = 0; i < locais.length; i++) registrar(n, colunas[i], locais[i]);
    linhas.push({
      aba: ABA,
      linha: n,
      tipo: 'entrada',
      situacao: comErro ? 'erro' : locais.length > 0 ? 'aviso' : 'valida',
      celulas,
      canonico: comErro
        ? null
        : { nomeInformado: nomeLido, ocupacaoPercentual: ocupacao },
    });
  }

  if (pasta.vinculosExternos)
    registrar(null, null, {
      severidade: 'aviso',
      codigo: 'LINK_EXTERNO',
      mensagem:
        'O arquivo declara vínculos com planilhas externas. Eles não foram abertos nem seguidos; só valores armazenados foram lidos.',
      orientacao:
        'Confirme que as taxas de ocupação (coluna L) foram digitadas, não vindas de outra planilha.',
    });
  const entradas = linhas.filter((l) => l.tipo === 'entrada').length;
  if (entradas === 0)
    registrar(null, null, {
      severidade: 'aviso',
      codigo: 'SEM_DADOS',
      mensagem: 'Nenhuma linha de meio de hospedagem foi preenchida.',
      orientacao:
        'Confirme se o arquivo enviado é a planilha preenchida da edição.',
    });

  const resumo: ResumoLeitura = {
    rotuloPeriodo,
    diarias,
    abas: pasta.abas.map((a) => {
      if (a === alvo) return { nome: a.nome, situacao: 'lida' as const };
      const motivo = Object.entries(config.abasReferencia).find(
        ([nome]) => chave(nome) === chave(a.nome),
      )?.[1];
      return {
        nome: a.nome,
        situacao: 'ignorada' as const,
        motivo: motivo ?? 'Aba fora do layout homologado.',
      };
    }),
    linhasEntrada: entradas,
    linhasVaziasIgnoradas: vazias,
    colunasIgnoradas: COLUNAS_CALCULADAS,
  };
  return { resumo, linhas, ocorrencias };
}

export const lerTabulacaoConsolidado = (pasta: PastaXlsx) =>
  lerTabulacao(pasta, 'tabulacao_consolidado');
export const lerTabulacaoExpectativa = (pasta: PastaXlsx) =>
  lerTabulacao(pasta, 'tabulacao_expectativa');
