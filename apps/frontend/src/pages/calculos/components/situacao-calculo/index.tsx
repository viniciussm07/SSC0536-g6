import type { SituacaoExecucao, SituacaoPublicacao } from '@ssc0536/common';
import { Badge } from '@/components/badge';
import {
  CORES_PUBLICACAO,
  CORES_SITUACAO,
  ROTULOS_PUBLICACAO,
  ROTULOS_SITUACAO_EXECUCAO,
} from '../../rotulos';

export const BadgeSituacao = ({ situacao }: { situacao: SituacaoExecucao }) => (
  <Badge cor={CORES_SITUACAO[situacao]}>
    {ROTULOS_SITUACAO_EXECUCAO[situacao]}
  </Badge>
);
export const BadgePublicacao = ({
  publicacao,
}: {
  publicacao: SituacaoPublicacao;
}) => (
  <Badge cor={CORES_PUBLICACAO[publicacao]}>
    {ROTULOS_PUBLICACAO[publicacao]}
  </Badge>
);
