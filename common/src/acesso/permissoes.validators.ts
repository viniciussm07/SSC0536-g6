import {
  PERFIS,
  RECURSOS_ACESSO,
  ACOES_ACESSO,
  ESCOPOS_ACESSO,
} from './permissoes.constants.js';
import type { Perfil, PermissaoAcesso } from './permissoes.types.js';

export function isPerfil(value: unknown): value is Perfil {
  return (
    typeof value === 'string' && (PERFIS as readonly string[]).includes(value)
  );
}
export function isPermissaoAcesso(value: unknown): value is PermissaoAcesso {
  return (
    typeof value === 'object' &&
    value !== null &&
    'recurso' in value &&
    typeof value.recurso === 'string' &&
    (RECURSOS_ACESSO as readonly string[]).includes(value.recurso) &&
    'acao' in value &&
    typeof value.acao === 'string' &&
    (ACOES_ACESSO as readonly string[]).includes(value.acao) &&
    'escopo' in value &&
    typeof value.escopo === 'string' &&
    (ESCOPOS_ACESSO as readonly string[]).includes(value.escopo)
  );
}

/** Limites de segurança da POC; uma permissão ainda precisa ser concedida no banco. */
export function permissaoCompativel(
  perfil: Perfil,
  permissao: PermissaoAcesso,
): boolean {
  if (permissao.escopo === 'nenhum') return true;
  if (
    [
      'contas',
      'vinculos',
      'permissoes',
      'visibilidade',
      'auditoria',
      'catalogos',
    ].includes(permissao.recurso)
  )
    return perfil === 'administrador' && permissao.escopo === 'todos';
  if (perfil === 'visualizador')
    return (
      permissao.recurso === 'indicadores' &&
      ['consultar', 'exportar'].includes(permissao.acao) &&
      permissao.escopo === 'todos'
    );
  if (perfil === 'empresario')
    return (
      ['empreendimentos', 'inventarios', 'respostas'].includes(
        permissao.recurso,
      ) &&
      permissao.escopo === 'vinculados' &&
      permissao.acao !== 'publicar'
    );
  if (perfil === 'estagiario' && permissao.acao === 'publicar') return false;
  if (permissao.recurso === 'indicadores' && permissao.escopo !== 'todos')
    return false;
  return true;
}
