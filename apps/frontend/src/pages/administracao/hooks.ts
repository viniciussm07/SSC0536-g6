import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcessoAtual,
  CriarConta,
  AlterarConta,
  Perfil,
  PermissaoAcesso,
} from '@ssc0536/common';
import { acessoService } from '@/services/acesso';

export function useAdministracao() {
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
  return { criar, alterar, recuperar };
}
export function useVinculos(id: number) {
  const client = useQueryClient();
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
  return { alterar };
}
export function usePoliticas(acesso: AcessoAtual, perfil: Perfil) {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({ queryKey: ['acesso'] });
    await client.invalidateQueries({ queryKey: ['permissoes'] });
    await client.invalidateQueries({ queryKey: ['visibilidades'] });
  };
  // Matriz completa (o PUT substitui tudo); a grade pagina em consulta própria.
  const permissoes = useQuery({
    queryKey: ['permissoes', acesso.usuarioId, acesso.revisao, perfil],
    queryFn: ({ signal }) => acessoService.permissoesCompletas(perfil, signal),
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
  return { permissoes, alterarPermissoes, alterarVisibilidade };
}
