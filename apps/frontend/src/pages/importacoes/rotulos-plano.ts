import type { MotivoPlano, SituacaoPlano } from '@ssc0536/common';
import type { CorBadge } from '@/components/badge';

export const ROTULOS_SITUACAO_PLANO: Record<SituacaoPlano, string> = {
  novo: 'Nova resposta',
  atualizar: 'Atualiza resposta',
  sem_mudanca: 'Sem mudança',
  conflito: 'Conflito',
  rejeitado: 'Rejeitada',
  pendente: 'Pendente',
  aplicado: 'Aplicada',
};
export const CORES_SITUACAO_PLANO: Record<SituacaoPlano, CorBadge> = {
  novo: 'azul',
  atualizar: 'azul',
  sem_mudanca: 'cinza',
  conflito: 'laranja',
  rejeitado: 'vermelho',
  pendente: 'amarelo',
  aplicado: 'escuro',
};
export const ROTULOS_MOTIVO_PLANO: Record<MotivoPlano, string> = {
  ERRO_DE_LEITURA:
    'A linha tem erro de leitura; corrija na planilha e envie de novo.',
  SEM_OCUPACAO: 'Sem taxa de ocupação: ausência não é zero e nada é gravado.',
  REJEITADO_MANUALMENTE: 'Rejeitada por decisão da equipe.',
  FORA_DO_PUBLICO: 'O empreendimento não está no público desta edição.',
  MANTIDA_EXISTENTE: 'Mantida a resposta já gravada.',
  SEM_CORRESPONDENCIA: 'Escolha o empreendimento correspondente.',
  EMPREENDIMENTO_DUPLICADO_NO_LOTE:
    'Mais de uma linha aponta para este empreendimento; corrija um dos vínculos.',
  SEM_DESTINO: 'Escolha a edição de destino.',
  DIVERGE_DA_EXISTENTE:
    'Já existe resposta diferente. Escolha substituir ou manter.',
};
export const formatarPercentual = (valor: string | null) =>
  valor === null ? '—' : `${valor.replace('.', ',')}%`;
