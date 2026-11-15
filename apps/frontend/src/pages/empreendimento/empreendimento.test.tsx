import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  acessoDoPerfil,
  colecao,
  contextosEnviados,
  detalheFicticio,
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
      if (/^\/empreendimentos\/\d+$/.test(path)) {
        const id = Number(path.split('/').pop());
        return Response.json({
          data: detalheFicticio({
            id,
            nomeFantasia: id === 11 ? 'Hotel A2' : 'Hotel A',
            cnpj: id === 11 ? null : '11222333000181',
          }),
        });
      }
      if (path.includes('/11/')) return new Response(null, { status: 404 });
      if (path.endsWith('/inventarios/vigente'))
        return Response.json({ data: null });
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
    expect(new Set(contextosEnviados(http, '/10/inventarios'))).toEqual(
      new Set(['10']),
    );
    expect(new Set(contextosEnviados(http, '/10/respostas'))).toEqual(
      new Set(['10']),
    );

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
      expect(within(detalhes).getAllByRole('alert')).toHaveLength(5),
    );
    expect(new Set(contextosEnviados(http, '/11/inventarios'))).toEqual(
      new Set(['11']),
    );
    expect(new Set(contextosEnviados(http, '/11/contatos'))).toEqual(
      new Set(['11']),
    );
    expect(
      screen.queryByRole('region', { name: 'Administração de acesso' }),
    ).not.toBeInTheDocument();
    expect(
      http.mock.calls.every(([, init]) => init?.signal instanceof AbortSignal),
    ).toBe(true);
  });

  it('ficha mostra dados cadastrais, contatos, Cadastur e informações faltantes', async () => {
    mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia();
      if (path === '/acessos/atual')
        return Response.json({
          data: acessoDoPerfil('empresario', 1, [HOTEL_A]),
        });
      if (path === '/empreendimentos/10')
        return Response.json({
          data: detalheFicticio({
            razaoSocial: null,
            pendencias: ['sem_razao_social', 'sem_contato'],
            contatos: [],
            cadastur: [
              {
                id: 1,
                situacao: 'numero_proprio',
                numero: '000123',
                vencimento: '2027-01-31',
              },
            ],
            localizacao: { longitude: -49, latitude: -20 },
          }),
        });
      if (path.startsWith('/empreendimentos/10/cadastur'))
        return colecao([
          {
            id: 1,
            situacao: 'numero_proprio',
            numero: '000123',
            vencimento: '2027-01-31',
          },
        ]);
      if (path.endsWith('/inventarios/vigente'))
        return Response.json({ data: null });
      return colecao([]);
    });
    renderApp('/');
    expect(
      await screen.findByRole('heading', { name: 'Hotel A', level: 1 }),
    ).toBeInTheDocument();
    const faltas = screen.getByRole('status', {
      name: 'Informações faltantes',
    });
    expect(faltas).toHaveTextContent('Razão social não informada');
    expect(faltas).toHaveTextContent('Sem contatos');
    expect(screen.getByText('Rua Fictícia, 100')).toBeInTheDocument();
    expect(screen.getByText('-20, -49')).toBeInTheDocument();
    expect(screen.getByText('01/01/2026')).toBeInTheDocument();
    expect(
      await screen.findByText('Nenhum contato encontrado.'),
    ).toBeInTheDocument();
    const cadastur = await screen.findByRole('table', { name: 'Cadastur' });
    expect(within(cadastur).getByText('Número próprio')).toBeInTheDocument();
    expect(within(cadastur).getByText('000123')).toBeInTheDocument();
    expect(within(cadastur).getByText('31/01/2027')).toBeInTheDocument();
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole('main')).getByRole('link', {
        name: 'Editar cadastro',
      }),
    ).toHaveAttribute('href', '/editar');
  });

  it('erro ao carregar a ficha permite tentar novamente sem esconder o restante', async () => {
    let falhar = true;
    mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia();
      if (path === '/acessos/atual')
        return Response.json({
          data: acessoDoPerfil('empresario', 1, [HOTEL_A]),
        });
      if (path === '/empreendimentos/10')
        return falhar
          ? new Response(null, { status: 503 })
          : Response.json({ data: detalheFicticio() });
      if (path.endsWith('/inventarios/vigente'))
        return Response.json({ data: null });
      return colecao([]);
    });
    const { user } = renderApp('/');
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível conectar');
    expect(
      await screen.findByText('Nenhuma versão disponível.'),
    ).toBeInTheDocument();
    falhar = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Razão social')).toBeInTheDocument();
  });
});
