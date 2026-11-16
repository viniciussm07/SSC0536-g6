import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IndicadorConsulta } from '@ssc0536/common';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

// jsdom não mede layout; o ResponsiveContainer do Recharts precisa do observador.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

let proximoId = 1;
function linha(
  periodo: [id: number, rotulo: string, inicio: string, fim: string],
  tipoColeta: string,
  recorte: string,
  valor: string,
  extra: Partial<IndicadorConsulta> = {},
): IndicadorConsulta {
  const [periodoId, rotulo, periodoInicio, periodoFim] = periodo;
  return {
    id: proximoId++,
    indicadorId: 7,
    nome: 'Taxa de ocupação fictícia',
    unidade: '%',
    periodo: rotulo,
    periodoId,
    periodoTipo: 'mes',
    periodoInicio,
    periodoFim,
    tipoColeta,
    recorte,
    metodo: 'ponderada',
    valor,
    ...extra,
  };
}
const JAN = [1, 'Janeiro 2026 — fictício', '2026-01-01', '2026-01-31'] as const;
const FEV = [
  2,
  'Fevereiro 2026 — fictício',
  '2026-02-01',
  '2026-02-28',
] as const;
const SERIE: IndicadorConsulta[] = [
  linha([...JAN], 'consolidado', 'total', '76.4'),
  linha([...JAN], 'expectativa', 'total', '72.6'),
  linha([...JAN], 'consolidado', 'hotel', '73.3'),
  linha([...FEV], 'consolidado', 'total', '61.3'),
  linha([...FEV], 'expectativa', 'total', '64'),
  linha([...FEV], 'consolidado', 'hotel', '58.2'),
  linha([...FEV], 'consolidado', 'resort', '68.0'),
  linha([...FEV], 'consolidado', 'total', '1045.2', {
    indicadorId: 8,
    nome: 'Diária média fictícia',
    unidade: 'R$',
    metodo: 'aritmetica',
  }),
];

/** API fictícia: o painel pede `$orderby=periodoInicio…`; a grade usa a ordenação padrão. */
function api(
  perfil: 'visualizador' | 'gestor' | 'empresario',
  painel: (url: URL) => Response | Promise<Response>,
  grade: object[] = [],
) {
  return mockHttp((path) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    const url = new URL(`http://teste${path}`);
    if (url.pathname === '/indicadores' && url.searchParams.get('$orderby'))
      return painel(url);
    return colecao(url.pathname === '/indicadores' ? grade : []);
  });
}
const doPainel = (http: ReturnType<typeof mockHttp>) =>
  http.mock.calls
    .map(([u]) => new URL(String(u)))
    .filter((u) => u.searchParams.get('$orderby')?.startsWith('periodoInicio'));

describe('Painel de indicadores', () => {
  it('visualizador vê carregamento, aviso de dado fictício, unidade, período e gráficos', async () => {
    let liberar: () => void = () => {};
    const pronto = new Promise<void>((r) => (liberar = r));
    api('visualizador', async () => {
      await pronto;
      return colecao(SERIE);
    });
    renderApp('/indicadores');
    expect(
      await screen.findByText('Carregando painel de indicadores…'),
    ).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'Dados fictícios de demonstração, não homologados pelo OTO.',
    );
    liberar();
    // Indicador de série mais longa e último período como referência.
    expect(
      await screen.findByRole('heading', {
        name: 'Taxa de ocupação fictícia (%)',
      }),
    ).toBeInTheDocument();
    const destaques = screen.getByLabelText(
      'Destaques de Fevereiro 2026 — fictício',
    );
    expect(destaques).toHaveTextContent('Consolidado — Total61,3%');
    expect(destaques).toHaveTextContent('Expectativa — Total64%');
    expect(destaques).toHaveTextContent(
      'Fevereiro 2026 — fictício · 01/02/2026 a 28/02/2026 · unidade %',
    );
    expect(
      screen.getByRole('img', { name: /^Tendência — Total \(%\)/ }),
    ).toHaveAccessibleName(
      'Tendência — Total (%): Janeiro 2026 — fictício: Consolidado 76,4%, Expectativa 72,6%; Fevereiro 2026 — fictício: Consolidado 61,3%, Expectativa 64%',
    );
    // Recorte sem resultado aparece como ausência, não como zero.
    expect(
      screen.getByRole('img', {
        name: /^Expectativa × Consolidado — Fevereiro 2026 — fictício \(%\)/,
      }),
    ).toHaveAccessibleName(
      'Expectativa × Consolidado — Fevereiro 2026 — fictício (%): Total: expectativa 64%, consolidado 61,3%; Hotéis: expectativa sem dado, consolidado 58,2%; Resorts: expectativa sem dado, consolidado 68,0%',
    );
    expect(
      screen.getByRole('img', { name: /^Por recorte — Consolidado/ }),
    ).toHaveAccessibleName(
      'Por recorte — Consolidado, Fevereiro 2026 — fictício (%): Total 61,3%; Hotéis 58,2%; Resorts 68,0%',
    );
    // A tabela continua como alternativa acessível; visualizador não exporta.
    expect(
      screen.getByRole('heading', { name: 'Tabela de resultados' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Exportar/ }),
    ).not.toBeInTheDocument();
  });

  it('filtros trocam indicador, recorte, tipo de coleta e período sem recalcular valores', async () => {
    const http = api('gestor', () => colecao(SERIE));
    const { user } = renderApp('/indicadores');
    await screen.findByRole('heading', {
      name: 'Taxa de ocupação fictícia (%)',
    });
    // O servidor recebe tipo de período e intervalo; a ordem é cronológica estável.
    expect(doPainel(http)[0].searchParams.get('$filter')).toBe(
      "periodoTipo eq 'mes'",
    );
    expect(doPainel(http)[0].searchParams.get('$orderby')).toBe(
      'periodoInicio asc,periodoId asc,id asc',
    );
    // Gestor exporta pela grade compartilhada: um único botão, em CSV.
    await screen.findByRole('table', { name: 'Indicadores' });
    expect(screen.getAllByRole('button', { name: /Exportar/ })).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Exportar CSV' }),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('Recorte da série'),
      'hotel',
    );
    await user.selectOptions(
      screen.getByLabelText('Tipo de coleta'),
      'consolidado',
    );
    expect(
      screen.getByRole('img', { name: /^Tendência — Hotéis/ }),
    ).toHaveAccessibleName(
      'Tendência — Hotéis (%): Janeiro 2026 — fictício: Consolidado 73,3%; Fevereiro 2026 — fictício: Consolidado 58,2%',
    );

    await user.selectOptions(
      screen.getByLabelText('Período de referência'),
      '1',
    );
    const destaques = screen.getByLabelText(
      'Destaques de Janeiro 2026 — fictício',
    );
    expect(within(destaques).getAllByRole('definition')[0]).toHaveTextContent(
      '73,3%',
    );

    await user.selectOptions(screen.getByLabelText('Indicador'), '8');
    expect(
      await screen.findByRole('heading', {
        name: 'Diária média fictícia (R$)',
      }),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText('Recorte da série'),
      'total',
    );
    expect(screen.getByLabelText(/^Destaques de Fevereiro/)).toHaveTextContent(
      'R$ 1.045,2',
    );

    // Intervalo e tipo de período vão para o servidor e entram na query key.
    await user.selectOptions(
      screen.getByLabelText('Tipo de período'),
      'feriado_prolongado',
    );
    await user.type(screen.getByLabelText('De'), '2026-02-01');
    await waitFor(() =>
      expect(doPainel(http).at(-1)?.searchParams.get('$filter')).toBe(
        "periodoTipo eq 'feriado_prolongado' and periodoInicio ge 2026-02-01",
      ),
    );
    await user.type(screen.getByLabelText('Até'), '2026-01-31');
    expect(
      await screen.findByText(
        'A data final deve ser igual ou posterior à inicial.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Corrija o intervalo de datas para atualizar os gráficos.',
      ),
    ).toBeInTheDocument();
  });

  it('falha do painel permite recarregar; resultado vazio mostra estado vazio', async () => {
    let falhar = true;
    api('visualizador', () =>
      falhar ? new Response(null, { status: 503 }) : colecao([]),
    );
    const { user } = renderApp('/indicadores');
    expect(
      await screen.findByText(/^Painel indisponível:/),
    ).toBeInTheDocument();
    falhar = false;
    await user.click(screen.getByRole('button', { name: 'Recarregar painel' }));
    expect(
      await screen.findByText(
        'Nenhum resultado liberado para seu perfil nos filtros do painel.',
      ),
    ).toBeInTheDocument();
  });

  it('a grade continua com repetição após falha e estado vazio', async () => {
    let falhar = true;
    mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia('visualizador');
      if (path === '/acessos/atual')
        return Response.json({ data: acessoDoPerfil('visualizador') });
      if (path.includes('periodoInicio')) return colecao([]);
      if (falhar) return new Response(null, { status: 503 });
      return colecao([]);
    });
    const { user } = renderApp('/indicadores');
    expect(
      await screen.findByText(/Não foi possível conectar/),
    ).toBeInTheDocument();
    falhar = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByText(
        'Nenhum indicador encontrado para seu perfil e filtros.',
      ),
    ).toBeInTheDocument();
  });

  it('perfil sem permissão não vê o painel nem consulta indicadores', async () => {
    const http = api('empresario', () => colecao(SERIE));
    renderApp('/indicadores');
    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Painel de indicadores' }),
    ).not.toBeInTheDocument();
    expect(
      http.mock.calls.some(([u]) => String(u).includes('/indicadores')),
    ).toBe(false);
  });

  it('exibe rótulos legíveis em vez de valores internos e a unidade nos eixos', async () => {
    const feriado = linha(
      [3, 'Feriado fictício', '2026-02-14', '2026-02-17'],
      'expectativa',
      'resort',
      '80.5',
      { periodoTipo: 'feriado_prolongado', metodo: 'aritmetica' },
    );
    api('gestor', () => colecao(SERIE), [SERIE[0], feriado]);
    renderApp('/indicadores');
    await screen.findByRole('heading', {
      name: 'Taxa de ocupação fictícia (%)',
    });

    // Filtros: método e tipo de período com rótulo, valor interno preservado.
    const metodo = screen.getByLabelText('Método de agregação');
    expect(metodo).toHaveDisplayValue('Ponderada');
    expect(metodo).toHaveValue('ponderada');
    expect(
      within(screen.getByLabelText('Tipo de período'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Mês', 'Feriado prolongado']);
    expect(screen.getByLabelText('Recorte da série')).toHaveDisplayValue(
      'Total',
    );
    expect(
      screen.getByText('Método Ponderada · períodos do tipo mês'),
    ).toBeInTheDocument();

    // Subtítulo da tendência com pontuação entre o intervalo e a nota.
    expect(
      screen.getByText(
        'Janeiro 2026 — fictício a Fevereiro 2026 — fictício. Lacunas indicam período sem resultado.',
      ),
    ).toBeInTheDocument();

    // Marcas do eixo Y (unidade) não são desenhadas no jsdom; ver `rotuloEixoValor` em utils.

    // Tabela: rótulos, valor com unidade e datas civis em DD/MM/AAAA.
    const tabela = await screen.findByRole('table', { name: 'Indicadores' });
    const linhaFeriado = within(tabela)
      .getByText('Feriado fictício')
      .closest('tr')!;
    for (const texto of [
      'Expectativa',
      'Resorts',
      '80,5%',
      'Aritmética',
      'Feriado prolongado',
      '14/02/2026',
      '17/02/2026',
    ])
      expect(within(linhaFeriado).getByText(texto)).toBeInTheDocument();
    for (const interno of [
      'expectativa',
      'resort',
      'aritmetica',
      'feriado_prolongado',
    ])
      expect(within(tabela).queryByText(interno)).not.toBeInTheDocument();
    const linhaMes = within(tabela)
      .getByText('Janeiro 2026 — fictício')
      .closest('tr')!;
    for (const texto of ['Consolidado', 'Total', 'Ponderada', 'Mês'])
      expect(within(linhaMes).getByText(texto)).toBeInTheDocument();
  });
});
