import type { MapeamentoRecurso } from '../odata/prisma-where';

/** Mapeamento de `GET /modelos-pesquisa` para o esquema OData do common. */
export const MAPA_MODELOS_PESQUISA: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  nome: { caminho: ['nome'] },
  publicoAlvo: { caminho: ['publicoAlvo'] },
  versao: { caminho: ['versaoAtual'] },
  criadaEm: { caminho: ['criadaEm'] },
};

/** Mapeamento de `GET /modelos-pesquisa/:id/versoes` (histórico imutável). */
export const MAPA_VERSOES_MODELO: MapeamentoRecurso = {
  numero: { caminho: ['numero'] },
  nome: { caminho: ['nome'] },
  publicoAlvo: { caminho: ['publicoAlvo'] },
  criadaEm: { caminho: ['criadaEm'] },
  motivo: { caminho: ['motivo'] },
};
