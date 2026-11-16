import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { catalogoService } from '@/services/catalogo';
import { inventarioService, type CorpoNovaVersao } from '@/services/inventario';

/** Versão a usar como base do formulário: a corrigida ou a vigente hoje (pode não existir). */
export function useVersaoBase(
  acesso: AcessoAtual,
  id: number,
  corrigir: number | undefined,
) {
  return useQuery({
    queryKey: [
      'inventarios',
      acesso.usuarioId,
      acesso.revisao,
      id,
      'base',
      corrigir ?? 'vigente',
    ],
    queryFn: ({ signal }) =>
      corrigir === undefined
        ? inventarioService.vigente(id, undefined, signal)
        : inventarioService.detalhe(id, corrigir, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useCatalogoDoSegmento(
  acesso: AcessoAtual,
  segmentoId: number | undefined,
) {
  return useQuery({
    queryKey: [
      'catalogo-formulario',
      acesso.usuarioId,
      acesso.revisao,
      segmentoId,
    ],
    queryFn: ({ signal }) => catalogoService.formulario(segmentoId!, signal),
    enabled: segmentoId !== undefined,
    retry: false,
  });
}

export function useCriarVersao(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (corpo: CorpoNovaVersao) => inventarioService.criar(id, corpo),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['inventarios'] }),
        client.invalidateQueries({ queryKey: ['empreendimentos'] }),
      ]);
    },
  });
}
