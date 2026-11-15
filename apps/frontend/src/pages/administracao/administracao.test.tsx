import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdministracaoPage } from './index';
import { VinculosConta } from './components/vinculos';
import { PoliticasPerfil } from './components/politicas';
import { acessoDoPerfil, colecao, mockHttp } from '@/test/http';
import { renderComContexto } from '@/test/com-contexto';

const acesso = acessoDoPerfil;
async function montar(
  elemento: React.ReactNode,
  perfil = 'administrador' as const,
) {
  return await renderComContexto(elemento, perfil);
}

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
      if (path.includes('/permissoes')) return colecao([]);
      return colecao([]);
    });
    const { user } = await montar(<AdministracaoPage />);
    await user.click(await screen.findByRole('button', { name: 'Nova conta' }));
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
      await screen.findByRole('button', { name: 'Ações de Pessoa nova' }),
    ).toBeInTheDocument();
    expect(consultas).toBeGreaterThan(1);
    expect(screen.queryByLabelText('Nome da pessoa')).not.toBeInTheDocument();
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
    const { user } = await montar(
      <VinculosConta acesso={acesso('administrador')} usuarioId={2} />,
    );
    await user.click(screen.getByRole('button', { name: 'Salvar vínculo' }));
    expect(
      await screen.findByText('Informe o ID positivo do empreendimento.'),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('ID do empreendimento'), '10');
    await user.click(screen.getByRole('button', { name: 'Salvar vínculo' }));
    const grade = await screen.findByRole('table', { name: 'Vínculos' });
    expect(within(grade).getByText('Hotel A')).toBeInTheDocument();
    expect(within(grade).getByText('Ativo')).toBeInTheDocument();
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
        return colecao([
          { recurso: 'indicadores', acao: 'consultar', escopo: 'todos' },
        ]);
      return colecao([{ indicadorId: 10, nome: 'Taxa fictícia', permitido }]);
    });
    const { user } = await montar(
      <PoliticasPerfil acesso={acesso('administrador')} />,
    );
    await user.click(
      await screen.findByRole('button', { name: 'Alterar permissão' }),
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
    await user.keyboard('{Escape}');
    await user.click(
      await screen.findByRole('button', { name: 'Ações de Taxa fictícia' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Liberar' }));
    const grade = screen.getByRole('table', { name: 'Visibilidade' });
    expect(await within(grade).findByText('Liberado')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Ações de Taxa fictícia' }),
    );
    expect(
      await screen.findByRole('menuitem', { name: 'Restringir' }),
    ).toBeInTheDocument();
  });
});
