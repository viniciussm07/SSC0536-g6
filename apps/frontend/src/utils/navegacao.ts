import type {
  AcaoAcesso,
  AcessoAtual,
  Perfil,
  RecursoAcesso,
} from '@ssc0536/common';
import { permite } from '@/utils/acesso';

export type CaminhoNavegacao =
  | '/'
  | '/empreendimentos'
  | '/indicadores'
  | '/administracao'
  | '/catalogos'
  | '/periodos'
  | '/diarias'
  | '/calculos'
  | '/modelos-pesquisa'
  | '/pesquisas'
  | '/importacoes'
  | '/editar'
  | '/auditoria';

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
    caminho: '/catalogos',
    rotulo: 'Catálogos',
    descricao: 'Grupos e itens do formulário, com histórico de versões.',
    secao: 'geral',
    recurso: 'catalogos',
  },
  {
    caminho: '/periodos',
    rotulo: 'Períodos',
    descricao: 'Meses de referência e feriados prolongados das pesquisas.',
    secao: 'geral',
    recurso: 'pesquisas',
  },
  {
    caminho: '/diarias',
    rotulo: 'Diárias e RHC',
    descricao: 'Coleta e conferência das fontes complementares.',
    secao: 'geral',
    recurso: 'calculos',
  },
  {
    caminho: '/modelos-pesquisa',
    rotulo: 'Modelos de pesquisa',
    descricao: 'Questionários de pesquisa, campos e histórico de versões.',
    secao: 'geral',
    recurso: 'pesquisas',
  },
  {
    caminho: '/pesquisas',
    rotulo: 'Edições de pesquisa',
    descricao: 'Abertura, prazos, público e acompanhamento de respondentes.',
    secao: 'geral',
    recurso: 'pesquisas',
  },
  {
    caminho: '/calculos',
    rotulo: 'Cálculos',
    descricao: 'Execuções, revisões e publicação dos indicadores calculados.',
    secao: 'geral',
    recurso: 'calculos',
  },
  {
    caminho: '/importacoes',
    rotulo: 'Importação de planilhas',
    descricao: 'Envio e leitura das planilhas oficiais, com prévia e erros.',
    secao: 'geral',
    recurso: 'importacoes',
  },
  {
    caminho: '/auditoria',
    rotulo: 'Auditoria',
    descricao: 'Histórico de alterações, autoria e processos.',
    secao: 'geral',
    recurso: 'auditoria',
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
