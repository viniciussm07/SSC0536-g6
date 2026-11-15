import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcessoAtual,
  CriarConta,
  AlterarConta,
  Perfil,
  PermissaoAcesso,
} from '@ssc0536/common';
import { acessoService } from '@/services/acesso';

export function useAdministracao(acesso: AcessoAtual, page: number) {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({
      predicate: (q) =>
        [
          'contas',
          'vinculos',
          'acesso',
          'permissoes',
          'visibilidades',
        ].includes(String(q.queryKey[0])),
    });
  };
  const contas = useQuery({
    queryKey: ['contas', acesso.usuarioId, acesso.revisao, page],
    queryFn: ({ signal }) => acessoService.contas(page, signal),
    retry: false,
  });
  const criar = useMutation({
    mutationFn: (body: CriarConta) => acessoService.criarConta(body),
    onSuccess: atualizar,
    gcTime: 0,
  });
  const alterar = useMutation({
    mutationFn: ({ id, body }: { id: number; body: AlterarConta }) =>
      acessoService.alterarConta(id, body),
    onSuccess: atualizar,
  });
  const recuperar = useMutation({
    mutationFn: acessoService.recuperar,
    onSuccess: atualizar,
    gcTime: 0,
  });
  return { contas, criar, alterar, recuperar };
}
export function useVinculos(acesso: AcessoAtual, id: number, page: number) {
  const client = useQueryClient();
  const vinculos = useQuery({
    queryKey: ['vinculos', acesso.usuarioId, acesso.revisao, id, page],
    queryFn: ({ signal }) => acessoService.vinculos(id, page, signal),
    retry: false,
  });
  const alterar = useMutation({
    mutationFn: ({
      empreendimentoId,
      ativo,
    }: {
      empreendimentoId: number;
      ativo: boolean;
    }) => acessoService.vincular(id, empreendimentoId, ativo),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['vinculos'] });
      await client.invalidateQueries({ queryKey: ['acesso'] });
    },
  });
  return { vinculos, alterar };
}
export function usePoliticas(
  acesso: AcessoAtual,
  perfil: Perfil,
  page: number,
) {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({ queryKey: ['acesso'] });
    await client.invalidateQueries({ queryKey: ['permissoes'] });
    await client.invalidateQueries({ queryKey: ['visibilidades'] });
  };
  const permissoes = useQuery({
    queryKey: ['permissoes', acesso.usuarioId, acesso.revisao, perfil],
    queryFn: ({ signal }) => acessoService.permissoes(perfil, signal),
    retry: false,
  });
  const visibilidades = useQuery({
    queryKey: ['visibilidades', acesso.usuarioId, acesso.revisao, perfil, page],
    queryFn: ({ signal }) => acessoService.visibilidades(perfil, page, signal),
    retry: false,
  });
  const alterarPermissoes = useMutation({
    mutationFn: (regras: PermissaoAcesso[]) =>
      acessoService.alterarPermissoes(perfil, regras),
    onSuccess: atualizar,
  });
  const alterarVisibilidade = useMutation({
    mutationFn: ({
      indicadorId,
      permitido,
    }: {
      indicadorId: number;
      permitido: boolean;
    }) => acessoService.alterarVisibilidade(perfil, indicadorId, permitido),
    onSuccess: atualizar,
  });
  return { permissoes, visibilidades, alterarPermissoes, alterarVisibilidade };
}
