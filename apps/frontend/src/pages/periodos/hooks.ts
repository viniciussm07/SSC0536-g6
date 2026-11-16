import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AlteracaoPeriodo } from '@ssc0536/common';
import { periodosService } from '@/services/periodos';

/** Mudanças de período invalidam a grade e os detalhes consultados. */
export function usePeriodoMutations() {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({ queryKey: ['periodos'] });
  };
  const criar = useMutation({
    mutationFn: periodosService.criar,
    onSuccess: atualizar,
  });
  const alterar = useMutation({
    mutationFn: ({
      id,
      alteracao,
    }: {
      id: number;
      alteracao: AlteracaoPeriodo;
    }) => periodosService.alterar(id, alteracao),
    onSuccess: atualizar,
  });
  return { criar, alterar };
}

/** Detalhe do período (inclui `emUso`); a edição usa-o para travar datas e tipo. */
export function usePeriodoDetalhe(id?: number) {
  return useQuery({
    queryKey: ['periodos', 'detalhe', id],
    queryFn: ({ signal }) => periodosService.detalhe(id as number, signal),
    enabled: id !== undefined,
    retry: false,
  });
}
