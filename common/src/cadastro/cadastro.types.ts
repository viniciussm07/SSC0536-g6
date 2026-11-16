import type { EmpreendimentoResumo } from '../acesso/permissoes.types.js';
import type {
  FINALIDADES_CONTATO,
  PENDENCIAS_CADASTRO,
  SITUACOES_CADASTUR,
  SITUACOES_EMPREENDIMENTO,
  TIPOS_CONTATO,
  ZONAS,
} from './cadastro.constants.js';

export type TipoContato = (typeof TIPOS_CONTATO)[number];
export type FinalidadeContato = (typeof FINALIDADES_CONTATO)[number];
export type SituacaoEmpreendimento = (typeof SITUACOES_EMPREENDIMENTO)[number];
export type SituacaoCadastur = (typeof SITUACOES_CADASTUR)[number];
export type Zona = (typeof ZONAS)[number];
export type PendenciaCadastro = (typeof PENDENCIAS_CADASTRO)[number];

/** Graus decimais WGS84 (SRID 4326): longitude em [-180, 180], latitude em [-90, 90]. */
export interface Coordenadas {
  longitude: number;
  latitude: number;
}
export interface SegmentoResumo {
  id: number;
  chave: string;
  nome: string;
  nivelCadastro: string;
}
export interface ContatoCadastro {
  id: number;
  tipo: TipoContato;
  valor: string;
  finalidade: FinalidadeContato;
  responsavelNome: string | null;
  responsavelCargo: string | null;
}
export interface CadasturCadastro {
  id: number;
  situacao: SituacaoCadastur;
  /** Texto, preserva zeros à esquerda. */
  numero: string | null;
  /** YYYY-MM-DD */
  vencimento: string | null;
}

/** Linha da listagem: resumo + classificação e informações faltantes. */
export interface EmpreendimentoListado extends EmpreendimentoResumo {
  tipoHospedagem: string | null;
  pendencias: PendenciaCadastro[];
  /** Extensão aditiva da listagem; capacidade do inventário vigente no fuso operacional. */
  zona?: Zona | null;
  endereco?: string | null;
  totalUh?: number | null;
  leitos?: number | null;
  funcFixos?: number | null;
  funcTemporarios?: number | null;
}
export interface EmpreendimentoDetalhe extends EmpreendimentoListado {
  razaoSocial: string | null;
  idOrigem: string | null;
  categoriaIndicador: string | null;
  endereco: string | null;
  zona: Zona | null;
  localizacao: Coordenadas | null;
  /** YYYY-MM-DD */
  dataInicioAtividades: string | null;
  /** YYYY-MM-DD; presente somente quando encerrado. */
  dataEncerramento: string | null;
  segmentos: SegmentoResumo[];
  contatos: ContatoCadastro[];
  cadastur: CadasturCadastro[];
}

export interface ContatoEntrada {
  /** Com id atualiza o contato; sem id cria. */
  id?: number;
  tipo: TipoContato;
  valor: string;
  finalidade: FinalidadeContato;
  responsavelNome?: string | null;
  responsavelCargo?: string | null;
}
export interface CadasturEntrada {
  id?: number;
  situacao: SituacaoCadastur;
  numero?: string | null;
  vencimento?: string | null;
}
/**
 * Entrada de criação. Na atualização todos os campos são opcionais: omitido = não altera,
 * `null` = limpa (campos opcionais), lista = conjunto desejado (o que faltar é removido).
 */
export interface EntradaEmpreendimento {
  nomeFantasia: string;
  situacao: SituacaoEmpreendimento;
  segmentoIds: number[];
  razaoSocial?: string | null;
  /** 14 dígitos; máscara é removida. Sem unicidade aprovada. */
  cnpj?: string | null;
  idOrigem?: string | null;
  tipoHospedagem?: string | null;
  categoriaIndicador?: string | null;
  endereco?: string | null;
  zona?: Zona | null;
  localizacao?: Coordenadas | null;
  dataInicioAtividades?: string | null;
  dataEncerramento?: string | null;
  contatos?: ContatoEntrada[];
  cadastur?: CadasturEntrada[];
  /** Confirma que o cadastro não é duplicado dos candidatos apontados pelo servidor. */
  confirmarSemDuplicidade?: boolean;
}
export type AlteracaoEmpreendimento = Partial<EntradaEmpreendimento>;

export interface ErroCampo {
  field: string;
  message: string;
}
export type ResultadoEntrada<T> =
  { valido: true; data: T } | { valido: false; erros: ErroCampo[] };

export type MotivoDuplicidade = 'nome_igual' | 'cnpj_igual' | 'id_origem_igual';
export interface CandidatoDuplicidade {
  id: number;
  nomeFantasia: string;
  cnpj: string | null;
  situacao: string;
  motivos: MotivoDuplicidade[];
}
