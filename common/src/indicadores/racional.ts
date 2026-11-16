/**
 * Aritmética racional exata (BigInt) usada apenas dentro do domínio de indicadores.
 * Nenhum valor intermediário passa por ponto flutuante nem é arredondado.
 */
export interface Racional {
  n: bigint;
  d: bigint;
}

function mdc(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

function racional(n: bigint, d: bigint): Racional {
  const sinal = d < 0n ? -1n : 1n;
  const divisor = mdc(n, d) || 1n;
  return { n: (sinal * n) / divisor, d: (sinal * d) / divisor };
}

export const ZERO: Racional = { n: 0n, d: 1n };
export const CEM: Racional = { n: 100n, d: 1n };

/** Decimal não negativo como texto com ponto (`"57.5"`); números JS são recusados. */
export function lerDecimal(valor: unknown): Racional | undefined {
  if (typeof valor !== 'string' || !/^\d{1,35}(?:\.\d{1,30})?$/.test(valor)) {
    return undefined;
  }
  const [inteiro, fracao = ''] = valor.split('.');
  return racional(BigInt(inteiro + fracao), 10n ** BigInt(fracao.length));
}

/** Quantidade inteira não negativa e segura (contagens de UH, leitos, dias). */
export function lerInteiro(valor: unknown): Racional | undefined {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0
    ? { n: BigInt(valor), d: 1n }
    : undefined;
}

export const somar = (a: Racional, b: Racional): Racional =>
  racional(a.n * b.d + b.n * a.d, a.d * b.d);

export const subtrair = (a: Racional, b: Racional): Racional =>
  racional(a.n * b.d - b.n * a.d, a.d * b.d);

export const multiplicar = (a: Racional, b: Racional): Racional =>
  racional(a.n * b.n, a.d * b.d);

/** O chamador garante divisor diferente de zero (base zero vira indisponibilidade). */
export const dividir = (a: Racional, b: Racional): Racional =>
  racional(a.n * b.d, a.d * b.n);

export const ehZero = (a: Racional): boolean => a.n === 0n;
export const ehNegativo = (a: Racional): boolean => a.n < 0n;
export const comparar = (a: Racional, b: Racional): number => {
  const diferenca = a.n * b.d - b.n * a.d;
  return diferenca < 0n ? -1 : diferenca > 0n ? 1 : 0;
};

/**
 * Serializa com `casas` decimais, meio para cima (afastando de zero), sem zeros finais.
 * É o único ponto de arredondamento do domínio.
 */
export function formatar(valor: Racional, casas: number): string {
  const negativo = valor.n < 0n;
  const escala = 10n ** BigInt(casas);
  const absoluto = negativo ? -valor.n : valor.n;
  const escalado = (absoluto * escala * 2n + valor.d) / (valor.d * 2n);
  const inteiro = escalado / escala;
  const fracao = (escalado % escala)
    .toString()
    .padStart(casas, '0')
    .replace(/0+$/, '');
  const texto = fracao ? `${inteiro}.${fracao}` : `${inteiro}`;
  return negativo && escalado !== 0n ? `-${texto}` : texto;
}
