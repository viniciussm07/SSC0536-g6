import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { autenticacaoService } from '@/services/autenticacao';
import type {
  EntradaLogin,
  EntradaAtivacao,
  SessaoAtual,
} from '@ssc0536/common';

export const SESSAO_QUERY_KEY = ['sessao', 'atual'] as const;
export function useAcesso() {
  const client = useQueryClient();
  const removerDados = () =>
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'sessao',
    });
  const sessao = useQuery({
    queryKey: SESSAO_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const data = await autenticacaoService.atual(signal);
      const anterior = client.getQueryData<SessaoAtual | null>(
        SESSAO_QUERY_KEY,
      );
      if (!data || (anterior && anterior.usuario.id !== data.usuario.id))
        removerDados();
      return data;
    },
    retry: false,
    staleTime: 0,
    refetchInterval: (query) =>
      Math.max(
        1000,
        Math.min(
          60000,
          query.state.data
            ? Date.parse(query.state.data.expiraEm) - Date.now()
            : 60000,
        ),
      ),
  });
  const limpar = async () => {
    await client.cancelQueries();
    removerDados();
    client.setQueryData(SESSAO_QUERY_KEY, null);
  };
  const entrar = useMutation({
    mutationFn: (entrada: EntradaLogin) => autenticacaoService.entrar(entrada),
    onSuccess: async (data) => {
      await limpar();
      client.setQueryData(SESSAO_QUERY_KEY, data);
      await client.invalidateQueries({ queryKey: SESSAO_QUERY_KEY });
    },
    gcTime: 0,
  });
  const sair = useMutation({
    mutationFn: autenticacaoService.sair,
    onSuccess: limpar,
    gcTime: 0,
  });
  const ativar = useMutation({
    mutationFn: (entrada: EntradaAtivacao) =>
      autenticacaoService.ativar(entrada),
    onSuccess: limpar,
    gcTime: 0,
  });
  return { sessao, entrar, sair, ativar };
}
