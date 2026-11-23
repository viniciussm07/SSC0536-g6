import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Painel } from '@ssc0536/common';
import { acessoDoPerfil, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const fonte = {
  origem: 'calculo' as const,
  execucaoId: 7,
  revisao: 2,
  publicadaEm: '2026-11-10T12:00:00.000Z',
  calculadoEm: '2026-11-10T11:00:00.000Z',
};
const periodo = (id: number, rotulo: string) => ({
  id,
  rotulo,
  tipo: 'mes',
  dataInicio: '2026-10-01',
  dataFim: '2026-10-31',
});
const opcoes = [
  {
    periodoId: 2,
    periodo: 'Outubro/2026',
    periodoTipo: 'mes',
    tipoColeta: 'consolidado',
  },
  {
    periodoId: 1,
    periodo: 'Setembro/2026',
    periodoTipo: 'mes',
    tipoColeta: 'consolidado',
  },
  {
    periodoId: 2,
    periodo: 'Outubro/2026',
    periodoTipo: 'mes',
    tipoColeta: 'expectativa',
  },
];
const item = (
  codigo: string,
  nome: string,
  valor: Painel['itens'][number]['valor'],
  grupo: 'indicador' | 'cobertura' = 'indicador',
) => ({
  indicadorId: codigo.length,
  codigo,
  nome,
  unidade: 'percentual_0_100',
  grupo,
  recorte: 'total',
  metodo: 'ponderada',
  valor,
  fonte,
  comparacao: null,
});
const painel = (p: Partial<Painel> = {}): Painel => ({
  periodo: periodo(2, 'Outubro/2026'),
  tipoColeta: 'consolidado',
  comparacao: null,
  situacao: 'disponivel',
  itens: [
    item('taxa_ocupacao_uh', 'Taxa de ocupação', {
      estado: 'disponivel',
      valor: '66.666666666667',
    }),
    item('taxa_ocupacao_resort', 'Ocupação resort', {
      estado: 'disponivel',
      valor: '0',
    }),
    item('faixa', 'Faixa ótima', {
      estado: 'indisponivel',
      motivo: 'sem_respondentes',
      detalhe: null,
    }),
    {
      ...item('diaria_media_ponderada', 'Diária média ponderada', {
        estado: 'disponivel',
        valor: '411.711911764706',
      }),
      unidade: 'reais_por_diaria',
    },
    {
      ...item('faixa_ocupacao_meios', 'Meios por faixa', {
        estado: 'disponivel',
        valor: '50',
      }),
      recorte: 'excelente',
      metodo: 'nao_se_aplica',
    },
    item(
      'cobertura_meios',
      'Meios respondentes',
      { estado: 'disponivel', valor: '80' },
      'cobertura',
    ),
  ],
  atualizadoEm: fonte.calculadoEm,
  aviso: 'Valores demonstrativos.',
  ...p,
});

const serie = {
  tipoColeta: 'consolidado',
  periodos: [periodo(1, 'Setembro/2026'), periodo(2, 'Outubro/2026')],
  feriados: [
    {
      id: 9,
      rotulo: 'Independência 2026',
      tipo: 'feriado_prolongado',
      dataInicio: '2026-10-05',
      dataFim: '2026-10-07',
    },
  ],
  series: [
    {
      indicadorId: 3,
      codigo: 'taxa_ocupacao_uh',
      nome: 'Taxa de ocupação',
      unidade: 'percentual_0_100',
      recorte: 'total',
      metodo: 'ponderada',
      pontos: [
        { periodoId: 1, valor: '60' },
        { periodoId: 2, valor: '66.5' },
      ],
    },
  ],
};

const participacao = {
  tipoColeta: 'consolidado',
  edicoes: [
    {
      pesquisaId: 1,
      periodoId: 1,
      periodo: 'Setembro/2026',
      dataInicio: '2026-09-01',
      destinatarios: 10,
      respondentes: 8,
    },
  ],
};

function http(
  perfil: 'visualizador' | 'gestor',
  resposta: (url: string) => Response,
) {
  return mockHttp((path) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    if (path === '/indicadores/painel/opcoes')
      return Response.json({ data: opcoes });
    if (path.startsWith('/indicadores/painel/serie'))
      return Response.json({ data: serie });
    if (path.startsWith('/indicadores/painel/participacao'))
      return Response.json({ data: participacao });
    if (path.startsWith('/indicadores/painel?')) return resposta(path);
    return new Response(null, { status: 404 });
  });
}

describe('Painel de indicadores na visão geral', () => {
  it('mostra valores, zero e indisponível distintos, cobertura e aviso de amostra', async () => {
    http('visualizador', () => Response.json({ data: painel() }));
    renderApp('/');
    const tabela = await screen.findByRole('table', {
      name: 'Indicadores de Outubro/2026 · Consolidado',
    });
    expect(within(tabela).getByText('66,67%')).toBeInTheDocument();
    expect(within(tabela).getByText('0%')).toBeInTheDocument();
    expect(
      within(tabela).getByText('Indisponível · Sem respondentes no período'),
    ).toBeInTheDocument();
    expect(within(tabela).getAllByText(/Cálculo #7, revisão 2/)).toHaveLength(
      5,
    );
    expect(
      screen.getByRole('table', {
        name: 'Cobertura da amostra de Outubro/2026 · Consolidado',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      '80% dos meios de hospedagem',
    );
    // Resumo, gráficos (imagens com descrição) e a evolução em tabela equivalente.
    const resumo = screen.getByRole('list', { name: 'Resumo do período' });
    expect(within(resumo).getByText('66,67%')).toBeInTheDocument();
    // Preço ofertado aparece em reais, com a unidade ao lado.
    expect(within(resumo).getByText('R$ 411,71')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Taxa de ocupação em Outubro\/2026/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: /Evolução da taxa de ocupação/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Evolução em tabela')).toBeInTheDocument();
    // Faixas e sazonalidade para qualquer perfil; participação só com acesso a pesquisas.
    expect(
      screen.getByRole('img', { name: /por faixa de ocupação em Outubro/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Sazonalidade em tabela'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Participação da pesquisa'),
    ).not.toBeInTheDocument();

    // Visualizador não gera boletim.
    expect(
      screen.queryByRole('button', { name: /exportar/i }),
    ).not.toBeInTheDocument();
  });

  it('comparação só oferece períodos compatíveis e envia a seleção ao servidor', async () => {
    const pedidos: string[] = [];
    http('gestor', (url) => {
      pedidos.push(url);
      const comparado = url.includes('comparacaoPeriodoId=1');
      return Response.json({
        data: painel({
          comparacao: comparado ? periodo(1, 'Setembro/2026') : null,
          itens: [
            {
              ...item('taxa_ocupacao_uh', 'Taxa de ocupação', {
                estado: 'disponivel',
                valor: '66.5',
              }),
              comparacao: comparado
                ? {
                    estado: 'disponivel' as const,
                    valor: '60',
                    variacao: '6.5',
                    fonte,
                  }
                : null,
            },
          ],
        }),
      });
    });
    const { user } = renderApp('/');
    await screen.findByRole('table', { name: /Indicadores de/ });
    const comparar = screen.getByLabelText('Comparar com');
    // Setembro (mesma coleta e tipo) é oferecido; Outubro/expectativa não.
    expect(
      within(comparar)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Sem comparação', 'Setembro/2026']);
    expect(
      await screen.findByText('Participação da pesquisa'),
    ).toBeInTheDocument();
    expect(screen.getByText('Participação em tabela')).toBeInTheDocument();
    await user.selectOptions(comparar, '1');
    expect(await screen.findByText('+6,5 p.p.')).toBeInTheDocument();
    expect(pedidos.at(-1)).toBe(
      '/indicadores/painel?periodoId=2&tipoColeta=consolidado&comparacaoPeriodoId=1',
    );
    expect(
      screen.getByRole('button', { name: /Exportar/ }),
    ).toBeInTheDocument();
  });

  it.each([
    ['calculo_pendente', 'Cálculo pendente'],
    ['sem_dados', 'Sem dados'],
  ] as const)(
    'situação %s não exibe valores nem zero',
    async (situacao, rotulo) => {
      http('visualizador', () =>
        Response.json({
          data: painel({ situacao, itens: [], atualizadoEm: null }),
        }),
      );
      renderApp('/');
      expect(await screen.findByText(rotulo)).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    },
  );

  it('falha do servidor permite tentar de novo', async () => {
    let falhar = true;
    http('visualizador', () =>
      falhar
        ? new Response(null, { status: 503 })
        : Response.json({ data: painel() }),
    );
    const { user } = renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível',
    );
    falhar = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByRole('table', { name: /Indicadores de/ }),
    ).toBeInTheDocument();
  });

  it('gestor exporta o painel em PDF ou XLSX com a seleção atual', async () => {
    const pedidos: string[] = [];
    mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia('gestor');
      if (path === '/acessos/atual')
        return Response.json({ data: acessoDoPerfil('gestor') });
      if (path === '/indicadores/painel/opcoes')
        return Response.json({ data: opcoes });
      if (path.startsWith('/indicadores/painel/serie'))
        return Response.json({ data: serie });
      if (path.startsWith('/indicadores/painel/exportacao')) {
        pedidos.push(path);
        const xlsx = path.includes('formato=xlsx');
        return new Response(new Blob(['x']), {
          headers: {
            'Content-Type': xlsx
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'application/pdf',
            'Content-Disposition': `attachment; filename="indicadores.${xlsx ? 'xlsx' : 'pdf'}"`,
          },
        });
      }
      if (path.startsWith('/indicadores/painel?'))
        return Response.json({ data: painel() });
      return new Response(null, { status: 404 });
    });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const { user } = renderApp('/');
    await screen.findByRole('table', { name: /Indicadores de/ });
    await user.click(screen.getByRole('button', { name: /Exportar/ }));
    await user.click(await screen.findByRole('menuitem', { name: /PDF/ }));
    await user.click(await screen.findByRole('button', { name: /Exportar/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Excel/ }));
    await vi.waitFor(() => expect(pedidos).toHaveLength(2));
    expect(pedidos[0]).toBe(
      '/indicadores/painel/exportacao?periodoId=2&tipoColeta=consolidado&formato=pdf',
    );
    expect(pedidos[1]).toContain('formato=xlsx');
  });
});
