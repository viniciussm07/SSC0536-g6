import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { acessoService } from '@/services/acesso';

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
      acessoService.empreendimentos(pageParam, signal, busca || undefined),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) =>
      meta.page < meta.totalPages ? meta.page + 1 : undefined,
    enabled: habilitado,
    placeholderData: keepPreviousData,
    retry: false,
  });
}
