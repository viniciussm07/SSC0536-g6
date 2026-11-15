import { useQuery } from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { cadastroService } from '@/services/cadastro';

/** Detalhe cadastral do empreendimento contextualizado (envia o contexto ao servidor). */
export function useDetalheEmpreendimento(acesso: AcessoAtual, id: number) {
  return useQuery({
    queryKey: [
      'empreendimentos',
      acesso.usuarioId,
      acesso.revisao,
      'detalhe',
      id,
    ],
    queryFn: ({ signal }) => cadastroService.detalhe(id, signal),
    retry: false,
  });
}
