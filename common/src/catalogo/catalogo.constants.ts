/** Caminhos sob /api. O formulário de um segmento é um agregado; grupos/itens são coleções OData. */
export const CATALOGO_RECURSOS = {
  segmentos: '/segmentos',
  catalogos: '/catalogos',
} as const;

export const SELECOES_GRUPO = ['unica', 'multipla'] as const;

/**
 * Estados de uma resposta de inventário. `nao_informado` (desconhecido) nunca é convertido em
 * `nao`: zero/negativo, não se aplica e desconhecido são respostas diferentes.
 */
export const ESTADOS_ITEM_INVENTARIO = [
  'sim',
  'nao',
  'nao_se_aplica',
  'nao_informado',
] as const;

export const LIMITES_CATALOGO = {
  chave: 120,
  rotulo: 200,
  pergunta: 300,
  secao: 100,
  detalhe: 300,
  motivo: 300,
  ordemMaxima: 100_000,
  quantidadeMaxima: 1_000_000,
  respostas: 1000,
} as const;

/** Chave estável: minúsculas, dígitos e separadores `.`, `-`, `_` (ex.: `hospedagem.recepcao.sanitario`). */
export const PADRAO_CHAVE_CATALOGO = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
