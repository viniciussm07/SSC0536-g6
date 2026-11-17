import {
  ODATA_LIMITES,
  isIndicadorConsulta,
  type IndicadorConsulta,
} from '@ssc0536/common';
import { endpoints } from '@/services/endpoints';
import { consultarColecao } from '@/services/odata';

/** Limite de páginas lidas para o painel; acima dele a série é marcada como truncada. */
export const PAGINAS_MAXIMAS_PAINEL = 10;

export interface SerieIndicadores {
  linhas: IndicadorConsulta[];
  total: number;
  truncada: boolean;
}

export const indicadoresService = {
  /**
   * Lê todas as páginas de `GET /indicadores` para o filtro OData informado, em ordem
   * cronológica estável. O escopo continua decidido pelo servidor (só indicadores liberados).
   */
  async serie(
    filtro: string | undefined,
    signal?: AbortSignal,
  ): Promise<SerieIndicadores> {
    const top = ODATA_LIMITES.topMaximo;
    const linhas: IndicadorConsulta[] = [];
    let total = 0;
    for (let pagina = 0; pagina < PAGINAS_MAXIMAS_PAINEL; pagina++) {
      const resposta = await consultarColecao(
        endpoints.acesso.indicadores,
        {
          filter: filtro,
          orderby: 'periodoInicio asc,periodoId asc,id asc',
          top,
          skip: pagina * top,
          count: true,
        },
        isIndicadorConsulta,
        signal,
      );
      total = resposta.meta.total ?? linhas.length + resposta.data.length;
      linhas.push(...resposta.data);
      if (resposta.data.length < top || linhas.length >= total) break;
    }
    return { linhas, total, truncada: linhas.length < total };
  },
};
