import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Perfil } from '@ssc0536/common';
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

function servidor(
  perfil: Perfil,
  vinculos = perfil === 'empresario' ? [HOTEL_A] : [],
) {
  return mockHttp((path) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil, 1, vinculos) });
    if (/^\/empreendimentos\?/.test(path))
      return colecao([
        {
          id: 10,
          nomeFantasia: 'Hotel A',
          cnpj: '11222333000181',
          situacao: 'ativo',
        },
        { id: 11, nomeFantasia: 'Hotel A2', cnpj: null, situacao: 'ativo' },
      ]);
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
    return colecao([]);
  });
}
const itensDoMenu = () =>
  within(screen.getByRole('navigation', { name: 'Navegação principal' }))
    .getAllByRole('link')
    .map((link) => link.textContent);

describe('Área autenticada: rotas, cabeçalho e menu', () => {
  it('menu sobreposto fecha por Escape e devolve o foco ao acionador', async () => {
    servidor('administrador');
    const { user } = renderApp('/');
    await screen.findByText('Olá, Pessoa fictícia');
    const acionador = await screen.findByRole('button', { name: 'Abrir menu' });
    await user.click(acionador);
    const menu = screen.getByRole('dialog', { name: 'Menu de navegação' });
    expect(menu).toContainElement(document.activeElement as HTMLElement);
    expect(acionador).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(acionador).toHaveFocus();
    expect(acionador).toHaveAttribute('aria-expanded', 'false');
  });

  it('menu sobreposto navega para a área permitida e fecha', async () => {
    servidor('administrador');
    const { user, router } = renderApp('/');
    await screen.findByText('Olá, Pessoa fictícia');
    await user.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu de navegação' });
    await user.click(
      within(menu).getByRole('link', { name: 'Empreendimentos' }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/empreendimentos'),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
  });

  it('sem sessão redireciona para o login', async () => {
    mockHttp(() => new Response(null, { status: 401 }));
    const { router } = renderApp('/administracao');
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/entrar');
  });

  it.each([
    [
      'administrador',
      [
        'Início',
        'Empreendimentos',
        'Indicadores',
        'Administração',
        'Catálogos',
        'Auditoria',
      ],
    ],
    ['gestor', ['Início', 'Empreendimentos', 'Indicadores']],
    ['estagiario', ['Início', 'Empreendimentos']],
    ['visualizador', ['Início', 'Indicadores']],
    ['empresario', ['Empreendimento', 'Editar cadastro']],
  ] as const)(
    'menu de %s mostra somente áreas permitidas',
    async (perfil, esperado) => {
      servidor(perfil);
      renderApp('/');
      await waitFor(() => expect(itensDoMenu()).toEqual(esperado));
      expect(
        within(
          screen.getByRole('navigation', { name: 'Navegação principal' }),
        ).getAllByRole('link')[0],
      ).toHaveAttribute('aria-current', 'page');
    },
  );

  it('botão do canto direito destaca o contexto e rebaixa o nome; o dropdown traz e-mail, perfil e Sair', async () => {
    servidor('administrador');
    const { user, router } = renderApp('/');
    const botao = await screen.findByRole('button', {
      name: /Contexto: Visão geral do OTO\. Conta de Pessoa fictícia/,
    });
    // Contexto em primeiro plano; nome da pessoa em segundo plano (menor destaque).
    const [principal, secundario] = within(botao).getAllByText(
      /Visão geral do OTO|Pessoa fictícia/,
    );
    expect(principal).toHaveTextContent('Visão geral do OTO');
    expect(secundario).toHaveTextContent('Pessoa fictícia');
    expect(secundario).toHaveClass('text-xs', 'text-muted-foreground');
    expect(principal).not.toHaveClass('text-muted-foreground');
    // Fica no cabeçalho, à direita; Sair e e-mail só aparecem ao abrir.
    expect(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Conta de/,
      }),
    ).toBe(botao);
    expect(screen.queryByText('pessoa@example.test')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Sair' }),
    ).not.toBeInTheDocument();
    await user.click(botao);
    const menu = await screen.findByRole('dialog', { name: 'Menu da conta' });
    expect(within(menu).getByText('pessoa@example.test')).toBeInTheDocument();
    expect(within(menu).getByText('Administrador')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Sair' })).toBeEnabled();
    await user.keyboard('{Escape}');
    await user.click(
      await screen.findByRole('link', { name: 'Administração' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Administração de acesso' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/administracao');
  });

  it('perfil sem seleção de entidade mostra o nome em destaque e o perfil abaixo; dropdown sem lista de empreendimentos', async () => {
    servidor('visualizador');
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'Indicadores' });
    const botao = await screen.findByRole('button', {
      name: 'Conta de Pessoa fictícia. Abrir menu',
    });
    expect(botao).toHaveTextContent('Pessoa fictícia');
    expect(botao).toHaveTextContent('Visualizador');
    await user.click(botao);
    const menu = await screen.findByRole('dialog', { name: 'Menu da conta' });
    expect(within(menu).getByText('pessoa@example.test')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Sair' })).toBeEnabled();
    expect(
      within(menu).queryByRole('list', { name: 'Empreendimentos' }),
    ).not.toBeInTheDocument();
  });

  it('rota sem permissão mostra acesso negado sem consultar os dados', async () => {
    const http = servidor('visualizador');
    renderApp('/administracao');
    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument();
    expect(
      http.mock.calls.some(([url]) => String(url).includes('/contas')),
    ).toBe(false);
  });

  it('endereço inexistente mostra página não encontrada', async () => {
    servidor('gestor');
    renderApp('/nao-existe');
    expect(
      await screen.findByRole('heading', { name: 'Página não encontrada' }),
    ).toBeInTheDocument();
  });

  it('botão de menu alterna a navegação por teclado em telas pequenas', async () => {
    servidor('gestor');
    const { user } = renderApp('/');
    await screen.findByText('Olá, Pessoa fictícia');
    const botao = await screen.findByRole('button', { name: 'Abrir menu' });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    await user.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toBeEnabled();
    await user.click(screen.getByRole('link', { name: 'Indicadores' }));
    expect(
      await screen.findByRole('button', { name: 'Abrir menu' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('gestor começa na visão geral; ao escolher um empreendimento o menu e o início passam a ser dele e voltam com a visão geral', async () => {
    const http = servidor('gestor');
    const { user, router } = renderApp('/');
    expect(
      await screen.findByText(/Escolha um empreendimento no menu do cabeçalho/),
    ).toBeInTheDocument();
    expect(itensDoMenu()).toEqual(['Início', 'Empreendimentos', 'Indicadores']);
    await user.click(
      screen.getByRole('button', { name: /Contexto: Visão geral/ }),
    );
    const dropdown = await screen.findByRole('dialog', {
      name: 'Menu da conta',
    });
    expect(
      within(dropdown).getByRole('button', { name: 'Visão geral do OTO' }),
    ).toHaveAttribute('aria-pressed', 'true');
    // Visão geral é destacada e explicada: não é um empreendimento.
    expect(
      within(dropdown).getByText(/não é um empreendimento/),
    ).toBeInTheDocument();
    expect(
      within(dropdown).getByRole('button', { name: 'Visão geral do OTO' }),
    ).toHaveAccessibleDescription(/não é um empreendimento/);
    // Cada empreendimento mostra o CNPJ formatado, ou que não foi informado.
    expect(
      await within(dropdown).findByRole('button', { name: 'Hotel A' }),
    ).toHaveAccessibleDescription('CNPJ 11.222.333/0001-81');
    expect(
      within(dropdown).getByRole('button', { name: 'Hotel A2' }),
    ).toHaveAccessibleDescription('ID 11');
    // Dropdown com lista infinita: sem controles de paginação.
    expect(
      screen.queryByRole('button', { name: 'Próxima' }),
    ).not.toBeInTheDocument();
    await user.type(
      within(dropdown).getByLabelText('Buscar empreendimento'),
      'hotel',
    );
    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url]) =>
            new URL(String(url)).searchParams.get('$filter') ===
            "contains(tolower(nomeFantasia),'hotel')",
        ),
      ).toBe(true),
    );
    await user.click(
      await within(dropdown).findByRole('button', { name: 'Hotel A2' }),
    );
    // Menu da visão geral some; a página inicial passa a ser o empreendimento.
    expect(
      await screen.findByRole('button', {
        name: /Contexto: Hotel A2\./,
      }),
    ).toBeInTheDocument();
    expect(itensDoMenu()).toEqual(['Empreendimento', 'Editar cadastro']);
    expect(
      screen.queryByRole('link', { name: 'Indicadores' }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Hotel A2', level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Nenhuma versão disponível.'),
    ).toBeInTheDocument();
    expect(new Set(contextosEnviados(http, '/11/inventarios'))).toEqual(
      new Set(['11']),
    );
    expect(
      JSON.parse(localStorage.getItem('oto:contexto:1') ?? 'null'),
    ).toEqual({ id: 11, nome: 'Hotel A2', cnpj: null });
    // Áreas da visão geral não existem com contexto: o endereço volta ao início.
    await act(async () => {
      await router.navigate({ to: '/indicadores' });
    });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(
      screen.queryByRole('heading', { name: 'Painel de indicadores' }),
    ).not.toBeInTheDocument();
    // Escolher o OTO traz de volta o menu e a página inicial da visão geral.
    await user.click(
      screen.getByRole('button', { name: /Contexto: Hotel A2/ }),
    );
    await user.click(
      within(
        await screen.findByRole('dialog', { name: 'Menu da conta' }),
      ).getByRole('button', { name: 'Visão geral do OTO' }),
    );
    await waitFor(() =>
      expect(itensDoMenu()).toEqual([
        'Início',
        'Empreendimentos',
        'Indicadores',
      ]),
    );
    expect(
      await screen.findByText(/Escolha um empreendimento no menu/),
    ).toBeInTheDocument();
    expect(localStorage.getItem('oto:contexto:1')).toBeNull();
  });

  it('com empreendimento, um botão ao lado do nome da empresa, na barra da header, volta à visão geral', async () => {
    localStorage.setItem(
      'oto:contexto:1',
      JSON.stringify({ id: 10, nome: 'Hotel A', cnpj: '11222333000181' }),
    );
    servidor('gestor');
    const { user } = renderApp('/');
    const botao = await screen.findByRole('button', {
      name: /Contexto: Hotel A\./,
    });
    const sair = screen.getByRole('button', {
      name: 'Voltar para a visão geral do OTO',
    });
    // Na header, colado ao botão do contexto; não existe no menu lateral.
    expect(sair.parentElement).toBe(botao.parentElement);
    expect(
      within(screen.getByRole('banner')).getByRole('button', {
        name: sair.getAttribute('aria-label')!,
      }),
    ).toBe(sair);
    expect(
      within(
        screen.getByRole('navigation', { name: 'Navegação principal' }),
      ).queryByRole('button'),
    ).not.toBeInTheDocument();
    expect(itensDoMenu()).toEqual(['Empreendimento', 'Editar cadastro']);
    await user.click(sair);
    await waitFor(() =>
      expect(itensDoMenu()).toEqual([
        'Início',
        'Empreendimentos',
        'Indicadores',
      ]),
    );
    expect(localStorage.getItem('oto:contexto:1')).toBeNull();
    expect(
      await screen.findByRole('button', {
        name: /Contexto: Visão geral do OTO\./,
      }),
    ).toBeInTheDocument();
    // Na visão geral não há para onde voltar.
    expect(
      screen.queryByRole('button', {
        name: 'Voltar para a visão geral do OTO',
      }),
    ).not.toBeInTheDocument();
  });

  it('empresário não tem visão geral: sem botão de voltar', async () => {
    servidor('empresario', [HOTEL_A, HOTEL_A2]);
    renderApp('/');
    await screen.findByRole('heading', { name: 'Hotel A', level: 1 });
    expect(
      screen.queryByRole('button', {
        name: 'Voltar para a visão geral do OTO',
      }),
    ).not.toBeInTheDocument();
  });

  it('lista do seletor é infinita: carrega a próxima página ao rolar até o fim', async () => {
    const pagina = (n: number) =>
      Response.json({
        data: Array.from({ length: n === 1 ? 20 : 5 }, (_, i) => ({
          id: n * 100 + i,
          nomeFantasia: `Hotel ${n}-${i}`,
          cnpj: null,
          situacao: 'ativo',
        })),
        meta: {
          top: 20,
          skip: (n - 1) * 20,
          total: 25,
        },
      });
    const http = mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia('gestor');
      if (path === '/acessos/atual')
        return Response.json({ data: acessoDoPerfil('gestor') });
      if (!path.startsWith('/empreendimentos?')) return colecao([]);
      const skip = Number(
        new URL(`http://oto.test${path}`).searchParams.get('$skip'),
      );
      return pagina(skip / 20 + 1);
    });
    const { user } = renderApp('/');
    await user.click(
      await screen.findByRole('button', { name: /Contexto: Visão geral/ }),
    );
    const lista = await screen.findByRole('list', { name: 'Empreendimentos' });
    expect(await within(lista).findByText('Hotel 1-0')).toBeInTheDocument();
    expect(within(lista).queryByText('Hotel 2-0')).not.toBeInTheDocument();
    fireEvent.scroll(lista);
    expect(await within(lista).findByText('Hotel 2-4')).toBeInTheDocument();
    expect(
      http.mock.calls.filter(
        ([url]) => new URL(String(url)).searchParams.get('$skip') === '20',
      ),
    ).toHaveLength(1);
    // Sem mais páginas, rolar de novo não pede nada.
    fireEvent.scroll(lista);
    expect(
      http.mock.calls.filter(
        ([url]) => new URL(String(url)).searchParams.get('$skip') === '40',
      ),
    ).toHaveLength(0);
  });

  it('contexto restaurado que o servidor recusa volta para a visão geral', async () => {
    localStorage.setItem(
      'oto:contexto:1',
      JSON.stringify({ id: 99, nome: 'Hotel removido' }),
    );
    mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia('gestor');
      if (path === '/acessos/atual')
        return Response.json({ data: acessoDoPerfil('gestor') });
      if (path === '/empreendimentos/99')
        return new Response(null, { status: 404 });
      if (path.endsWith('/inventarios/vigente'))
        return Response.json({ data: null });
      return colecao([]);
    });
    renderApp('/');
    expect(
      await screen.findByRole('button', {
        name: /Contexto: Visão geral do OTO\./,
      }),
    ).toBeInTheDocument();
    expect(itensDoMenu()).toEqual(['Início', 'Empreendimentos', 'Indicadores']);
  });

  it('empresário com um vínculo não vê seletor de entidade, só e-mail, perfil e Sair', async () => {
    servidor('empresario', [HOTEL_A]);
    const { user } = renderApp('/');
    expect(
      await screen.findByRole('heading', { name: 'Hotel A', level: 1 }),
    ).toBeInTheDocument();
    const botao = screen.getByRole('button', { name: /Contexto: Hotel A\./ });
    expect(botao).toHaveTextContent('Pessoa fictícia');
    await user.click(botao);
    const menu = await screen.findByRole('dialog', { name: 'Menu da conta' });
    expect(within(menu).getByText('Empresário')).toBeInTheDocument();
    expect(
      within(menu).queryByLabelText('Buscar empreendimento'),
    ).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole('list', { name: 'Empreendimentos' }),
    ).not.toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Sair' })).toBeEnabled();
  });

  it('empresário sem vínculos fica sem contexto e sem item de empreendimento', async () => {
    servidor('empresario', []);
    renderApp('/');
    await screen.findByText('Olá, Pessoa fictícia');
    expect(
      screen.getByText('Sem empreendimento vinculado'),
    ).toBeInTheDocument();
    expect(itensDoMenu()).toEqual(['Início', 'Empreendimentos']);
  });

  it('empresário com vários vínculos nunca fica na visão geral', async () => {
    servidor('empresario', [HOTEL_A, HOTEL_A2]);
    renderApp('/');
    expect(
      await screen.findByRole('button', { name: /Contexto: Hotel A\./ }),
    ).toBeInTheDocument();
  });

  it('mudança de revisão elimina caches protegidos e acesso revogado retira o conteúdo', async () => {
    let revisao = 1;
    let revogado = false;
    mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia('empresario');
      if (path === '/acessos/atual')
        return revogado
          ? new Response(null, { status: 403 })
          : Response.json({
              data: {
                ...acessoDoPerfil('empresario', 1, [HOTEL_A]),
                revisao,
              },
            });
      if (/^\/empreendimentos\/\d+$/.test(path))
        return Response.json({ data: detalheFicticio() });
      if (path.endsWith('/inventarios/vigente'))
        return Response.json({ data: null });
      return colecao([]);
    });
    const { client } = renderApp('/');
    await screen.findByText('Nenhuma versão disponível.');
    client.setQueryData(['respostas', 1, 1, 10], 'cache antigo');
    revisao = 2;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['acesso'] });
    });
    expect(client.getQueryData(['respostas', 1, 1, 10])).toBeUndefined();
    revogado = true;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['acesso'] });
    });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Empreendimentos autorizados' }),
    ).not.toBeInTheDocument();
  });
});
