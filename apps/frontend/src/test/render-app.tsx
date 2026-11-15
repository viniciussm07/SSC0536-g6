import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarRouter } from '@/router';

export function novoQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

// Renderiza a aplicação completa com histórico em memória e QueryClient isolado.
export function renderApp(caminho = '/') {
  const client = novoQueryClient();
  const router = criarRouter(
    createMemoryHistory({ initialEntries: [caminho] }),
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router, user: userEvent.setup() };
}
