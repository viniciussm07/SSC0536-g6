import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AcessoAtual, ItemResposta } from '@ssc0536/common';
import { respostasService } from '@/services/respostas';

const RAIZ = 'pesquisas-respondente';

/** Formulário com a situação calculada no servidor e a resposta já registrada. */
export function useFormularioResposta(
  acesso: AcessoAtual,
  id: number,
  pesquisaId: number,
) {
  return useQuery({
    queryKey: [
      RAIZ,
      acesso.usuarioId,
      acesso.revisao,
      id,
      'formulario',
      pesquisaId,
    ],
    queryFn: ({ signal }) =>
      respostasService.formulario(id, pesquisaId, signal),
    retry: false,
  });
}

/** Envio idempotente; atualiza o painel, o formulário e a grade de respostas. */
export function useEnviarResposta(id: number, pesquisaId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (itens: ItemResposta[]) =>
      respostasService.enviar(id, pesquisaId, itens),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: [RAIZ] }),
        client.invalidateQueries({ queryKey: ['respostas'] }),
      ]);
    },
  });
}
