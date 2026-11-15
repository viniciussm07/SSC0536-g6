import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { acessoDoPerfil, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

const item = (id: number, grupoId: number, rotulo: string, extra = {}) => ({
  id,
  grupoId,
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
  segmentoId: 1,
  grupos: [
    {
      id: 1,
      segmentoId: 1,
      chave: 'fixture.recepcao',
      pergunta: 'Recepção',
      selecao: 'multipla',
      permiteOutro: true,
      secao: 'Serviços e equipamentos',
      ordem: 1,
      ativo: true,
      itens: [
        item(1, 1, 'Sem recepção', { exclusivo: true }),
        item(2, 1, 'Sanitário na recepção'),
        item(3, 1, 'Outros serviços', { outro: true }),
      ],
    },
    {
      id: 2,
      segmentoId: 1,
      chave: 'fixture.elevador',
      pergunta: 'Elevador',
      selecao: 'unica',
      permiteOutro: false,
      secao: 'Acessibilidade',
      ordem: 2,
      ativo: true,
      itens: [item(10, 2, 'Elevador adaptado', { aceitaQuantidade: true })],
    },
  ],
};

function servidor(validacao: () => Response) {
  return mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia('gestor');
    if (path === '/acessos/atual')
      return Response.json({ data: acessoDoPerfil('gestor') });
    if (path === '/segmentos')
      return Response.json({
        data: [
          {
            id: 1,
            chave: 'hospedagem',
            nome: 'Hospedagem',
            nivelCadastro: 'completo',
          },
        ],
      });
    if (path === '/segmentos/1/catalogo')
      return Response.json({ data: FORMULARIO });
    if (path === '/segmentos/1/catalogo/validacoes' && init?.method === 'POST')
      return validacao();
    return new Response(null, { status: 404 });
  });
}
const corpoEnviado = (http: ReturnType<typeof servidor>) =>
  JSON.parse(
    http.mock.calls.find(([url]) => String(url).endsWith('/validacoes'))![1]!
      .body as string,
  );

describe('Pré-visualização do formulário de inventário', () => {
  it('agrupa por seção, mantém "não informado" por padrão e omite o que não foi respondido', async () => {
    const http = servidor(() =>
      Response.json({
        data: {
          itens: [
            { itemId: 1, estado: 'nao' },
            { itemId: 2, estado: 'sim' },
          ],
        },
      }),
    );
    const { user } = renderApp('/formulario-inventario');
    expect(
      await screen.findByRole('heading', { name: 'Serviços e equipamentos' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Acessibilidade' }),
    ).toBeInTheDocument();
    const grupo = screen.getByRole('group', { name: /Recepção/ });
    expect(within(grupo).getByLabelText('Sanitário na recepção')).toHaveValue(
      'nao_informado',
    );
    // Detalhe só aparece para "outro" marcado como sim; quantidade, para quem a aceita.
    expect(screen.queryByLabelText(/Detalhe de/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Outros serviços'), 'sim');
    expect(
      screen.getByLabelText('Detalhe de “Outros serviços”'),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText('Outros serviços'),
      'nao_informado',
    );
    expect(screen.queryByLabelText(/Detalhe de/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Elevador adaptado'), 'sim');
    expect(
      screen.getByLabelText('Quantidade de “Elevador adaptado”'),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText('Elevador adaptado'),
      'nao_informado',
    );

    await user.selectOptions(
      screen.getByLabelText('Sanitário na recepção'),
      'sim',
    );
    await user.selectOptions(screen.getByLabelText('Sem recepção'), 'nao');
    await user.click(screen.getByRole('button', { name: 'Validar respostas' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Respostas válidas: 2 itens informados. Pré-visualização: nada foi gravado.',
    );
    expect(corpoEnviado(http)).toEqual({
      itens: [
        { itemId: 1, estado: 'nao' },
        { itemId: 2, estado: 'sim' },
      ],
    });
  });

  it('erros do servidor aparecem junto ao item e ao grupo, sem depender de cor', async () => {
    servidor(() =>
      Response.json(
        {
          error: {
            code: 'ENTRADA_INVALIDA',
            message: 'Confira os campos informados.',
            details: [
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
    const { user } = renderApp('/formulario-inventario');
    await screen.findByRole('heading', { name: 'Serviços e equipamentos' });
    await user.selectOptions(screen.getByLabelText('Sem recepção'), 'sim');
    await user.selectOptions(screen.getByLabelText('Outros serviços'), 'sim');
    await user.click(screen.getByRole('button', { name: 'Validar respostas' }));
    const grupo = screen.getByRole('group', { name: /Recepção/ });
    expect(
      await within(grupo).findByText(
        '"Sem recepção" não pode ser combinado com outra opção.',
      ),
    ).toBeInTheDocument();
    expect(
      within(grupo).getByText('Descreva a opção "outro".'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // Corrigir e enviar de novo limpa os erros anteriores.
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Descartar e continuar' }),
    );
    expect(
      screen.queryByText('Descreva a opção "outro".'),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Sem recepção')).toHaveValue(
        'nao_informado',
      ),
    );
  });
});
