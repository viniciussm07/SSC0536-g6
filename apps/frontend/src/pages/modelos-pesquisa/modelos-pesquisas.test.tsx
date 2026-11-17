import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const MODELO = {
  id: 1,
  nome: 'Satisfação do hóspede',
  publicoAlvo: 'Hóspedes de meios de hospedagem',
  versao: 2,
  criadaEm: '2026-11-15T12:00:00.000Z',
};
const DETALHE = {
  ...MODELO,
  campos: [
    {
      id: 10,
      chave: 'satisfacao_geral',
      rotulo: 'Satisfação geral',
      tipoValor: 'percentual',
      obrigatorio: true,
      ordem: 10,
      opcoes: [],
    },
    {
      id: 11,
      chave: 'motivo_estadia',
      rotulo: 'Motivo da estadia',
      tipoValor: 'escolha',
      obrigatorio: false,
      ordem: 20,
      opcoes: [{ chave: 'lazer', rotulo: 'Lazer', ordem: 10 }],
    },
  ],
};
const VERSOES = [
  {
    numero: 2,
    nome: 'Satisfação do hóspede',
    publicoAlvo: 'Hóspedes de meios de hospedagem',
    criadaEm: '2026-11-15T12:00:00.000Z',
    motivo: 'Ajuste das opções',
  },
  {
    numero: 1,
    nome: 'Satisfação do hóspede',
    publicoAlvo: 'Hóspedes',
    criadaEm: '2026-11-10T12:00:00.000Z',
    motivo: null,
  },
];

function servidor(opcoes: { criar409?: boolean } = {}) {
  const lista = [{ ...MODELO }];
  return mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia('gestor');
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil('gestor') });
    if (path === '/modelos-pesquisa' && init?.method === 'POST') {
      if (opcoes.criar409)
        return Response.json(
          {
            error: {
              code: 'CHAVE_DUPLICADA',
              message: 'Já existe um campo ou opção com esta chave no modelo.',
            },
          },
          { status: 409 },
        );
      const corpo = JSON.parse(init!.body as string);
      const criado = {
        id: 2,
        nome: corpo.nome,
        publicoAlvo: corpo.publicoAlvo,
        versao: 1,
        criadaEm: '2026-11-16T12:00:00.000Z',
        campos: corpo.campos.map((c: object, i: number) => ({
          id: 20 + i,
          ...c,
        })),
      };
      lista.push({
        id: 2,
        nome: criado.nome,
        publicoAlvo: criado.publicoAlvo,
        versao: 1,
        criadaEm: criado.criadaEm,
      });
      return Response.json({ data: criado }, { status: 201 });
    }
    if (path === '/modelos-pesquisa/1' && init?.method === 'PUT') {
      const corpo = JSON.parse(init!.body as string);
      return Response.json({
        data: {
          ...DETALHE,
          ...corpo,
          campos: corpo.campos
            ? corpo.campos.map((c: object, i: number) => ({
                id: 10 + i,
                ...c,
              }))
            : DETALHE.campos,
        },
      });
    }
    if (path === '/modelos-pesquisa/1') return Response.json({ data: DETALHE });
    if (path.startsWith('/modelos-pesquisa/1/versoes')) return colecao(VERSOES);
    if (path.startsWith('/modelos-pesquisa?')) return colecao(lista);
    return colecao([]);
  });
}

describe('Modelos de pesquisa', () => {
  it('carrega a grade e cria um modelo com campos, opções e obrigatoriedade', async () => {
    const http = servidor();
    const { user } = renderApp('/modelos-pesquisa');
    const grade = await screen.findByRole('table', {
      name: 'Modelos de pesquisa',
    });
    expect(
      within(grade).getByText('Satisfação do hóspede'),
    ).toBeInTheDocument();
    expect(
      within(grade).getByText('Hóspedes de meios de hospedagem'),
    ).toBeInTheDocument();
    expect(
      http.mock.calls.some(([url]) =>
        String(url).includes('/modelos-pesquisa?'),
      ),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Novo modelo' }));
    await user.click(
      await screen.findByRole('button', { name: 'Criar modelo' }),
    );
    expect(
      (await screen.findAllByText('Informe um texto de 1 a 200 caracteres.'))
        .length,
    ).toBe(2);
    expect(
      await screen.findByText(
        'Chave inválida: use minúsculas, dígitos e separadores ., -, _.',
      ),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome'), 'Pesquisa de permanência');
    await user.type(
      screen.getByLabelText('Público-alvo'),
      'Hóspedes em estadia',
    );
    const campo1 = screen.getByRole('group', { name: 'Campo 1' });
    await user.type(within(campo1).getByLabelText('Chave'), 'satisfacao_geral');
    await user.type(
      within(campo1).getByLabelText('Rótulo'),
      'Satisfação geral',
    );
    await user.selectOptions(
      within(campo1).getByLabelText('Tipo do valor'),
      'percentual',
    );
    await user.click(
      within(campo1).getByRole('checkbox', { name: 'Exigir resposta' }),
    );
    await user.click(screen.getByRole('button', { name: 'Adicionar campo' }));
    const campo2 = screen.getByRole('group', { name: 'Campo 2' });
    await user.type(within(campo2).getByLabelText('Chave'), 'motivo_estadia');
    await user.type(
      within(campo2).getByLabelText('Rótulo'),
      'Motivo da estadia',
    );
    await user.selectOptions(
      within(campo2).getByLabelText('Tipo do valor'),
      'escolha',
    );
    await user.click(
      await within(campo2).findByRole('button', { name: 'Adicionar opção' }),
    );
    const opcao1 = within(campo2).getByRole('group', { name: 'Opção 1' });
    await user.type(within(opcao1).getByLabelText('Chave'), 'lazer');
    await user.type(within(opcao1).getByLabelText('Rótulo'), 'Lazer');
    await user.click(screen.getByRole('button', { name: 'Criar modelo' }));

    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith('/modelos-pesquisa') &&
            init?.method === 'POST',
        ),
      ).toBe(true),
    );
    const post = http.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/modelos-pesquisa') && init?.method === 'POST',
    )!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      nome: 'Pesquisa de permanência',
      publicoAlvo: 'Hóspedes em estadia',
      campos: [
        {
          chave: 'satisfacao_geral',
          rotulo: 'Satisfação geral',
          tipoValor: 'percentual',
          obrigatorio: true,
          ordem: 10,
          opcoes: [],
        },
        {
          chave: 'motivo_estadia',
          rotulo: 'Motivo da estadia',
          tipoValor: 'escolha',
          obrigatorio: false,
          ordem: 20,
          opcoes: [{ chave: 'lazer', rotulo: 'Lazer', ordem: 10 }],
        },
      ],
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    // A criação invalida a grade: o novo modelo aparece sem recarregar a página.
    expect(
      await screen.findByText('Pesquisa de permanência'),
    ).toBeInTheDocument();
  });

  it('editar envia os campos alterados com o motivo e avisa quando nada muda', async () => {
    const http = servidor();
    const { user } = renderApp('/modelos-pesquisa');
    await user.click(
      await screen.findByRole('button', {
        name: 'Ações de Satisfação do hóspede',
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    const campo1 = await screen.findByRole('group', { name: 'Campo 1' });

    await user.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    expect(
      await screen.findByText('Informe ao menos um campo para alterar.'),
    ).toBeInTheDocument();
    expect(http.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(
      false,
    );

    const rotulo = within(campo1).getByLabelText('Rótulo');
    await user.clear(rotulo);
    await user.type(rotulo, 'Satisfação do hóspede');
    await user.type(
      screen.getByLabelText('Motivo da alteração'),
      'Ajuste do rótulo',
    );
    await user.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await waitFor(() =>
      expect(http.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(
        true,
      ),
    );
    const put = http.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(JSON.parse(put[1]!.body as string)).toEqual({
      campos: [
        {
          chave: 'satisfacao_geral',
          rotulo: 'Satisfação do hóspede',
          tipoValor: 'percentual',
          obrigatorio: true,
          ordem: 10,
          opcoes: [],
        },
        {
          chave: 'motivo_estadia',
          rotulo: 'Motivo da estadia',
          tipoValor: 'escolha',
          obrigatorio: false,
          ordem: 20,
          opcoes: [{ chave: 'lazer', rotulo: 'Lazer', ordem: 10 }],
        },
      ],
      motivo: 'Ajuste do rótulo',
    });
  });

  it('histórico mostra as versões imutáveis do modelo em uma grade', async () => {
    servidor();
    const { user } = renderApp('/modelos-pesquisa');
    await user.click(
      await screen.findByRole('button', {
        name: 'Ações de Satisfação do hóspede',
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Histórico' }),
    );
    const grade = await screen.findByRole('table', {
      name: 'Versões do modelo',
    });
    expect(within(grade).getByText('Ajuste das opções')).toBeInTheDocument();
    expect(within(grade).getAllByRole('row')).toHaveLength(3);
  });

  it('chave repetida mostra mensagem amigável do conflito', async () => {
    servidor({ criar409: true });
    const { user } = renderApp('/modelos-pesquisa');
    await user.click(
      await screen.findByRole('button', { name: 'Novo modelo' }),
    );
    await user.type(
      await screen.findByLabelText('Nome'),
      'Pesquisa de permanência',
    );
    await user.type(
      screen.getByLabelText('Público-alvo'),
      'Hóspedes em estadia',
    );
    const campo1 = screen.getByRole('group', { name: 'Campo 1' });
    await user.type(within(campo1).getByLabelText('Chave'), 'satisfacao_geral');
    await user.type(
      within(campo1).getByLabelText('Rótulo'),
      'Satisfação geral',
    );
    await user.click(screen.getByRole('button', { name: 'Criar modelo' }));
    expect(
      await screen.findByText(
        'Já existe um campo ou opção com esta chave no modelo. Escolha outra chave.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
