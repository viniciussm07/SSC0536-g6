/** Estado de entrada, anterior à conferência e à persistência no domínio. */
export type ValorColetado<T> =
  | { estado: 'informado'; valor: T }
  | { estado: 'ausente' }
  | { estado: 'vazio' }
  | { estado: 'desconhecido' }
  | { estado: 'nao_se_aplica' };

export type ResultadoNormalizacao<T> =
  | { valido: true; data: ValorColetado<T> }
  | { valido: false; erro: { code: 'VALOR_INVALIDO'; message: string } };

export type EscalaPercentual = 'fracao' | 'percentual';
