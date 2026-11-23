import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const LOTE = {
  id: 7,
  fonte: 'tabulacao_consolidado',
  nomeArquivo: 'Tabulação Carnaval 2026.xlsx',
  tamanhoBytes: 20480,
  versaoParser: 'tabulacao-consolidado/1',
  estado: 'lido',
  criadoEm: '2026-11-22T12:00:00.000Z',
  lidoEm: '2026-11-22T12:00:01.000Z',
};
const DETALHE = {
  ...LOTE,
  sha256: 'a'.repeat(64),
  erroMensagem: null,
  destino: null,
  confirmacao: 'nao_confirmado',
  confirmadoEm: null,
  recalculoPendente: false,
  resumo: {
    rotuloPeriodo: 'TAXA OCUPAÇÃO – CONSOLIDADA CARNAVAL 2026',
    diarias: 5,
    abas: [
      { nome: 'TABULAÇÃO', situacao: 'lida' },
      { nome: 'MH', situacao: 'ignorada', motivo: 'Capacidade de referência' },
    ],
    linhasEntrada: 2,
    linhasVaziasIgnoradas: 38,
    colunasIgnoradas: ['G'],
  },
  totais: { linhas: 4, erros: 1, avisos: 0 },
};
const PLANO_VAZIO = {
  loteId: 7,
  destino: null,
  confirmacao: 'nao_confirmado',
  avisos: [],
  podeConfirmar: false,
  totais: {
    lidas: 0,
    novos: 0,
    atualizados: 0,
    semMudanca: 0,
    conflitos: 0,
    rejeitados: 0,
    pendentes: 0,
    aplicados: 0,
  },
  itens: [],
};
const OCORRENCIA = {
  id: 1,
  aba: 'TABULAÇÃO',
  linha: 6,
  coluna: 'L',
  severidade: 'erro',
  codigo: 'ESCALA_AMBIGUA',
  mensagem: 'O valor "0.5" não indica a escala.',
  orientacao: 'Formate a célula como porcentagem.',
};
const LINHAS = [
  {
    id: 1,
    aba: 'TABULAÇÃO',
    linha: 5,
    tipo: 'entrada',
    situacao: 'valida',
    celulas: {},
    canonico: { nomeInformado: 'Hotel Fictício', ocupacaoPercentual: '75.5' },
  },
  {
    id: 2,
    aba: 'TABULAÇÃO',
    linha: 6,
    tipo: 'entrada',
    situacao: 'erro',
    celulas: {
      C: {
        bruto: 'Pousada Fictícia',
        tipo: 'texto',
        formula: null,
        formatoPercentual: false,
      },
    },
    canonico: null,
  },
];

function servidor(
  perfil: 'gestor' | 'estagiario' | 'administrador',
  opcoes: { conflito?: boolean } = {},
) {
  const lista: object[] = [];
  const http = mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    if (path.startsWith('/importacoes?fonte=') && init?.method === 'POST') {
      if (opcoes.conflito)
        return Response.json(
          { error: { code: 'ARQUIVO_JA_RECEBIDO', message: 'duplicado' } },
          { status: 409 },
        );
      lista.push(LOTE);
      return Response.json({ data: DETALHE }, { status: 201 });
    }
    if (path.startsWith('/importacoes?')) return colecao(lista);
    if (path === '/importacoes/7') return Response.json({ data: DETALHE });
    if (path.startsWith('/importacoes/7/ocorrencias'))
      return colecao([OCORRENCIA]);
    if (path.startsWith('/importacoes/7/linhas')) return colecao(LINHAS);
    if (path === '/importacoes/7/plano')
      return Response.json({ data: PLANO_VAZIO });
    return colecao([]);
  });
  return http;
}
const planilha = () =>
  new File([new Uint8Array([80, 75, 3, 4])], 'Tabulação Carnaval 2026.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

describe('Importação de planilhas', () => {
  it('envia o arquivo como binário, mostra a prévia com erros e deixa claro que não é importação', async () => {
    const http = servidor('gestor');
    const { user } = renderApp('/importacoes');
    await screen.findByRole('heading', { name: 'Importação de planilhas' });
    const envio = screen.getByRole('button', { name: 'Enviar e ler' });
    expect(envio).toBeDisabled();

    await user.upload(screen.getByLabelText('Arquivo da planilha'), planilha());
    await user.click(screen.getByRole('button', { name: 'Enviar e ler' }));

    const chamada = http.mock.calls.find(([url]) =>
      String(url).includes('/importacoes?fonte='),
    );
    expect(String(chamada![0])).toContain('fonte=tabulacao_consolidado');
    const init = chamada![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(File);
    const cabecalhos = init.headers as Record<string, string>;
    expect(cabecalhos['Content-Type']).toBe('application/octet-stream');
    expect(cabecalhos['X-OTO-Request']).toBe('1');
    expect(decodeURIComponent(cabecalhos['x-nome-arquivo'])).toBe(
      'Tabulação Carnaval 2026.xlsx',
    );

    // A leitura abre em página própria, não em modal.
    expect(
      await screen.findByRole('heading', {
        name: 'Tabulação Carnaval 2026.xlsx',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Isto é uma leitura, não uma importação/),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', { name: 'Etapas da importação' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(4);

    await user.click(screen.getByRole('tab', { name: 'Erros e avisos (1)' }));
    expect(
      await screen.findByText('O valor "0.5" não indica a escala.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Formate a célula como porcentagem.'),
    ).toBeInTheDocument();
    expect(screen.getByText('TABULAÇÃO · L6')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Linhas lidas' }));
    expect(await screen.findByText('75,5')).toBeInTheDocument();
    expect(screen.getByText('Pousada Fictícia')).toBeInTheDocument();
    expect(screen.getByText('Com erro')).toBeInTheDocument();
    expect(screen.queryByText(/importação concluída/i)).not.toBeInTheDocument();
  });

  it('recusa formato e tamanho no formulário e explica arquivo já recebido', async () => {
    servidor('gestor', { conflito: true });
    const { user } = renderApp('/importacoes');
    await screen.findByRole('heading', { name: 'Importação de planilhas' });
    const campo = screen.getByLabelText('Arquivo da planilha');
    await user.upload(
      campo,
      new File(['x'], 'dados.csv', { type: 'text/csv' }),
    );
    // `accept` filtra o seletor; o validador repete a regra.
    await user.upload(
      campo,
      new File(['x'], 'dados.ods', {
        type: 'application/vnd.oasis.opendocument.spreadsheet',
      }),
    );
    expect(screen.getByRole('button', { name: 'Enviar e ler' })).toBeDisabled();

    await user.upload(campo, planilha());
    await user.click(screen.getByRole('button', { name: 'Enviar e ler' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /já foi recebido/,
    );
  });

  it('estagiário não acessa a área', async () => {
    servidor('estagiario');
    renderApp('/importacoes');
    await waitFor(() =>
      expect(screen.queryByText('Carregando…')).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('heading', { name: 'Importação de planilhas' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Enviar e ler' }),
    ).not.toBeInTheDocument();
  });

  it('administrador vê o histórico vazio e o formulário', async () => {
    servidor('administrador');
    renderApp('/importacoes');
    expect(
      await screen.findByText(
        'Nenhuma planilha recebida ainda. Envie a primeira acima.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Enviar e ler' }),
    ).toBeInTheDocument();
  });

  it('permite escolher Expectativa e envia a fonte correspondente', async () => {
    const http = servidor('gestor');
    const { user } = renderApp('/importacoes');
    await screen.findByRole('heading', { name: 'Importação de planilhas' });
    await user.selectOptions(
      screen.getByLabelText('Tipo de planilha'),
      'tabulacao_expectativa',
    );
    await user.upload(screen.getByLabelText('Arquivo da planilha'), planilha());
    await user.click(screen.getByRole('button', { name: 'Enviar e ler' }));
    await waitFor(() =>
      expect(
        http.mock.calls.some(([url]) =>
          String(url).includes('/importacoes?fonte=tabulacao_expectativa'),
        ),
      ).toBe(true),
    );
  });
});
