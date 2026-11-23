/** Caminhos sob /api para as fontes complementares do plano 17. */
export const DIARIA_RECURSOS = {
  coletasDiarias: '/coletas-diarias',
  rhcPeriodos: '/rhc-periodos',
  parametrosCalculo: '/parametros-calculo',
} as const;

/** `manual` é a coleta autorizada desta entrega; `importacao` fica para a parte 09. */
export const ORIGENS_COLETA = ['manual', 'importacao'] as const;
export type OrigemColeta = (typeof ORIGENS_COLETA)[number];

/** Estado de conferência compartilhado por diária e RHC. */
export const SITUACOES_CONFERENCIA_FONTE = [
  'pendente',
  'conferida',
  'divergente',
] as const;
export type SituacaoConferenciaFonte =
  (typeof SITUACOES_CONFERENCIA_FONTE)[number];

/** Recorte diário do MER; feriados são representados pelo tipo do período. */
export const TIPOS_DIA = ['semana', 'fim_de_semana'] as const;
export type TipoDia = (typeof TIPOS_DIA)[number];

/** Unidade do preço observado; o protocolo da diária ainda será homologado. */
export const UNIDADES_PRECO = ['por_uh_diaria'] as const;
export type UnidadePreco = (typeof UNIDADES_PRECO)[number];

export const SITUACOES_PARAMETRO = [
  'hipotese_pendente_homologacao',
  'homologado',
] as const;
export type SituacaoParametro = (typeof SITUACOES_PARAMETRO)[number];

export const MOEDA_PADRAO = 'BRL';
export const UNIDADE_PRECO_PADRAO: UnidadePreco = 'por_uh_diaria';
export const UNIDADE_PARAMETRO_PADRAO = 'indefinida';
export const SITUACAO_PARAMETRO_PADRAO: SituacaoParametro =
  'hipotese_pendente_homologacao';

export const LIMITES_DIARIAS = {
  fonte: 60,
  referenciaOrigem: 500,
  observacao: 1000,
  chaveParametro: 120,
  unidadeParametro: 60,
  /** Trava de sanidade, não regra de outlier homologada. */
  valorMaximo: 1_000_000,
  casasDecimais: 6,
  leitosMaximo: 10_000_000,
} as const;

export const PADRAO_MOEDA = /^[A-Z]{3}$/;
