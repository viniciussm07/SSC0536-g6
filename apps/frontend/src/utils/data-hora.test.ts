import { describe, expect, it } from 'vitest';
import {
  deEntradaLocal,
  formatarInstante,
  paraEntradaLocal,
} from './data-hora';

describe('data e hora no fuso operacional', () => {
  it('converte o valor do campo local para UTC e de volta', () => {
    expect(deEntradaLocal('2026-11-30T23:59')).toBe('2026-12-01T02:59:00.000Z');
    expect(paraEntradaLocal('2026-12-01T02:59:00.000Z')).toBe(
      '2026-11-30T23:59',
    );
    expect(paraEntradaLocal('2026-12-01T03:00:00.000Z')).toBe(
      '2026-12-01T00:00',
    );
  });

  it('recusa valores incompletos', () => {
    expect(deEntradaLocal('2026-11-30')).toBeNull();
    expect(deEntradaLocal('')).toBeNull();
    expect(deEntradaLocal('2026-02-30T10:00')).toBeNull();
  });

  it('formata sempre no horário de Brasília', () => {
    expect(formatarInstante('2026-12-01T02:59:00.000Z')).toBe(
      '30/11/2026, 23:59',
    );
  });
});
