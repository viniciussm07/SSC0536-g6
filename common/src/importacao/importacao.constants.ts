/** Caminhos sob /api. */
export const IMPORTACAO_RECURSOS = {
  importacoes: '/importacoes',
} as const;

/** Famílias de planilha com parser próprio. Não há parser genérico por semelhança de nome. */
export const FONTES_IMPORTACAO = ['tabulacao_consolidado'] as const;
export type FonteImportacao = (typeof FONTES_IMPORTACAO)[number];

/** `recebido`: original guardado; `lendo`: leitura em curso; `lido`: prévia gerada; `erro`: leitura falhou. */
export const ESTADOS_LOTE = ['recebido', 'lendo', 'lido', 'erro'] as const;
export type EstadoLote = (typeof ESTADOS_LOTE)[number];

export const SEVERIDADES_OCORRENCIA = ['erro', 'aviso'] as const;
export type SeveridadeOcorrencia = (typeof SEVERIDADES_OCORRENCIA)[number];

/** `cabecalho`: metadados da aba (período, dias); `entrada`: valor primário informado. */
export const TIPOS_LINHA_IMPORTACAO = ['cabecalho', 'entrada'] as const;
export type TipoLinhaImportacao = (typeof TIPOS_LINHA_IMPORTACAO)[number];

export const SITUACOES_LINHA_IMPORTACAO = ['valida', 'aviso', 'erro'] as const;
export type SituacaoLinhaImportacao =
  (typeof SITUACOES_LINHA_IMPORTACAO)[number];

/** Cabeçalho que leva o nome original do arquivo (URL-encoded) no upload binário. */
export const CABECALHO_NOME_ARQUIVO = 'x-nome-arquivo';

export const LIMITES_IMPORTACAO = {
  /** O maior arquivo do acervo tem 4 MB; a tabulação, cerca de 100 KB. */
  tamanhoMaximoBytes: 5 * 1024 * 1024,
  nomeArquivo: 255,
  /** Proteção contra pacotes compactados maliciosos (zip bomb). */
  entradasPacoteMaximas: 300,
  descompactadoMaximoBytes: 64 * 1024 * 1024,
  linhasMaximas: 5000,
  celulaMaximaCaracteres: 2000,
} as const;

/** Lido pela interface para identificar o mapeamento aprovado de cada fonte. */
export const VERSOES_PARSER: Readonly<Record<FonteImportacao, string>> = {
  tabulacao_consolidado: 'tabulacao-consolidado/1',
};

export const CODIGOS_OCORRENCIA = [
  'ARQUIVO_INVALIDO',
  'FORMATO_NAO_HOMOLOGADO',
  'MACRO_PRESENTE',
  'LINK_EXTERNO',
  'LAYOUT_DESCONHECIDO',
  'ABA_AUSENTE',
  'CABECALHO_ALTERADO',
  'FORMULA_SEM_VALOR',
  'FORMULA_EM_ENTRADA',
  'VALOR_DE_ERRO',
  'ESCALA_AMBIGUA',
  'VALOR_INVALIDO',
  'NOME_AUSENTE',
  'NOME_DUPLICADO',
  'OCUPACAO_AUSENTE',
  'DIARIAS_INVALIDAS',
  'PERIODO_AUSENTE',
  'LIMITE_EXCEDIDO',
  'SEM_DADOS',
] as const;
export type CodigoOcorrencia = (typeof CODIGOS_OCORRENCIA)[number];

/** Estado da confirmação do lote (parte 09), independente do estado da leitura. */
export const CONFIRMACOES_LOTE = [
  'nao_confirmado',
  'parcial',
  'concluido',
] as const;
export type ConfirmacaoLote = (typeof CONFIRMACOES_LOTE)[number];

/** Situação de cada linha no plano de alterações; as sete somam o total de linhas lidas. */
export const SITUACOES_PLANO = [
  'novo',
  'atualizar',
  'sem_mudanca',
  'conflito',
  'rejeitado',
  'pendente',
  'aplicado',
] as const;
export type SituacaoPlano = (typeof SITUACOES_PLANO)[number];

/** Motivo estável de rejeição ou pendência, para a tela e o CSV de rejeições. */
export const MOTIVOS_PLANO = [
  'ERRO_DE_LEITURA',
  'SEM_OCUPACAO',
  'REJEITADO_MANUALMENTE',
  'FORA_DO_PUBLICO',
  'MANTIDA_EXISTENTE',
  'SEM_CORRESPONDENCIA',
  'EMPREENDIMENTO_DUPLICADO_NO_LOTE',
  'SEM_DESTINO',
  'DIVERGE_DA_EXISTENTE',
] as const;
export type MotivoPlano = (typeof MOTIVOS_PLANO)[number];

export const TIPOS_DECISAO = ['vincular', 'rejeitar'] as const;
export type TipoDecisao = (typeof TIPOS_DECISAO)[number];

export const RESOLUCOES_CONFLITO = ['substituir', 'manter'] as const;
export type ResolucaoConflito = (typeof RESOLUCOES_CONFLITO)[number];

export const ACOES_APLICACAO = ['criar', 'atualizar', 'sem_mudanca'] as const;
export type AcaoAplicacao = (typeof ACOES_APLICACAO)[number];

/** Origem da correspondência usada em uma linha. */
export type OrigemDecisao = 'manual' | 'correspondencia_salva';

export const CANAL_RESPOSTA_IMPORTACAO = 'importacao';

export const LIMITES_CONCILIACAO = {
  motivo: 500,
  candidatos: 5,
} as const;
