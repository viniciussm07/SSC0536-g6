import type { IndicadorConsulta, TipoPeriodo } from '@ssc0536/common';

/**
 * Seleção e formatação dos resultados devolvidos pela API para o painel. Nada aqui recalcula
 * indicador: os valores são exibidos como recebidos (texto decimal) e só viram número para
 * posicionar marcas nos gráficos.
 */

export const RECORTES_PAINEL = [
  { valor: 'total', rotulo: 'Total' },
  { valor: 'hotel', rotulo: 'Hotéis' },
  { valor: 'pousada', rotulo: 'Pousadas' },
  { valor: 'resort', rotulo: 'Resorts' },
] as const;

export const TIPOS_COLETA_PAINEL = [
  { valor: 'consolidado', rotulo: 'Consolidado' },
  { valor: 'expectativa', rotulo: 'Expectativa' },
] as const;

export type TipoColetaPainel = (typeof TIPOS_COLETA_PAINEL)[number]['valor'];

/** Cores dos tipos de coleta nos gráficos (tokens do tema OTO, como no protótipo). */
export const CORES_COLETA = {
  consolidado: { label: 'Consolidado', color: 'var(--primary)' },
  expectativa: { label: 'Expectativa', color: 'var(--cta)' },
} as const satisfies Record<TipoColetaPainel, { label: string; color: string }>;

const MESES = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Rótulos de exibição dos valores internos da API (filtros, gráficos e tabela). */
export const ROTULOS_RECORTE: Readonly<Record<string, string>> =
  Object.fromEntries(RECORTES_PAINEL.map((r) => [r.valor, r.rotulo]));
export const ROTULOS_TIPO_COLETA: Readonly<Record<string, string>> =
  Object.fromEntries(TIPOS_COLETA_PAINEL.map((t) => [t.valor, t.rotulo]));
export const ROTULOS_METODO: Readonly<Record<string, string>> = {
  aritmetica: 'Aritmética',
  ponderada: 'Ponderada',
};
export const ROTULOS_TIPO_PERIODO: Readonly<Record<TipoPeriodo, string>> = {
  mes: 'Mês',
  feriado_prolongado: 'Feriado prolongado',
};

/** Valor desconhecido (novo na API) aparece legível, sem sublinhado, em vez de sumir. */
const rotular = (mapa: Readonly<Record<string, string>>, valor: string) =>
  mapa[valor] ?? valor.replaceAll('_', ' ');

export const rotuloRecorte = (valor: string) => rotular(ROTULOS_RECORTE, valor);
export const rotuloTipoColeta = (valor: string) =>
  rotular(ROTULOS_TIPO_COLETA, valor);
export const rotuloMetodo = (valor: string) => rotular(ROTULOS_METODO, valor);
export const rotuloTipoPeriodo = (valor: string) =>
  rotular(ROTULOS_TIPO_PERIODO, valor);

/** Decimal da API (`1045.2`) em notação brasileira (`1.045,2`), sem passar por ponto flutuante. */
export function formatarDecimal(valor: string) {
  const [, sinal = '', inteiro = '', fracao] =
    /^(-?)(\d+)(?:\.(\d+))?$/.exec(valor) ?? [];
  if (!inteiro) return valor;
  const milhares = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sinal}${milhares}${fracao ? `,${fracao}` : ''}`;
}

/** Valor com a unidade do indicador (`48,2%`, `R$ 468,90`, `12 dias`). */
export function formatarValor(valor: string, unidade: string) {
  const texto = formatarDecimal(valor);
  if (unidade === '%') return `${texto}%`;
  if (unidade === 'R$') return `R$ ${texto}`;
  return unidade ? `${texto} ${unidade}` : texto;
}

/** Marca do eixo Y com a unidade (`60%`, `R$ 400`); o número vem da escala do gráfico. */
export function rotuloEixoValor(valor: number, unidade: string) {
  if (unidade === '%') return `${valor}%`;
  if (unidade === 'R$') return `R$ ${valor}`;
  return String(valor);
}

/** Rótulo curto para o eixo: `out/25` (mês) ou `14/11/25` (início de outro período). */
export function rotuloCurtoPeriodo(
  linha: Pick<IndicadorConsulta, 'periodoTipo' | 'periodoInicio'>,
) {
  const [ano, mes, dia] = linha.periodoInicio.split('-');
  const aa = ano.slice(2);
  if (linha.periodoTipo === 'mes') return `${MESES[Number(mes) - 1]}/${aa}`;
  return `${dia}/${mes}/${aa}`;
}

/** Data civil `YYYY-MM-DD` como `DD/MM/AAAA`. */
export function formatarDataCivil(data: string) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export interface IndicadorDisponivel {
  id: number;
  nome: string;
  unidade: string;
  resultados: number;
}

/** Indicadores presentes nas linhas; o de série mais longa primeiro, depois por ID. */
export function indicadoresDisponiveis(
  linhas: readonly IndicadorConsulta[],
): IndicadorDisponivel[] {
  const porId = new Map<number, IndicadorDisponivel>();
  for (const l of linhas) {
    const atual = porId.get(l.indicadorId);
    if (atual) atual.resultados += 1;
    else
      porId.set(l.indicadorId, {
        id: l.indicadorId,
        nome: l.nome,
        unidade: l.unidade,
        resultados: 1,
      });
  }
  return [...porId.values()].sort(
    (a, b) => b.resultados - a.resultados || a.id - b.id,
  );
}

/** Métodos presentes, em ordem alfabética. */
export function metodosDisponiveis(linhas: readonly IndicadorConsulta[]) {
  return [...new Set(linhas.map((l) => l.metodo))].sort();
}

export interface PeriodoPainel {
  id: number;
  rotulo: string;
  curto: string;
  tipo: IndicadorConsulta['periodoTipo'];
  inicio: string;
  fim: string;
}

/** Períodos distintos em ordem cronológica (início, depois ID). */
export function periodosDasLinhas(
  linhas: readonly IndicadorConsulta[],
): PeriodoPainel[] {
  const porId = new Map<number, PeriodoPainel>();
  for (const l of linhas)
    if (!porId.has(l.periodoId))
      porId.set(l.periodoId, {
        id: l.periodoId,
        rotulo: l.periodo,
        curto: rotuloCurtoPeriodo(l),
        tipo: l.periodoTipo,
        inicio: l.periodoInicio,
        fim: l.periodoFim,
      });
  return [...porId.values()].sort(
    (a, b) =>
      (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0) || a.id - b.id,
  );
}

/** Valor de uma célula do painel: ausente, único ou conflitante (mais de um resultado). */
export type CelulaPainel =
  | { situacao: 'ausente' }
  | { situacao: 'unico'; valor: string }
  | { situacao: 'conflito'; quantidade: number };

function celula(linhas: readonly IndicadorConsulta[]): CelulaPainel {
  if (linhas.length === 0) return { situacao: 'ausente' };
  if (linhas.length > 1)
    return { situacao: 'conflito', quantidade: linhas.length };
  return { situacao: 'unico', valor: linhas[0].valor };
}

/** Número só para posicionar a marca; ausência e conflito não são plotados. */
export function numeroDaCelula(c: CelulaPainel): number | null {
  return c.situacao === 'unico' ? Number(c.valor) : null;
}

export interface PontoComparado {
  consolidado: CelulaPainel;
  expectativa: CelulaPainel;
}

const doTipo = (linhas: readonly IndicadorConsulta[], tipo: string) =>
  linhas.filter((l) => l.tipoColeta === tipo);

/** Série temporal de um recorte: um ponto por período, com os dois tipos de coleta. */
export function serieDoRecorte(
  linhas: readonly IndicadorConsulta[],
  periodos: readonly PeriodoPainel[],
  recorte: string,
): (PontoComparado & { periodo: PeriodoPainel })[] {
  return periodos.map((periodo) => {
    const doPeriodo = linhas.filter(
      (l) => l.periodoId === periodo.id && l.recorte === recorte,
    );
    return {
      periodo,
      consolidado: celula(doTipo(doPeriodo, 'consolidado')),
      expectativa: celula(doTipo(doPeriodo, 'expectativa')),
    };
  });
}

/** Valores de cada recorte em um período, com os dois tipos de coleta. */
export function recortesDoPeriodo(
  linhas: readonly IndicadorConsulta[],
  periodoId: number,
): (PontoComparado & { recorte: string; rotulo: string })[] {
  const doPeriodo = linhas.filter((l) => l.periodoId === periodoId);
  const presentes = new Set(doPeriodo.map((l) => l.recorte));
  const ordem: string[] = [
    ...RECORTES_PAINEL.map((r) => r.valor).filter((r) => presentes.has(r)),
    ...[...presentes]
      .filter((r) => !RECORTES_PAINEL.some((p) => p.valor === r))
      .sort(),
  ];
  return ordem.map((recorte) => {
    const doRecorte = doPeriodo.filter((l) => l.recorte === recorte);
    return {
      recorte,
      rotulo: rotuloRecorte(recorte),
      consolidado: celula(doTipo(doRecorte, 'consolidado')),
      expectativa: celula(doTipo(doRecorte, 'expectativa')),
    };
  });
}

/** Texto acessível de uma célula, com unidade. */
export function textoDaCelula(c: CelulaPainel, unidade: string) {
  if (c.situacao === 'ausente') return 'sem dado';
  if (c.situacao === 'conflito')
    return `${c.quantidade} resultados divergentes (ver tabela)`;
  return formatarValor(c.valor, unidade);
}
