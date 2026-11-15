import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SESSAO_QUERY_KEY } from '@/hooks/use-sessao';
import { renderApp } from '@/test/render-app';

const data = {
  usuario: {
    id: 900001,
    nome: 'Pessoa Fictícia',
    email: 'conta@example.test',
    perfil: 'empresario',
  },
  expiraEm: '2099-01-01T00:00:00.000Z',
};
function montar(caminho = '/entrar') {
  const request = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).endsWith('/acessos/atual')
      ? Promise.resolve(
          Response.json({
            data: {
              usuarioId: data.usuario.id,
              perfil: 'empresario',
              revisao: 1,
              permissoes: [],
              vinculos: [],
            },
          }),
        )
      : request(input, init),
  );
  return renderApp(caminho);
}
describe('Acesso individual', () => {
  it('valida campos no TanStack Form sem enviar login ou ativação inválidos', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', request);
    const { user } = montar();
    await user.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(
      await screen.findByText('Informe um e-mail válido.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await user.type(screen.getByLabelText('E-mail'), 'invalido');
    await user.type(screen.getByLabelText('Senha'), 'Senha fictícia longa');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(request).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: 'Tenho um código de acesso' }),
    );
    expect(screen.getByLabelText('Senha')).toHaveValue('');
    await user.type(
      screen.getByLabelText('Código fornecido pelo administrador'),
      'z'.repeat(64),
    );
    await user.type(screen.getByLabelText('Senha'), 'curta');
    await user.click(screen.getByRole('button', { name: 'Salvar senha' }));
    expect(
      await screen.findByText('Use entre 12 e 128 caracteres na senha.'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Código fornecido pelo administrador'),
    ).toHaveAttribute('aria-invalid', 'true');
    expect(request).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: 'Voltar para entrar' }),
    );
    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('aguarda a mutation de login e impede submissões duplicadas', async () => {
    let complete!: (response: Response) => void;
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            complete = resolve;
          }),
      );
    vi.stubGlobal('fetch', request);
    const { user } = montar();
    await user.type(
      await screen.findByLabelText('E-mail'),
      'conta@example.test',
    );
    await user.type(
      screen.getByLabelText('Senha'),
      'Senha fictícia longa{Enter}',
    );
    const waiting = await screen.findByRole('button', { name: 'Aguarde…' });
    expect(waiting).toBeDisabled();
    expect(screen.getByLabelText('E-mail')).toBeDisabled();
    expect(screen.getByLabelText('Senha')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Tenho um código de acesso' }),
    ).toBeDisabled();
    await user.click(waiting);
    expect(request).toHaveBeenCalledTimes(2);
    complete(new Response(null, { status: 401 }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha inválidos',
    );
    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.getByLabelText('E-mail')).toHaveValue('conta@example.test');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    await user.type(
      screen.getByLabelText('Senha'),
      'Outra senha fictícia{Enter}',
    );
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('erro na ativação limpa segredos e permite tentar novamente', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', request);
    const { user } = montar();
    await user.click(
      await screen.findByRole('button', { name: 'Tenho um código de acesso' }),
    );
    const preencher = async () => {
      await user.type(
        screen.getByLabelText('Código fornecido pelo administrador'),
        'a'.repeat(64),
      );
      await user.type(
        screen.getByLabelText('Senha'),
        'Senha fictícia longa{Enter}',
      );
    };
    await preencher();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Confira os campos',
    );
    expect(
      screen.getByLabelText('Código fornecido pelo administrador'),
    ).toHaveValue('');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
    await preencher();
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('revalidação remove dados antigos ao expirar ou trocar de identidade em outra aba', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data }))
      .mockResolvedValueOnce(
        Response.json({
          data: { ...data, usuario: { ...data.usuario, id: 900002 } },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', request);
    const { client } = montar('/');
    await screen.findByText('Olá, Pessoa Fictícia');
    client.setQueryData(['inventarios', 900001], 'dados anteriores');
    await act(async () => {
      await client.invalidateQueries({ queryKey: SESSAO_QUERY_KEY });
    });
    expect(client.getQueryData(['inventarios', 900001])).toBeUndefined();
    client.setQueryData(['inventarios', 900002], 'outros dados');
    await act(async () => {
      await client.invalidateQueries({ queryKey: SESSAO_QUERY_KEY });
    });
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
    expect(client.getQueryData(['inventarios', 900002])).toBeUndefined();
  });
  it('recupera sessão antes de mostrar dados e permite tentar novamente após falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('Rede indisponível'))
        .mockResolvedValueOnce(Response.json({ data })),
    );
    const { user } = montar('/');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Recuperando sessão',
    );
    await user.click(
      await screen.findByRole('button', { name: 'Tentar novamente' }),
    );
    expect(await screen.findByText('Olá, Pessoa Fictícia')).toBeInTheDocument();
  });
  it('login/logout por teclado, cookie transportado e cache anterior removido', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ data }))
      .mockResolvedValueOnce(Response.json({ data }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const { user, client } = montar();
    await screen.findByLabelText('E-mail');
    client.setQueryData(['inventarios', 'anterior'], { segredo: true });
    await user.type(screen.getByLabelText('E-mail'), 'conta@example.test');
    await user.type(
      screen.getByLabelText('Senha'),
      'Senha fictícia longa{Enter}',
    );
    expect(await screen.findByText('Olá, Pessoa Fictícia')).toBeInTheDocument();
    expect(client.getQueryData(['inventarios', 'anterior'])).toBeUndefined();
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      credentials: 'include',
      method: 'POST',
      headers: { 'X-OTO-Request': '1' },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await user.click(
      screen.getByRole('button', { name: /Conta de Pessoa Fictícia/ }),
    );
    await user.click(await screen.findByRole('button', { name: 'Sair' }));
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
  });
  it('login inválido mostra erro sem repetir e permite recuperação assistida', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const { user } = montar();
    await user.type(
      await screen.findByLabelText('E-mail'),
      'conta@example.test',
    );
    await user.type(screen.getByLabelText('Senha'), 'Senha fictícia longa');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha inválidos',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await user.click(
      screen.getByRole('button', { name: 'Tenho um código de acesso' }),
    );
    expect(
      screen.getByLabelText('Código fornecido pelo administrador'),
    ).toBeInTheDocument();
  });
  it('ativação válida volta ao login sem criar sessão', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 })),
    );
    const { user } = montar();
    await user.click(
      await screen.findByRole('button', { name: 'Tenho um código de acesso' }),
    );
    await user.type(
      screen.getByLabelText('Código fornecido pelo administrador'),
      'a'.repeat(64),
    );
    await user.type(screen.getByLabelText('Senha'), 'Senha fictícia longa');
    await user.click(screen.getByRole('button', { name: 'Salvar senha' }));
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Senha definida');
  });
});
