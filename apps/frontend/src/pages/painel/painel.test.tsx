import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  PERMISSOES_INICIAIS,
  type AcessoAtual,
  type Perfil,
} from '@ssc0536/common';
import { PainelPage } from './index';
import { AdministracaoPainel } from '../administracao';
import { VinculosConta } from '../administracao/components/vinculos';
import { PoliticasPerfil } from '../administracao/components/politicas';

function acesso(perfil: Perfil): AcessoAtual {
  return {
    usuarioId: 1,
    perfil,
    revisao: 1,
    vinculos: [],
    permissoes: PERMISSOES_INICIAIS.filter((p) => p.perfil === perfil).map(
      ({ recurso, acao, escopo }) => ({ recurso, acao, escopo }),
    ),
  };
}
const usuario = {
  id: 1,
  nome: 'Pessoa fictícia',
  email: 'pessoa@example.test',
  perfil: 'empresario',
};
function colecao(data: object[]) {
  return Response.json({
    data,
    meta: {
      page: 1,
      pageSize: 20,
      total: data.length,
      totalPages: data.length ? 1 : 0,
    },
  });
}
function montar(elemento: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  render(<QueryClientProvider client={client}>{elemento}</QueryClientProvider>);
  return { client, user: userEvent.setup() };
}
function mockHttp(
  handler: (path: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const mock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input).split('/api')[1], init),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}
describe('Painel autorizado', () => {
  it('aguarda acesso e permite seleção explícita entre empreendimentos com estados vazio e erro nos detalhes', async () => {
    let concluir!: (res: Response) => void;
    const http = mockHttp((path) => {
      if (path === '/acessos/atual')
        return new Promise((resolve) => {
          concluir = resolve;
        });
      if (path.startsWith('/empreendimentos?'))
        return colecao([
          { id: 10, nomeFantasia: 'Hotel A', situacao: 'ativo' },
          { id: 11, nomeFantasia: 'Hotel A2', situacao: 'ativo' },
        ]);
      if (path.includes('/11/')) return new Response(null, { status: 404 });
      return colecao([]);
    });
    const { user } = montar(<PainelPage usuario={usuario} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Conferindo permissões',
    );
    concluir(Response.json({ data: acesso('empresario') }));
    await user.click(await screen.findByRole('button', { name: 'Hotel A' }));
    expect(
      await screen.findByText('Nenhuma versão disponível.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Nenhuma resposta disponível.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hotel A2' }));
    const detalhes = screen.getByRole('region', {
      name: 'Empreendimento selecionado',
    });
    expect(
      within(detalhes).getByRole('heading', { name: 'Hotel A2' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(within(detalhes).getAllByRole('alert')).toHaveLength(2),
    );
    expect(
      screen.queryByRole('region', { name: 'Administração de acesso' }),
    ).not.toBeInTheDocument();
    expect(
      http.mock.calls.every(([, init]) => init?.signal instanceof AbortSignal),
    ).toBe(true);
  });
  it('visualizador só consulta indicadores; falha permite repetir e resultado vazio não oferece exportação', async () => {
    let falhar = true;
    mockHttp((path) => {
      if (path === '/acessos/atual')
        return Response.json({ data: acesso('visualizador') });
      if (falhar) return new Response(null, { status: 503 });
      return colecao([]);
    });
    const { user } = montar(<PainelPage usuario={usuario} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar',
    );
    falhar = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByText('Nenhum indicador foi liberado para seu perfil.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Empreendimentos autorizados'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Exportar/ }),
    ).not.toBeInTheDocument();
  });
  it('mudança de revisão elimina caches protegidos e acesso revogado retira o painel', async () => {
    let revisao = 1;
    let revogado = false;
    mockHttp((path) =>
      path === '/acessos/atual'
        ? revogado
          ? new Response(null, { status: 403 })
          : Response.json({ data: { ...acesso('empresario'), revisao } })
        : colecao([]),
    );
    const { client } = montar(<PainelPage usuario={usuario} />);
    await screen.findByText(/Nenhum empreendimento disponível/);
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
describe('Administração com TanStack Form', () => {
  it('valida criação, aguarda envio, mostra erro e sucesso com código descartável e atualiza listagem', async () => {
    let enviar!: (res: Response) => void;
    let consultas = 0;
    let criado = false;
    const http = mockHttp((path, init) => {
      if (path === '/contas' && init?.method === 'POST')
        return new Promise((resolve) => {
          enviar = resolve;
        });
      if (path.startsWith('/contas?')) {
        consultas++;
        return colecao(
          criado
            ? [
                {
                  id: 2,
                  nome: 'Pessoa nova',
                  email: 'nova@example.test',
                  perfil: 'gestor',
                  ativo: true,
                },
              ]
            : [],
        );
      }
      if (path.includes('/permissoes')) return Response.json({ data: [] });
      return colecao([]);
    });
    const { user } = montar(
      <AdministracaoPainel acesso={acesso('administrador')} />,
    );
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(
      await screen.findByText('Informe o nome (até 200 caracteres).'),
    ).toBeInTheDocument();
    expect(
      http.mock.calls.filter(([, init]) => init?.method === 'POST'),
    ).toHaveLength(0);
    await user.type(screen.getByLabelText('Nome da pessoa'), 'Pessoa nova');
    await user.type(
      screen.getByLabelText('E-mail da conta'),
      'nova@example.test',
    );
    await user.selectOptions(
      screen.getByLabelText('Perfil da conta'),
      'gestor',
    );
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(
      await screen.findByRole('button', { name: 'Salvando…' }),
    ).toBeDisabled();
    enviar(new Response(null, { status: 409 }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    criado = true;
    enviar(
      Response.json({
        data: {
          usuarioId: 2,
          token: 'a'.repeat(64),
          expiraEm: '2099-01-01T00:00:00.000Z',
        },
      }),
    );
    expect(
      await screen.findByRole('region', { name: 'Código de ativação' }),
    ).toHaveTextContent('a'.repeat(64));
    expect(
      await screen.findByRole('button', { name: 'Gerenciar Pessoa nova' }),
    ).toBeInTheDocument();
    expect(consultas).toBeGreaterThan(1);
    expect(screen.getByLabelText('Nome da pessoa')).toHaveValue('');
    const posts = http.mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(JSON.parse(posts[1][1]!.body as string)).toEqual({
      nome: 'Pessoa nova',
      email: 'nova@example.test',
      perfil: 'gestor',
    });
    await user.click(screen.getByRole('button', { name: 'Ocultar código' }));
    expect(screen.queryByText('a'.repeat(64))).not.toBeInTheDocument();
  });
  it('salva vínculo pelo formulário reutilizável e recarrega o estado ativo', async () => {
    let ativo = false;
    const http = mockHttp((_path, init) => {
      if (init?.method === 'PUT') {
        ativo = true;
        return Response.json({ data: { empreendimentoId: 10, ativo } });
      }
      return colecao(
        ativo ? [{ empreendimentoId: 10, nomeFantasia: 'Hotel A', ativo }] : [],
      );
    });
    const { user } = montar(
      <VinculosConta acesso={acesso('administrador')} usuarioId={2} />,
    );
    await user.click(screen.getByRole('button', { name: 'Salvar vínculo' }));
    expect(
      await screen.findByText('Informe o ID positivo do empreendimento.'),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('ID do empreendimento'), '10');
    await user.click(screen.getByRole('button', { name: 'Salvar vínculo' }));
    expect(
      await screen.findByText('Hotel A (ID 10): ativo'),
    ).toBeInTheDocument();
    expect(
      http.mock.calls.some(
        ([path, init]) =>
          String(path).endsWith('/contas/2/vinculos/10') &&
          init?.method === 'PUT',
      ),
    ).toBe(true);
  });
  it('formulário de política impede ampliação indevida e alteração de visibilidade invalida consulta', async () => {
    let permitido = false;
    const http = mockHttp((path, init) => {
      if (init?.method === 'PUT') {
        permitido = true;
        return Response.json({ data: { permitido } });
      }
      if (path.includes('/permissoes'))
        return Response.json({
          data: [
            { recurso: 'indicadores', acao: 'consultar', escopo: 'todos' },
          ],
        });
      return colecao([{ indicadorId: 10, nome: 'Taxa fictícia', permitido }]);
    });
    const { user } = montar(
      <PoliticasPerfil acesso={acesso('administrador')} />,
    );
    await user.selectOptions(
      await screen.findByLabelText('Escopo da permissão'),
      'todos',
    );
    await user.click(screen.getByRole('button', { name: 'Salvar permissão' }));
    expect(
      await screen.findByText('Esta combinação não é permitida para o perfil.'),
    ).toBeInTheDocument();
    expect(
      http.mock.calls.filter(([, init]) => init?.method === 'PUT'),
    ).toHaveLength(0);
    await user.click(
      screen.getByRole('button', { name: 'Liberar Taxa fictícia' }),
    );
    expect(
      await screen.findByText('Taxa fictícia: liberado'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Restringir Taxa fictícia' }),
    ).toBeInTheDocument();
  });
});
