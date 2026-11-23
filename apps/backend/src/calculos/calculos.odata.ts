import type { MapeamentoRecurso } from '../odata/prisma-where';

/** Mapeamento de `GET /calculos`. */
export const MAPA_CALCULOS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  periodoId: { caminho: ['periodoId'] },
  periodo: { caminho: ['periodo', 'rotulo'] },
  tipoColeta: { caminho: ['tipoColeta'] },
  pesquisaId: { caminho: ['pesquisaId'] },
  pesquisa: { caminho: ['pesquisa', 'titulo'] },
  perguntaId: { caminho: ['perguntaId'] },
  revisao: { caminho: ['revisao'] },
  versaoFormula: { caminho: ['versaoFormula'] },
  situacao: { caminho: ['situacao'] },
  publicacao: { caminho: ['publicacao'] },
  motivo: { caminho: ['motivo'] },
  erro: { caminho: ['erro'] },
  solicitadaEm: { caminho: ['solicitadaEm'] },
  solicitadaPor: { caminho: ['solicitadaPor', 'nome'] },
  concluidaEm: { caminho: ['concluidaEm'] },
  publicadaEm: { caminho: ['publicadaEm'] },
  publicadaPorId: { caminho: ['publicadaPorId'] },
};
