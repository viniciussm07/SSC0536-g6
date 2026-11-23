import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Perfil } from '@ssc0536/common';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const OUTUBRO = {
  id: 7,
  tipo: 'mes',
  rotulo: 'Outubro 2026',
  dataInicio: '2026-10-01',
  dataFim: '2026-10-31',
};
const EDICAO = {
  id: 40,
  titulo: 'Consolidado de outubro',
  tipoColeta: 'consolidado',
  status: 'encerrada',
  abertura: '2026-11-01T12:00:00.000Z',
  prazo: '2026-11-10T02:59:00.000Z',
  modeloId: 3,
  modeloVersao: 2,
};
const EDICAO_DETALHE = {
  ...EDICAO,
  situacao: 'encerrada',
  modeloNome: 'Ocupação fictícia',
  segmentoIds: [],
  criadaEm: '2026-10-20T12:00:00.000Z',
  abertaEm: '2026-11-01T12:00:00.000Z',
  encerradaEm: '2026-11-10T03:00:00.000Z',
  periodos: [OUTUBRO],
  perguntas: [
    {
      id: 11,
      periodoId: 7,
      campoId: 9,
      chave: 'ocupacao',
      rotulo: 'Ocupação (%)',
      tipoValor: 'percentual',
      obrigatorio: true,
    },
    {
      id: 12,
      periodoId: 7,
      campoId: 10,
      chave: 'obs',
      rotulo: 'Observação',
      tipoValor: 'texto',
      obrigatorio: false,
    },
  ],
  participacao: {
    elegiveis: 2,
    destinatarios: 2,
    respondentes: 2,
    pendentes: 0,
  },
};
const LINHA = {
  id: 5,
  periodoId: 7,
  periodo: 'Outubro 2026',
  tipoColeta: 'consolidado',
  pesquisaId: 40,
  pesquisa: 'Consolidado de outubro',
  perguntaId: 11,
  revisao: 1,
  versaoFormula: 1,
  situacao: 'concluido',
  publicacao: 'calculado',
  motivo: null,
  erro: null,
  solicitadaEm: '2026-11-22T12:00:00.000Z',
  solicitadaPor: 'Gestora fictícia',
  concluidaEm: '2026-11-22T12:00:01.000Z',
  publicadaEm: null,
  publicadaPorId: null,
};
const DETALHE = {
  ...LINHA,
  motivoPublicacao: null,
  substituidaPorId: null,
  insumosAtuais: 'iguais',
  insumos: {
    versaoFormula: 1,
    periodo: { ...OUTUBRO, diasPeriodo: 31, tipo: undefined },
    pesquisa: {
      id: 40,
      titulo: 'Consolidado de outubro',
      tipoColeta: 'consolidado',
    },
    pergunta: { id: 11, rotulo: 'Ocupação (%)' },
    populacao: 'destinatarios',
    meios: [
      {
        empreendimentoId: 1,
        nomeFantasia: 'Hotel Fictício Alfa',
        tipo: 'hotel',
        capacidade: 'vigente',
        inventarioVersaoIds: [3],
        uhs: 10,
        leitos: 20,
        maxLeitosPorUh: 2,
        respostaId: 8,
        taxaOcupacao: '75',
      },
    ],
    rhc: { situacao: 'ausente', rhcPeriodoIds: [], qtdRhc: null, leitos: null },
    parametros: [
      {
        chave: 'day_use.percentual',
        situacao: 'ausente',
        parametroIds: [],
        valor: null,
      },
    ],
  },
  resultados: [
    {
      id: 1,
      indicadorId: 2,
      codigo: 'taxa_ocupacao_uh',
      nome: 'Taxa de ocupação por UH',
      unidade: 'percentual_0_100',
      recorte: 'total',
      metodo: 'ponderada',
      valor: { estado: 'disponivel', valor: '75' },
    },
    {
      id: 2,
      indicadorId: 3,
      codigo: 'turistas_rhc',
      nome: 'Turistas em RHC',
      unidade: 'pessoas',
      recorte: 'total',
      metodo: 'nao_se_aplica',
      valor: {
        estado: 'indisponivel',
        motivo: 'dado_ausente',
        detalhe: 'RHC do período não informado.',
      },
    },
  ],
};

function servidor(
  perfil: Perfil = 'gestor',
  opcoes: { publicada?: object; reaproveitada?: boolean } = {},
) {
  let detalhe: Record<string, unknown> = { ...DETALHE };
  return mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    if (path === '/calculos' && init?.method === 'POST')
      return Response.json(
        {
          data: {
            execucao: detalhe,
            reaproveitada: opcoes.reaproveitada ?? false,
          },
        },
        { status: opcoes.reaproveitada ? 200 : 201 },
      );
    if (path === '/calculos/5/publicacao' && init?.method === 'POST') {
      const corpo = JSON.parse(init.body as string) as { motivo?: string };
      if (opcoes.publicada && !corpo.motivo)
        return Response.json(
          {
            error: {
              code: 'ENTRADA_INVALIDA',
              message: 'Confira os campos informados.',
              details: [{ field: 'motivo', message: 'Informe o motivo.' }],
            },
          },
          { status: 400 },
        );
      detalhe = {
        ...detalhe,
        publicacao: 'publicado',
        publicadaEm: '2026-11-22T13:00:00.000Z',
        publicadaPorId: 1,
        motivoPublicacao: corpo.motivo ?? null,
      };
      return Response.json({ data: detalhe });
    }
    if (path === '/calculos/5') return Response.json({ data: detalhe });
    if (path.startsWith('/calculos?') && path.includes('publicado'))
      return colecao(opcoes.publicada ? [opcoes.publicada] : []);
    if (path.startsWith('/calculos?')) return colecao([LINHA]);
    if (path === '/pesquisas/40')
      return Response.json({ data: EDICAO_DETALHE });
    if (path.startsWith('/pesquisas?')) return colecao([EDICAO]);
    return colecao([]);
  });
}

const chamadas = (
  http: ReturnType<typeof servidor>,
  fim: string,
  metodo: string,
) =>
  http.mock.calls.filter(
    ([url, init]) => String(url).endsWith(fim) && init?.method === metodo,
  );

describe('Cálculos', () => {
  it('lista execuções, abre o detalhe com indisponível sem zero e publica pela primeira vez sem motivo', async () => {
    const http = servidor('gestor');
    const { user } = renderApp('/calculos');
    const grade = await screen.findByRole('table', { name: 'Cálculos' });
    expect(within(grade).getByText('Outubro 2026')).toBeInTheDocument();
    expect(within(grade).getByText('Calculado')).toBeInTheDocument();

    await user.click(
      within(grade).getByRole('button', { name: /Ações de Outubro 2026/ }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Detalhes' }));
    const dialogo = await screen.findByRole('dialog');
    const resultados = await within(dialogo).findByRole('region', {
      name: 'Resultados',
    });
    expect(within(resultados).getByText('75')).toBeInTheDocument();
    expect(
      within(resultados).getByText('Indisponível · Dado ausente'),
    ).toBeInTheDocument();
    expect(
      within(dialogo).getByText('Hotel Fictício Alfa'),
    ).toBeInTheDocument();

    await user.click(
      within(dialogo).getByRole('button', { name: 'Publicar resultados' }),
    );
    await waitFor(() =>
      expect(chamadas(http, '/calculos/5/publicacao', 'POST')).toHaveLength(1),
    );
    expect(
      JSON.parse(
        chamadas(http, '/calculos/5/publicacao', 'POST')[0][1]!.body as string,
      ),
    ).toEqual({});
    expect(
      await within(dialogo).findByText('Resultados publicados em Indicadores.'),
    ).toBeInTheDocument();
    // Detalhe refeito após a invalidação: já publicado, sem formulário.
    await waitFor(() =>
      expect(
        within(dialogo).queryByRole('button', { name: 'Publicar resultados' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('substituir a publicação vigente exige motivo antes de chamar o servidor', async () => {
    const http = servidor('gestor', {
      publicada: { ...LINHA, id: 4, publicacao: 'publicado' },
    });
    const { user } = renderApp('/calculos');
    const grade = await screen.findByRole('table', { name: 'Cálculos' });
    await user.click(
      within(grade).getByRole('button', { name: /Ações de Outubro 2026/ }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Detalhes' }));
    const motivo = await screen.findByLabelText(/Motivo da substituição/);
    await user.click(
      screen.getByRole('button', { name: 'Publicar resultados' }),
    );
    expect(
      await screen.findByText(
        'Informe o motivo para substituir a publicação vigente.',
      ),
    ).toBeInTheDocument();
    expect(chamadas(http, '/calculos/5/publicacao', 'POST')).toHaveLength(0);
    await user.type(motivo, 'Resposta corrigida');
    await user.click(
      screen.getByRole('button', { name: 'Publicar resultados' }),
    );
    await waitFor(() =>
      expect(chamadas(http, '/calculos/5/publicacao', 'POST')).toHaveLength(1),
    );
    expect(
      JSON.parse(
        chamadas(http, '/calculos/5/publicacao', 'POST')[0][1]!.body as string,
      ),
    ).toEqual({ motivo: 'Resposta corrigida' });
  });

  it('novo cálculo oferece só perguntas percentuais e informa reaproveitamento', async () => {
    const http = servidor('gestor', { reaproveitada: true });
    const { user } = renderApp('/calculos');
    await user.click(
      await screen.findByRole('button', { name: 'Novo cálculo' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Calcular' }));
    expect(await screen.findByText('Escolha a edição.')).toBeInTheDocument();
    expect(chamadas(http, '/calculos', 'POST')).toHaveLength(0);

    const edicao = await screen.findByLabelText('Edição de pesquisa');
    await waitFor(() => expect(edicao).toBeEnabled());
    await user.selectOptions(edicao, '40');
    const pergunta = screen.getByLabelText('Pergunta de taxa de ocupação');
    await waitFor(() => expect(pergunta).toBeEnabled());
    const opcoes = within(pergunta)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opcoes).toEqual(['Selecione a pergunta', 'Ocupação (%)']);
    await user.selectOptions(pergunta, '11');
    await user.type(screen.getByLabelText(/Motivo/), 'Correção fictícia');
    await user.click(screen.getByRole('button', { name: 'Calcular' }));
    await waitFor(() =>
      expect(chamadas(http, '/calculos', 'POST')).toHaveLength(1),
    );
    expect(
      JSON.parse(chamadas(http, '/calculos', 'POST')[0][1]!.body as string),
    ).toEqual({ perguntaId: 11, motivo: 'Correção fictícia' });
    expect(
      await screen.findByText(/o resultado existente foi reaproveitado/),
    ).toBeInTheDocument();
  });

  it('estagiário não acessa a página de cálculos', async () => {
    servidor('estagiario');
    renderApp('/calculos');
    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Cálculos/ }),
    ).not.toBeInTheDocument();
  });
});
