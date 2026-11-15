import {
  HEALTH_RESOURCE,
  AUTENTICACAO_RECURSOS,
  ACESSO_RECURSOS,
  CADASTRO_RECURSOS,
  CATALOGO_RECURSOS,
} from '@ssc0536/common';

export const endpoints = {
  health: `/${HEALTH_RESOURCE}`,
  autenticacao: AUTENTICACAO_RECURSOS,
  acesso: ACESSO_RECURSOS,
  cadastro: CADASTRO_RECURSOS,
  catalogo: CATALOGO_RECURSOS,
} as const;
