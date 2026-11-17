/** Caminhos sob /api. */
export const PESQUISA_RECURSOS = {
  modelosPesquisa: '/modelos-pesquisa',
} as const;

/** Tipo do valor colhido pelo campo do formulário. */
export const TIPOS_VALOR_CAMPO = ['percentual', 'texto', 'escolha'] as const;
export type TipoValorCampo = (typeof TIPOS_VALOR_CAMPO)[number];

export const LIMITES_PESQUISAS = {
  nome: 200,
  publicoAlvo: 200,
  rotuloCampo: 200,
  chaveCampo: 120,
  rotuloOpcao: 200,
  motivo: 300,
  camposMinimo: 1,
  camposMaximo: 100,
  opcoesMinimo: 1,
  opcoesMaximo: 100,
  ordemMaxima: 100_000,
} as const;

/** Chave estável de campo/opção: minúsculas, dígitos e separadores `.`, `-`, `_`. */
export const PADRAO_CHAVE_CAMPO = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
