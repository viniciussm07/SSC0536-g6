import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { acessoService } from '@/services/acesso';
import { HttpError } from '@/services/http';

export function usePermissoes(usuarioId: number) {
  const client = useQueryClient();
  return useQuery({
    queryKey: ['acesso', usuarioId],
    retry: false,
    refetchInterval: 15000,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      try {
        const acesso = await acessoService.atual(signal);
        const anterior = client.getQueryData<AcessoAtual>([
          'acesso',
          usuarioId,
        ]);
        if (anterior && anterior.revisao !== acesso.revisao)
          client.removeQueries({
            predicate: (q) =>
              !['sessao', 'acesso'].includes(String(q.queryKey[0])),
          });
        return acesso;
      } catch (error) {
        if (error instanceof HttpError && [401, 403].includes(error.status)) {
          client.removeQueries({
            predicate: (q) =>
              !['sessao', 'acesso'].includes(String(q.queryKey[0])),
          });
          if (error.status === 401)
            await client.invalidateQueries({ queryKey: ['sessao', 'atual'] });
        }
        throw error;
      }
    },
  });
}
