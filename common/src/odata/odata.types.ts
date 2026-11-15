import type {
  FUNCOES_TEXTO,
  OPERADORES_COMPARACAO,
} from './odata.constants.js';

export type OperadorComparacao = (typeof OPERADORES_COMPARACAO)[number];
export type FuncaoTexto = (typeof FUNCOES_TEXTO)[number];

export type TipoCampoOData =
  'texto' | 'inteiro' | 'decimal' | 'booleano' | 'data' | 'datahora' | 'enum';

export interface CampoOData {
  nome: string;
  tipo: TipoCampoOData;
  /** Aceita `null` (literal e comparação). */
  anulavel: boolean;
  filtravel: boolean;
  ordenavel: boolean;
  /** Domínio de campos `enum`. */
  valores?: readonly string[];
  /** Não é coluna física: o servidor define a semântica (por exemplo, `pendencia`). */
  virtual: boolean;
  /** Restringe os operadores aceitos (`eq`, `in`, `contains`...); ausente = todos do tipo. */
  operadores?: readonly string[];
}

export type DirecaoOrdenacao = 'asc' | 'desc';
export interface OrdenacaoOData {
  campo: string;
  direcao: DirecaoOrdenacao;
}
/** Esquema de uma coleção: só colunas devolvidas na linha são filtráveis. */
export interface EsquemaOData {
  recurso: string;
  campos: readonly CampoOData[];
  /** Ordem quando não há `$orderby`. */
  ordenacaoPadrao: readonly OrdenacaoOData[];
  /** Campos que desempatam sempre (ordem estável entre páginas). */
  desempate: readonly string[];
}

export type LiteralOData =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'inteiro'; valor: number }
  /** Decimal em texto, sem perda de precisão. */
  | { tipo: 'decimal'; valor: string }
  | { tipo: 'booleano'; valor: boolean }
  | { tipo: 'data'; valor: string }
  | { tipo: 'datahora'; valor: string }
  | { tipo: 'nulo' };

export interface ReferenciaCampo {
  nome: string;
  /** `tolower(campo)` */
  minusculas: boolean;
  /** Índice do campo no texto do filtro. */
  posicao: number;
}

export type NoFiltro =
  | { tipo: 'e' | 'ou'; esquerda: NoFiltro; direita: NoFiltro }
  | { tipo: 'nao'; operando: NoFiltro }
  | {
      tipo: 'comparacao';
      operador: OperadorComparacao;
      campo: ReferenciaCampo;
      valor: LiteralOData;
    }
  | { tipo: 'em'; campo: ReferenciaCampo; valores: LiteralOData[] }
  | {
      tipo: 'funcao';
      funcao: FuncaoTexto;
      campo: ReferenciaCampo;
      valor: string;
    };

export interface ErroConsulta {
  /** Parâmetro (`$filter`, `$top`, ...) ou campo com problema. */
  field: string;
  message: string;
  /** Índice do caractere no valor do parâmetro, quando conhecido. */
  position?: number;
}
export type ResultadoOData<T> =
  { valido: true; data: T } | { valido: false; erros: ErroConsulta[] };

export interface ConsultaOData {
  filtro: NoFiltro | null;
  ordenacao: OrdenacaoOData[];
  top: number;
  skip: number;
  contar: boolean;
}

export interface MetaColecaoOData {
  top: number;
  skip: number;
  /** Presente quando a consulta usa `$count=true`. */
  total?: number;
}

export interface ColecaoOData<T> {
  data: T[];
  meta: MetaColecaoOData;
}
