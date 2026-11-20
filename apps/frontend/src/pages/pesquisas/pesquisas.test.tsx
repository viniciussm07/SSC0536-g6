import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Perfil } from '@ssc0536/common';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const MODELO = {
  id: 3,
  nome: 'Ocupação fictícia',
  publicoAlvo: 'Meios de hospedagem',
  versao: 2,
  criadaEm: '2026-11-15T12:00:00.000Z',
};
const OUTUBRO = {
  id: 7,
  tipo: 'mes',
  rotulo: 'Outubro 2026',
  dataInicio: '2026-10-01',
  dataFim: '2026-10-31',
};
const LINHA = {
  id: 40,
  titulo: 'Consolidado de outubro',
  tipoColeta: 'consolidado',
  status: 'rascunho',
  abertura: '2026-11-20T12:00:00.000Z',
  prazo: '2026-12-01T02:59:00.000Z',
  modeloId: 3,
  modeloVersao: 2,
};
const RASCUNHO = {
  ...LINHA,
  situacao: 'rascunho',
  modeloNome: 'Ocupação fictícia',
  segmentoIds: [],
  criadaEm: '2026-11-16T12:00:00.000Z',
  abertaEm: null,
  encerradaEm: null,
  periodos: [OUTUBRO],
  perguntas: [
    {
      id: 1,
      periodoId: 7,
      campoId: 9,
      chave: 'ocupacao',
      rotulo: 'Ocupação (%)',
      tipoValor: 'percentual',
      obrigatorio: true,
    },
  ],
  participacao: {
    elegiveis: 3,
    destinatarios: null,
    respondentes: 0,
    pendentes: null,
  },
};
const ABERTA = {
  ...RASCUNHO,
  status: 'aberta',
  situacao: 'recebendo',
  abertaEm: '2026-11-20T12:00:00.000Z',
  participacao: {
    elegiveis: 3,
    destinatarios: 3,
    respondentes: 1,
    pendentes: 2,
  },
};

function servidor(
  perfil: Perfil = 'gestor',
  opcoes: {
    abrir409?: boolean;
    detalhe?: object;
    segmentoFalha?: boolean;
    linha?: object;
  } = {},
) {
  let atual: object = opcoes.detalhe ?? RASCUNHO;
  let falhaSegmento = opcoes.segmentoFalha;
  return mockHttp((path, init) => {
    const metodo = init?.method ?? 'GET';
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    if (path === '/pesquisas' && metodo === 'POST')
      return Response.json({ data: RASCUNHO }, { status: 201 });
    if (path === '/pesquisas/40/abertura' && metodo === 'POST') {
      if (opcoes.abrir409)
        return Response.json(
          {
            error: {
              code: 'PESQUISA_SEM_DESTINATARIOS',
              message: 'Nenhum empreendimento ativo atende ao público.',
            },
          },
          { status: 409 },
        );
      atual = ABERTA;
      return Response.json({ data: ABERTA });
    }
    if (path === '/pesquisas/40') return Response.json({ data: atual });
    if (path.startsWith('/pesquisas/40/destinatarios'))
      return colecao([
        {
          empreendimentoId: 1,
          nomeFantasia: 'Pousada Fictícia',
          situacaoResposta: 'respondeu',
          respondidaEm: '2026-11-21T12:00:00.000Z',
        },
        {
          empreendimentoId: 2,
          nomeFantasia: 'Hotel Fictício',
          situacaoResposta: 'pendente',
          respondidaEm: null,
        },
      ]);
    if (path.startsWith('/pesquisas?')) return colecao([opcoes.linha ?? LINHA]);
    if (path.startsWith('/modelos-pesquisa?')) return colecao([MODELO]);
    if (path.startsWith('/periodos?')) return colecao([OUTUBRO]);
    if (path === '/segmentos') {
      if (falhaSegmento) {
        falhaSegmento = false;
        return new Response(null, { status: 503 });
      }
      return Response.json({ data: [] });
    }
    return colecao([]);
  });
}

describe('Edições de pesquisa', () => {
  it('preserva segundos originais ao alterar apenas o título de edição aberta', async () => {
    const http = servidor('gestor', {
      detalhe: { ...ABERTA, abertura: '2026-11-20T12:00:35.123Z' },
    });
    const { user } = renderApp('/pesquisas');
    const grade = await screen.findByRole('table', {
      name: 'Edições de pesquisa',
    });
    await user.click(
      within(grade).getByRole('button', {
        name: 'Ações de Consolidado de outubro',
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    const titulo = await screen.findByLabelText('Título');
    await user.clear(titulo);
    await user.type(titulo, 'Título atualizado');
    await user.click(screen.getByRole('button', { name: 'Salvar edição' }));
    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith('/pesquisas/40') && init?.method === 'PUT',
        ),
      ).toBe(true),
    );
    const [, init] = http.mock.calls.find(
      ([url, i]) =>
        String(url).endsWith('/pesquisas/40') && i?.method === 'PUT',
    )!;
    expect(JSON.parse(init!.body as string)).toEqual({
      titulo: 'Título atualizado',
    });
  });

  it('permite adotar explicitamente a versão vigente do mesmo modelo', async () => {
    const http = servidor('gestor', {
      detalhe: { ...RASCUNHO, modeloVersao: 1 },
    });
    const { user } = renderApp('/pesquisas');
    const grade = await screen.findByRole('table', {
      name: 'Edições de pesquisa',
    });
    await user.click(
      within(grade).getByRole('button', {
        name: 'Ações de Consolidado de outubro',
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    await user.click(
      await screen.findByRole('checkbox', {
        name: 'Adotar a versão vigente ao salvar',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Salvar edição' }));
    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith('/pesquisas/40') && init?.method === 'PUT',
        ),
      ).toBe(true),
    );
    const [, init] = http.mock.calls.find(
      ([url, i]) =>
        String(url).endsWith('/pesquisas/40') && i?.method === 'PUT',
    )!;
    expect(JSON.parse(init!.body as string)).toEqual({ modeloId: 3 });
  });

  it('impede criar durante falha de segmentos e oferece nova tentativa', async () => {
    servidor('gestor', { segmentoFalha: true });
    const { user } = renderApp('/pesquisas');
    await user.click(
      await screen.findByRole('button', { name: 'Nova edição' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar segmentos',
    );
    expect(
      screen.queryByRole('button', { name: 'Criar rascunho' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByRole('button', { name: 'Criar rascunho' }),
    ).toBeInTheDocument();
  });

  it('mostra prazo vencido na grade para edição aberta expirada', async () => {
    servidor('gestor', {
      linha: {
        ...LINHA,
        status: 'aberta',
        abertura: '2020-01-01T00:00:00.000Z',
        prazo: '2020-01-02T00:00:00.000Z',
      },
    });
    renderApp('/pesquisas');
    const grade = await screen.findByRole('table', {
      name: 'Edições de pesquisa',
    });
    expect(within(grade).getByText('Prazo vencido')).toBeInTheDocument();
  });

  it('permite alterar título de edição expirada sem permitir mudar prazo', async () => {
    servidor('gestor', { detalhe: { ...ABERTA, situacao: 'expirada' } });
    const { user } = renderApp('/pesquisas');
    const grade = await screen.findByRole('table', {
      name: 'Edições de pesquisa',
    });
    await user.click(
      within(grade).getByRole('button', {
        name: 'Ações de Consolidado de outubro',
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    expect(await screen.findByLabelText('Título')).toBeEnabled();
    expect(screen.getByLabelText('Prazo (horário de Brasília)')).toBeDisabled();
  });

  it('cria rascunho com horários de Brasília convertidos para UTC', async () => {
    const http = servidor();
    const { user } = renderApp('/pesquisas');
    const grade = await screen.findByRole('table', {
      name: 'Edições de pesquisa',
    });
    expect(
      within(grade).getByText('Consolidado de outubro'),
    ).toBeInTheDocument();
    expect(within(grade).getByText('30/11/2026, 23:59')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nova edição' }));
    await user.click(
      await screen.findByRole('button', { name: 'Criar rascunho' }),
    );
    // Validação do common no formulário: título, modelo, períodos e horários.
    expect(
      (await screen.findAllByText('Campo obrigatório.')).length,
    ).toBeGreaterThanOrEqual(3);

    await user.type(screen.getByLabelText('Título'), 'Consolidado de outubro');
    await user.selectOptions(
      screen.getByLabelText('Modelo de pesquisa'),
      await screen.findByRole('option', { name: 'Ocupação fictícia (v2)' }),
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Outubro 2026 (2026-10-01 a 2026-10-31)',
      }),
    );
    await user.type(
      screen.getByLabelText('Abertura (horário de Brasília)'),
      '2026-11-20T09:00',
    );
    await user.type(
      screen.getByLabelText('Prazo (horário de Brasília)'),
      '2026-11-30T23:59',
    );
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(
      await screen.findByText(
        'Confirme a seleção de todos os empreendimentos ativos ou escolha segmentos.',
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', {
        name: /Confirmo todos os empreendimentos/,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith('/pesquisas') && init?.method === 'POST',
        ),
      ).toBe(true),
    );
    const [, init] = http.mock.calls.find(
      ([url, i]) => String(url).endsWith('/pesquisas') && i?.method === 'POST',
    )!;
    expect(JSON.parse(init!.body as string)).toEqual({
      titulo: 'Consolidado de outubro',
      tipoColeta: 'expectativa',
      modeloId: 3,
      periodoIds: [7],
      segmentoIds: [],
      abertura: '2026-11-20T12:00:00.000Z',
      prazo: '2026-12-01T02:59:00.000Z',
    });
    // Após criar, abre o acompanhamento com a prévia de elegíveis.
    expect(await screen.findByText('Elegíveis agora')).toBeInTheDocument();
  });

  it('revisa e abre: contagens de participação e destinatários aparecem', async () => {
    const http = servidor();
    const { user } = renderApp('/pesquisas');
    const grade = await screen.findByRole('table', {
      name: 'Edições de pesquisa',
    });
    await user.click(
      within(grade).getByRole('button', {
        name: 'Ações de Consolidado de outubro',
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Acompanhar' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Revisar e abrir' }),
    );
    const confirmacao = screen.getByRole('alertdialog', {
      name: 'Confirmar abertura',
    });
    expect(confirmacao).toHaveTextContent('Elegíveis agora: 3.');
    await user.click(
      within(confirmacao).getByRole('button', { name: 'Confirmar abertura' }),
    );

    expect(await screen.findByText('Recebendo respostas')).toBeInTheDocument();
    const destinatarios = await screen.findByRole('table', {
      name: 'Destinatários',
    });
    expect(within(destinatarios).getByText('Pendente')).toBeInTheDocument();
    expect(within(destinatarios).getByText('Respondeu')).toBeInTheDocument();
    expect(
      http.mock.calls.filter(([url]) =>
        String(url).endsWith('/pesquisas/40/abertura'),
      ),
    ).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Encerrar edição' }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Revisar e abrir' }),
    ).not.toBeInTheDocument();
  });

  it('mostra o motivo de conflito ao abrir sem público', async () => {
    servidor('gestor', { abrir409: true });
    const { user } = renderApp('/pesquisas');
    const grade = await screen.findByRole('table', {
      name: 'Edições de pesquisa',
    });
    await user.click(
      within(grade).getByRole('button', {
        name: 'Ações de Consolidado de outubro',
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Acompanhar' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Revisar e abrir' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar abertura' }),
    );
    expect(
      await screen.findByText(
        'Nenhum empreendimento ativo atende ao público selecionado.',
      ),
    ).toBeInTheDocument();
  });

  it('estagiário só acompanha: sem criação, edição ou ações de ciclo', async () => {
    servidor('estagiario');
    const { user } = renderApp('/pesquisas');
    const grade = await screen.findByRole('table', {
      name: 'Edições de pesquisa',
    });
    expect(
      screen.queryByRole('button', { name: 'Nova edição' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(grade).getByRole('button', {
        name: 'Ações de Consolidado de outubro',
      }),
    );
    expect(
      screen.queryByRole('menuitem', { name: 'Editar' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Acompanhar' }));
    expect(await screen.findByText('Elegíveis agora')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Revisar e abrir' }),
    ).not.toBeInTheDocument();
  });
});
