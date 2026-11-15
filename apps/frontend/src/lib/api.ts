const apiUrl = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
).replace(/\/$/, '');

export type HealthResponse = {
  status: 'ok';
  database: 'connected';
  timestamp: string;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiUrl}/health`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error('A API ou o banco de dados está indisponível.');
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('status' in data) ||
    data.status !== 'ok' ||
    !('database' in data) ||
    data.database !== 'connected' ||
    !('timestamp' in data) ||
    typeof data.timestamp !== 'string'
  ) {
    throw new Error('A API retornou uma resposta inesperada.');
  }
  return data as HealthResponse;
}
