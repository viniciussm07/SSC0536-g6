import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import userEvent from '@testing-library/user-event';
import type { Perfil } from '@ssc0536/common';
import { ContextoAutenticadoProvider } from '@/components/contexto-autenticado';
import { acessoDoPerfil, usuarioFicticio } from './http';
import { novoQueryClient } from './render-app';

// Renderiza uma página isolada com o contexto autenticado e um roteador mínimo em memória
// (as grades guardam seu estado nos search params).
export async function renderComContexto(elemento: ReactNode, perfil: Perfil) {
  const client = novoQueryClient();
  const raiz = createRootRoute({
    component: () => (
      <ContextoAutenticadoProvider
        valor={{
          usuario: { ...usuarioFicticio, perfil },
          acesso: acessoDoPerfil(perfil),
        }}
      >
        {elemento}
      </ContextoAutenticadoProvider>
    ),
  });
  const router = createRouter({
    routeTree: raiz.addChildren([
      createRoute({ getParentRoute: () => raiz, path: '/' }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  );
  return { client, router, user: userEvent.setup() };
}
