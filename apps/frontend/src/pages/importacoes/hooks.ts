import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importacoesService } from '@/services/importacoes';

/** Enviar ou reler muda lotes, linhas e ocorrências; tudo de importação é invalidado. */
export function useImportacaoMutations() {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({ queryKey: ['importacoes'] });
  };
  const enviar = useMutation({
    mutationFn: importacoesService.enviar,
    onSuccess: atualizar,
  });
  const reler = useMutation({
    mutationFn: importacoesService.reler,
    onSuccess: atualizar,
  });
  return { enviar, reler };
}

const TOPO = { top: 100, skip: 0 } as const;

export function useLoteLeitura(id: number) {
  const detalhe = useQuery({
    queryKey: ['importacoes', 'detalhe', id],
    queryFn: ({ signal }) => importacoesService.detalhe(id, signal),
    retry: false,
  });
  const ocorrencias = useQuery({
    queryKey: ['importacoes', 'ocorrencias', id],
    queryFn: ({ signal }) => importacoesService.ocorrencias(id, TOPO, signal),
    retry: false,
  });
  const linhas = useQuery({
    queryKey: ['importacoes', 'linhas', id],
    queryFn: ({ signal }) =>
      importacoesService.linhas(
        id,
        { ...TOPO, filter: "tipo eq 'entrada'" },
        signal,
      ),
    retry: false,
  });
  return { detalhe, ocorrencias, linhas };
}
