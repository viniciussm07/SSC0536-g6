import type { MapeamentoRecurso } from '../odata/prisma-where';
export const MAPA_AUDITORIAS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  entidade: { caminho: ['entidade'] },
  entidadeId: { caminho: ['entidadeId'] },
  acao: { caminho: ['acao'] },
  em: { caminho: ['em'] },
  usuarioId: { caminho: ['usuarioId'] },
  autor: { caminho: ['autorNome'] },
  origem: { caminho: ['origem'] },
  processo: { caminho: ['processo'] },
  correlacaoId: { caminho: ['correlacaoId'] },
};
