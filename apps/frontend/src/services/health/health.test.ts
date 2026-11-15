import { describe, expect, it, vi } from 'vitest';
import { healthService } from './index';

describe('Cliente HTTP de saúde', () => {
  it('rejeita conteúdo incompatível em vez de apresentar conexão válida', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ status: 'ok' })),
    );
    await expect(healthService.get()).rejects.toThrow(
      'A API retornou uma resposta inesperada.',
    );
  });

  it('propaga o cancelamento da query para o transporte HTTP', async () => {
    const request = vi.fn().mockResolvedValue(
      Response.json({
        status: 'ok',
        database: 'connected',
        timestamp: '2026-11-15T12:00:00Z',
      }),
    );
    vi.stubGlobal('fetch', request);
    const controller = new AbortController();
    await healthService.get(controller.signal);
    const signal = request.mock.calls[0][1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });
});
