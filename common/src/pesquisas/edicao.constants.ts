/** Caminhos sob /api das edições de pesquisa. */
export const EDICAO_RECURSOS = {
  pesquisas: '/pesquisas',
} as const;

/** Estado persistido da edição. */
export const STATUS_PESQUISA = ['rascunho', 'aberta', 'encerrada'] as const;
export type StatusPesquisa = (typeof STATUS_PESQUISA)[number];

/** Uma edição coleta somente um tipo; edições legadas mistas viram edições relacionadas. */
export const TIPOS_COLETA = ['expectativa', 'consolidado'] as const;
export type TipoColeta = (typeof TIPOS_COLETA)[number];

/**
 * Situação derivada do estado e do relógio do servidor: `agendada` (aberta, antes da
 * abertura), `recebendo` (dentro da janela) e `expirada` (aberta, após o prazo).
 */
export const SITUACOES_PESQUISA = [
  'rascunho',
  'agendada',
  'recebendo',
  'expirada',
  'encerrada',
] as const;
export type SituacaoPesquisa = (typeof SITUACOES_PESQUISA)[number];

/** Situação de cada destinatário no acompanhamento. */
export const SITUACOES_DESTINATARIO = ['respondeu', 'pendente'] as const;
export type SituacaoDestinatario = (typeof SITUACOES_DESTINATARIO)[number];

export const LIMITES_EDICOES = {
  titulo: 200,
  motivo: 300,
  periodosMinimo: 1,
  periodosMaximo: 24,
  segmentosMaximo: 50,
} as const;
