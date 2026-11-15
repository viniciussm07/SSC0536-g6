import type { MapeamentoRecurso } from '../odata/prisma-where';

/** Mapeamento Prisma do esquema `ESQUEMA_CONTAS` (colunas de `GET /contas`). */
export const MAPA_CONTAS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  nome: { caminho: ['nome'] },
  email: { caminho: ['email'] },
  perfil: { caminho: ['perfil'] },
  ativo: { caminho: ['ativo'] },
};
