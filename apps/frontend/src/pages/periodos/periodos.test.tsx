import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const PERIODO = {
  id: 1,
  tipo: 'mes',
  rotulo: 'Novembro de 2026',
  dataInicio: '2026-11-01',
  dataFim: '2026-11-30',
};

function servidor(
  perfil: 'gestor' | 'estagiario' | 'visualizador',
  opcoes: { emUso?: boolean; criar409?: boolean; alterar409?: boolean } = {},
) {
  const lista = [{ ...PERIODO }];
  return mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    if (path === '/periodos' && init?.method === 'POST') {
      if (opcoes.criar409)
        return Response.json(
          {
            error: {
              code: 'PERIODO_DUPLICADO',
              message: 'Já existe um período com este tipo e intervalo.',
            },
          },
          { status: 409 },
        );
      const criado = { id: 2, ...JSON.parse(init!.body as string) };
      lista.push(criado);
      return Response.json({ data: criado }, { status: 201 });
    }
    if (path === '/periodos/1' && init?.method === 'PUT') {
      if (opcoes.alterar409)
        return Response.json(
          {
            error: {
              code: 'PERIODO_EM_USO',
              message:
                'O período já referencia pesquisas, coletas ou indicadores.',
            },
          },
          { status: 409 },
        );
      return Response.json({
        data: {
          ...PERIODO,
          ...JSON.parse(init!.body as string),
          emUso: opcoes.emUso ?? false,
        },
      });
    }
    if (path === '/periodos/1')
      return Response.json({
        data: { ...PERIODO, emUso: opcoes.emUso ?? false },
      });
    if (path.startsWith('/periodos?')) return colecao(lista);
    return colecao([]);
  });
}

describe('Períodos', () => {
  it('carrega a grade e cria um período pelo diálogo, atualizando a lista', async () => {
    const http = servidor('gestor');
    const { user } = renderApp('/periodos');
    const grade = await screen.findByRole('table', { name: 'Períodos' });
    expect(within(grade).getByText('Novembro de 2026')).toBeInTheDocument();
    expect(within(grade).getByText('Mês de referência')).toBeInTheDocument();
    expect(
      http.mock.calls.some(([url]) => String(url).includes('/periodos?')),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Novo período' }));
    await user.click(
      await screen.findByRole('button', { name: 'Criar período' }),
    );
    expect(
      await screen.findByText('Informe um rótulo de 1 a 120 caracteres.'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Informe uma data válida (YYYY-MM-DD).').length,
    ).toBeGreaterThan(0);

    await user.selectOptions(
      screen.getByLabelText('Tipo'),
      'feriado_prolongado',
    );
    await user.type(screen.getByLabelText('Rótulo'), '  Férias de julho ');
    fireEvent.change(screen.getByLabelText('Início'), {
      target: { value: '2026-07-01' },
    });
    fireEvent.change(screen.getByLabelText('Fim'), {
      target: { value: '2026-07-15' },
    });
    expect(screen.getByText('Duração: 15 dias.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar período' }));
    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith('/periodos') && init?.method === 'POST',
        ),
      ).toBe(true),
    );
    const post = http.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/periodos') && init?.method === 'POST',
    )!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      tipo: 'feriado_prolongado',
      rotulo: 'Férias de julho',
      dataInicio: '2026-07-01',
      dataFim: '2026-07-15',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    // A criação invalida a grade: a nova linha aparece sem recarregar a página.
    expect(await screen.findByText('Férias de julho')).toBeInTheDocument();
  });

  it('conflito de duplicidade mostra mensagem amigável e mantém o formulário', async () => {
    servidor('gestor', { criar409: true });
    const { user } = renderApp('/periodos');
    await user.click(
      await screen.findByRole('button', { name: 'Novo período' }),
    );
    await user.type(await screen.findByLabelText('Rótulo'), 'Novembro de 2026');
    fireEvent.change(screen.getByLabelText('Início'), {
      target: { value: '2026-11-01' },
    });
    fireEvent.change(screen.getByLabelText('Fim'), {
      target: { value: '2026-11-30' },
    });
    await user.click(screen.getByRole('button', { name: 'Criar período' }));
    expect(
      await screen.findByText(
        'Já existe um período com este tipo e intervalo. Ajuste as datas ou o tipo.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Rótulo')).toHaveValue('Novembro de 2026');
  });

  it('edição mostra detalhe com duração e uso, e envia só o que mudou', async () => {
    const http = servidor('gestor', { emUso: true });
    const { user } = renderApp('/periodos');
    await user.click(
      await screen.findByRole('button', { name: 'Ações de Novembro de 2026' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    expect(await screen.findByText('Em uso')).toBeInTheDocument();
    expect(screen.getByText('Duração: 30 dias.')).toBeInTheDocument();
    expect(screen.getByLabelText('Início')).toBeDisabled();
    expect(screen.getByLabelText('Fim')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Salvar período' }));
    expect(
      await screen.findByText('Informe ao menos um campo para alterar.'),
    ).toBeInTheDocument();
    expect(http.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(
      false,
    );

    const rotulo = screen.getByLabelText('Rótulo');
    await user.clear(rotulo);
    await user.type(rotulo, 'Novembro cheio');
    await user.click(screen.getByRole('button', { name: 'Salvar período' }));
    await waitFor(() =>
      expect(http.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(
        true,
      ),
    );
    const put = http.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(JSON.parse(put[1]!.body as string)).toEqual({
      rotulo: 'Novembro cheio',
    });
  });

  it('conflito de período em uso explica a trava de datas e tipo', async () => {
    servidor('gestor', { alterar409: true });
    const { user } = renderApp('/periodos');
    await user.click(
      await screen.findByRole('button', { name: 'Ações de Novembro de 2026' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    await screen.findByText('Sem uso registrado');
    fireEvent.change(screen.getByLabelText('Fim'), {
      target: { value: '2026-12-05' },
    });
    await user.click(screen.getByRole('button', { name: 'Salvar período' }));
    expect(
      await screen.findByText(
        'O período já referencia pesquisas, coletas ou indicadores: datas e tipo não podem mudar. Altere apenas o rótulo ou crie um novo período.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('estagiário consulta sem ver o botão de criação', async () => {
    servidor('estagiario');
    renderApp('/periodos');
    expect(
      await screen.findByRole('table', { name: 'Períodos' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Novo período' }),
    ).not.toBeInTheDocument();
  });

  it('sem permissão de pesquisas não há acesso nem menu', async () => {
    servidor('visualizador');
    renderApp('/periodos');
    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Períodos' }),
    ).not.toBeInTheDocument();
  });
});
