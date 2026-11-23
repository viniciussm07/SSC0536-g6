/** Caminhos REST da camada de consumo dos indicadores (parte 18), relativos a `/api`. */
export const PAINEL_RECURSOS = {
  painel: '/indicadores/painel',
  opcoes: '/indicadores/painel/opcoes',
  serie: '/indicadores/painel/serie',
  exportacao: '/indicadores/painel/exportacao',
  participacao: '/indicadores/painel/participacao',
} as const;

/**
 * Situação da seleção. `calculo_pendente` = há cálculo concluído ou em andamento ainda não
 * publicado; `sem_dados` = nada foi calculado nem carregado para a seleção.
 */
export const SITUACOES_PAINEL = [
  'disponivel',
  'calculo_pendente',
  'sem_dados',
] as const;

/** Origem do número: execução publicada (parte 16) ou carga histórica sem execução. */
export const ORIGENS_RESULTADO_PAINEL = ['calculo', 'carga'] as const;

/** Indicadores de cobertura mostram a amostra; não são totais do município. */
export const GRUPOS_PAINEL = ['indicador', 'cobertura'] as const;

/** Prefixo do código dos indicadores de cobertura (`cobertura_meios`, ...). */
export const PREFIXO_COBERTURA = 'cobertura_';

export const PAINEL_AVISO_METODOLOGIA =
  'Fórmulas e parâmetros ainda não foram homologados pelo OTO; os valores são demonstrativos.';

/** Máximo de períodos devolvidos pela série (os mais recentes). */
export const LIMITE_PERIODOS_SERIE = 24;

/** Formatos da exportação do painel (a mesma resposta da API, em arquivo). */
export const FORMATOS_EXPORTACAO_PAINEL = ['pdf', 'xlsx'] as const;
