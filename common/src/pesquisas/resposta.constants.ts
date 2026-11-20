/**
 * Caminhos sob /api das respostas, sempre no escopo do empreendimento contextualizado.
 * `:id` é o empreendimento; `:pesquisaId`, a edição.
 */
export const RESPOSTA_RECURSOS = {
  pesquisas: '/empreendimentos/:id/pesquisas',
  formulario: '/empreendimentos/:id/pesquisas/:pesquisaId',
  resposta: '/empreendimentos/:id/pesquisas/:pesquisaId/resposta',
} as const;

/** Canal gravado em `resposta.canal` pelo envio na plataforma. */
export const CANAL_RESPOSTA_SISTEMA = 'sistema';

export const LIMITES_RESPOSTAS = {
  /** Uma edição tem no máximo 100 campos × 24 períodos. */
  itensMaximo: 2400,
  texto: 2000,
} as const;
