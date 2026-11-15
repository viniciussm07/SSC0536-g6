import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  acessoDoPerfil,
  colecao,
  contextosEnviados,
  HOTEL_A,
  HOTEL_A2,
  mockHttp,
  sessaoFicticia,
} from '@/test/http';
import { renderApp } from '@/test/render-app';

describe('Página inicial do empreendimento contextualizado', () => {
  it('empresário abre no primeiro vínculo, envia o contexto e troca explicitamente de empreendimento', async () => {
    let concluir!: (res: Response) => void;
    const http = mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia();
      if (path === '/acessos/atual')
        return new Promise((resolve) => {
          concluir = resolve;
        });
      if (path.includes('/11/')) return new Response(null, { status: 404 });
      return colecao([]);
    });
    const { user } = renderApp('/');
    expect(
      await screen.findByText(/Conferindo permissões/),
    ).toBeInTheDocument();
    concluir(
      Response.json({
        data: acessoDoPerfil('empresario', 1, [HOTEL_A, HOTEL_A2]),
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Hotel A', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Nenhuma versão disponível.'),
    ).toBeInTheDocument();
    expect(screen.getByText('CNPJ 11.222.333/0001-81')).toBeInTheDocument();
    expect(contextosEnviados(http, '/10/inventarios')).toEqual(['10']);
    expect(contextosEnviados(http, '/10/respostas')).toEqual(['10']);

    await user.click(
      screen.getByRole('button', { name: /Contexto: Hotel A\./ }),
    );
    const dialogo = await screen.findByRole('dialog', {
      name: 'Menu da conta',
    });
    // Empresário não tem visão geral nem busca global: só os próprios vínculos.
    expect(
      within(dialogo).queryByRole('button', { name: 'Visão geral do OTO' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialogo).queryByLabelText('Buscar empreendimento'),
    ).not.toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: 'Hotel A2' }));
    expect(
      await screen.findByRole('heading', { name: 'Hotel A2', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('ID 11')).toBeInTheDocument();
    const detalhes = screen.getByRole('region', {
      name: 'Dados do empreendimento',
    });
    await waitFor(() =>
      expect(within(detalhes).getAllByRole('alert')).toHaveLength(2),
    );
    expect(contextosEnviados(http, '/11/inventarios')).toEqual(['11']);
    expect(
      screen.queryByRole('region', { name: 'Administração de acesso' }),
    ).not.toBeInTheDocument();
    expect(
      http.mock.calls.every(([, init]) => init?.signal instanceof AbortSignal),
    ).toBe(true);
  });
});
