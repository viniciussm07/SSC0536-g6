import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { acessoDoPerfil, colecao, mockHttp, sessaoFicticia } from '@/test/http';
import { renderApp } from '@/test/render-app';

describe('Página de indicadores', () => {
  it('visualizador só consulta indicadores; falha permite repetir e resultado vazio não oferece exportação', async () => {
    let falhar = true;
    mockHttp((path) => {
      if (path === '/sessoes/atual') return sessaoFicticia('visualizador');
      if (path === '/acessos/atual')
        return Response.json({ data: acessoDoPerfil('visualizador') });
      if (falhar) return new Response(null, { status: 503 });
      return colecao([]);
    });
    const { user } = renderApp('/indicadores');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar',
    );
    falhar = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByText(
        'Nenhum indicador encontrado para seu perfil e filtros.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Empreendimentos' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Exportar/ }),
    ).not.toBeInTheDocument();
  });
});
