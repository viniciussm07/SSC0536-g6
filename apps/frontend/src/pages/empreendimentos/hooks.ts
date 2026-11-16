import { hojeOperacional } from '@/utils/inventario';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { cadastroService } from '@/services/cadastro';
import type { ConsultaColecao } from '@/services/odata';

export function useListaEmpreendimentos(
  acesso: AcessoAtual,
  consulta: ConsultaColecao,
) {
  return useQuery({
    queryKey: [
      'empreendimentos',
      acesso.usuarioId,
      acesso.revisao,
      'lista',
      hojeOperacional(),
      consulta,
    ],
    queryFn: ({ signal }) => cadastroService.listar(consulta, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });
}
