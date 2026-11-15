import type {
  Perfil,
  RecursoAcesso,
  AcaoAcesso,
  EscopoAcesso,
  PermissaoAcesso,
} from './permissoes.types.js';

function conceder(
  perfil: Perfil,
  recursos: readonly RecursoAcesso[],
  acoes: readonly AcaoAcesso[],
  escopo: EscopoAcesso = 'todos',
): (PermissaoAcesso & { perfil: Perfil })[] {
  return recursos.flatMap((recurso) =>
    acoes.map((acao) => ({ perfil, recurso, acao, escopo })),
  );
}

/** Padrões técnicos da POC confirmados pelo desenvolvedor; não são homologação do OTO. */
export const PERMISSOES_INICIAIS: readonly (PermissaoAcesso & {
  perfil: Perfil;
})[] = [
  ...conceder(
    'administrador',
    ['contas', 'vinculos', 'permissoes', 'visibilidade', 'catalogos'],
    ['consultar', 'criar', 'alterar'],
  ),
  ...conceder(
    'administrador',
    [
      'empreendimentos',
      'inventarios',
      'pesquisas',
      'respostas',
      'importacoes',
      'calculos',
    ],
    ['consultar', 'criar', 'alterar', 'exportar'],
  ),
  ...conceder('administrador', ['indicadores'], ['consultar', 'exportar']),
  ...conceder('administrador', ['publicacoes'], ['publicar']),
  ...conceder('administrador', ['auditoria'], ['consultar']),
  ...conceder(
    'gestor',
    [
      'empreendimentos',
      'inventarios',
      'pesquisas',
      'respostas',
      'importacoes',
      'calculos',
    ],
    ['consultar', 'criar', 'alterar', 'exportar'],
  ),
  ...conceder('gestor', ['indicadores'], ['consultar', 'exportar']),
  ...conceder('gestor', ['publicacoes'], ['publicar']),
  ...conceder(
    'estagiario',
    ['empreendimentos', 'inventarios', 'respostas'],
    ['consultar', 'criar', 'alterar'],
  ),
  ...conceder('estagiario', ['pesquisas'], ['consultar']),
  ...conceder('visualizador', ['indicadores'], ['consultar']),
  ...conceder(
    'empresario',
    ['empreendimentos'],
    ['consultar', 'alterar'],
    'vinculados',
  ),
  ...conceder(
    'empresario',
    ['inventarios', 'respostas'],
    ['consultar', 'criar', 'alterar'],
    'vinculados',
  ),
];
