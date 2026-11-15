import type {
  AcaoAcesso,
  AcessoAtual,
  Perfil,
  RecursoAcesso,
} from '@ssc0536/common';
import { permite } from '@/utils/acesso';

export type CaminhoNavegacao =
  '/' | '/empreendimentos' | '/indicadores' | '/administracao' | '/editar';

export interface ItemNavegacao {
  caminho: CaminhoNavegacao;
  rotulo: string;
  descricao: string;
  // Com empreendimento contextualizado só a seção "entidade" aparece; sem ele, só a "geral".
  secao: 'geral' | 'entidade';
  // Recurso exigido (ação consultar); sem recurso, o item é liberado a quem está autenticado.
  recurso?: RecursoAcesso;
  /** Ação exigida sobre o recurso (padrão: consultar). */
  acao?: AcaoAcesso;
}

export interface SecaoNavegacao {
  id: ItemNavegacao['secao'];
  titulo: string;
  itens: readonly ItemNavegacao[];
}

export const ITENS_NAVEGACAO: readonly ItemNavegacao[] = [
  {
    caminho: '/',
    rotulo: 'Início',
    descricao: 'Resumo do seu acesso.',
    secao: 'geral',
  },
  {
    caminho: '/empreendimentos',
    rotulo: 'Empreendimentos',
    descricao: 'Cadastro, consulta e atualização dos meios de hospedagem.',
    secao: 'geral',
    recurso: 'empreendimentos',
  },
  {
    caminho: '/indicadores',
    rotulo: 'Indicadores',
    descricao: 'Indicadores liberados para o seu perfil.',
    secao: 'geral',
    recurso: 'indicadores',
  },
  {
    caminho: '/administracao',
    rotulo: 'Administração',
    descricao: 'Contas, vínculos, permissões e visibilidade.',
    secao: 'geral',
    recurso: 'contas',
  },
  {
    caminho: '/',
    rotulo: 'Empreendimento',
    descricao:
      'Cadastro, inventários e respostas do empreendimento selecionado.',
    secao: 'entidade',
    recurso: 'empreendimentos',
  },
  {
    caminho: '/editar',
    rotulo: 'Editar cadastro',
    descricao: 'Atualiza os dados cadastrais, contatos e Cadastur.',
    secao: 'entidade',
    recurso: 'empreendimentos',
    acao: 'alterar',
  },
];

export function itensVisiveis(acesso?: AcessoAtual, temEntidade = false) {
  return ITENS_NAVEGACAO.filter(
    (item) =>
      (item.secao === 'entidade') === temEntidade &&
      (!item.recurso ||
        (acesso && permite(acesso, item.recurso, item.acao ?? 'consultar'))),
  );
}

export function secoesNavegacao(
  acesso: AcessoAtual | undefined,
  nomeEntidade: string | null,
): SecaoNavegacao[] {
  const itens = itensVisiveis(acesso, nomeEntidade !== null);
  const secoes: SecaoNavegacao[] = [
    {
      id: 'geral',
      titulo: 'Visão geral',
      itens: itens.filter((i) => i.secao === 'geral'),
    },
    {
      id: 'entidade',
      titulo: nomeEntidade ?? '',
      itens: itens.filter((i) => i.secao === 'entidade'),
    },
  ];
  return secoes.filter((secao) => secao.itens.length);
}

export const ROTULOS_PERFIL: Record<Perfil, string> = {
  administrador: 'Administrador',
  gestor: 'Gestor',
  estagiario: 'Estagiário',
  visualizador: 'Visualizador',
  empresario: 'Empresário',
};
