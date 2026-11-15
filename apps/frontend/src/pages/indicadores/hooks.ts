import { useMutation } from '@tanstack/react-query';
import { acessoService } from '@/services/acesso';
import type { ConsultaColecao } from '@/services/odata';

/** Exporta o conjunto filtrado e ordenado atual (a primeira página, até o limite do servidor). */
export function useExportarIndicadores(consulta: ConsultaColecao) {
  return useMutation({
    mutationFn: () => acessoService.exportarIndicadores(consulta),
    gcTime: 0,
  });
}
