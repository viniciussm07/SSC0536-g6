import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const LOTE = {
  id: 7,
  fonte: 'tabulacao_consolidado',
  nomeArquivo: 'Tabulação.xlsx',
  tamanhoBytes: 2048,
  versaoParser: 'tabulacao-consolidado/1',
  estado: 'lido',
  criadoEm: '2026-11-22T12:00:00.000Z',
  lidoEm: '2026-11-22T12:00:01.000Z',
};
const DESTINO = {
  pesquisaId: 3,
  perguntaId: 9,
  tituloPesquisa: 'Carnaval 2026',
  rotuloPeriodo: 'Carnaval 2026',
  dataInicio: '2026-02-14',
  dataFim: '2026-02-18',
};
const detalhe = (extra: object = {}) => ({
  ...LOTE,
  sha256: 'a'.repeat(64),
  erroMensagem: null,
  destino: DESTINO,
  confirmacao: 'nao_confirmado',
  confirmadoEm: null,
  recalculoPendente: false,
  resumo: {
    rotuloPeriodo: 'CARNAVAL 2026',
    diarias: 5,
    abas: [],
    linhasEntrada: 3,
    linhasVaziasIgnoradas: 37,
    colunasIgnoradas: [],
  },
  totais: { linhas: 5, erros: 0, avisos: 0 },
  ...extra,
});
const item = (extra: object) => ({
  linhaId: 1,
  linha: 5,
  nomeInformado: 'Hotel Fictício Alfa',
  ocupacaoPercentual: '75.5',
  situacao: 'pendente',
  motivo: 'SEM_CORRESPONDENCIA',
  empreendimento: null,
  origemDecisao: null,
  valorAtual: null,
  candidatos: [],
  resolucao: null,
  acaoAplicada: null,
  ...extra,
});
const totais = (extra: object) => ({
  lidas: 3,
  novos: 0,
  atualizados: 0,
  semMudanca: 0,
  conflitos: 0,
  rejeitados: 0,
  pendentes: 0,
  aplicados: 0,
  ...extra,
});
const plano = (itens: object[], t: object, extra: object = {}) => ({
  loteId: 7,
  destino: DESTINO,
  confirmacao: 'nao_confirmado',
  avisos: [
    'Período no arquivo: "CARNAVAL 2026". Período da edição de destino: "Carnaval 2026" (2026-02-14 a 2026-02-18).',
  ],
  podeConfirmar: true,
  totais: totais(t),
  itens,
  ...extra,
});
const CAND = {
  id: 10,
  nomeFantasia: 'Hotel Fictício Alfa',
  situacao: 'ativo',
  motivo: 'nome_igual',
};

function servidor(
  perfil: 'gestor' | 'estagiario',
  estado: { plano: object; chamadas: Array<[string, string, unknown]> },
) {
  return mockHttp((path, init) => {
    const metodo = init?.method ?? 'GET';
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    if (path.startsWith('/importacoes?')) return colecao([LOTE]);
    if (path === '/importacoes/7') return Response.json({ data: detalhe() });
    if (
      path.startsWith('/importacoes/7/ocorrencias') ||
      path.startsWith('/importacoes/7/linhas?')
    )
      return colecao([]);
    if (path === '/importacoes/7/plano')
      return Response.json({ data: estado.plano });
    if (path.startsWith('/pesquisas?')) return colecao([]);
    if (path.startsWith('/empreendimentos?'))
      return colecao([
        {
          id: 10,
          nomeFantasia: 'Hotel Fictício Alfa',
          cnpj: null,
          situacao: 'ativo',
          tipoHospedagem: 'hotel',
          pendencias: [],
        },
        {
          id: 11,
          nomeFantasia: 'Pousada Fictícia Beta',
          cnpj: null,
          situacao: 'ativo',
          tipoHospedagem: 'pousada',
          pendencias: [],
        },
      ]);
    if (
      /\/importacoes\/7\/(linhas\/\d+\/(decisao|conflito)|confirmacoes)$/.test(
        path,
      )
    ) {
      estado.chamadas.push([
        metodo,
        path,
        init?.body ? JSON.parse(String(init.body)) : null,
      ]);
      if (path.endsWith('/confirmacoes'))
        return Response.json({
          data: {
            confirmacao: 'parcial',
            criadas: 1,
            atualizadas: 0,
            semMudanca: 0,
            pendentes: 1,
            conflitos: 0,
            rejeitadas: 0,
            recalculoPendente: true,
          },
        });
      return metodo === 'DELETE'
        ? new Response(null, { status: 204 })
        : Response.json({ data: estado.plano });
    }
    return colecao([]);
  });
}

async function abrir(user: ReturnType<typeof renderApp>['user']) {
  await screen.findByRole('heading', { name: 'Importação de planilhas' });
  await user.click(
    await screen.findByRole('button', {
      name: /Ações de Tabulação.xlsx|Ações/,
    }),
  );
  await user.click(
    await screen.findByRole('menuitem', { name: 'Ver leitura' }),
  );
  return screen.findByRole('dialog');
}

describe('Conciliação e confirmação', () => {
  it('mostra o plano com totais, sugestão sem vincular sozinha, e vincula por decisão explícita', async () => {
    const estado = {
      plano: plano(
        [item({ candidatos: [CAND] })],
        { pendentes: 1, lidas: 1 },
        { podeConfirmar: false },
      ),
      chamadas: [] as Array<[string, string, unknown]>,
    };
    servidor('gestor', estado);
    const { user } = renderApp('/importacoes');
    const dialogo = await abrir(user);
    const painel = await within(dialogo).findByRole('region', {
      name: 'Conciliação e confirmação',
    });
    expect(within(painel).getByText('Pendente')).toBeInTheDocument();
    expect(
      within(painel).getByText(/Escolha o empreendimento correspondente/),
    ).toBeInTheDocument();
    expect(
      within(painel).getByText(/Período da edição de destino/),
    ).toBeInTheDocument();
    expect(
      within(
        within(painel).getByRole('group', { name: 'Totais do plano' }),
      ).getByText('Pendentes').nextSibling,
    ).toHaveTextContent('1');
    // Sugestão aparece como opção, mas nada foi vinculado.
    expect(estado.chamadas).toHaveLength(0);
    expect(
      within(painel).getByRole('button', {
        name: /Confirmar 0 novas e 0 atualizações/,
      }),
    ).toBeDisabled();

    await user.selectOptions(
      within(painel).getByLabelText('Empreendimento da linha 5'),
      '10',
    );
    await user.click(within(painel).getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(estado.chamadas).toHaveLength(1));
    expect(estado.chamadas[0]).toEqual([
      'PUT',
      '/importacoes/7/linhas/1/decisao',
      { tipo: 'vincular', empreendimentoId: 10 },
    ]);
  });

  it('confirma enviando os totais exibidos e mostra confirmação parcial sem sucesso enganoso', async () => {
    const estado = {
      plano: plano(
        [
          item({
            situacao: 'novo',
            motivo: null,
            empreendimento: { id: 10, nomeFantasia: 'Hotel Fictício Alfa' },
            origemDecisao: 'manual',
          }),
          item({
            linhaId: 2,
            linha: 6,
            nomeInformado: 'Resort X',
            situacao: 'pendente',
          }),
        ],
        { novos: 1, pendentes: 1, lidas: 2 },
      ),
      chamadas: [] as Array<[string, string, unknown]>,
    };
    servidor('gestor', estado);
    const { user } = renderApp('/importacoes');
    const dialogo = await abrir(user);
    const painel = await within(dialogo).findByRole('region', {
      name: 'Conciliação e confirmação',
    });
    await user.click(
      within(painel).getByRole('button', {
        name: 'Confirmar 1 novas e 0 atualizações',
      }),
    );
    await waitFor(() =>
      expect(estado.chamadas.at(-1)).toEqual([
        'POST',
        '/importacoes/7/confirmacoes',
        { novos: 1, atualizados: 0 },
      ]),
    );
    const status = await within(painel).findByRole('status');
    expect(status).toHaveTextContent(
      'Confirmação parcial: 1 criadas, 0 atualizadas, 0 sem mudança.',
    );
    expect(status).toHaveTextContent(
      'Ainda há 1 pendentes e 0 conflitos sem aplicar.',
    );
    expect(status).toHaveTextContent('recalculados; nada foi publicado');
    expect(status).not.toHaveTextContent('concluída');
  });

  it('conflito exige escolha explícita entre substituir e manter', async () => {
    const estado = {
      plano: plano(
        [
          item({
            situacao: 'conflito',
            motivo: 'DIVERGE_DA_EXISTENTE',
            empreendimento: { id: 10, nomeFantasia: 'Hotel Fictício Alfa' },
            valorAtual: '60',
          }),
        ],
        { conflitos: 1, lidas: 1 },
        { podeConfirmar: false },
      ),
      chamadas: [] as Array<[string, string, unknown]>,
    };
    servidor('gestor', estado);
    const { user } = renderApp('/importacoes');
    const dialogo = await abrir(user);
    const painel = await within(dialogo).findByRole('region', {
      name: 'Conciliação e confirmação',
    });
    expect(within(painel).getByText('Já gravado: 60%')).toBeInTheDocument();
    expect(within(painel).getByText('Conflito')).toBeInTheDocument();
    await user.click(
      within(painel).getByRole('button', { name: 'Substituir' }),
    );
    await waitFor(() =>
      expect(estado.chamadas[0]).toEqual([
        'PUT',
        '/importacoes/7/linhas/1/conflito',
        { resolucao: 'substituir' },
      ]),
    );
  });

  it('aplicada fica sem ações; lote confirmado não oferece trocar o destino', async () => {
    const estado = {
      plano: plano(
        [
          item({
            situacao: 'aplicado',
            motivo: null,
            empreendimento: { id: 10, nomeFantasia: 'Hotel Fictício Alfa' },
            acaoAplicada: 'criar',
          }),
        ],
        { aplicados: 1, lidas: 1 },
        { confirmacao: 'concluido', podeConfirmar: false },
      ),
      chamadas: [] as Array<[string, string, unknown]>,
    };
    servidor('gestor', estado);
    const { user } = renderApp('/importacoes');
    const dialogo = await abrir(user);
    const painel = await within(dialogo).findByRole('region', {
      name: 'Conciliação e confirmação',
    });
    expect(within(painel).getByText('Resposta criada')).toBeInTheDocument();
    expect(
      within(painel).queryByRole('button', { name: 'Rejeitar' }),
    ).not.toBeInTheDocument();
    expect(
      within(painel).queryByRole('form', { name: 'Escolher destino' }),
    ).not.toBeInTheDocument();
    expect(
      within(painel).getByText('Confirmação concluída'),
    ).toBeInTheDocument();
  });
});
