import { describe, expect, it, vi } from 'vitest';
import { autenticacaoService } from './index';
describe('Transporte da autenticação', () => {
  it('propaga cancelamento e rejeita sessão com formato inválido', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { usuario: {} } }));
    vi.stubGlobal('fetch', request);
    const controller = new AbortController();
    await expect(autenticacaoService.atual(controller.signal)).rejects.toThrow(
      'Resposta de sessão inesperada.',
    );
    controller.abort();
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('distingue expiração de indisponibilidade e não trata falha como sessão anônima', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(new Response(null, { status: 503 })),
    );
    await expect(autenticacaoService.atual()).resolves.toBeNull();
    await expect(autenticacaoService.atual()).rejects.toThrow(
      'Não foi possível conectar',
    );
  });
});
