import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const SEGMENTO = {
  id: 1,
  chave: 'hospedagem',
  nome: 'Hospedagem',
  nivelCadastro: 'completo',
};
const GRUPO = {
  id: 1,
  segmentoId: 1,
  chave: 'hospedagem.recepcao',
  pergunta: 'Recepção',
  secao: 'Serviços e equipamentos',
  selecao: 'multipla',
  permiteOutro: true,
  ordem: 40,
  ativo: true,
};
const ITEM = {
  id: 5,
  grupoId: 1,
  grupoChave: 'hospedagem.recepcao',
  chave: 'hospedagem.recepcao.sanitario',
  rotulo: 'Sanitário',
  exclusivo: false,
  outro: false,
  aceitaQuantidade: false,
  ordem: 60,
  ativo: true,
  versao: 2,
};

function servidor(perfil: 'administrador' | 'gestor') {
  return mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    if (path === '/segmentos') return Response.json({ data: [SEGMENTO] });
    if (path.startsWith('/catalogos/grupos')) return colecao([GRUPO]);
    if (path === '/catalogos/itens' && init?.method === 'POST')
      return Response.json(
        {
          data: {
            ...ITEM,
            id: 6,
            chave: 'hospedagem.recepcao.lavanderia',
            rotulo: 'Lavanderia',
            versao: 1,
          },
        },
        { status: 201 },
      );
    if (path === '/catalogos/itens/5' && init?.method === 'PUT')
      return Response.json({ data: { ...ITEM, ativo: false } });
    if (path.startsWith('/catalogos/itens/5/versoes'))
      return colecao([
        {
          numero: 2,
          rotulo: 'Sanitário PCD',
          pergunta: 'Recepção',
          selecao: 'multipla',
          exclusivo: false,
          outro: false,
          aceitaQuantidade: false,
          criadaEm: '2026-11-15T12:00:00.000Z',
          motivo: 'Padronização do rótulo',
        },
        {
          numero: 1,
          rotulo: 'Sanitário',
          pergunta: 'Recepção',
          selecao: 'multipla',
          exclusivo: false,
          outro: false,
          aceitaQuantidade: false,
          criadaEm: '2026-11-14T12:00:00.000Z',
          motivo: null,
        },
      ]);
    if (path.startsWith('/catalogos/itens')) return colecao([ITEM]);
    return colecao([]);
  });
}

describe('Catálogos do inventário', () => {
  it('lista itens em grade, cria item com payload normalizado e inativa sem remover', async () => {
    const http = servidor('administrador');
    const { user } = renderApp('/catalogos');
    const grade = await screen.findByRole('table', {
      name: 'Itens do catálogo',
    });
    expect(within(grade).getByText('Sanitário')).toBeInTheDocument();
    expect(
      http.mock.calls.some(([url]) =>
        String(url).includes('/catalogos/itens?'),
      ),
    ).toBe(true);

    await user.click(
      screen.getByRole('button', {
        name: 'Ações de hospedagem.recepcao.sanitario',
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Inativar' }));
    await waitFor(() =>
      expect(
        http.mock.calls.find(
          ([url, init]) =>
            String(url).endsWith('/catalogos/itens/5') &&
            init?.method === 'PUT',
        ),
      ).toBeTruthy(),
    );
    const put = http.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/catalogos/itens/5') && init?.method === 'PUT',
    )!;
    expect(JSON.parse(put[1]!.body as string)).toEqual({ ativo: false });

    const novo = screen.getByRole('button', { name: 'Novo item' });
    await waitFor(() => expect(novo).toBeEnabled());
    await user.click(novo);
    await user.click(await screen.findByRole('button', { name: 'Criar item' }));
    expect(
      await screen.findByText('Informe um texto de 1 a 200 caracteres.'),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText('Chave estável'),
      'hospedagem.recepcao.lavanderia',
    );
    await user.type(screen.getByLabelText('Rótulo'), '  Lavanderia ');
    await user.click(screen.getByRole('button', { name: 'Criar item' }));
    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith('/catalogos/itens') && init?.method === 'POST',
        ),
      ).toBe(true),
    );
    const post = http.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/catalogos/itens') && init?.method === 'POST',
    )!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      grupoId: 1,
      chave: 'hospedagem.recepcao.lavanderia',
      rotulo: 'Lavanderia',
      exclusivo: false,
      outro: false,
      aceitaQuantidade: false,
      ordem: 10,
    });
  });

  it('editar envia só o que mudou; sem mudança não envia e avisa', async () => {
    const http = servidor('administrador');
    const { user } = renderApp('/catalogos');
    await user.click(
      await screen.findByRole('button', {
        name: 'Ações de hospedagem.recepcao.sanitario',
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Salvar item' }),
    );
    expect(
      await screen.findByText('Informe ao menos um campo para alterar.'),
    ).toBeInTheDocument();
    expect(http.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(
      false,
    );
    const rotulo = screen.getByLabelText('Rótulo');
    await user.clear(rotulo);
    await user.type(rotulo, 'Sanitário PCD');
    await user.type(
      screen.getByLabelText('Motivo da alteração'),
      'Padronização',
    );
    await user.click(screen.getByRole('button', { name: 'Salvar item' }));
    await waitFor(() =>
      expect(http.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(
        true,
      ),
    );
    const put = http.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(JSON.parse(put[1]!.body as string)).toEqual({
      rotulo: 'Sanitário PCD',
      motivo: 'Padronização',
    });
  });

  it('histórico mostra as versões imutáveis do item em uma grade', async () => {
    servidor('administrador');
    const { user } = renderApp('/catalogos');
    await user.click(
      await screen.findByRole('button', {
        name: 'Ações de hospedagem.recepcao.sanitario',
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Histórico' }),
    );
    const grade = await screen.findByRole('table', { name: 'Versões do item' });
    expect(within(grade).getByText('Sanitário PCD')).toBeInTheDocument();
    expect(
      within(grade).getByText('Padronização do rótulo'),
    ).toBeInTheDocument();
    expect(within(grade).getAllByRole('row')).toHaveLength(3);
  });

  it('gestor não vê o menu nem acessa a gestão de catálogos', async () => {
    servidor('gestor');
    renderApp('/catalogos');
    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Catálogos' }),
    ).not.toBeInTheDocument();
  });
});
