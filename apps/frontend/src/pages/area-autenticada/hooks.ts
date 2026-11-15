import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import {
  ESQUEMA_EMPREENDIMENTOS,
  montarFiltro,
  type AcessoAtual,
} from '@ssc0536/common';
import { acessoService } from '@/services/acesso';
import { TAMANHO_PAGINA_GRADE } from '@/utils/grade';

function consultaDoCatalogo(busca: string, pagina: number) {
  const filtro = busca
    ? montarFiltro(
        [{ campo: 'nomeFantasia', operador: 'contem', valor: busca }],
        ESQUEMA_EMPREENDIMENTOS,
      )
    : { valido: true as const, data: '' };
  if (!filtro.valido) throw new Error('Busca de empreendimento inválida.');
  return {
    filter: filtro.data || undefined,
    top: TAMANHO_PAGINA_GRADE,
    skip: (pagina - 1) * TAMANHO_PAGINA_GRADE,
    count: true,
  };
}

// Catálogo para trocar de empreendimento, carregado por páginas conforme a rolagem;
// só consulta com o seletor aberto.
export function useCatalogoEmpreendimentos(
  acesso: AcessoAtual,
  busca: string,
  habilitado: boolean,
) {
  return useInfiniteQuery({
    queryKey: [
      'empreendimentos',
      acesso.usuarioId,
      acesso.revisao,
      'catalogo',
      busca,
    ],
    queryFn: ({ pageParam, signal }) =>
      acessoService.empreendimentos(
        consultaDoCatalogo(busca, pageParam),
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: ({ meta }, _paginas, ultima) =>
      ultima * TAMANHO_PAGINA_GRADE < (meta.total ?? 0)
        ? ultima + 1
        : undefined,
    enabled: habilitado,
    placeholderData: keepPreviousData,
    retry: false,
  });
}
