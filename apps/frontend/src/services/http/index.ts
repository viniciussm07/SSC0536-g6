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
      headers,
    }: {
      method?: string;
      body?: unknown;
      signal?: AbortSignal;
      headers?: Record<string, string>;
    } = {},
  ): Promise<unknown> {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      credentials: 'include',
      headers:
        method === 'GET' && !headers
          ? undefined
          : {
              ...(method === 'GET'
                ? {}
                : {
                    'Content-Type': 'application/json',
                    'X-OTO-Request': '1',
                  }),
              ...headers,
            },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
        : AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const mensagens: Record<number, string> = {
        400: 'Confira os dados informados e tente novamente.',
        401: 'Sua sessão expirou ou o acesso é inválido. Entre novamente.',
        403: 'Você não tem permissão para realizar esta ação.',
        404: 'Não foi possível encontrar o registro solicitado.',
        409: 'Não foi possível salvar devido a um conflito. Confira os dados e tente novamente.',
        429: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      };
      if (path === '/sessoes' && response.status === 401)
        mensagens[401] =
          'E-mail ou senha inválidos. Confira os dados e tente novamente.';
      if (path === '/ativacoes' && response.status === 400)
        mensagens[400] =
          'Confira os campos ou solicite outro código ao administrador.';
      const erro = await lerErro(response);
      throw new HttpError(
        response.status,
        mensagens[response.status] ??
          'Não foi possível conectar ao serviço. Tente novamente.',
        erro.code,
        erro.details,
      );
    }
    return response.status === 204 ? undefined : response.json();
  },
  async baixar(
    path: string,
    {
      signal,
      headers,
    }: { signal: AbortSignal; headers?: Record<string, string> },
  ) {
    const response = await fetch(`${apiUrl}${path}`, {
      credentials: 'include',
      headers,
      signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
    });
    if (!response.ok) {
      const erro = await lerErro(response);
      const mensagens: Record<number, string> = {
        400: 'Não foi possível exportar. Confira os filtros e tente novamente.',
        401: 'Sua sessão expirou. Entre novamente para exportar.',
        403: 'Você não tem permissão para exportar estes dados.',
        404: 'Os dados solicitados não estão disponíveis para exportação.',
      };
      throw new HttpError(
        response.status,
        mensagens[response.status] ??
          'Não foi possível exportar. Tente novamente.',
        erro.code,
        erro.details,
      );
    }
    const disposicao = response.headers.get('Content-Disposition') ?? '';
    const nome = /filename="([^"\\/]+)"/.exec(disposicao)?.[1];
    if (!nome || !response.headers.get('Content-Type')?.startsWith('text/csv'))
      throw new Error(
        'O serviço não retornou um arquivo CSV. Tente novamente.',
      );
    const arquivo = await response.blob();
    signal.throwIfAborted();
    return { arquivo, nome };
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
      throw new Error(
        'Os serviços estão temporariamente indisponíveis. Tente novamente.',
      );
    return response.json();
  },
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Código estável do envelope de erro (`error.code`), quando o servidor o enviou. */
    public readonly code?: string,
    /** Detalhes por campo ou candidatos (`error.details`); valide antes de usar. */
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

async function lerErro(response: Response) {
  try {
    const corpo: unknown = await response.json();
    if (
      typeof corpo === 'object' &&
      corpo !== null &&
      'error' in corpo &&
      typeof corpo.error === 'object' &&
      corpo.error !== null
    ) {
      const { code, details } = corpo.error as Record<string, unknown>;
      return {
        code: typeof code === 'string' ? code : undefined,
        details,
      };
    }
  } catch {
    /* Corpo ausente ou inválido: o status já descreve o erro. */
  }
  return { code: undefined, details: undefined };
}
