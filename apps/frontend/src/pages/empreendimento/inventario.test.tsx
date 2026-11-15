import { screen, waitFor, within } from '@testing-library/react';
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
import {
  capacidadeFicticia,
  linhaFicticia,
  versaoFicticia,
} from '@/test/inventario';
import { renderApp } from '@/test/render-app';

// Linha do tempo: v3 corrige a v2 (mesma vigência); v1 é a anterior da v2.
const V1 = versaoFicticia({
  id: 1,
  vigenciaInicio: '2026-01-01',
  vigenciaFim: '2026-03-31',
  capacidade: capacidadeFicticia({
    leitos: { estado: 'informado', valor: 20 },
  }),
  itens: [
    {
      itemId: 1,
      itemVersao: 1,
      rotulo: 'Sanitário',
      pergunta: 'Recepção',
      estado: 'sim',
      detalhe: null,
      quantidade: null,
    },
  ],
});
const V2 = versaoFicticia({
  id: 2,
  vigenciaInicio: '2026-04-01',
  substituidaPorId: 3,
  capacidade: capacidadeFicticia({
    leitos: { estado: 'informado', valor: 22 },
  }),
  itens: [
    {
      itemId: 1,
      itemVersao: 2,
      rotulo: 'Sanitário PCD',
      pergunta: 'Recepção',
      estado: 'nao',
      detalhe: null,
      quantidade: null,
    },
  ],
});
const V3 = versaoFicticia({
  id: 3,
  vigenciaInicio: '2026-04-01',
  tipoAlteracao: 'correcao',
  motivo: 'Leitos digitados errado',
  capacidade: capacidadeFicticia({
    leitos: { estado: 'informado', valor: 18 },
    uhsPcd: { estado: 'desconhecido', valor: null },
  }),
  itens: [
    {
      itemId: 1,
      itemVersao: 2,
      rotulo: 'Sanitário PCD',
      pergunta: 'Recepção',
      estado: 'sim',
      detalhe: null,
      quantidade: null,
    },
  ],
});
const LINHAS = [
  linhaFicticia({ id: 3, tipoAlteracao: 'correcao', leitos: 18 }),
  linhaFicticia({ id: 2, substituidaPorId: 3, leitos: 22 }),
  linhaFicticia({
    id: 1,
    vigenciaInicio: '2026-01-01',
    vigenciaFim: '2026-03-31',
    situacaoConferencia: 'completo',
  }),
];

function servidor(perfil: Perfil, vigente = V3) {
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
    if (path === '/empreendimentos/10')
      return Response.json({ data: detalheFicticio() });
    if (path === '/empreendimentos/10/inventarios/vigente')
      return Response.json({ data: vigente });
    const detalhe = /^\/empreendimentos\/10\/inventarios\/(\d)$/.exec(path);
    if (detalhe)
      return Response.json({ data: [V1, V2, V3][Number(detalhe[1]) - 1] });
    if (/\/inventarios\/3\/conferencia$/.test(path) && init?.method === 'PUT')
      return Response.json({
        data: { ...V3, situacaoConferencia: 'completo' },
      });
    if (path.startsWith('/empreendimentos/10/inventarios?'))
      return colecao(LINHAS);
    return colecao([]);
  });
}
const noContexto = () =>
  localStorage.setItem(
    'oto:contexto:1',
    JSON.stringify({ id: 10, nome: 'Hotel A', cnpj: '11222333000181' }),
  );

describe('Inventário na página do empreendimento', () => {
  it('mostra a capacidade vigente preservando estados e a linha do tempo com substituídas', async () => {
    noContexto();
    servidor('gestor');
    renderApp('/');
    const resumo = await screen.findByRole('group', {
      name: 'Capacidade vigente',
    });
    expect(await within(resumo).findByText('18')).toBeInTheDocument();
    // Zero, "Não" e estados são mostrados como o que são.
    expect(within(resumo).getAllByText('Desconhecido').length).toBeGreaterThan(
      0,
    );
    expect(within(resumo).getByText('Não')).toBeInTheDocument();
    expect(
      within(resumo).getByText(/Vigente desde 01\/04\/2026/),
    ).toBeInTheDocument();
    const grade = await screen.findByRole('table', {
      name: 'Versões do inventário',
    });
    expect(
      within(grade).getByText('Substituída pela versão 3'),
    ).toBeInTheDocument();
    expect(within(grade).getAllByRole('row')).toHaveLength(4);
    expect(
      screen.getByRole('link', { name: 'Atualizar inventário' }),
    ).toHaveAttribute('href', '/inventario/nova-versao');
  });

  it('sem versão vigente informa a ausência em vez de mostrar valores', async () => {
    noContexto();
    mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia('gestor');
      if (path === '/acessos/atual')
        return Response.json({ data: acessoDoPerfil('gestor') });
      if (path === '/empreendimentos/10')
        return Response.json({ data: detalheFicticio() });
      if (path === '/empreendimentos/10/inventarios/vigente')
        return Response.json({ data: null });
      return colecao([]);
    });
    renderApp('/');
    expect(
      await screen.findByText('Nenhuma versão vigente hoje.'),
    ).toBeInTheDocument();
  });

  it('detalhe mostra a leitura histórica e as diferenças para a versão anterior', async () => {
    noContexto();
    servidor('gestor');
    const { user } = renderApp('/');
    // A correção (v3) é comparada com a versão que ela corrigiu (v2).
    const botoes = await screen.findAllByRole('button', {
      name: /Ações de versão de 01\/04\/2026/,
    });
    await user.click(botoes[0]);
    await user.click(
      await screen.findByRole('menuitem', { name: 'Ver detalhes' }),
    );
    const dialogo = await screen.findByRole('dialog');
    const diferencas = await within(dialogo).findByRole('region', {
      name: 'Diferenças',
    });
    expect(await within(diferencas).findByText('Leitos:')).toBeInTheDocument();
    expect(diferencas).toHaveTextContent('Leitos: 22 → 18');
    expect(diferencas).toHaveTextContent(
      'UH acessíveis (PCD): Não se aplica → Desconhecido',
    );
    expect(diferencas).toHaveTextContent('Sanitário PCD: Não → Sim');
    // Rótulo da versão do item, não o atual do catálogo.
    expect(
      within(dialogo).getByRole('region', { name: 'Itens da versão' }),
    ).toHaveTextContent('Sanitário PCD: Sim');
    expect(dialogo).toHaveTextContent('Leitos digitados errado');
  });

  it('equipe confere a versão aberta; versão substituída só oferece o detalhe', async () => {
    noContexto();
    const http = servidor('gestor');
    const { user } = renderApp('/');
    const botoes = await screen.findAllByRole('button', {
      name: /Ações de versão de/,
    });
    // Linha 2 (v2) está substituída.
    await user.click(botoes[1]);
    expect(await screen.findAllByRole('menuitem')).toHaveLength(1);
    await user.keyboard('{Escape}');
    await user.click(botoes[0]);
    await user.click(await screen.findByRole('menuitem', { name: 'Conferir' }));
    await user.selectOptions(
      await screen.findByLabelText('Situação da conferência'),
      'completo',
    );
    await user.click(
      screen.getByRole('button', { name: 'Salvar conferência' }),
    );
    await waitFor(() =>
      expect(
        http.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith('/inventarios/3/conferencia') &&
            init?.method === 'PUT',
        ),
      ).toBe(true),
    );
    const put = http.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(JSON.parse(String(put[1]!.body))).toEqual({
      situacaoConferencia: 'completo',
    });
  });

  it('empresário corrige a versão aberta, mas não confere', async () => {
    noContexto();
    servidor('empresario');
    const { user, router } = renderApp('/');
    const botoes = await screen.findAllByRole('button', {
      name: /Ações de versão de/,
    });
    await user.click(botoes[0]);
    expect(
      screen.queryByRole('menuitem', { name: 'Conferir' }),
    ).not.toBeInTheDocument();
    await user.click(await screen.findByRole('menuitem', { name: 'Corrigir' }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/inventario/nova-versao'),
    );
    expect(router.state.location.search).toMatchObject({ corrigir: 3 });
  });
});
