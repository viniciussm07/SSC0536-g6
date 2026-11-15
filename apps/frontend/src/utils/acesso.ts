import type {
  AcessoAtual,
  RecursoAcesso,
  AcaoAcesso,
  EscopoAcesso,
} from '@ssc0536/common';

export const permite = (
  acesso: AcessoAtual,
  recurso: RecursoAcesso,
  acao: AcaoAcesso,
) =>
  acesso.permissoes.some(
    (p) => p.recurso === recurso && p.acao === acao && p.escopo !== 'nenhum',
  );

export const escopo = (
  acesso: AcessoAtual,
  recurso: RecursoAcesso,
  acao: AcaoAcesso,
): EscopoAcesso =>
  acesso.permissoes.find((p) => p.recurso === recurso && p.acao === acao)
    ?.escopo ?? 'nenhum';
