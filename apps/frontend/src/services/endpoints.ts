import { HEALTH_RESOURCE, AUTENTICACAO_RECURSOS } from '@ssc0536/common';

export const endpoints = {
  health: `/${HEALTH_RESOURCE}`,
  autenticacao: AUTENTICACAO_RECURSOS,
} as const;
