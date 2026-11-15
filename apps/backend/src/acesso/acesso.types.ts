import type { IncomingMessage } from 'node:http';
import type { IdentidadeSessao } from '@ssc0536/common';

export interface ContextoAcesso {
  usuario: IdentidadeSessao;
  tokenHash: string;
}
export interface RequisicaoAutenticada extends IncomingMessage {
  acesso: ContextoAcesso;
}
