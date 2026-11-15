import type { AcessoAtual, RecursoAcesso, AcaoAcesso } from '@ssc0536/common';

export const permite = (
  acesso: AcessoAtual,
  recurso: RecursoAcesso,
  acao: AcaoAcesso,
) =>
  acesso.permissoes.some(
    (p) => p.recurso === recurso && p.acao === acao && p.escopo !== 'nenhum',
  );
