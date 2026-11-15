import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  acessoDoPerfil,
  colecao,
  detalheFicticio,
  mockHttp,
  sessaoFicticia,
} from '@/test/http';
import { renderApp } from '@/test/render-app';

const SEGMENTOS = [
  {
    id: 900001,
    chave: 'fixture.hospedagem',
    nome: 'Hospedagem fictícia',
    nivelCadastro: 'completo',
  },
];
function servidor(post: (corpo: Record<string, unknown>) => Response) {
  return mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia('gestor');
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil('gestor') });
    if (path === '/segmentos') return Response.json({ data: SEGMENTOS });
    if (path === '/empreendimentos' && init?.method === 'POST')
      return post(JSON.parse(String(init.body)));
    if (/^\/empreendimentos\/\d+$/.test(path))
      return Response.json({
        data: detalheFicticio({ id: 900050, nomeFantasia: 'Hotel Gama' }),
      });
    return colecao([]);
  });
}
const corpos = (http: ReturnType<typeof servidor>) =>
  http.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(
      ([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>,
    );
const criado = () =>
  Response.json(
    { data: detalheFicticio({ id: 900050, nomeFantasia: 'Hotel Gama' }) },
    { status: 201 },
  );

describe('Cadastro: novo empreendimento', () => {
  it('valida no formulário, não envia vazio e aceita cadastro parcial só com o essencial', async () => {
    const http = servidor(criado);
    const { user, router } = renderApp('/empreendimentos/novo');
    await user.click(
      await screen.findByRole('button', { name: 'Cadastrar empreendimento' }),
    );
    expect(
      await screen.findByText('Informe o nome fantasia.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Informe ao menos um segmento/),
    ).toBeInTheDocument();
    expect(corpos(http)).toHaveLength(0);
    await user.type(screen.getByLabelText(/Nome fantasia/), '  Hotel Gama ');
    await user.click(
      screen.getByRole('checkbox', { name: 'Hospedagem fictícia' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar empreendimento' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Hotel Gama', level: 1 }),
    ).toBeInTheDocument();
    expect(corpos(http)).toEqual([
      { nomeFantasia: 'Hotel Gama', situacao: 'ativo', segmentoIds: [900001] },
    ]);
    expect(router.state.location.pathname).toBe('/');
    expect(
      screen.getByRole('button', { name: /Contexto: Hotel Gama\./ }),
    ).toBeInTheDocument();
  });

  it('valida CNPJ, coordenadas, data de encerramento e contatos antes de enviar', async () => {
    const http = servidor(criado);
    const { user } = renderApp('/empreendimentos/novo');
    await user.type(
      await screen.findByLabelText(/Nome fantasia/),
      'Hotel Gama',
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Hospedagem fictícia' }),
    );
    await user.type(screen.getByLabelText('CNPJ'), '123');
    await user.type(screen.getByLabelText('Longitude'), '200');
    await user.selectOptions(
      screen.getByLabelText('Situação cadastral'),
      'Encerrado',
    );
    await user.click(screen.getByRole('button', { name: 'Adicionar contato' }));
    await user.type(screen.getByLabelText('Contato'), 'sem-arroba');
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar empreendimento' }),
    );
    expect(await screen.findByText(/CNPJ com 14 dígitos/)).toBeInTheDocument();
    expect(
      screen.getByText('Longitude deve estar entre -180 e 180.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(
      screen.getAllByText('Informe a data de encerramento.').length,
    ).toBeGreaterThan(0);
    expect(corpos(http)).toHaveLength(0);
  });

  it('envia cadastro completo com contatos, Cadastur e coordenadas normalizados', async () => {
    const http = servidor(criado);
    const { user } = renderApp('/empreendimentos/novo');
    await user.type(
      await screen.findByLabelText(/Nome fantasia/),
      'Hotel Gama',
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Hospedagem fictícia' }),
    );
    await user.type(screen.getByLabelText('CNPJ'), '11.222.333/0001-81');
    await user.type(screen.getByLabelText('Longitude'), '-49,5');
    await user.type(screen.getByLabelText('Latitude'), '-20,25');
    await user.click(screen.getByRole('button', { name: 'Adicionar contato' }));
    await user.type(screen.getByLabelText('Contato'), 'contato@example.test');
    await user.selectOptions(screen.getByLabelText('Finalidade'), 'Interno');
    await user.selectOptions(
      screen.getByLabelText('Situação no Cadastur'),
      'Número próprio',
    );
    await user.type(screen.getByLabelText('Número do Cadastur'), '000123');
    await user.type(
      screen.getByLabelText('Vencimento do Cadastur'),
      '2027-01-31',
    );
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar empreendimento' }),
    );
    await waitFor(() => expect(corpos(http)).toHaveLength(1));
    expect(corpos(http)[0]).toEqual({
      nomeFantasia: 'Hotel Gama',
      situacao: 'ativo',
      segmentoIds: [900001],
      cnpj: '11222333000181',
      localizacao: { longitude: -49.5, latitude: -20.25 },
      contatos: [
        { tipo: 'email', valor: 'contato@example.test', finalidade: 'interno' },
      ],
      cadastur: [
        {
          situacao: 'numero_proprio',
          numero: '000123',
          vencimento: '2027-01-31',
        },
      ],
    });
  });

  it('duplicidade potencial lista candidatos e só repete o envio com confirmação explícita', async () => {
    let tentativa = 0;
    const http = servidor(() => {
      tentativa++;
      return tentativa === 1
        ? Response.json(
            {
              error: {
                code: 'DUPLICIDADE_POTENCIAL',
                message: 'Há empreendimentos que podem ser o mesmo.',
                details: [
                  {
                    id: 900001,
                    nomeFantasia: 'Hotel Gama Antigo',
                    cnpj: null,
                    situacao: 'ativo',
                    motivos: ['nome_igual'],
                  },
                ],
              },
            },
            { status: 409 },
          )
        : criado();
    });
    const { user } = renderApp('/empreendimentos/novo');
    await user.type(
      await screen.findByLabelText(/Nome fantasia/),
      'Hotel Gama',
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Hospedagem fictícia' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar empreendimento' }),
    );
    const aviso = await screen.findByRole('region', {
      name: 'Possíveis duplicidades',
    });
    expect(within(aviso).getByText('Hotel Gama Antigo')).toBeInTheDocument();
    expect(aviso).toHaveTextContent('ID 900001');
    expect(aviso).toHaveTextContent('mesmo nome');
    expect(corpos(http)).toHaveLength(1);
    expect('confirmarSemDuplicidade' in corpos(http)[0]).toBe(false);
    await user.click(
      within(aviso).getByRole('button', {
        name: 'Confirmar que é outro empreendimento',
      }),
    );
    await screen.findByRole('heading', { name: 'Hotel Gama', level: 1 });
    expect(corpos(http)).toHaveLength(2);
    expect(corpos(http)[1].confirmarSemDuplicidade).toBe(true);
  });

  it('mostra erros por campo devolvidos pelo servidor e outros erros sem perder o preenchimento', async () => {
    let n = 0;
    servidor(() => {
      n++;
      return n === 1
        ? Response.json(
            {
              error: {
                code: 'ENTRADA_INVALIDA',
                message: 'x',
                details: [
                  {
                    field: 'segmentoIds',
                    message: 'Segmento inexistente: 900001.',
                  },
                ],
              },
            },
            { status: 400 },
          )
        : new Response(null, { status: 503 });
    });
    const { user } = renderApp('/empreendimentos/novo');
    await user.type(
      await screen.findByLabelText(/Nome fantasia/),
      'Hotel Gama',
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Hospedagem fictícia' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar empreendimento' }),
    );
    expect(
      await screen.findByText(/Segmento inexistente: 900001/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar empreendimento' }),
    );
    expect(
      await screen.findByText(/Não foi possível conectar/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome fantasia/)).toHaveValue('Hotel Gama');
  });

  it('bloqueia envio duplicado enquanto salva', async () => {
    let resolver!: (r: Response) => void;
    mockHttp((path, init) => {
      if (path === '/sessoes/atual') return sessaoFicticia('gestor');
      if (path === '/acessos/atual')
        return Response.json({ data: acessoDoPerfil('gestor') });
      if (path === '/segmentos') return Response.json({ data: SEGMENTOS });
      if (init?.method === 'POST')
        return new Promise<Response>((r) => {
          resolver = r;
        });
      return Response.json({
        data: detalheFicticio({ id: 900050, nomeFantasia: 'Hotel Gama' }),
      });
    });
    const { user } = renderApp('/empreendimentos/novo');
    await user.type(
      await screen.findByLabelText(/Nome fantasia/),
      'Hotel Gama',
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Hospedagem fictícia' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Cadastrar empreendimento' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Salvando…' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome fantasia/)).toBeDisabled();
    resolver(criado());
    await screen.findByRole('heading', { name: 'Hotel Gama', level: 1 });
  });
});
