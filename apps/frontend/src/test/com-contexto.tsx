import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Perfil } from '@ssc0536/common';
import { ContextoAutenticadoProvider } from '@/components/contexto-autenticado';
import { acessoDoPerfil, usuarioFicticio } from './http';
import { novoQueryClient } from './render-app';

// Renderiza uma página isolada com o contexto autenticado, sem roteador.
export function renderComContexto(elemento: ReactNode, perfil: Perfil) {
  const client = novoQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ContextoAutenticadoProvider
        valor={{
          usuario: { ...usuarioFicticio, perfil },
          acesso: acessoDoPerfil(perfil),
        }}
      >
        {elemento}
      </ContextoAutenticadoProvider>
    </QueryClientProvider>,
  );
  return { client, user: userEvent.setup() };
}
