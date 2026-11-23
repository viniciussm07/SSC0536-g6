import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  acessoDoPerfil,
  colecao,
  listadoFicticio,
  mockHttp,
  sessaoFicticia,
} from '@/test/http';
import { renderApp } from '@/test/render-app';

const PERIODO = {
  id: 3,
  tipo: 'mes',
  rotulo: 'Novembro de 2040',
  dataInicio: '2040-11-01',
  dataFim: '2040-11-30',
};

const COLETA = {
  id: 1,
  empreendimentoId: 10,
  empreendimentoNome: 'Hotel A',
  periodoId: 3,
  periodoRotulo: 'Novembro de 2040',
  fonte: 'booking',
  dataColeta: '2040-11-01',
  dataEstadia: '2040-11-15',
  tipoDia: 'fim_de_semana',
  valorDiaria: '199.90',
  moeda: 'BRL',
  unidadePreco: 'por_uh_diaria',
  origem: 'manual',
  situacaoConferencia: 'pendente',
  referenciaOrigem: null,
  observacao: null,
  conferidoEm: null,
  conferidoPor: null,
};

function servidor(
  perfil: 'gestor' | 'visualizador',
  opcoes: { criar409?: boolean; criar400?: boolean } = {},
) {
  const coletas = [{ ...COLETA }];
  const rhcs: object[] = [];
  const parametros: object[] = [];
  return mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil(perfil) });
    if (path.startsWith('/empreendimentos?'))
      return colecao([listadoFicticio({ id: 10, nomeFantasia: 'Hotel A' })]);
    if (path.startsWith('/periodos?')) return colecao([PERIODO]);
    if (path === '/coletas-diarias' && init?.method === 'POST') {
      if (opcoes.criar400)
        return Response.json(
          {
            error: {
              code: 'ENTRADA_INVALIDA',
              message: 'Confira os campos informados.',
              details: [
                {
                  field: 'dataEstadia',
                  message:
                    'A data de estadia deve pertencer ao período selecionado.',
                },
              ],
            },
          },
          { status: 400 },
        );
      if (opcoes.criar409)
        return Response.json(
          {
            error: {
              code: 'COLETA_DIARIA_DUPLICADA',
              message: 'Já existe uma coleta com esta identidade.',
            },
          },
          { status: 409 },
        );
      const criada = {
        ...COLETA,
        id: 2,
        ...JSON.parse(init.body as string),
        empreendimentoNome: 'Hotel A',
        periodoRotulo: 'Novembro de 2040',
        valorDiaria: '210.50',
      };
      coletas.push(criada);
      return Response.json({ data: criada }, { status: 201 });
    }
    if (path.startsWith('/coletas-diarias?')) return colecao(coletas);
    if (path === '/rhc-periodos' && init?.method === 'POST') {
      const criado = {
        id: 1,
        qtdRhc: 0,
        leitos: 0,
        origem: 'manual',
        situacaoConferencia: 'pendente',
        revisao: 1,
        observacao: null,
        conferidoEm: null,
        conferidoPor: null,
        periodoRotulo: 'Novembro de 2040',
        ...JSON.parse(init.body as string),
      };
      rhcs.push(criado);
      return Response.json({ data: criado }, { status: 201 });
    }
    if (path.startsWith('/rhc-periodos?')) return colecao(rhcs);
    if (path === '/parametros-calculo' && init?.method === 'POST') {
      const criado = {
        id: 1,
        unidade: 'indefinida',
        situacao: 'hipotese_pendente_homologacao',
        vigenciaFim: null,
        fonte: null,
        observacao: null,
        ...JSON.parse(init.body as string),
      };
      parametros.push(criado);
      return Response.json({ data: criado }, { status: 201 });
    }
    if (path.startsWith('/parametros-calculo?')) return colecao(parametros);
    return colecao([]);
  });
}

describe('Diárias e RHC', () => {
  it('carrega a grade e cria uma coleta de diária, invalidando a lista', async () => {
    const http = servidor('gestor');
    const { user } = renderApp('/diarias');
    const grade = await screen.findByRole('table', {
      name: 'Coletas de diária',
    });
    expect(within(grade).getByText('Hotel A')).toBeInTheDocument();
    expect(within(grade).getByText('BRL 199.90')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nova coleta' }));
    await user.selectOptions(
      await screen.findByLabelText('Empreendimento'),
      '10',
    );
    await user.selectOptions(screen.getByLabelText('Período'), '3');
    fireEvent.change(screen.getByLabelText('Data da coleta'), {
      target: { value: '2040-11-02' },
    });
    fireEvent.change(screen.getByLabelText('Data da estadia'), {
      target: { value: '2040-11-16' },
    });
    await user.type(screen.getByLabelText('Valor da diária'), '210,50');
    await user.click(screen.getByRole('button', { name: 'Criar coleta' }));

    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith('/coletas-diarias') && init?.method === 'POST',
        ),
      ).toBe(true),
    );
    const post = http.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/coletas-diarias') && init?.method === 'POST',
    )!;
    expect(JSON.parse(post[1]!.body as string)).toMatchObject({
      empreendimentoId: 10,
      periodoId: 3,
      dataColeta: '2040-11-02',
      dataEstadia: '2040-11-16',
      valorDiaria: '210,50',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('duplicidade mostra mensagem amigável e mantém o formulário', async () => {
    servidor('gestor', { criar409: true });
    const { user } = renderApp('/diarias');
    await user.click(
      await screen.findByRole('button', { name: 'Nova coleta' }),
    );
    await user.selectOptions(
      await screen.findByLabelText('Empreendimento'),
      '10',
    );
    await user.selectOptions(screen.getByLabelText('Período'), '3');
    fireEvent.change(screen.getByLabelText('Data da coleta'), {
      target: { value: '2040-11-01' },
    });
    fireEvent.change(screen.getByLabelText('Data da estadia'), {
      target: { value: '2040-11-15' },
    });
    await user.type(screen.getByLabelText('Valor da diária'), '199,90');
    await user.click(screen.getByRole('button', { name: 'Criar coleta' }));
    expect(
      await screen.findByText(
        'Já existe uma coleta com este empreendimento, período, fonte, data de estadia e tipo de dia.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('erro de período inválido mostra a mensagem de campo do servidor', async () => {
    servidor('gestor', { criar400: true });
    const { user } = renderApp('/diarias');
    await user.click(
      await screen.findByRole('button', { name: 'Nova coleta' }),
    );
    await user.selectOptions(
      await screen.findByLabelText('Empreendimento'),
      '10',
    );
    await user.selectOptions(screen.getByLabelText('Período'), '3');
    fireEvent.change(screen.getByLabelText('Data da coleta'), {
      target: { value: '2040-11-01' },
    });
    fireEvent.change(screen.getByLabelText('Data da estadia'), {
      target: { value: '2040-12-01' },
    });
    await user.type(screen.getByLabelText('Valor da diária'), '199,90');
    await user.click(screen.getByRole('button', { name: 'Criar coleta' }));
    expect(
      await screen.findByText(
        'A data de estadia deve pertencer ao período selecionado.',
      ),
    ).toBeInTheDocument();
  });

  it('cria RHC pela aba correspondente', async () => {
    const http = servidor('gestor');
    const { user } = renderApp('/diarias');
    await user.click(await screen.findByRole('tab', { name: 'RHC' }));
    await user.click(await screen.findByRole('button', { name: 'Novo RHC' }));
    await user.selectOptions(await screen.findByLabelText('Período'), '3');
    await user.type(screen.getByLabelText('Quantidade de RHC'), '2');
    await user.type(screen.getByLabelText('Leitos de RHC'), '8');
    await user.click(screen.getByRole('button', { name: 'Criar RHC' }));
    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith('/rhc-periodos') && init?.method === 'POST',
        ),
      ).toBe(true),
    );
    const post = http.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/rhc-periodos') && init?.method === 'POST',
    )!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      periodoId: 3,
      qtdRhc: 2,
      leitos: 8,
    });
  });

  it('carrega a aba de parâmetros', async () => {
    servidor('gestor');
    const { user } = renderApp('/diarias');
    await user.click(await screen.findByRole('tab', { name: 'Parâmetros' }));
    expect(
      await screen.findByRole('table', { name: 'Parâmetros de cálculo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Novo parâmetro' }),
    ).toBeInTheDocument();
  });

  it('visualizador não acessa as fontes complementares', async () => {
    servidor('visualizador');
    renderApp('/diarias');
    expect(
      await screen.findByRole('heading', { name: 'Acesso negado' }),
    ).toBeInTheDocument();
  });
});
