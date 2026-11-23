import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importacoesService } from '@/services/importacoes';

/** Enviar cria um lote e muda a lista; os dados do lote são invalidados junto. */
export function useEnviarImportacao() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: importacoesService.enviar,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['importacoes'] });
    },
  });
}
