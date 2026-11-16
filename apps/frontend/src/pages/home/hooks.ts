import { useQuery } from '@tanstack/react-query';
import { healthService } from '@/services/health';

const HEALTH_QUERY_KEY = ['health'] as const;

export function useHomeHealth() {
  const health = useQuery({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: ({ signal }) => healthService.get(signal),
    enabled: false,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const message = health.isFetching
    ? 'Verificando a conexão com os serviços…'
    : health.isError
      ? health.error.message.startsWith('Os serviços')
        ? health.error.message
        : 'Não foi possível conectar. Tente novamente em alguns instantes.'
      : health.isSuccess
        ? 'Conexão confirmada. Os serviços estão disponíveis.'
        : 'Verifique se os serviços estão disponíveis.';

  return { health, message };
}
