import type {
  ComparacaoPainel,
  ItemPainel,
  MotivoIndisponibilidade,
  TipoColeta,
} from '@ssc0536/common';

export const ROTULO_COLETA: Record<TipoColeta, string> = {
  expectativa: 'Expectativa',
  consolidado: 'Consolidado',
};

export const ROTULO_MOTIVO: Record<MotivoIndisponibilidade, string> = {
  sem_respondentes: 'Sem respondentes no período',
  capacidade_zero: 'Capacidade zerada',
  base_zero: 'Base de cálculo zerada',
  dado_ausente: 'Dado ausente',
  parametro_ausente: 'Parâmetro ausente',
  entrada_invalida: 'Entrada inválida',
};

const UNIDADES: Record<string, string> = {
  percentual_0_100: '%',
  reais_por_diaria: 'R$ por diária',
  reais_por_uh_dia: 'R$ por UH/dia',
};

/** Unidades monetárias (preço ofertado, não faturamento). */
export const ehMoeda = (unidade: string) => unidade.startsWith('reais');
const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const ehPercentual = (unidade: string) => unidade === 'percentual_0_100';

export const rotuloUnidade = (unidade: string) =>
  UNIDADES[unidade] ?? unidade.replaceAll('_', ' ');

/** Apresentação em pt-BR; o valor exato continua no atributo `title` da célula. */
export function formatarDecimal(valor: string, casas = 2): string {
  return Number(valor).toLocaleString('pt-BR', {
    maximumFractionDigits: casas,
  });
}

export function formatarValor(valor: string, unidade: string): string {
  if (ehMoeda(unidade)) return BRL.format(Number(valor));
  const texto = formatarDecimal(valor);
  return ehPercentual(unidade) ? `${texto}%` : texto;
}

export function formatarVariacao(valor: string, unidade: string): string {
  const numero = Number(valor);
  const sinal = numero > 0 ? '+' : '';
  if (ehMoeda(unidade)) return `${sinal}${BRL.format(numero)}`;
  const texto = `${sinal}${formatarDecimal(valor)}`;
  return ehPercentual(unidade) ? `${texto} p.p.` : texto;
}

/** Itens com barra: percentuais disponíveis no intervalo 0–100. */
export function larguraBarra(item: ItemPainel): number | null {
  if (item.valor.estado !== 'disponivel' || !ehPercentual(item.unidade))
    return null;
  const n = Number(item.valor.valor);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

export function descricaoComparacao(
  comparacao: ComparacaoPainel | null,
  unidade: string,
): string | null {
  if (comparacao === null) return null;
  if (comparacao.estado === 'ausente') return 'Sem resultado no período base';
  if (comparacao.estado === 'indisponivel')
    return 'Resultado indisponível no período base';
  return formatarVariacao(comparacao.variacao, unidade);
}

export const rotuloRecorte = (recorte: string) =>
  recorte === 'total' ? 'Total' : recorte;

export function rotuloFonte(item: ItemPainel): string {
  const { fonte } = item;
  if (fonte.origem === 'carga') return 'Carga histórica';
  return `Cálculo #${fonte.execucaoId}, revisão ${fonte.revisao}`;
}

export function formatarInstante(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  });
}

/** Unidade percentual 0–100 fixa o eixo; as demais usam a escala dos dados. */
export const nomeSerie = (s: { nome: string; recorte: string }) =>
  s.recorte === 'total' ? s.nome : `${s.nome} · ${s.recorte}`;

/**
 * Rótulo curto para eixos e legendas dos gráficos: a taxa por tipo vira o nome do tipo e a
 * taxa total vira "Total". O nome completo continua na tabela equivalente.
 */
export function rotuloCurto(s: {
  codigo: string;
  nome: string;
  recorte: string;
}) {
  if (s.codigo === 'taxa_ocupacao_uh') return 'Total';
  if (
    ['diaria_media_ponderada', 'diaria_media_aritmetica', 'revpar'].includes(
      s.codigo,
    )
  )
    return s.recorte === 'total'
      ? 'Total'
      : s.recorte.charAt(0).toUpperCase() + s.recorte.slice(1);
  if (s.codigo === 'taxa_ocupacao_tipo')
    return s.recorte.charAt(0).toUpperCase() + s.recorte.slice(1);
  return nomeSerie(s);
}
