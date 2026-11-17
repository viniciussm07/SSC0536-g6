import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  HOTEL_A,
  acessoDoPerfil,
  colecao,
  contextosEnviados,
  detalheFicticio,
  mockHttp,
  sessaoFicticia,
} from '@/test/http';
import { renderApp } from '@/test/render-app';

const OUTUBRO = {
  id: 7,
  tipo: 'mes',
  rotulo: 'Outubro 2026',
  dataInicio: '2026-10-01',
  dataFim: '2026-10-31',
};
const FORMULARIO = {
  pesquisaId: 40,
  titulo: 'Consolidado de outubro',
  tipoColeta: 'consolidado',
  abertura: '2026-11-01T03:00:00.000Z',
  prazo: '2026-12-01T02:59:00.000Z',
  situacao: 'recebendo',
  periodos: [OUTUBRO],
  perguntas: [
    {
      id: 1,
      periodoId: 7,
      chave: 'ocupacao',
      rotulo: 'Ocupação (%)',
      tipoValor: 'percentual',
      obrigatorio: true,
      opcoes: null,
    },
    {
      id: 2,
      periodoId: 7,
      chave: 'canal',
      rotulo: 'Canal principal',
      tipoValor: 'escolha',
      obrigatorio: false,
      opcoes: [
        { chave: 'direto', rotulo: 'Direto' },
        { chave: 'agencia', rotulo: 'Agência' },
      ],
    },
  ],
  resposta: null,
};
const REGISTRADA = {
  id: 90,
  respondidaEm: '2026-11-10T13:00:00.000Z',
  atualizadaEm: null,
  canal: 'sistema',
  itens: [
    { perguntaId: 1, valor: '72.5' },
    { perguntaId: 2, valor: 'agencia' },
  ],
};
const LINHA = {
  pesquisaId: 40,
  titulo: 'Consolidado de outubro',
  tipoColeta: 'consolidado',
  status: 'aberta',
  abertura: FORMULARIO.abertura,
  // Prazo distante: a ação "Responder" depende da janela no relógio atual.
  prazo: '2099-01-01T00:00:00.000Z',
  situacaoResposta: 'pendente',
  respondidaEm: null,
};

function servidor(
  opcoes: {
    formulario?: object;
    enviar?: (corpo: { itens: unknown[] }) => Response;
  } = {},
) {
  let atual: object = opcoes.formulario ?? FORMULARIO;
  return mockHttp((path, init) => {
    const metodo = init?.method ?? 'GET';
    if (path === '/sessoes/atual') return sessaoFicticia();
    if (path === '/acessos/atual')
      return Response.json({
        data: acessoDoPerfil('empresario', 1, [HOTEL_A]),
      });
    if (path === '/empreendimentos/10')
      return Response.json({ data: detalheFicticio() });
    if (path.endsWith('/inventarios/vigente'))
      return Response.json({ data: null });
    if (path.startsWith('/empreendimentos/10/pesquisas?'))
      return colecao([LINHA]);
    if (
      path === '/empreendimentos/10/pesquisas/40/resposta' &&
      metodo === 'PUT'
    ) {
      const corpo = JSON.parse(String(init!.body)) as { itens: unknown[] };
      const r = opcoes.enviar?.(corpo);
      if (r) return r;
      atual = { ...FORMULARIO, resposta: REGISTRADA };
      return Response.json({ data: atual }, { status: 201 });
    }
    if (path === '/empreendimentos/10/pesquisas/40')
      return Response.json({ data: atual });
    return colecao([]);
  });
}
const puts = (http: ReturnType<typeof servidor>) =>
  http.mock.calls
    .filter(([, init]) => init?.method === 'PUT')
    .map(([, init]) => JSON.parse(String(init!.body)) as unknown);

describe('Responder pesquisa', () => {
  it('painel do empreendimento lista a pesquisa pendente e leva ao formulário', async () => {
    servidor();
    const { user, router } = renderApp('/');
    const tabela = await screen.findByRole('table', { name: 'Pesquisas' });
    expect(
      await within(tabela).findByText('Consolidado de outubro'),
    ).toBeInTheDocument();
    expect(within(tabela).getByText('Pendente')).toBeInTheDocument();
    await user.click(
      within(tabela).getByRole('button', {
        name: 'Ações de Consolidado de outubro',
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Responder' }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/responder/40'),
    );
  });

  it('valida no cliente, envia com o contexto e confirma o registro', async () => {
    const http = servidor();
    const { user } = renderApp('/responder/40');
    expect(
      await screen.findByRole('heading', { name: 'Consolidado de outubro' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Recebendo respostas')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /Outubro 2026/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    expect(
      await screen.findByText('Resposta obrigatória.'),
    ).toBeInTheDocument();
    expect(puts(http)).toEqual([]);

    const ocupacao = screen.getByLabelText('Ocupação (%) *');
    await user.type(ocupacao, '101');
    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    expect(
      await screen.findByText('Informe um percentual de 0 a 100.'),
    ).toBeInTheDocument();
    expect(puts(http)).toEqual([]);

    await user.clear(ocupacao);
    await user.type(ocupacao, '72,5');
    await user.selectOptions(
      screen.getByLabelText('Canal principal'),
      'agencia',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    expect(
      await screen.findByText(/Resposta registrada em 10\/11\/2026, 10:00\./, {
        selector: 'p.font-medium',
      }),
    ).toBeInTheDocument();
    expect(puts(http)).toEqual([
      {
        itens: [
          { perguntaId: 1, valor: '72,5' },
          { perguntaId: 2, valor: 'agencia' },
        ],
      },
    ]);
    expect(
      contextosEnviados(http, '/empreendimentos/10/pesquisas/40/resposta'),
    ).toEqual(['10']);
    // Após o envio o formulário passa a corrigir a resposta registrada.
    expect(
      await screen.findByRole('button', { name: 'Salvar correção' }),
    ).toBeInTheDocument();
  });

  it('mostra erro de prazo e de campo vindos do servidor sem perder o preenchimento', async () => {
    let tentativa = 0;
    servidor({
      enviar: () =>
        ++tentativa === 1
          ? Response.json(
              {
                error: {
                  code: 'ENTRADA_INVALIDA',
                  message: 'Confira os campos.',
                  details: [
                    { field: 'perguntas.1', message: 'Valor recusado.' },
                  ],
                },
              },
              { status: 400 },
            )
          : Response.json(
              {
                error: {
                  code: 'PESQUISA_FORA_DO_PRAZO',
                  message: 'A edição não recebe respostas.',
                },
              },
              { status: 409 },
            ),
    });
    const { user } = renderApp('/responder/40');
    const ocupacao = await screen.findByLabelText('Ocupação (%) *');
    await user.type(ocupacao, '50');
    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    expect(await screen.findByText('Valor recusado.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    expect(
      await screen.findByText(
        'Esta pesquisa não está recebendo respostas agora; nada foi registrado.',
      ),
    ).toBeInTheDocument();
    expect(ocupacao).toHaveValue('50');
  });

  it('fora do prazo exibe a resposta registrada somente para leitura', async () => {
    servidor({
      formulario: { ...FORMULARIO, situacao: 'expirada', resposta: REGISTRADA },
    });
    renderApp('/responder/40');
    expect(
      await screen.findByText(
        'O prazo terminou. Novas respostas e correções não são aceitas.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('72,5%')).toBeInTheDocument();
    expect(screen.getByText('Agência')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Enviar|Salvar/ }),
    ).not.toBeInTheDocument();
  });
});
