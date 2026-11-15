import {
  ODATA_LIMITES,
  condicoesDoFiltro,
  lerFiltro,
  lerOrdenacao,
  montarFiltro,
  validarFiltro,
  type CondicaoColuna,
  type EsquemaOData,
  type OrdenacaoOData,
} from '@ssc0536/common';
import type { ConsultaColecao } from '@/services/odata';

export const TAMANHO_PAGINA_GRADE = 20;

export type BuscaGrade = Record<string, string | number | undefined>;

export interface EstadoGrade {
  filter: string;
  orderby: string;
  page: number;
}

const chave = (id: string, sufixo: 'filter' | 'orderby' | 'page') =>
  `${id}.${sufixo}`;

const paginaValida = (valor: unknown): number | null => {
  if (typeof valor !== 'number' && typeof valor !== 'string') return null;
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return Number.isSafeInteger(numero) &&
    numero >= 1 &&
    (numero - 1) * TAMANHO_PAGINA_GRADE <= ODATA_LIMITES.skipMaximo
    ? numero
    : null;
};

const filtroValido = (valor: unknown, esquema: EsquemaOData) => {
  if (
    typeof valor !== 'string' ||
    !valor ||
    valor.length > ODATA_LIMITES.filtroCaracteres
  )
    return false;
  const lido = lerFiltro(valor);
  return lido.valido && validarFiltro(lido.data, esquema).length === 0;
};

/** Validador de search params por rota; preserva somente estado OData válido da grade. */
export function validarBuscaDaGrade(
  busca: Record<string, unknown>,
  id: string,
  esquema: EsquemaOData,
): BuscaGrade {
  const validada: BuscaGrade = {};
  const filter = busca[chave(id, 'filter')];
  if (filtroValido(filter, esquema))
    validada[chave(id, 'filter')] = String(filter);
  const orderby = busca[chave(id, 'orderby')];
  if (
    typeof orderby === 'string' &&
    orderby &&
    lerOrdenacao(orderby, esquema).valido
  )
    validada[chave(id, 'orderby')] = orderby;
  const page = paginaValida(busca[chave(id, 'page')]);
  if (page && page > 1) validada[chave(id, 'page')] = page;
  return validada;
}

/** Combina validadores quando uma rota contém mais de uma grade namespaced. */
export function validarBuscaDasGrades(
  busca: Record<string, unknown>,
  grades: readonly { id: string; esquema: EsquemaOData }[],
): BuscaGrade {
  return Object.assign(
    {},
    ...grades.map(({ id, esquema }) => validarBuscaDaGrade(busca, id, esquema)),
  );
}

export function estadoDaGrade(busca: BuscaGrade, id: string): EstadoGrade {
  return {
    filter:
      typeof busca[chave(id, 'filter')] === 'string'
        ? String(busca[chave(id, 'filter')])
        : '',
    orderby:
      typeof busca[chave(id, 'orderby')] === 'string'
        ? String(busca[chave(id, 'orderby')])
        : '',
    page: paginaValida(busca[chave(id, 'page')]) ?? 1,
  };
}

export function buscaComEstadoDaGrade(
  busca: BuscaGrade,
  id: string,
  estado: Partial<EstadoGrade>,
): BuscaGrade {
  const atual = { ...estadoDaGrade(busca, id), ...estado };
  const proxima = { ...busca };
  const definir = (sufixo: 'filter' | 'orderby', valor: string) => {
    if (valor) proxima[chave(id, sufixo)] = valor;
    else delete proxima[chave(id, sufixo)];
  };
  definir('filter', atual.filter);
  definir('orderby', atual.orderby);
  if (atual.page > 1) proxima[chave(id, 'page')] = atual.page;
  else delete proxima[chave(id, 'page')];
  return proxima;
}

export function consultaDaGrade(estado: EstadoGrade): ConsultaColecao {
  return {
    filter: estado.filter || undefined,
    orderby: estado.orderby || undefined,
    top: TAMANHO_PAGINA_GRADE,
    skip: (estado.page - 1) * TAMANHO_PAGINA_GRADE,
    count: true,
  };
}

export function condicoesEditaveis(
  filter: string,
  esquema: EsquemaOData,
): CondicaoColuna[] | null {
  if (!filter) return [];
  const lido = lerFiltro(filter);
  if (!lido.valido || validarFiltro(lido.data, esquema).length) return null;
  return condicoesDoFiltro(lido.data);
}

export function ordenacaoDaGrade(
  orderby: string,
  esquema: EsquemaOData,
): OrdenacaoOData[] {
  if (!orderby) return [];
  const lida = lerOrdenacao(orderby, esquema);
  return lida.valido ? lida.data : [];
}

/** Preserva a expressão original quando ela não pode ser editada por coluna. */
export function filtroComCondicao(
  filter: string,
  condicao: CondicaoColuna,
  esquema: EsquemaOData,
) {
  const existentes = condicoesEditaveis(filter, esquema);
  const montado = montarFiltro(
    [
      ...(existentes ?? []).filter((item) => item.campo !== condicao.campo),
      condicao,
    ],
    esquema,
  );
  if (!montado.valido || existentes !== null) return montado;
  const combinado = `(${filter}) and (${montado.data})`;
  const lido = lerFiltro(combinado);
  if (!lido.valido) return lido;
  const erros = validarFiltro(lido.data, esquema);
  return erros.length
    ? { valido: false as const, erros }
    : { valido: true as const, data: combinado };
}
