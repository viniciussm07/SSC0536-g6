import type { MapeamentoRecurso } from '../odata/prisma-where';

/** Mapeamento de `GET /periodos` para o esquema OData do common. */
export const MAPA_PERIODOS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  tipo: { caminho: ['tipo'] },
  rotulo: { caminho: ['rotulo'] },
  dataInicio: { caminho: ['dataInicio'] },
  dataFim: { caminho: ['dataFim'] },
};
