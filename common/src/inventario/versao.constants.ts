export const TIPOS_ALTERACAO_INVENTARIO = ['correcao', 'mudanca_real'] as const;

/** Campos de capacidade e funcionamento de uma versão (nomes canônicos do dicionário). */
export const CAMPOS_CAPACIDADE = [
  'totalUh',
  'leitos',
  'maxLeitosPorUh',
  'uhsPcd',
  'funcFixos',
  'funcTemporarios',
  'funciona24h',
  'checkin',
  'checkout',
] as const;

/**
 * Estados persistidos de um campo de capacidade. `informado` tem valor (zero é informado);
 * os demais deixam a coluna escalar nula e ficam em `estados`.
 */
export const ESTADOS_CAMPO_INVENTARIO = [
  'informado',
  'nao_se_aplica',
  'desconhecido',
  'vazio',
] as const;

export const LIMITES_INVENTARIO = { motivo: 300 } as const;
