import { API_PREFIX } from '@ssc0536/common';

const apiUrl = (
  import.meta.env.VITE_API_URL || `http://localhost:3000/${API_PREFIX}`
).replace(/\/$/, '');

export const apiClient = {
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
