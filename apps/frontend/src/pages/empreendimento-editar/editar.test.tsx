import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Perfil } from '@ssc0536/common';
import {
  acessoDoPerfil,
  colecao,
  detalheFicticio,
  HOTEL_A,
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
function servidor(
  perfil: Perfil,
  put: () => Response = () => Response.json({ data: detalheFicticio() }),
) {
  let atual = detalheFicticio();
  return mockHttp((path, init) => {
    if (path === '/sessoes/atual') return sessaoFicticia(perfil);
    if (path === '/acessos/atual')
      return Response.json({
        data: acessoDoPerfil(
          perfil,
          1,
          perfil === 'empresario' ? [HOTEL_A] : [],
        ),
      });
    if (path === '/segmentos') return Response.json({ data: SEGMENTOS });
    if (path === '/empreendimentos/10' && init?.method === 'PUT') {
      const resposta = put();
      if (resposta.ok) {
        const corpo = JSON.parse(String(init.body)) as Record<string, unknown>;
        atual = { ...atual, ...(corpo as object) } as typeof atual;
      }
      return resposta;
    }
    if (path === '/empreendimentos/10') return Response.json({ data: atual });
    return colecao([]);
  });
}
const gestorNoContexto = () =>
  localStorage.setItem(
    'oto:contexto:1',
    JSON.stringify({ id: 10, nome: 'Hotel A', cnpj: '11222333000181' }),
  );
const puts = (http: ReturnType<typeof servidor>) =>
  http.mock.calls.filter(([, init]) => init?.method === 'PUT');

describe('Cadastro: editar empreendimento', () => {
  it('carrega os valores, envia só o necessário com o contexto e volta à ficha atualizada', async () => {
    gestorNoContexto();
    const http = servidor('gestor');
    const { user, router } = renderApp('/editar');
    expect(await screen.findByLabelText(/Nome fantasia/)).toHaveValue(
      'Hotel A',
    );
    expect(screen.getByLabelText('CNPJ')).toHaveValue('11222333000181');
    expect(screen.getByLabelText('Endereço')).toHaveValue('Rua Fictícia, 100');
    expect(screen.getByLabelText('Contato')).toHaveValue(
      'contato@example.test',
    );
    expect(
      screen.getByRole('checkbox', { name: 'Hospedagem fictícia' }),
    ).toBeChecked();
    await user.clear(screen.getByLabelText('Endereço'));
    await user.type(screen.getByLabelText('Endereço'), 'Rua Nova, 5');
    await user.clear(screen.getByLabelText('Razão social'));
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
    expect(
      await screen.findByRole('heading', { name: 'Hotel A', level: 1 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByText('Rua Nova, 5')).toBeInTheDocument();
    const [[, init]] = puts(http);
    expect(init?.headers).toMatchObject({ 'x-identification': '10' });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      nomeFantasia: 'Hotel A',
      cnpj: '11222333000181',
      endereco: 'Rua Nova, 5',
      razaoSocial: null,
      segmentoIds: [900001],
      contatos: [{ id: 1, tipo: 'email', valor: 'contato@example.test' }],
      cadastur: [{ id: 1, situacao: 'nao_possui' }],
    });
  });

  it('limpar um campo opcional envia null e vazio em campo obrigatório não envia', async () => {
    gestorNoContexto();
    const http = servidor('gestor');
    const { user } = renderApp('/editar');
    await user.clear(await screen.findByLabelText(/Nome fantasia/));
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
    expect(
      await screen.findByText('Informe o nome fantasia.'),
    ).toBeInTheDocument();
    expect(puts(http)).toHaveLength(0);
  });

  it('empresário: identificação e situação ficam bloqueadas e não são enviadas', async () => {
    const http = servidor('empresario');
    const { user } = renderApp('/editar');
    expect(await screen.findByLabelText(/Nome fantasia/)).toBeDisabled();
    for (const rotulo of [
      'CNPJ',
      'ID de origem',
      'Tipo de hospedagem',
      'Categoria do indicador',
      'Situação cadastral',
    ])
      expect(screen.getByLabelText(rotulo)).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: 'Hospedagem fictícia' }),
    ).toBeDisabled();
    expect(
      screen.getByText(/só podem ser alterados pela equipe do OTO/),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Endereço'));
    await user.type(screen.getByLabelText('Endereço'), 'Rua do Empresário, 1');
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
    await waitFor(() => expect(puts(http)).toHaveLength(1));
    const corpo = JSON.parse(String(puts(http)[0][1]?.body)) as Record<
      string,
      unknown
    >;
    for (const campo of [
      'nomeFantasia',
      'cnpj',
      'idOrigem',
      'tipoHospedagem',
      'categoriaIndicador',
      'situacao',
      'dataEncerramento',
      'segmentoIds',
    ])
      expect(campo in corpo).toBe(false);
    expect(corpo.endereco).toBe('Rua do Empresário, 1');
  });

  it('403 de campo restrito e erro de rede aparecem sem perder o que foi digitado', async () => {
    gestorNoContexto();
    let n = 0;
    servidor('gestor', () => {
      n++;
      return n === 1
        ? Response.json(
            { error: { code: 'CAMPO_RESTRITO', message: 'x' } },
            { status: 403 },
          )
        : new Response(null, { status: 503 });
    });
    const { user } = renderApp('/editar');
    await user.type(await screen.findByLabelText('Endereço'), ' (novo)');
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
    expect(
      await screen.findByText(/só podem ser alterados pela equipe/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
    expect(
      await screen.findByText(/Não foi possível conectar/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Endereço')).toHaveValue(
      'Rua Fictícia, 100 (novo)',
    );
  });

  it('sem empreendimento contextualizado a edição não existe e volta ao início', async () => {
    servidor('gestor');
    const { router } = renderApp('/editar');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(screen.queryByLabelText(/Nome fantasia/)).not.toBeInTheDocument();
  });
});
