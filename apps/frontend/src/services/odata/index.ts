import {
  CABECALHO_CONTEXTO,
  isColecaoOData,
  type ColecaoOData,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';

export interface ConsultaColecao {
  filter?: string;
  orderby?: string;
  top: number;
  skip: number;
  count?: boolean;
}

/** Transporte único das coleções OData; serializa a consulta e valida o envelope recebido. */
export async function consultarColecao<T>(
  path: string,
  consulta: ConsultaColecao,
  validarLinha: (valor: unknown) => valor is T,
  signal?: AbortSignal,
  contexto?: number | string,
): Promise<ColecaoOData<T>> {
  const parametros = new URLSearchParams({
    $top: String(consulta.top),
    $skip: String(consulta.skip),
    $count: String(consulta.count ?? true),
  });
  if (consulta.filter) parametros.set('$filter', consulta.filter);
  if (consulta.orderby) parametros.set('$orderby', consulta.orderby);
  const valor = await apiClient.request(
    `${path}${path.includes('?') ? '&' : '?'}${parametros}`,
    {
      signal,
      headers:
        contexto === undefined
          ? undefined
          : { [CABECALHO_CONTEXTO]: String(contexto) },
    },
  );
  if (!isColecaoOData(valor, validarLinha))
    throw new Error('Resposta de coleção inesperada.');
  return valor;
}
