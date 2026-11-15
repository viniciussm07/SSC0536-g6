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
    ? 'Verificando a API e o banco de dados…'
    : health.isError
      ? health.error.message.startsWith('A API')
        ? health.error.message
        : 'Não foi possível conectar. Confira se o backend e o banco estão em execução.'
      : health.isSuccess
        ? 'Tudo conectado. A API e o PostgreSQL estão disponíveis.'
        : 'Verifique a conexão entre a aplicação, a API e o banco de dados.';

  return { health, message };
}
