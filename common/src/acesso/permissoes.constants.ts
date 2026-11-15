export const PERFIS = [
  'administrador',
  'gestor',
  'estagiario',
  'visualizador',
  'empresario',
] as const;
export const RECURSOS_ACESSO = [
  'contas',
  'vinculos',
  'permissoes',
  'visibilidade',
  'empreendimentos',
  'inventarios',
  'pesquisas',
  'respostas',
  'importacoes',
  'calculos',
  'indicadores',
  'publicacoes',
  'auditoria',
] as const;
export const ACOES_ACESSO = [
  'consultar',
  'criar',
  'alterar',
  'exportar',
  'publicar',
] as const;
export const ESCOPOS_ACESSO = ['nenhum', 'todos', 'vinculados'] as const;
export const ACESSO_RECURSOS = {
  atual: '/acessos/atual',
  contas: '/contas',
  perfis: '/perfis',
  empreendimentos: '/empreendimentos',
  indicadores: '/indicadores',
} as const;
