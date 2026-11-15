import type { ValorColetado } from '../coleta/valor-coletado.types.js';
import type { RespostaItemInventario } from '../catalogo/catalogo.types.js';
import type {
  CAMPOS_CAPACIDADE,
  ESTADOS_CAMPO_INVENTARIO,
  TIPOS_ALTERACAO_INVENTARIO,
} from './versao.constants.js';

export type TipoAlteracaoInventario =
  (typeof TIPOS_ALTERACAO_INVENTARIO)[number];
export type CampoCapacidade = (typeof CAMPOS_CAPACIDADE)[number];
export type EstadoCampoInventario = (typeof ESTADOS_CAMPO_INVENTARIO)[number];
export type SituacaoConferenciaInventario = 'completo' | 'parcial' | 'pendente';

/** Valor de um campo: `valor` só existe com estado `informado` (zero e falso são informados). */
export type ValorCapacidade<T> =
  | { estado: 'informado'; valor: T }
  | { estado: Exclude<EstadoCampoInventario, 'informado'>; valor: null };
export interface CapacidadeInventario {
  totalUh: ValorCapacidade<number>;
  leitos: ValorCapacidade<number>;
  maxLeitosPorUh: ValorCapacidade<number>;
  uhsPcd: ValorCapacidade<number>;
  funcFixos: ValorCapacidade<number>;
  funcTemporarios: ValorCapacidade<number>;
  funciona24h: ValorCapacidade<boolean>;
  checkin: ValorCapacidade<string>;
  checkout: ValorCapacidade<string>;
}

export interface ItemVersaoInventario {
  itemId: number;
  /** Versão do item do catálogo usada nesta resposta (snapshot imutável). */
  itemVersao: number;
  /** Rótulo e pergunta do grupo como eram nessa versão do item. */
  rotulo: string;
  pergunta: string;
  estado: RespostaItemInventario['estado'];
  detalhe: string | null;
  quantidade: number | null;
}
export interface VersaoInventarioDetalhe {
  id: number;
  empreendimentoId: number;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  tipoAlteracao: TipoAlteracaoInventario;
  situacaoConferencia: SituacaoConferenciaInventario;
  motivo: string | null;
  /** ISO 8601 em UTC. */
  criadaEm: string;
  autor: string;
  /** Preenchido quando uma correção substituiu esta versão (a linha é preservada). */
  substituidaPorId: number | null;
  capacidade: CapacidadeInventario;
  itens: ItemVersaoInventario[];
}

/** Entrada já validada; campo de capacidade omitido (`ausente`) herda da versão-base. */
export interface EntradaVersaoInventario {
  tipoAlteracao: TipoAlteracaoInventario;
  vigenciaInicio?: string;
  vigenciaFim?: string | null;
  corrigeId?: number;
  motivo?: string;
  capacidade: Record<CampoCapacidade, ValorColetado<number | boolean | string>>;
  itens: RespostaItemInventario[];
}
export interface EntradaConferenciaInventario {
  situacaoConferencia: SituacaoConferenciaInventario;
  motivo?: string;
}

export interface VigenciaExistente {
  id: number;
  inicio: string;
  fim: string | null;
}
export type PlanoVigencia =
  | {
      valido: true;
      /** Versões cujo fim muda (fecha a que cobre a data inicial). */
      fechar: { id: number; fim: string }[];
      /** Fim da nova versão; nulo = aberta. */
      fim: string | null;
    }
  | { valido: false; erros: { field: string; message: string }[] };

export interface DiferencaCampo {
  campo: CampoCapacidade;
  antes: ValorCapacidade<number | boolean | string>;
  depois: ValorCapacidade<number | boolean | string>;
}
export interface DiferencaItem {
  itemId: number;
  tipo: 'adicionado' | 'removido' | 'alterado';
  antes: ItemVersaoInventario | null;
  depois: ItemVersaoInventario | null;
}
export interface DiferencasInventario {
  campos: DiferencaCampo[];
  itens: DiferencaItem[];
  vigencia: {
    antes: [string, string | null];
    depois: [string, string | null];
  } | null;
}
