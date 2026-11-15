import type { DefinicaoColecao } from './colecao.types.js';

export function definirColecao<T extends DefinicaoColecao>(definicao: T): T {
  if (typeof definicao.exportacao === 'object') {
    const nomes = new Set<string>();
    for (const coluna of definicao.exportacao.colunas ?? []) {
      if (
        !definicao.esquema.campos.some((c) => c.nome === coluna.campo) ||
        nomes.has(coluna.campo) ||
        !coluna.rotulo.trim()
      )
        throw new Error('Coluna CSV inválida ou duplicada.');
      nomes.add(coluna.campo);
    }
  }
  return definicao;
}
export function caminhoColecao(
  colecao: DefinicaoColecao,
  parametros: Readonly<Record<string, string | number>> = {},
): string {
  return colecao.caminho.replace(
    /:([a-zA-Z][a-zA-Z0-9]*)/g,
    (_, nome: string) => {
      const valor = parametros[nome];
      if (valor === undefined || String(valor) === '')
        throw new Error(`Parâmetro ausente: ${nome}`);
      return encodeURIComponent(String(valor));
    },
  );
}
