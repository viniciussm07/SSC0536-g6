import { API_PREFIX } from '@ssc0536/common';

const apiUrl = (
  import.meta.env.VITE_API_URL || `http://localhost:3000/${API_PREFIX}`
).replace(/\/$/, '');

export const apiClient = {
  async request(
    path: string,
    {
      method = 'GET',
      body,
      signal,
    }: { method?: string; body?: unknown; signal?: AbortSignal } = {},
  ): Promise<unknown> {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      credentials: 'include',
      headers:
        method === 'GET'
          ? undefined
          : { 'Content-Type': 'application/json', 'X-OTO-Request': '1' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
        : AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const mensagens: Record<number, string> = {
        400: 'Confira os campos ou solicite outro código ao administrador.',
        401: 'E-mail ou senha inválidos, ou sessão expirada.',
        403: 'Acesso não permitido.',
        404: 'Recurso não encontrado no escopo autorizado.',
        409: 'A alteração conflita com as regras de acesso ou com uma conta existente.',
        429: 'Muitas tentativas. Aguarde até 15 minutos.',
      };
      throw new HttpError(
        response.status,
        mensagens[response.status] ??
          'Não foi possível conectar ao serviço. Tente novamente.',
      );
    }
    return response.status === 204 ? undefined : response.json();
  },
  async get(
    path: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<unknown> {
    const response = await fetch(`${apiUrl}${path}`, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
        : AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error('A API ou o banco de dados está indisponível.');
    return response.json();
  },
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
