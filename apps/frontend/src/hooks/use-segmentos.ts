import { useQuery } from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { cadastroService } from '@/services/cadastro';

export function useSegmentos(acesso: AcessoAtual) {
  return useQuery({
    queryKey: ['segmentos', acesso.usuarioId, acesso.revisao],
    queryFn: ({ signal }) => cadastroService.segmentos(signal),
    retry: false,
  });
}
