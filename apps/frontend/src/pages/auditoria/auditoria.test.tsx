import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const EVENTO = {
  id: 7,
  entidade: 'empreendimento',
  entidadeId: 10,
  acao: 'alterar',
  em: '2026-11-15T12:00:00.000Z',
  usuarioId: 1,
  autor: 'Pessoa fictícia',
  origem: 'manual',
  processo: null,
  correlacaoId: 'lote:07',
};
const DETALHE = {
  ...EVENTO,
  antes: { nomeFantasia: 'Antes fictício', leitos: null },
  depois: { nomeFantasia: 'Depois fictício', leitos: 0 },
  diferencas: [
    {
      campo: 'nomeFantasia',
      antes: 'Antes fictício',
      depois: 'Depois fictício',
      antesPresente: true,
      depoisPresente: true,
    },
    {
      campo: 'leitos',
      antes: null,
      depois: 0,
      antesPresente: true,
      depoisPresente: true,
    },
    {
      campo: 'novo',
      antes: null,
      depois: false,
      antesPresente: false,
      depoisPresente: true,
    },
  ],
};
function servidor(
  handler: (path: string) => Response | Promise<Response>,
  perfil: 'administrador' | 'gestor' = 'administrador',
) {
  return mockHttp((path) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    return handler(path);
  });
}
describe('Auditoria: consulta autorizada e detalhe histórico', () => {
  it('mostra carregamento e estado vazio com consulta OData no servidor', async () => {
    let concluir!: (r: Response) => void;
    const request = servidor(
      () =>
        new Promise((resolve) => {
          concluir = resolve;
        }),
    );
    renderApp('/auditoria');
    expect(
      await screen.findByText('Carregando eventos de auditoria…'),
    ).toBeInTheDocument();
    await act(async () => concluir(colecao([])));
    expect(
      await screen.findByText(
        'Nenhum evento encontrado para os filtros informados.',
      ),
    ).toBeInTheDocument();
    expect(
      request.mock.calls.some(([url]) => String(url).includes('%24count=true')),
    ).toBe(true);
  });
  it('erro de consulta permite tentar novamente sem inventar eventos', async () => {
    let falha = true;
    servidor(() =>
      falha ? new Response(null, { status: 503 }) : colecao([EVENTO]),
    );
    const { user } = renderApp('/auditoria');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    falha = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByRole('table', { name: 'Eventos de auditoria' }),
    ).toHaveTextContent('empreendimento');
  });
  it('abre detalhe, distingue ausência/null/zero/false e fecha por Escape', async () => {
    servidor((path) =>
      path === '/auditorias/7'
        ? Response.json({ data: DETALHE })
        : colecao([EVENTO]),
    );
    const { user } = renderApp('/auditoria');
    await user.click(
      await screen.findByRole('button', { name: 'Ações de evento 7' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Ver detalhes' }),
    );
    const dialogo = await screen.findByRole('dialog');
    const tabela = await within(dialogo).findByRole('table', {
      name: 'Diferenças do evento',
    });
    expect(tabela).toHaveTextContent('Antes fictício');
    expect(tabela).toHaveTextContent('Depois fictício');
    expect(tabela).toHaveTextContent('Não informado');
    expect(tabela).toHaveTextContent('Ausente');
    expect(tabela).toHaveTextContent('Não');
    expect(within(tabela).getByText('0', { exact: true })).toBeInTheDocument();
    expect(
      within(dialogo).queryByRole('button', { name: /Excluir|Salvar/ }),
    ).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('falha no detalhe permite tentar novamente dentro do diálogo', async () => {
    let falha = true;
    servidor((path) =>
      path === '/auditorias/7'
        ? falha
          ? new Response(null, { status: 503 })
          : Response.json({ data: DETALHE })
        : colecao([EVENTO]),
    );
    const { user } = renderApp('/auditoria');
    await user.click(
      await screen.findByRole('button', { name: 'Ações de evento 7' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Ver detalhes' }),
    );
    const dialogo = screen.getByRole('dialog');
    expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
    falha = false;
    await user.click(
      within(dialogo).getByRole('button', { name: 'Tentar novamente' }),
    );
    expect(
      await within(dialogo).findByRole('table', {
        name: 'Diferenças do evento',
      }),
    ).toHaveTextContent('Antes fictício');
  });

  it('fechar o detalhe cancela a consulta pendente', async () => {
    let signal: AbortSignal | undefined;
    mockHttp((path, init) => {
      if (path === '/sessoes/atual') return sessaoFicticia('administrador');
      if (path === '/acessos/atual')
        return Response.json({ data: acessoDoPerfil('administrador') });
      if (path === '/auditorias/7') {
        signal = init?.signal ?? undefined;
        return new Promise((_, reject) =>
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Cancelada', 'AbortError')),
          ),
        );
      }
      return colecao([EVENTO]);
    });
    const { user } = renderApp('/auditoria');
    await user.click(
      await screen.findByRole('button', { name: 'Ações de evento 7' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Ver detalhes' }),
    );
    expect(
      await within(screen.getByRole('dialog')).findByText('Carregando evento…'),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it('filtra por entidade na URL e encaminha o filtro ao servidor', async () => {
    const request = servidor(() => colecao([EVENTO]));
    const { user, router } = renderApp('/auditoria');
    await user.click(
      await screen.findByRole('button', { name: 'Filtrar Entidade' }),
    );
    await user.type(screen.getByLabelText('Valor'), 'empreendimento');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() =>
      expect(router.state.location.searchStr).toContain('auditorias.filter'),
    );
    await waitFor(() =>
      expect(
        request.mock.calls.some(([url]) => {
          const u = new URL(String(url));
          return u.searchParams.get('$filter')?.includes('empreendimento');
        }),
      ).toBe(true),
    );
  });
  it('perfil sem permissão recebe acesso negado e não consulta eventos', async () => {
    const request = servidor(() => colecao([]), 'gestor');
    renderApp('/auditoria');
    expect(await screen.findByText('Acesso negado')).toBeInTheDocument();
    expect(
      request.mock.calls.some(([url]) => String(url).includes('/auditorias')),
    ).toBe(false);
    expect(
      screen.queryByRole('link', { name: /^Auditoria$/ }),
    ).not.toBeInTheDocument();
  });
  it('revogação de acesso remove o detalhe e o cache protegido', async () => {
    let revogado = false;
    mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia('administrador');
      if (path === '/acessos/atual')
        return revogado
          ? new Response(null, { status: 403 })
          : Response.json({ data: acessoDoPerfil('administrador') });
      return path === '/auditorias/7'
        ? Response.json({ data: DETALHE })
        : colecao([EVENTO]);
    });
    const { user, client } = renderApp('/auditoria');
    await user.click(
      await screen.findByRole('button', { name: 'Ações de evento 7' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Ver detalhes' }),
    );
    await within(screen.getByRole('dialog')).findByText('Antes fictício');
    revogado = true;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['acesso'] });
    });
    await screen.findByRole('alert');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(
      client.getQueryCache().findAll({ queryKey: ['auditoria'] }),
    ).toHaveLength(0);
  });
});
