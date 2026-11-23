import type {
  AcaoAplicacao,
  ConfirmacaoLote,
  EstadoLote,
  MotivoPlano,
  OrigemDecisao,
  ResolucaoConflito,
  SituacaoPlano,
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

/** Edição e pergunta de ocupação que recebem as respostas deste lote. */
export interface DestinoImportacao {
  pesquisaId: number;
  perguntaId: number;
  tituloPesquisa: string;
  rotuloPeriodo: string;
  dataInicio: string;
  dataFim: string;
}

export interface LoteImportacaoDetalhe extends LoteImportacaoLinha {
  sha256: string;
  destino: DestinoImportacao | null;
  confirmacao: ConfirmacaoLote;
  confirmadoEm: string | null;
  /** Respostas mudaram por importação; o recálculo dos indicadores consome este sinal. */
  recalculoPendente: boolean;
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

export interface CandidatoEmpreendimento {
  id: number;
  nomeFantasia: string;
  situacao: string;
  motivo: 'nome_igual' | 'nome_parecido' | 'correspondencia_salva';
}

/** Uma linha do plano de alterações, com o que aconteceria se o lote fosse confirmado. */
export interface ItemPlano {
  linhaId: number;
  linha: number;
  nomeInformado: string | null;
  /** Percentual 0–100 como texto decimal; `null` quando a planilha não informou. */
  ocupacaoPercentual: string | null;
  situacao: SituacaoPlano;
  motivo: MotivoPlano | null;
  empreendimento: { id: number; nomeFantasia: string } | null;
  origemDecisao: OrigemDecisao | null;
  /** Valor já gravado na edição para o empreendimento, quando existe. */
  valorAtual: string | null;
  candidatos: CandidatoEmpreendimento[];
  /** Resolução de conflito escolhida, quando houver. */
  resolucao: ResolucaoConflito | null;
  acaoAplicada: AcaoAplicacao | null;
}

/** As sete situações somam `lidas`: nada some do total. */
export interface TotaisPlano {
  lidas: number;
  novos: number;
  atualizados: number;
  semMudanca: number;
  conflitos: number;
  rejeitados: number;
  pendentes: number;
  aplicados: number;
}

export interface PlanoImportacao {
  loteId: number;
  destino: DestinoImportacao | null;
  confirmacao: ConfirmacaoLote;
  /** Avisos de conferência (período, diárias) que não bloqueiam a confirmação. */
  avisos: string[];
  /** Pronto para confirmar: há destino e ao menos uma linha a aplicar. */
  podeConfirmar: boolean;
  totais: TotaisPlano;
  itens: ItemPlano[];
}

export interface EntradaDestino {
  pesquisaId: number;
  perguntaId: number;
}
export type EntradaDecisao =
  | { tipo: 'vincular'; empreendimentoId: number }
  | { tipo: 'rejeitar'; motivo?: string };
export interface EntradaConflito {
  resolucao: ResolucaoConflito;
}
/** Totais exibidos ao confirmar; o servidor recusa se o plano mudou desde então. */
export interface EntradaConfirmacao {
  novos: number;
  atualizados: number;
}
export interface ResultadoConfirmacao {
  confirmacao: ConfirmacaoLote;
  criadas: number;
  atualizadas: number;
  semMudanca: number;
  pendentes: number;
  conflitos: number;
  rejeitadas: number;
  recalculoPendente: boolean;
}
