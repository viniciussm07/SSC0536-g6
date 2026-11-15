import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { COLECOES, ESQUEMA_CONTATOS } from '@ssc0536/common';
import { renderComContexto } from '@/test/com-contexto';
import { mockHttp } from '@/test/http';
import { ExportarColecao } from '.';

function prepararDownload() {
  const criar = vi
    .fn<(arquivo: Blob) => string>()
    .mockReturnValue('blob:arquivo-csv');
  const revogar = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = criar;
      static revokeObjectURL = revogar;
    },
  );
  const clicar = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  return { criar, revogar, clicar };
}
const csv = () =>
  new Response('\uFEFF"ID";"Valor"\r\n"1";"abc"\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="contatos.csv"',
    },
  });
const props = {
  esquema: ESQUEMA_CONTATOS,
  parametros: { id: 10 },
  contexto: 10,
  consulta: { filter: "tipo eq 'email'", orderby: 'id desc' },
};
describe('Exportação automática da coleção', () => {
  it('a capacidade e a permissão controlam o botão', async () => {
    await renderComContexto(
      <ExportarColecao
        {...props}
        colecao={{ ...COLECOES.contatos, exportacao: false }}
      />,
      'administrador',
    );
    expect(
      screen.queryByRole('button', { name: 'Exportar CSV' }),
    ).not.toBeInTheDocument();
    cleanup();
    await renderComContexto(<ExportarColecao {...props} />, 'empresario');
    expect(
      screen.queryByRole('button', { name: 'Exportar CSV' }),
    ).not.toBeInTheDocument();
  });
  it('transporta os bytes sem gerar CSV, enviando filtros e contexto, e usa o nome do backend', async () => {
    const { criar, revogar, clicar } = prepararDownload();
    const arquivoOriginal = new Blob(['conteúdo recebido']);
    const resposta = csv();
    vi.spyOn(resposta, 'blob').mockResolvedValue(arquivoOriginal);
    const http = mockHttp(() => resposta);
    const { user } = await renderComContexto(
      <ExportarColecao {...props} />,
      'administrador',
    );
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    await waitFor(() => expect(clicar).toHaveBeenCalledTimes(1));
    const [url, init] = http.mock.calls[0];
    const consulta = new URL(String(url)).searchParams;
    expect(consulta.get('$filter')).toBe("tipo eq 'email'");
    expect(consulta.get('$orderby')).toBe('id desc');
    expect(consulta.has('$top')).toBe(false);
    expect(consulta.has('$skip')).toBe(false);
    expect(init?.headers).toEqual({ 'x-identification': '10' });
    expect(init?.credentials).toBe('include');
    expect(clicar.mock.instances[0]).toHaveAttribute(
      'download',
      'contatos.csv',
    );
    expect(criar).toHaveBeenCalledWith(arquivoOriginal);
    await waitFor(
      () => expect(revogar).toHaveBeenCalledWith('blob:arquivo-csv'),
      { timeout: 2000 },
    );
  });
  it('mostra erro do transporte, permite tentar novamente e evita envios duplicados', async () => {
    prepararDownload();
    let resolver!: (r: Response) => void;
    const http = mockHttp(
      () =>
        new Promise<Response>((r) => {
          resolver = r;
        }),
    );
    const { user } = await renderComContexto(
      <ExportarColecao {...props} />,
      'administrador',
    );
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(screen.getByRole('button', { name: 'Exportando…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Exportando…' }));
    expect(http).toHaveBeenCalledTimes(1);
    await act(async () => resolver(new Response(null, { status: 403 })));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para exportar',
    );
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeEnabled();
  });
  it('desmontar cancela a transferência e impede download tardio', async () => {
    const { criar } = prepararDownload();
    let resolver!: (r: Response) => void;
    const http = mockHttp(
      () =>
        new Promise<Response>((r) => {
          resolver = r;
        }),
    );
    const { user } = await renderComContexto(
      <ExportarColecao {...props} />,
      'administrador',
    );
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    const signal = http.mock.calls[0][1]?.signal;
    cleanup();
    expect(signal?.aborted).toBe(true);
    await act(async () => resolver(csv()));
    expect(criar).not.toHaveBeenCalled();
  });
});
