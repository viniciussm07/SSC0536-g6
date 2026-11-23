import type { SituacaoExecucao, SituacaoPublicacao } from '@ssc0536/common';
import type { CorBadge } from '@/components/badge';

export const ROTULOS_SITUACAO_EXECUCAO: Record<SituacaoExecucao, string> = {
  pendente: 'Pendente',
  executando: 'Executando',
  concluido: 'Concluído',
  falhou: 'Falhou',
};
export const CORES_SITUACAO: Record<SituacaoExecucao, CorBadge> = {
  pendente: 'cinza',
  executando: 'amarelo',
  concluido: 'azul',
  falhou: 'vermelho',
};
export const ROTULOS_PUBLICACAO: Record<SituacaoPublicacao, string> = {
  calculado: 'Calculado',
  publicado: 'Publicado',
  substituido: 'Substituído',
};
export const CORES_PUBLICACAO: Record<SituacaoPublicacao, CorBadge> = {
  calculado: 'cinza',
  publicado: 'laranja',
  substituido: 'escuro',
};
