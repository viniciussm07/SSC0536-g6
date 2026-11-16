import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './index';

function renderHomePage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe('Consulta de saúde com React Query', () => {
  it('aguarda a ação do usuário antes de consultar o servidor', () => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    renderHomePage();
    expect(
      screen.getByRole('button', { name: 'Testar conexão' }),
    ).toBeEnabled();
    expect(request).not.toHaveBeenCalled();
  });

  it('exibe carregamento e confirma a conexão após resposta válida', async () => {
    let complete!: (response: Response) => void;
    const request = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    vi.stubGlobal('fetch', request);
    const user = renderHomePage();
    await user.click(screen.getByRole('button', { name: 'Testar conexão' }));
    expect(screen.getByRole('button', { name: 'Verificando…' })).toBeDisabled();
    complete(
      Response.json({
        status: 'ok',
        database: 'connected',
        timestamp: '2026-11-15T12:00:00Z',
      }),
    );
    expect(
      await screen.findByText(
        'Conexão confirmada. Os serviços estão disponíveis.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Testar conexão' }),
    ).toBeEnabled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('exibe indisponibilidade sem repetir automaticamente uma consulta manual', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', request);
    const user = renderHomePage();
    await user.click(screen.getByRole('button', { name: 'Testar conexão' }));
    expect(
      await screen.findByText(
        'Os serviços estão temporariamente indisponíveis. Tente novamente.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Testar conexão' }),
      ).toBeEnabled(),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('permite consultar novamente após uma falha de rede', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        Response.json({
          status: 'ok',
          database: 'connected',
          timestamp: '2026-11-15T12:00:00Z',
        }),
      );
    vi.stubGlobal('fetch', request);
    const user = renderHomePage();
    await user.click(screen.getByRole('button', { name: 'Testar conexão' }));
    expect(
      await screen.findByText(
        'Não foi possível conectar. Tente novamente em alguns instantes.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Testar conexão' }));
    expect(
      await screen.findByText(
        'Conexão confirmada. Os serviços estão disponíveis.',
      ),
    ).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });
});
