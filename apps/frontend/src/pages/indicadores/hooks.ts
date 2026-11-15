import { useMutation, useQuery } from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { acessoService } from '@/services/acesso';
import { permite } from '@/utils/acesso';

export function useIndicadores(acesso: AcessoAtual, page: number) {
  const indicadores = useQuery({
    queryKey: ['indicadores', acesso.usuarioId, acesso.revisao, page],
    queryFn: ({ signal }) => acessoService.indicadores(page, signal),
    enabled: permite(acesso, 'indicadores', 'consultar'),
    retry: false,
  });
  const exportar = useMutation({
    mutationFn: () => acessoService.exportarIndicadores(page),
    gcTime: 0,
  });
  return { indicadores, exportar };
}
