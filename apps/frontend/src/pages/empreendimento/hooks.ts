import { useQuery } from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { acessoService } from '@/services/acesso';
import { permite } from '@/utils/acesso';

export function useDetalhesEmpreendimento(
  acesso: AcessoAtual,
  id: number,
  paginaInventarios: number,
  paginaRespostas: number,
) {
  const inventarios = useQuery({
    queryKey: [
      'inventarios',
      acesso.usuarioId,
      acesso.revisao,
      id,
      paginaInventarios,
    ],
    queryFn: ({ signal }) =>
      acessoService.inventarios(id, paginaInventarios, signal),
    enabled: permite(acesso, 'inventarios', 'consultar'),
    retry: false,
  });
  const respostas = useQuery({
    queryKey: [
      'respostas',
      acesso.usuarioId,
      acesso.revisao,
      id,
      paginaRespostas,
    ],
    queryFn: ({ signal }) =>
      acessoService.respostas(id, paginaRespostas, signal),
    enabled: permite(acesso, 'respostas', 'consultar'),
    retry: false,
  });
  return { inventarios, respostas };
}
