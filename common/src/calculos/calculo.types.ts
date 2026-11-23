import type {
  COMPARACOES_INSUMOS,
  METODOS_RESULTADO,
  ORIGENS_POPULACAO,
  SITUACOES_CAPACIDADE,
  SITUACOES_EXECUCAO,
  SITUACOES_INSUMO,
  SITUACOES_PUBLICACAO,
} from './calculo.constants.js';
import type { TipoColeta } from '../pesquisas/edicao.constants.js';
import type { ValorIndicador } from '../indicadores/indicadores.types.js';

export type SituacaoExecucao = (typeof SITUACOES_EXECUCAO)[number];
export type SituacaoPublicacao = (typeof SITUACOES_PUBLICACAO)[number];
export type OrigemPopulacao = (typeof ORIGENS_POPULACAO)[number];
export type SituacaoCapacidade = (typeof SITUACOES_CAPACIDADE)[number];
export type SituacaoInsumo = (typeof SITUACOES_INSUMO)[number];
export type ComparacaoInsumos = (typeof COMPARACOES_INSUMOS)[number];
export type MetodoResultado = (typeof METODOS_RESULTADO)[number];

/**
 * `POST /calculos`: calcula os indicadores da tabulação a partir de uma pergunta percentual
 * (taxa de ocupação) de uma edição. Período e tipo de coleta vêm da pergunta e da edição.
 */
export interface EntradaExecucaoCalculo {
  perguntaId: number;
  motivo?: string;
}

/** `POST /calculos/:id/publicacao`. O motivo é obrigatório ao substituir outra publicação. */
export interface EntradaPublicacaoCalculo {
  motivo?: string;
}

/** Meio da população com a capacidade escolhida e a resposta usada (ou `null`). */
export interface MeioInsumo {
  empreendimentoId: number;
  nomeFantasia: string;
  /** Categoria do recorte por tipo (`categoriaIndicador`); `null` = não classificado. */
  tipo: string | null;
  capacidade: SituacaoCapacidade;
  /** Versão de inventário usada; com `varia_no_periodo`, a lista de versões que se cruzam. */
  inventarioVersaoIds: number[];
  uhs: number | null;
  leitos: number | null;
  maxLeitosPorUh: number | null;
  respostaId: number | null;
  /** Percentual 0–100 em texto; `null` = não respondeu. */
  taxaOcupacao: string | null;
}

export interface RhcInsumo {
  situacao: SituacaoInsumo;
  rhcPeriodoIds: number[];
  qtdRhc: number | null;
  leitos: number | null;
}

export interface ParametroInsumo {
  chave: string;
  situacao: SituacaoInsumo;
  parametroIds: number[];
  /** Decimal em texto; `null` quando ausente ou ambíguo. */
  valor: string | null;
}

/**
 * Retrato imutável dos insumos, lido numa única transação. O cálculo usa só este retrato:
 * repetir a execução reproduz o mesmo resultado, e a comparação com os insumos atuais
 * mostra se uma fonte mudou depois.
 */
export interface InsumosCalculo {
  versaoFormula: number;
  periodo: {
    id: number;
    rotulo: string;
    dataInicio: string;
    dataFim: string;
    diasPeriodo: number;
  };
  pesquisa: { id: number; titulo: string; tipoColeta: TipoColeta };
  pergunta: { id: number; rotulo: string };
  populacao: OrigemPopulacao;
  meios: MeioInsumo[];
  rhc: RhcInsumo;
  parametros: ParametroInsumo[];
}

/** Linha de `GET /calculos`. Instantes em ISO 8601 UTC. */
export interface ExecucaoCalculoLinha {
  id: number;
  periodoId: number;
  periodo: string;
  tipoColeta: TipoColeta;
  pesquisaId: number;
  pesquisa: string;
  perguntaId: number;
  /** Revisão da série da pergunta; atribuída na conclusão. */
  revisao: number | null;
  versaoFormula: number;
  situacao: SituacaoExecucao;
  publicacao: SituacaoPublicacao;
  motivo: string | null;
  erro: string | null;
  solicitadaEm: string;
  solicitadaPor: string;
  concluidaEm: string | null;
  publicadaEm: string | null;
  publicadaPorId: number | null;
}

/** Resultado de uma execução. Indisponível nunca vira zero. */
export interface ResultadoCalculo {
  id: number;
  indicadorId: number;
  codigo: string;
  nome: string;
  unidade: string;
  recorte: string;
  metodo: string;
  valor: ValorIndicador;
}

/** Detalhe de `GET /calculos/:id`, com linhagem e comparação com os insumos atuais. */
export interface ExecucaoCalculoDetalhe extends ExecucaoCalculoLinha {
  motivoPublicacao: string | null;
  substituidaPorId: number | null;
  insumos: InsumosCalculo;
  /** `null` enquanto os insumos atuais não puderem ser lidos (período ou pergunta removidos). */
  insumosAtuais: ComparacaoInsumos | null;
  resultados: ResultadoCalculo[];
}

/** Resposta de `POST /calculos`: `reaproveitada` quando os insumos repetem a última revisão. */
export interface SolicitacaoCalculo {
  execucao: ExecucaoCalculoDetalhe;
  reaproveitada: boolean;
}
