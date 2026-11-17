import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AlteracaoModeloPesquisa } from '@ssc0536/common';
import { modelosPesquisaService } from '@/services/pesquisas';

/** Mudanças do modelo invalidam a grade, os detalhes e o histórico de versões. */
export function useModeloMutations() {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({ queryKey: ['modelos'] });
  };
  const criar = useMutation({
    mutationFn: modelosPesquisaService.criar,
    onSuccess: atualizar,
  });
  const alterar = useMutation({
    mutationFn: ({
      id,
      alteracao,
    }: {
      id: number;
      alteracao: AlteracaoModeloPesquisa;
    }) => modelosPesquisaService.alterar(id, alteracao),
    onSuccess: atualizar,
  });
  return { criar, alterar };
}

/** Detalhe do modelo (com os campos); a edição parte dele para preservar a identidade. */
export function useModeloDetalhe(id?: number) {
  return useQuery({
    queryKey: ['modelos', 'detalhe', id],
    queryFn: ({ signal }) =>
      modelosPesquisaService.detalhe(id as number, signal),
    enabled: id !== undefined,
    retry: false,
  });
}
