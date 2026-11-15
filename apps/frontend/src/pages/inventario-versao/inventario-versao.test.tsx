import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  acessoDoPerfil,
  colecao,
  detalheFicticio,
  mockHttp,
  sessaoFicticia,
} from '@/test/http';
import { renderApp } from '@/test/render-app';
import { versaoFicticia } from '@/test/inventario';
import { hojeOperacional } from '@/utils/inventario';

const SEGMENTO = detalheFicticio().segmentos[0];
const item = (id: number, rotulo: string, extra = {}) => ({
  id,
  grupoId: 1,
  chave: `fixture.${id}`,
  rotulo,
  exclusivo: false,
  outro: false,
  aceitaQuantidade: false,
  ordem: id,
  ativo: true,
  versao: 1,
  ...extra,
});
const FORMULARIO = {
  segmentoId: SEGMENTO.id,
  grupos: [
    {
      id: 1,
      segmentoId: SEGMENTO.id,
      chave: 'fixture.recepcao',
      pergunta: 'Recepção',
      selecao: 'multipla',
      permiteOutro: true,
      secao: 'Serviços e equipamentos',
      ordem: 1,
      ativo: true,
      itens: [
        item(1, 'Sanitário na recepção'),
        item(2, 'Outros serviços', { outro: true }),
      ],
    },
  ],
};

function servidor(
  criar: (corpo: Record<string, unknown>) => Response,
  base = versaoFicticia({
    itens: [
      {
        itemId: 1,
        itemVersao: 1,
        rotulo: 'Sanitário na recepção',
        pergunta: 'Recepção',
        estado: 'sim',
        detalhe: null,
        quantidade: null,
      },
    ],
  }),
) {
  return mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia('gestor');
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil('gestor') });
    if (path === '/empreendimentos/10')
      return Response.json({ data: detalheFicticio() });
    if (path === `/segmentos/${SEGMENTO.id}/catalogo`)
      return Response.json({ data: FORMULARIO });
    if (path === '/empreendimentos/10/inventarios/vigente')
      return Response.json({ data: base });
    if (path === '/empreendimentos/10/inventarios/5')
      return Response.json({ data: base });
    if (path === '/empreendimentos/10/inventarios' && init?.method === 'POST')
      return criar(JSON.parse(String(init.body)) as Record<string, unknown>);
    return colecao([]);
  });
}
const noContexto = () =>
  localStorage.setItem(
    'oto:contexto:1',
    JSON.stringify({ id: 10, nome: 'Hotel A', cnpj: '11222333000181' }),
  );
const posts = (http: ReturnType<typeof servidor>) =>
  http.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(
      ([, init]) => JSON.parse(String(init!.body)) as Record<string, unknown>,
    );

describe('Inventário: nova versão', () => {
  it('prefilla da versão vigente, preserva zero, não se aplica e desconhecido e envia o contexto', async () => {
    noContexto();
    const http = servidor(() =>
      Response.json({ data: versaoFicticia({ id: 6 }) }, { status: 201 }),
    );
    const { user, router } = renderApp('/inventario/nova-versao');
    expect(
      await screen.findByRole('heading', { name: 'Atualizar inventário' }),
    ).toBeInTheDocument();
    // Valores herdados da vigente.
    expect(await screen.findByLabelText('UH')).toHaveValue('informado');
    expect(screen.getByLabelText('Valor de UH (unidades)')).toHaveValue('10');
    expect(screen.getByLabelText('UH acessíveis (PCD)')).toHaveValue(
      'nao_se_aplica',
    );
    expect(screen.getByLabelText('Sanitário na recepção')).toHaveValue('sim');
    expect(screen.getByLabelText('Início da vigência')).toHaveValue(
      hojeOperacional(),
    );

    const leitos = screen.getByLabelText('Valor de Leitos (leitos)');
    await user.clear(leitos);
    await user.type(leitos, '0');
    await user.selectOptions(
      screen.getByLabelText('Funcionários fixos'),
      'desconhecido',
    );
    await user.selectOptions(
      screen.getByLabelText('Funcionários temporários'),
      'nao_se_aplica',
    );
    await user.selectOptions(screen.getByLabelText('Outros serviços'), 'sim');
    await user.type(
      screen.getByLabelText('Detalhe de “Outros serviços”'),
      '  Lavanderia ',
    );
    await user.click(
      screen.getByRole('button', { name: 'Salvar nova versão' }),
    );

    await waitFor(() => expect(posts(http)).toHaveLength(1));
    const corpo = posts(http)[0] as {
      capacidade: Record<string, unknown>;
      itens: unknown[];
    };
    expect(corpo).toMatchObject({
      tipoAlteracao: 'mudanca_real',
      vigenciaInicio: hojeOperacional(),
    });
    expect('vigenciaFim' in corpo).toBe(false);
    expect(corpo.capacidade).toMatchObject({
      totalUh: 10,
      leitos: 0,
      maxLeitosPorUh: null,
      uhsPcd: { estado: 'nao_se_aplica' },
      funcFixos: null,
      funcTemporarios: { estado: 'nao_se_aplica' },
      funciona24h: false,
      checkin: '14:00',
    });
    // Item da base segue explícito; "outro" leva o detalhe sem espaços; item sem resposta é omitido.
    expect(corpo.itens).toEqual([
      { itemId: 1, estado: 'sim' },
      { itemId: 2, estado: 'sim', detalhe: 'Lavanderia' },
    ]);
    const chamada = http.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    )!;
    expect(
      (chamada[1]?.headers as Record<string, string>)['x-identification'],
    ).toBe('10');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('correção por link mantém a vigência, exige motivo e usa a versão corrigida como base', async () => {
    noContexto();
    let tentativa = 0;
    const http = servidor(() =>
      ++tentativa === 1
        ? Response.json(
            {
              error: {
                code: 'ENTRADA_INVALIDA',
                message: 'Confira',
                details: [
                  { field: 'motivo', message: 'Informe o motivo da correção.' },
                ],
              },
            },
            { status: 400 },
          )
        : Response.json(
            { data: versaoFicticia({ id: 7, tipoAlteracao: 'correcao' }) },
            { status: 201 },
          ),
    );
    const { user } = renderApp('/inventario/nova-versao?corrigir=5');
    expect(
      await screen.findByRole('heading', { name: 'Corrigir inventário' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Correção da versão de 01\/04\/2026/),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Início da vigência'),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Registrar correção' }),
    );
    expect(
      await screen.findByText('Informe o motivo da correção.'),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/Motivo da correção/),
      'Leitos digitados errado',
    );
    await user.click(
      screen.getByRole('button', { name: 'Registrar correção' }),
    );
    await waitFor(() => expect(posts(http)).toHaveLength(2));
    const corpo = posts(http)[1];
    expect(corpo).toMatchObject({
      tipoAlteracao: 'correcao',
      corrigeId: 5,
      motivo: 'Leitos digitados errado',
    });
    expect('vigenciaInicio' in corpo).toBe(false);
  });

  it('erros do servidor aparecem junto ao campo, ao item e ao grupo', async () => {
    noContexto();
    servidor(() =>
      Response.json(
        {
          error: {
            code: 'ENTRADA_INVALIDA',
            message: 'Confira',
            details: [
              {
                field: 'vigenciaInicio',
                message:
                  'Já existe uma versão que começa nesta data; para ajustar os valores, registre uma correção.',
              },
              {
                field: 'capacidade.leitos',
                message:
                  'Informe uma quantidade inteira entre 0 e 2147483647, sem separador de milhar.',
              },
              {
                field: 'itens[1].detalhe',
                message: 'Descreva a opção "outro".',
              },
              {
                field: 'grupos.fixture.recepcao',
                message:
                  '"Sem recepção" não pode ser combinado com outra opção.',
              },
            ],
          },
        },
        { status: 400 },
      ),
    );
    const { user } = renderApp('/inventario/nova-versao');
    await screen.findByLabelText('Outros serviços');
    await user.selectOptions(screen.getByLabelText('Outros serviços'), 'sim');
    await user.click(
      screen.getByRole('button', { name: 'Salvar nova versão' }),
    );
    expect(
      await screen.findByText(/Já existe uma versão que começa nesta data/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Informe uma quantidade inteira/),
    ).toBeInTheDocument();
    expect(screen.getByText('Descreva a opção "outro".')).toBeInTheDocument();
    expect(
      screen.getByText(/não pode ser combinado com outra opção/),
    ).toBeInTheDocument();
  });
});
