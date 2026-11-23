import type {
  PERFIS,
  RECURSOS_ACESSO,
  ACOES_ACESSO,
  ESCOPOS_ACESSO,
} from './permissoes.constants.js';

export type Perfil = (typeof PERFIS)[number];
export type RecursoAcesso = (typeof RECURSOS_ACESSO)[number];
export type AcaoAcesso = (typeof ACOES_ACESSO)[number];
export type EscopoAcesso = (typeof ESCOPOS_ACESSO)[number];
export interface PermissaoAcesso {
  recurso: RecursoAcesso;
  acao: AcaoAcesso;
  escopo: EscopoAcesso;
}
export interface VinculoAcesso {
  empreendimentoId: number;
  nomeFantasia: string;
  /** Texto como cadastrado (sem unicidade aprovada); null quando não informado. */
  cnpj: string | null;
}
export interface AcessoAtual {
  usuarioId: number;
  perfil: Perfil;
  revisao: number;
  permissoes: PermissaoAcesso[];
  vinculos: VinculoAcesso[];
}
export interface ContaResumo {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
}
export interface CriarConta {
  nome: string;
  email: string;
  perfil: Perfil;
}
export interface AlterarConta {
  perfil: Perfil;
  ativo: boolean;
}
export interface VinculoConta {
  empreendimentoId: number;
  nomeFantasia: string;
  ativo: boolean;
}
export interface VisibilidadeIndicador {
  indicadorId: number;
  nome: string;
  permitido: boolean;
}
export interface CodigoAtivacaoConta {
  usuarioId: number;
  token: string;
  expiraEm: string;
}
export interface EmpreendimentoResumo {
  id: number;
  nomeFantasia: string;
  /** Texto como cadastrado (sem unicidade aprovada); null quando não informado. */
  cnpj: string | null;
  situacao: string;
}
export interface RespostaResumo {
  id: number;
  pesquisaId: number;
  titulo: string;
  respondidaEm: string;
  canal: string;
}
export interface InventarioResumo {
  id: number;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  totalUh: number | null;
  leitos: number | null;
  situacaoConferencia: string;
  tipoAlteracao: string;
  /** ISO 8601 em UTC. */
  criadaEm: string;
  autor: string;
  /** Preenchido quando uma correção substituiu a versão (a linha é preservada). */
  substituidaPorId: number | null;
}
export interface IndicadorConsulta {
  id: number;
  periodoId: number;
  indicadorId: number;
  nome: string;
  unidade: string;
  periodo: string;
  tipoColeta: string;
  recorte: string;
  metodo: string;
  valor: string;
}
