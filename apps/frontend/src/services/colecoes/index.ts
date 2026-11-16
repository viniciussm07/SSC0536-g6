import {
  CABECALHO_CONTEXTO,
  caminhoColecao,
  type DefinicaoColecao,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import type { ConsultaColecao } from '@/services/odata';

export function baixarColecao(
  colecao: DefinicaoColecao,
  parametros: Readonly<Record<string, string | number>>,
  consulta: Pick<ConsultaColecao, 'filter' | 'orderby'>,
  signal: AbortSignal,
  contexto?: number,
) {
  const query = new URLSearchParams();
  if (consulta.filter) query.set('$filter', consulta.filter);
  if (consulta.orderby) query.set('$orderby', consulta.orderby);
  return apiClient.baixar(
    `${caminhoColecao(colecao, parametros)}/exportacoes?${query}`,
    {
      signal,
      headers:
        contexto === undefined
          ? undefined
          : { [CABECALHO_CONTEXTO]: String(contexto) },
    },
  );
}
