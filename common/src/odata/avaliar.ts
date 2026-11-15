import type { LiteralOData, NoFiltro } from './odata.types.js';

type Tri = boolean | null;
export type LeituraCampo = (
  nome: string,
  linha: Readonly<Record<string, unknown>>,
) => unknown;

const padrao: LeituraCampo = (nome, linha) => linha[nome];

function partesDecimal(texto: string) {
  const negativo = texto.startsWith('-');
  const [inteira, fracao = ''] = texto.replace(/^[-+]/, '').split('.');
  return {
    negativo,
    inteira: inteira.replace(/^0+(?=\d)/, ''),
    fracao: fracao.replace(/0+$/, ''),
  };
}
/** Comparação exata de decimais em texto (sem ponto flutuante). */
export function compararDecimais(a: string, b: string): number {
  const x = partesDecimal(a);
  const y = partesDecimal(b);
  const zero = (p: typeof x) => p.inteira === '0' && p.fracao === '';
  const sinal = (p: typeof x) => (zero(p) ? 0 : p.negativo ? -1 : 1);
  if (sinal(x) !== sinal(y)) return sinal(x) < sinal(y) ? -1 : 1;
  if (sinal(x) === 0) return 0;
  let c =
    x.inteira.length !== y.inteira.length
      ? x.inteira.length < y.inteira.length
        ? -1
        : 1
      : x.inteira === y.inteira
        ? 0
        : x.inteira < y.inteira
          ? -1
          : 1;
  if (c === 0) {
    const tamanho = Math.max(x.fracao.length, y.fracao.length);
    const fa = x.fracao.padEnd(tamanho, '0');
    const fb = y.fracao.padEnd(tamanho, '0');
    c = fa === fb ? 0 : fa < fb ? -1 : 1;
  }
  return x.negativo ? -c : c;
}

/** -1, 0, 1 ou null quando o valor é nulo/incomparável (lógica de três valores como no SQL). */
function comparar(
  valor: unknown,
  literal: Exclude<LiteralOData, { tipo: 'nulo' }>,
  minusculas: boolean,
): number | null {
  if (valor === null || valor === undefined) return null;
  switch (literal.tipo) {
    case 'texto': {
      const texto = minusculas ? String(valor).toLowerCase() : String(valor);
      return texto === literal.valor ? 0 : texto < literal.valor ? -1 : 1;
    }
    case 'inteiro':
    case 'decimal':
      return compararDecimais(String(valor), String(literal.valor));
    case 'booleano':
      return valor === literal.valor ? 0 : valor ? 1 : -1;
    case 'data': {
      const v = String(valor).slice(0, 10);
      return v === literal.valor ? 0 : v < literal.valor ? -1 : 1;
    }
    case 'datahora': {
      const v =
        valor instanceof Date ? valor.getTime() : Date.parse(String(valor));
      const l = Date.parse(literal.valor);
      return v === l ? 0 : v < l ? -1 : 1;
    }
  }
}

const e3 = (a: Tri, b: Tri): Tri =>
  a === false || b === false ? false : a === null || b === null ? null : true;
const ou3 = (a: Tri, b: Tri): Tri =>
  a === true || b === true ? true : a === null || b === null ? null : false;

/**
 * Avalia o filtro em memória com a mesma semântica do servidor (nulos eliminam a linha em
 * `ne`, `gt`, funções e `in`). Valores em lista (como `pendencias`) comparam por existência.
 * Serve de oráculo para testes e para listas já carregadas.
 */
export function avaliarFiltro(
  no: NoFiltro,
  linha: Readonly<Record<string, unknown>>,
  leitura: LeituraCampo = padrao,
): boolean {
  const avaliar = (n: NoFiltro): Tri => {
    switch (n.tipo) {
      case 'e':
        return e3(avaliar(n.esquerda), avaliar(n.direita));
      case 'ou':
        return ou3(avaliar(n.esquerda), avaliar(n.direita));
      case 'nao': {
        const r = avaliar(n.operando);
        return r === null ? null : !r;
      }
      case 'comparacao': {
        const valor = leitura(n.campo.nome, linha);
        if (n.valor.tipo === 'nulo') {
          const nulo = valor === null || valor === undefined;
          return n.operador === 'eq' ? nulo : !nulo;
        }
        if (Array.isArray(valor)) {
          const algum = valor.some(
            (v) => comparar(v, n.valor as never, n.campo.minusculas) === 0,
          );
          return n.operador === 'eq'
            ? algum
            : n.operador === 'ne'
              ? !algum
              : null;
        }
        const c = comparar(valor, n.valor, n.campo.minusculas);
        if (c === null) return null;
        switch (n.operador) {
          case 'eq':
            return c === 0;
          case 'ne':
            return c !== 0;
          case 'gt':
            return c > 0;
          case 'ge':
            return c >= 0;
          case 'lt':
            return c < 0;
          case 'le':
            return c <= 0;
        }
        return null;
      }
      case 'em': {
        const valor = leitura(n.campo.nome, linha);
        if (valor === null || valor === undefined) return null;
        const itens = Array.isArray(valor) ? valor : [valor];
        return itens.some((v) =>
          n.valores.some(
            (l) =>
              l.tipo !== 'nulo' && comparar(v, l, n.campo.minusculas) === 0,
          ),
        );
      }
      case 'funcao': {
        const valor = leitura(n.campo.nome, linha);
        if (valor === null || valor === undefined) return null;
        const texto = n.campo.minusculas
          ? String(valor).toLowerCase()
          : String(valor);
        return n.funcao === 'contains'
          ? texto.includes(n.valor)
          : n.funcao === 'startswith'
            ? texto.startsWith(n.valor)
            : texto.endsWith(n.valor);
      }
    }
  };
  return avaliar(no) === true;
}
