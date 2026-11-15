import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AlteracaoGrupoCatalogo,
  AlteracaoItemCatalogo,
} from '@ssc0536/common';
import { catalogoService } from '@/services/catalogo';

/** Mudanças de catálogo invalidam a gestão e a definição do formulário. */
export function useCatalogoMutations() {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({ queryKey: ['catalogos'] });
    await client.invalidateQueries({ queryKey: ['catalogo-formulario'] });
  };
  const criarGrupo = useMutation({
    mutationFn: catalogoService.criarGrupo,
    onSuccess: atualizar,
  });
  const alterarGrupo = useMutation({
    mutationFn: ({
      id,
      alteracao,
    }: {
      id: number;
      alteracao: AlteracaoGrupoCatalogo;
    }) => catalogoService.alterarGrupo(id, alteracao),
    onSuccess: atualizar,
  });
  const criarItem = useMutation({
    mutationFn: catalogoService.criarItem,
    onSuccess: atualizar,
  });
  const alterarItem = useMutation({
    mutationFn: ({
      id,
      alteracao,
    }: {
      id: number;
      alteracao: AlteracaoItemCatalogo;
    }) => catalogoService.alterarItem(id, alteracao),
    onSuccess: atualizar,
  });
  return { criarGrupo, alterarGrupo, criarItem, alterarItem };
}
