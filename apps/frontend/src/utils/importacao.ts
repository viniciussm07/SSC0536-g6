import type { EstadoLote, FonteImportacao } from '@ssc0536/common';
import type { CorBadge } from '@/components/badge';

export const ROTULOS_FONTE: Record<FonteImportacao, string> = {
  tabulacao_consolidado: 'Tabulação de ocupação consolidada',
  tabulacao_expectativa: 'Tabulação de expectativa de ocupação',
};

/** Consolidado é ocupação realizada; Expectativa é intenção declarada (não é previsão estatística). */
export const ROTULOS_OCUPACAO: Record<FonteImportacao, string> = {
  tabulacao_consolidado: 'Ocupação',
  tabulacao_expectativa: 'Ocupação esperada',
};
/** Estado da leitura do arquivo; a confirmação é outra etapa, mostrada no detalhe. */
export const ROTULOS_ESTADO: Record<EstadoLote, string> = {
  recebido: 'Recebido',
  lendo: 'Em leitura',
  lido: 'Leitura concluída',
  erro: 'Erro na leitura',
};
export const CORES_ESTADO: Record<EstadoLote, CorBadge> = {
  recebido: 'cinza',
  lendo: 'amarelo',
  lido: 'azul',
  erro: 'vermelho',
};

export const formatarTamanho = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
export const formatarInstante = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR') : '—';

export const ROTULOS_CONFIRMACAO = {
  nao_confirmado: 'Ainda não confirmado',
  parcial: 'Confirmação parcial',
  concluido: 'Confirmação concluída',
} as const;
export const CORES_CONFIRMACAO: Record<
  keyof typeof ROTULOS_CONFIRMACAO,
  CorBadge
> = {
  nao_confirmado: 'cinza',
  parcial: 'laranja',
  concluido: 'escuro',
};
