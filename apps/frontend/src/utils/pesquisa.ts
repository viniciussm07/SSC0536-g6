import type {
  SituacaoDestinatario,
  SituacaoPesquisa,
  StatusPesquisa,
  TipoColeta,
} from '@ssc0536/common';
import type { CorBadge } from '@/components/badge';

/** Rótulos de edições de pesquisa compartilhados pela gestão e pelo painel do empreendimento. */
export const ROTULOS_TIPO_COLETA: Record<TipoColeta, string> = {
  expectativa: 'Expectativa',
  consolidado: 'Consolidado',
};
export const ROTULOS_STATUS_PESQUISA: Record<StatusPesquisa, string> = {
  rascunho: 'Rascunho',
  aberta: 'Aberta',
  encerrada: 'Encerrada',
};
export const CORES_STATUS_PESQUISA: Record<StatusPesquisa, CorBadge> = {
  rascunho: 'cinza',
  aberta: 'laranja',
  encerrada: 'escuro',
};
export const ROTULOS_SITUACAO_PESQUISA: Record<SituacaoPesquisa, string> = {
  rascunho: 'Rascunho',
  agendada: 'Agendada',
  recebendo: 'Recebendo respostas',
  expirada: 'Prazo vencido',
  encerrada: 'Encerrada',
};
export const CORES_SITUACAO_PESQUISA: Record<SituacaoPesquisa, CorBadge> = {
  rascunho: 'cinza',
  agendada: 'azul',
  recebendo: 'laranja',
  expirada: 'amarelo',
  encerrada: 'escuro',
};
export const ROTULOS_SITUACAO_RESPOSTA: Record<SituacaoDestinatario, string> = {
  respondeu: 'Respondeu',
  pendente: 'Pendente',
};
export const CORES_TIPO_COLETA: Record<TipoColeta, CorBadge> = {
  expectativa: 'azul',
  consolidado: 'laranja',
};
