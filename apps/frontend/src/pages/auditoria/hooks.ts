import { useQuery } from '@tanstack/react-query';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { auditoriaService } from '@/services/auditoria';
import { permite } from '@/utils/acesso';
export function useEventoAuditoria(id: number) {
  const acesso = useAcessoAtual();
  return useQuery({
    queryKey: ['auditoria', acesso.usuarioId, acesso.revisao, 'detalhe', id],
    queryFn: ({ signal }) => auditoriaService.detalhe(id, signal),
    retry: false,
    enabled: permite(acesso, 'auditoria', 'consultar'),
  });
}
