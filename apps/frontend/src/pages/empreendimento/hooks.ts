import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { acessoService } from '@/services/acesso';
import { HttpError } from '@/services/http';
import { permite } from '@/utils/acesso';

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
export function useEmpreendimentos(acesso: AcessoAtual, page: number) {
  return useQuery({
    queryKey: ['empreendimentos', acesso.usuarioId, acesso.revisao, page],
    queryFn: ({ signal }) => acessoService.empreendimentos(page, signal),
    enabled: permite(acesso, 'empreendimentos', 'consultar'),
    retry: false,
  });
}
export function useDetalhesEmpreendimento(
  acesso: AcessoAtual,
  id: number,
  paginaInventarios: number,
  paginaRespostas: number,
) {
  const inventarios = useQuery({
    queryKey: [
      'inventarios',
      acesso.usuarioId,
      acesso.revisao,
      id,
      paginaInventarios,
    ],
    queryFn: ({ signal }) =>
      acessoService.inventarios(id, paginaInventarios, signal),
    enabled: permite(acesso, 'inventarios', 'consultar'),
    retry: false,
  });
  const respostas = useQuery({
    queryKey: [
      'respostas',
      acesso.usuarioId,
      acesso.revisao,
      id,
      paginaRespostas,
    ],
    queryFn: ({ signal }) =>
      acessoService.respostas(id, paginaRespostas, signal),
    enabled: permite(acesso, 'respostas', 'consultar'),
    retry: false,
  });
  return { inventarios, respostas };
}
export function useIndicadores(acesso: AcessoAtual, page: number) {
  const indicadores = useQuery({
    queryKey: ['indicadores', acesso.usuarioId, acesso.revisao, page],
    queryFn: ({ signal }) => acessoService.indicadores(page, signal),
    enabled: permite(acesso, 'indicadores', 'consultar'),
    retry: false,
  });
  const exportar = useMutation({
    mutationFn: () => acessoService.exportarIndicadores(page),
    gcTime: 0,
  });
  return { indicadores, exportar };
}
