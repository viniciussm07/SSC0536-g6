import {
  ordenacaoEstavel,
  type EsquemaOData,
  type OrdenacaoOData,
} from '@ssc0536/common';
import type { MapeamentoRecurso } from './prisma-where';

/**
 * `orderBy` do Prisma para o `$orderby` do usuário seguido do desempate do recurso. Colunas
 * opcionais ordenam com nulos por último; relações 1:1 aninham o caminho.
 */
export function compilarOrdenacao(
  ordenacao: readonly OrdenacaoOData[],
  esquema: EsquemaOData,
  mapa: MapeamentoRecurso,
): Record<string, unknown>[] {
  return ordenacaoEstavel(ordenacao, esquema).map((item) => {
    const campo = esquema.campos.find((c) => c.nome === item.campo);
    const caminho = mapa[item.campo]?.caminho;
    if (!campo || !caminho)
      throw new Error(
        `Campo sem mapeamento de ordenação: ${esquema.recurso}.${item.campo}`,
      );
    const folha =
      campo.anulavel && caminho.length === 1
        ? { sort: item.direcao, nulls: 'last' }
        : item.direcao;
    return caminho.reduceRight<unknown>(
      (interno, chave) => ({ [chave]: interno }),
      folha,
    ) as Record<string, unknown>;
  });
}
