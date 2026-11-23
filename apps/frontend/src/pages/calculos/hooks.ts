import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EntradaExecucaoCalculo,
  EntradaPublicacaoCalculo,
} from '@ssc0536/common';
import { calculosService } from '@/services/calculos';
import { edicoesService } from '@/services/edicoes';

/** Toda escrita muda a grade, o detalhe e o consumo de indicadores. */
export function useCalculoMutations() {
  const client = useQueryClient();
  const atualizar = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['calculos'] }),
      client.invalidateQueries({ queryKey: ['indicadores'] }),
    ]);
  };
  const executar = useMutation({
    mutationFn: (entrada: EntradaExecucaoCalculo) =>
      calculosService.executar(entrada),
    onSuccess: atualizar,
  });
  const retomar = useMutation({
    mutationFn: (id: number) => calculosService.retomar(id),
    onSuccess: atualizar,
  });
  const publicar = useMutation({
    mutationFn: ({
      id,
      entrada,
    }: {
      id: number;
      entrada: EntradaPublicacaoCalculo;
    }) => calculosService.publicar(id, entrada),
    onSuccess: atualizar,
  });
  return { executar, retomar, publicar };
}

export function useCalculoDetalhe(id?: number) {
  return useQuery({
    queryKey: ['calculos', 'detalhe', id],
    queryFn: ({ signal }) => calculosService.detalhe(id as number, signal),
    enabled: id !== undefined,
    retry: false,
  });
}

/** Edições candidatas ao cálculo: as mais recentes primeiro (máximo OData de 100). */
export function useEdicoesCalculo(ativo: boolean) {
  return useQuery({
    queryKey: ['calculos', 'edicoes'],
    queryFn: ({ signal }) =>
      edicoesService.listar(
        { top: 100, skip: 0, orderby: 'abertura desc' },
        signal,
      ),
    enabled: ativo,
    retry: false,
  });
}

/** Perguntas da edição escolhida; o cálculo aceita só campos percentuais. */
export function usePerguntasCalculo(pesquisaId?: number) {
  return useQuery({
    queryKey: ['calculos', 'edicoes', pesquisaId, 'perguntas'],
    queryFn: async ({ signal }) =>
      (
        await edicoesService.detalhe(pesquisaId as number, signal)
      ).perguntas.filter((p) => p.tipoValor === 'percentual'),
    enabled: pesquisaId !== undefined,
    retry: false,
  });
}

/** Publicação vigente da pergunta: substituí-la exige motivo. */
export function usePublicadaDaPergunta(perguntaId?: number) {
  return useQuery({
    queryKey: ['calculos', 'publicada', perguntaId],
    queryFn: async ({ signal }) =>
      (
        await calculosService.listar(
          {
            top: 1,
            skip: 0,
            filter: `perguntaId eq ${perguntaId} and publicacao eq 'publicado'`,
          },
          signal,
        )
      ).data[0] ?? null,
    enabled: perguntaId !== undefined,
    retry: false,
  });
}
