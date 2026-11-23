import type {
  EstadoLote,
  FonteImportacao,
  SeveridadeOcorrencia,
  SituacaoLinhaImportacao,
  TipoLinhaImportacao,
} from './importacao.constants.js';

/** Linha de `GET /importacoes`. Timestamps em ISO 8601 UTC. */
export interface LoteImportacaoLinha {
  id: number;
  fonte: FonteImportacao;
  nomeArquivo: string;
  tamanhoBytes: number;
  versaoParser: string;
  estado: EstadoLote;
  criadoEm: string;
  lidoEm: string | null;
}

export interface AbaLida {
  nome: string;
  situacao: 'lida' | 'ignorada' | 'ausente';
  motivo?: string;
}

/** Resumo da leitura; a leitura não é importação concluída. */
export interface ResumoLeitura {
  rotuloPeriodo: string | null;
  diarias: number | null;
  abas: AbaLida[];
  linhasEntrada: number;
  linhasVaziasIgnoradas: number;
  colunasIgnoradas: string[];
}

export interface LoteImportacaoDetalhe extends LoteImportacaoLinha {
  sha256: string;
  erroMensagem: string | null;
  resumo: ResumoLeitura | null;
  totais: { linhas: number; erros: number; avisos: number };
}

/** Célula de origem preservada sem interpretação. */
export interface CelulaBruta {
  /** Texto exato do valor armazenado (número serial, texto compartilhado, código de erro). */
  bruto: string | null;
  tipo: 'numero' | 'texto' | 'erro' | 'booleano' | 'vazio';
  formula: string | null;
  /** Número aplicado por formato de percentual (`0%`, `0,00%`). */
  formatoPercentual: boolean;
}

export type CanonicoLinha = Record<string, string | number | null>;

/** Linha de `GET /importacoes/:id/linhas`. */
export interface LinhaImportacaoLinha {
  id: number;
  aba: string;
  linha: number;
  tipo: TipoLinhaImportacao;
  situacao: SituacaoLinhaImportacao;
  celulas: Record<string, CelulaBruta>;
  canonico: CanonicoLinha | null;
}

/** Linha de `GET /importacoes/:id/ocorrencias`. */
export interface OcorrenciaImportacaoLinha {
  id: number;
  aba: string | null;
  linha: number | null;
  coluna: string | null;
  severidade: SeveridadeOcorrencia;
  codigo: string;
  mensagem: string;
  orientacao: string;
}
