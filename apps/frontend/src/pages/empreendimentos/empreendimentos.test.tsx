import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ESQUEMA_EMPREENDIMENTOS, type Perfil } from '@ssc0536/common';
import {
  acessoDoPerfil,
  colecao,
  detalheFicticio,
  listadoFicticio,
  mockHttp,
  sessaoFicticia,
} from '@/test/http';
import { renderApp } from '@/test/render-app';
import { colunasEmpreendimentos } from './colunas';

function servidor(perfil: Perfil, lista: (path: string) => Response) {
  return mockHttp((path) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    if (/^\/empreendimentos\?/.test(path)) return lista(path);
    if (/^\/empreendimentos\/\d+$/.test(path))
      return Response.json({
        data: detalheFicticio({ id: Number(path.split('/').pop()) }),
      });
    return colecao([]);
  });
}
const pagina = (itens: object[]) => colecao(itens);

describe('Cadastro: lista de empreendimentos', () => {
  it('mostra identificação (CNPJ ou ID), situação e informações faltantes', async () => {
    servidor('gestor', () =>
      pagina([
        listadoFicticio({ id: 10, nomeFantasia: 'Hotel A' }),
        listadoFicticio({
          id: 11,
          nomeFantasia: 'Pousada B',
          cnpj: null,
          situacao: 'encerrado',
          tipoHospedagem: null,
          pendencias: ['sem_cnpj', 'sem_contato'],
        }),
      ]),
    );
    renderApp('/empreendimentos');
    const linha = (nome: string) =>
      screen.findByRole('row', { name: new RegExp(nome) });
    const a = await linha('Hotel A');
    expect(within(a).getByText('CNPJ 11.222.333/0001-81')).toBeInTheDocument();
    expect(within(a).getByText('Completo')).toBeInTheDocument();
    const b = await linha('Pousada B');
    expect(within(b).getByText('ID 11')).toBeInTheDocument();
    expect(within(b).getByText('Encerrado')).toBeInTheDocument();
    const faltas = within(b).getByText('2 pendências');
    expect(faltas).toHaveAttribute('title', 'CNPJ não informado; Sem contatos');
  });

  it('sincroniza filtro e ordenação com OData e com a URL; limpar remove', async () => {
    const http = servidor('gestor', () => pagina([listadoFicticio()]));
    const { user, router } = renderApp('/empreendimentos');
    await screen.findByRole('row', { name: /Hotel A/ });
    const inicial = new URL(String(http.mock.calls.at(-1)?.[0])).searchParams;
    expect(inicial.get('$top')).toBe('20');
    expect(inicial.get('$skip')).toBe('0');
    expect(inicial.get('$count')).toBe('true');

    await user.click(
      screen.getByRole('button', { name: 'Filtrar Empreendimento' }),
    );
    await user.type(screen.getByLabelText('Valor'), 'Alfa');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() =>
      expect(
        http.mock.calls.some(([url]) => {
          const q = new URL(String(url)).searchParams;
          return q.get('$filter') === "contains(tolower(nomeFantasia),'alfa')";
        }),
      ).toBe(true),
    );
    expect(router.state.location.search['empreendimentos.filter']).toBe(
      "contains(tolower(nomeFantasia),'alfa')",
    );
    expect(screen.getByLabelText('Filtros ativos')).toHaveTextContent(
      'Empreendimento contém alfa',
    );

    await user.click(
      screen.getByRole('button', { name: 'Ordenar por Empreendimento' }),
    );
    await waitFor(() =>
      expect(
        new URL(String(http.mock.calls.at(-1)?.[0])).searchParams.get(
          '$orderby',
        ),
      ).toBe('nomeFantasia asc'),
    );
    expect(router.state.location.search['empreendimentos.orderby']).toBe(
      'nomeFantasia asc',
    );

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => {
      const ultima = String(http.mock.calls.at(-1)?.[0]);
      expect(new URL(ultima).searchParams.has('$filter')).toBe(false);
    });
    expect(
      router.state.location.search['empreendimentos.filter'],
    ).toBeUndefined();
  });

  it('pagina no servidor e restaura consulta válida da URL', async () => {
    const http = servidor('gestor', (path) => {
      const skip = Number(
        new URL(`http://oto.test${path}`).searchParams.get('$skip'),
      );
      return Response.json({
        data: [listadoFicticio({ id: skip + 1 })],
        meta: { top: 20, skip, total: 21 },
      });
    });
    const filtro = encodeURIComponent("situacao eq 'ativo'");
    const { user, router } = renderApp(
      `/empreendimentos?empreendimentos.filter=${filtro}`,
    );
    expect(await screen.findByLabelText('Filtros ativos')).toHaveTextContent(
      'Situação é igual a Ativo',
    );
    expect(
      new URL(String(http.mock.calls.at(-1)?.[0])).searchParams.get('$filter'),
    ).toBe("situacao eq 'ativo'");
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() =>
      expect(
        new URL(String(http.mock.calls.at(-1)?.[0])).searchParams.get('$skip'),
      ).toBe('20'),
    );
    expect(router.state.location.search['empreendimentos.page']).toBe(2);
  });

  it('preserva filtro OData válido que a interface não sabe editar', async () => {
    servidor('gestor', () => pagina([listadoFicticio()]));
    const filtro = encodeURIComponent(
      "situacao eq 'ativo' or situacao eq 'encerrado'",
    );
    renderApp(`/empreendimentos?empreendimentos.filter=${filtro}`);
    expect(await screen.findByText('Filtro personalizado')).toBeInTheDocument();
  });

  it('toda coluna de dados aponta para um campo filtrável do esquema', () => {
    for (const definicao of colunasEmpreendimentos) {
      if (definicao.id === 'acoes') continue;
      const campo = ESQUEMA_EMPREENDIMENTOS.campos.find(
        (item) => item.nome === definicao.meta?.campo,
      );
      expect(campo, String(definicao.id)).toBeDefined();
      expect(campo?.filtravel, campo?.nome).toBe(true);
    }
  });

  it('estados vazio e erro com nova tentativa', async () => {
    let falhar = true;
    servidor('gestor', () =>
      falhar ? new Response(null, { status: 503 }) : pagina([]),
    );
    const { user } = renderApp('/empreendimentos');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar',
    );
    falhar = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByText(/Nenhum empreendimento encontrado/),
    ).toBeInTheDocument();
  });

  it('"Novo empreendimento" aparece para quem pode criar; visualizador nem chega à lista', async () => {
    servidor('estagiario', () => pagina([]));
    renderApp('/empreendimentos');
    expect(
      await screen.findByRole('link', { name: 'Novo empreendimento' }),
    ).toHaveAttribute('href', '/empreendimentos/novo');
  });

  it('abrir um empreendimento contextualiza e leva à ficha na página inicial', async () => {
    servidor('gestor', () =>
      pagina([listadoFicticio({ id: 10, nomeFantasia: 'Hotel A' })]),
    );
    const { user, router } = renderApp('/empreendimentos');
    await user.click(
      await screen.findByRole('button', { name: 'Abrir Hotel A' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Hotel A', level: 1 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(
      screen.getByRole('button', { name: /Contexto: Hotel A\./ }),
    ).toBeInTheDocument();
  });
});
