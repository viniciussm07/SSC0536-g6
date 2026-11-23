import type { MotivoIndisponibilidade } from '../indicadores/indicadores.types.js';
import type { TipoColeta } from '../pesquisas/index.js';
import type {
  FORMATOS_EXPORTACAO_PAINEL,
  GRUPOS_PAINEL,
  ORIGENS_RESULTADO_PAINEL,
  SITUACOES_PAINEL,
} from './painel.constants.js';

export type SituacaoPainel = (typeof SITUACOES_PAINEL)[number];
export type OrigemResultadoPainel = (typeof ORIGENS_RESULTADO_PAINEL)[number];
export type FormatoExportacaoPainel =
  (typeof FORMATOS_EXPORTACAO_PAINEL)[number];
export type GrupoPainel = (typeof GRUPOS_PAINEL)[number];

/** Seleção do painel: `GET /indicadores/painel?periodoId=&tipoColeta=&comparacaoPeriodoId=`. */
export interface ConsultaPainel {
  periodoId: number;
  tipoColeta: TipoColeta;
  comparacaoPeriodoId?: number;
}

/** Valor decimal em texto (nunca ponto flutuante) ou indisponível com motivo; nunca zero. */
export type ValorPainel =
  | { estado: 'disponivel'; valor: string }
  | {
      estado: 'indisponivel';
      motivo: MotivoIndisponibilidade;
      detalhe: string | null;
    };

/** Revisão e momento que identificam o número exibido, em tela, boletim ou exportação. */
export interface FontePainel {
  origem: OrigemResultadoPainel;
  execucaoId: number | null;
  revisao: number | null;
  /** ISO 8601 UTC; nulo na carga histórica. */
  publicadaEm: string | null;
  calculadoEm: string;
}

/** `variacao` = valor − base, na unidade do indicador (pontos percentuais nas taxas). */
export type ComparacaoPainel =
  | {
      estado: 'disponivel';
      valor: string;
      variacao: string;
      fonte: FontePainel;
    }
  | { estado: 'indisponivel' }
  | { estado: 'ausente' };

export interface ItemPainel {
  indicadorId: number;
  codigo: string;
  nome: string;
  unidade: string;
  grupo: GrupoPainel;
  recorte: string;
  metodo: string;
  valor: ValorPainel;
  fonte: FontePainel;
  /** Nulo quando não há período de comparação selecionado. */
  comparacao: ComparacaoPainel | null;
}

export interface PeriodoPainel {
  id: number;
  rotulo: string;
  /** `mes` ou `feriado_prolongado`; só períodos do mesmo tipo são comparáveis. */
  tipo: string;
  dataInicio: string;
  dataFim: string;
}

export interface Painel {
  periodo: PeriodoPainel;
  tipoColeta: TipoColeta;
  comparacao: PeriodoPainel | null;
  situacao: SituacaoPainel;
  itens: ItemPainel[];
  /** Maior `calculadoEm` entre os itens; nulo sem dados. */
  atualizadoEm: string | null;
  aviso: string;
}

/** Combinação período + tipo de coleta que tem ao menos um resultado visível ao perfil. */
export interface OpcaoPainel {
  periodoId: number;
  periodo: string;
  periodoTipo: string;
  tipoColeta: TipoColeta;
}

/** Ponto de uma série: `valor` nulo = sem resultado publicado ou indisponível (nunca zero). */
export interface PontoSerie {
  periodoId: number;
  valor: string | null;
}

export interface SerieIndicador {
  indicadorId: number;
  codigo: string;
  nome: string;
  unidade: string;
  recorte: string;
  metodo: string;
  pontos: PontoSerie[];
}

/** Evolução dos indicadores visíveis ao perfil, do período mais antigo ao mais recente. */
export interface SeriePainel {
  tipoColeta: TipoColeta;
  periodos: PeriodoPainel[];
  series: SerieIndicador[];
  /** Feriados prolongados que se sobrepõem ao intervalo dos períodos (sazonalidade). */
  feriados: PeriodoPainel[];
}

export interface ConsultaExportacaoPainel extends ConsultaPainel {
  formato: FormatoExportacaoPainel;
}

/** Participação de uma edição: meios convidados e meios que responderam (sem dado pessoal). */
export interface EdicaoParticipacao {
  pesquisaId: number;
  periodoId: number;
  periodo: string;
  /** Início do período (YYYY-MM-DD), para ordenar. */
  dataInicio: string;
  destinatarios: number;
  respondentes: number;
}

export interface ParticipacaoPainel {
  tipoColeta: TipoColeta;
  edicoes: EdicaoParticipacao[];
}
