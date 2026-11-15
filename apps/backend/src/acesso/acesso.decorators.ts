import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import {
  CABECALHO_CONTEXTO,
  interpretarContextoEntidade,
  type RecursoAcesso,
  type AcaoAcesso,
} from '@ssc0536/common';
import { contextoInvalido } from './acesso.errors';

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

/** ID do empreendimento do cabeçalho de contexto (null se ausente); formato inválido é 400. */
export const ContextoEntidade = createParamDecorator(
  (_dados: unknown, execucao: ExecutionContext): number | null => {
    const req = execucao
      .switchToHttp()
      .getRequest<{ headers: Record<string, unknown> }>();
    const entrada = interpretarContextoEntidade(
      req.headers[CABECALHO_CONTEXTO],
    );
    if (!entrada.valido) throw contextoInvalido();
    return entrada.id;
  },
);
