import { SetMetadata } from '@nestjs/common';
import type { RecursoAcesso, AcaoAcesso } from '@ssc0536/common';

export const POLITICA_ROTA = 'oto:politica';
export type PoliticaRota =
  | { publica: true }
  | { sessao: true }
  | { recurso: RecursoAcesso; acao: AcaoAcesso };
export const RotaPublica = () =>
  SetMetadata(POLITICA_ROTA, { publica: true } satisfies PoliticaRota);
export const RequerSessao = () =>
  SetMetadata(POLITICA_ROTA, { sessao: true } satisfies PoliticaRota);
export const ExigirPermissao = (recurso: RecursoAcesso, acao: AcaoAcesso) =>
  SetMetadata(POLITICA_ROTA, { recurso, acao } satisfies PoliticaRota);
