import { describe, expect, it } from 'vitest';
import { formatarCnpj, rotuloIdentificacao } from './documento';

describe('CNPJ para exibição', () => {
  it('formata 14 dígitos, com ou sem máscara prévia', () => {
    expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatarCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });
  it('mantém como cadastrado o que não tem 14 dígitos', () => {
    expect(formatarCnpj('123')).toBe('123');
    expect(formatarCnpj('abc')).toBe('abc');
  });
  it('sem CNPJ (nulo, ausente ou vazio) usa o ID do sistema como identificação', () => {
    for (const vazio of [null, undefined, '', '  '])
      expect(rotuloIdentificacao(vazio, 900002)).toBe('ID 900002');
  });
  it('com CNPJ mostra o CNPJ formatado, não o ID', () => {
    expect(rotuloIdentificacao('11222333000181', 7)).toBe(
      'CNPJ 11.222.333/0001-81',
    );
  });
});
