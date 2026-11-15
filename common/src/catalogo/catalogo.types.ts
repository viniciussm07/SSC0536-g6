import type {
  ESTADOS_ITEM_INVENTARIO,
  SELECOES_GRUPO,
} from './catalogo.constants.js';

export type SelecaoGrupo = (typeof SELECOES_GRUPO)[number];
export type EstadoItemInventario = (typeof ESTADOS_ITEM_INVENTARIO)[number];

export interface ItemCatalogo {
  id: number;
  grupoId: number;
  chave: string;
  rotulo: string;
  /** Marcado como sim, não admite outro item do grupo também como sim (ex.: "Não possui"). */
  exclusivo: boolean;
  /** Item "Outro(s)": exige texto de detalhe quando for sim. */
  outro: boolean;
  aceitaQuantidade: boolean;
  ordem: number;
  ativo: boolean;
  /** Versão vigente do item (snapshot imutável). */
  versao: number;
}
export interface GrupoCatalogo {
  id: number;
  segmentoId: number;
  chave: string;
  pergunta: string;
  selecao: SelecaoGrupo;
  permiteOutro: boolean;
  secao: string | null;
  ordem: number;
  ativo: boolean;
  itens: ItemCatalogo[];
}
/** Definição do formulário de um segmento (só grupos/itens ativos, exceto para a gestão). */
export interface FormularioCatalogo {
  segmentoId: number;
  grupos: GrupoCatalogo[];
}

/** Linhas das coleções de gestão (colunas filtráveis dos esquemas OData). */
export interface GrupoCatalogoLinha {
  id: number;
  segmentoId: number;
  chave: string;
  pergunta: string;
  secao: string | null;
  selecao: SelecaoGrupo;
  permiteOutro: boolean;
  ordem: number;
  ativo: boolean;
}
export interface ItemCatalogoLinha {
  id: number;
  grupoId: number;
  grupoChave: string;
  chave: string;
  rotulo: string;
  exclusivo: boolean;
  outro: boolean;
  aceitaQuantidade: boolean;
  ordem: number;
  ativo: boolean;
  versao: number;
}
export interface VersaoItemCatalogo {
  numero: number;
  rotulo: string;
  pergunta: string;
  selecao: SelecaoGrupo;
  exclusivo: boolean;
  outro: boolean;
  aceitaQuantidade: boolean;
  /** ISO 8601 em UTC. */
  criadaEm: string;
  motivo: string | null;
}

export interface EntradaGrupoCatalogo {
  segmentoId: number;
  chave: string;
  pergunta: string;
  selecao: SelecaoGrupo;
  permiteOutro: boolean;
  secao?: string | null;
  ordem: number;
}
/** Pergunta, seção, ordem e situação podem mudar; chave, seleção e `permiteOutro` são imutáveis. */
export interface AlteracaoGrupoCatalogo {
  pergunta?: string;
  secao?: string | null;
  ordem?: number;
  ativo?: boolean;
  motivo?: string;
}
export interface EntradaItemCatalogo {
  grupoId: number;
  chave: string;
  rotulo: string;
  exclusivo: boolean;
  outro: boolean;
  aceitaQuantidade: boolean;
  ordem: number;
}
export interface AlteracaoItemCatalogo {
  rotulo?: string;
  exclusivo?: boolean;
  outro?: boolean;
  aceitaQuantidade?: boolean;
  ordem?: number;
  ativo?: boolean;
  motivo?: string;
}

/** Resposta de um item do formulário (corresponde a `InventarioItem`). */
export interface RespostaItemInventario {
  itemId: number;
  estado: EstadoItemInventario;
  detalhe?: string | null;
  quantidade?: number | null;
}
export interface EntradaRespostasCatalogo {
  itens: RespostaItemInventario[];
}
