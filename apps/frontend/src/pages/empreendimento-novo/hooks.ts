import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { EntradaEmpreendimento } from '@ssc0536/common';
import { cadastroService } from '@/services/cadastro';

export function useCriarEmpreendimento() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (entrada: EntradaEmpreendimento) =>
      cadastroService.criar(entrada),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['empreendimentos'] }),
    gcTime: 0,
  });
}
