import { AsyncLocalStorage } from 'node:async_hooks';
import type { ColunaCsv, EsquemaOData } from '@ssc0536/common';

/** Escopo por requisição, nunca compartilhado entre exportações concorrentes. */
export const exportacaoAtual = new AsyncLocalStorage<{
  escrever: (linhas: readonly unknown[]) => Promise<void>;
  signal: AbortSignal;
}>();

export function celulaCsv(valor: unknown, numerico = false): string {
  if (valor === null || valor === undefined) return '';
  let texto =
    typeof valor === 'boolean' ? (valor ? 'Sim' : 'Não') : String(valor);
  // Ignora espaços/controles antes do primeiro caractere interpretável pela planilha.
  const inicio = [...texto].find((c) => c.charCodeAt(0) > 32 && !/\s/u.test(c));
  if (
    typeof valor === 'string' &&
    !numerico &&
    inicio &&
    '=+@-'.includes(inicio)
  )
    texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
}
export function linhaCsv(
  linha: unknown,
  colunas: readonly ColunaCsv[],
  esquema?: EsquemaOData,
): string {
  if (typeof linha !== 'object' || linha === null)
    throw new Error('Projeção CSV inválida.');
  const valores = linha as Record<string, unknown>;
  return (
    colunas
      .map((c) => {
        const tipo = esquema?.campos.find((f) => f.nome === c.campo)?.tipo;
        return celulaCsv(
          valores[c.campo],
          (tipo === 'decimal' || tipo === 'inteiro') &&
            /^-?\d+(?:\.\d+)?$/.test(String(valores[c.campo])),
        );
      })
      .join(';') + '\r\n'
  );
}
