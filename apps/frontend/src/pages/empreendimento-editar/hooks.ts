import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AlteracaoEmpreendimento } from '@ssc0536/common';
import { cadastroService } from '@/services/cadastro';

export function useAlterarEmpreendimento(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (entrada: AlteracaoEmpreendimento) =>
      cadastroService.alterar(id, entrada),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['empreendimentos'] }),
    gcTime: 0,
  });
}
