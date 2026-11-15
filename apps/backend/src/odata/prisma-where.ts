import type {
  CampoOData,
  EsquemaOData,
  FuncaoTexto,
  LiteralOData,
  NoFiltro,
  OperadorComparacao,
} from '@ssc0536/common';

export type Where = Record<string, unknown>;

/** Operação sobre um campo virtual; o construtor devolve um `where` de lógica de dois valores. */
export type OperacaoVirtual =
  | {
      tipo: 'comparacao';
      operador: OperadorComparacao;
      valor: LiteralOData;
      minusculas: boolean;
    }
  | { tipo: 'em'; valores: LiteralOData[]; minusculas: boolean }
  | {
      tipo: 'funcao';
      funcao: FuncaoTexto;
      valor: string;
      minusculas: boolean;
    };
export interface MapeamentoCampo {
  /** Caminho Prisma até a coluna (`['definicao', 'nome']` para relações 1:1). */
  caminho?: readonly string[];
  /**
   * Campos virtuais: `where` próprio por operação (lógica de dois valores), ou `false`/`true`
   * quando nenhuma/todas as linhas casam.
   */
  construir?: (operacao: OperacaoVirtual) => Where | boolean;
}
/** Todo campo do esquema do `common` precisa de mapeamento (conferido nos testes). */
export type MapeamentoRecurso = Readonly<Record<string, MapeamentoCampo>>;

/**
 * O Prisma não escapa os curingas do LIKE em `contains/startsWith/endsWith`: sem isto, `_`
 * casaria qualquer caractere e `%` qualquer sequência. A barra invertida é o escape padrão.
 */
export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, '\\$&');

const aninhar = (caminho: readonly string[], folha: unknown): Where =>
  caminho.reduceRight<unknown>(
    (interno, chave) => ({ [chave]: interno }),
    folha,
  ) as Where;

function valorPrisma(literal: Exclude<LiteralOData, { tipo: 'nulo' }>) {
  switch (literal.tipo) {
    case 'data':
      return new Date(`${literal.valor}T00:00:00.000Z`);
    case 'datahora':
      return new Date(literal.valor);
    default:
      return literal.valor;
  }
}

const COMPLEMENTO: Record<OperadorComparacao, OperadorComparacao> = {
  eq: 'ne',
  ne: 'eq',
  gt: 'le',
  ge: 'lt',
  lt: 'ge',
  le: 'gt',
};
const OPERADOR_PRISMA: Record<OperadorComparacao, string> = {
  eq: 'equals',
  ne: 'not',
  gt: 'gt',
  ge: 'gte',
  lt: 'lt',
  le: 'lte',
};

/**
 * Converte o AST validado em `where` do Prisma. A negação desce até as folhas (De Morgan, que
 * vale na lógica de três valores) e cada folha negada exclui nulos explicitamente, então
 * `not`, `ne`, `notIn` e funções negadas nunca devolvem linhas com valor nulo, como o SQL.
 * Texto com `tolower` usa `mode: 'insensitive'` só quando o literal já está em minúsculas;
 * com maiúsculas nenhuma linha pode casar, e o resultado é calculado sem consultar o banco.
 */
export function compilarFiltro(
  no: NoFiltro,
  esquema: EsquemaOData,
  mapa: MapeamentoRecurso,
): Where {
  const definicao = (nome: string): [CampoOData, MapeamentoCampo] => {
    const campo = esquema.campos.find((c) => c.nome === nome);
    const mapeamento = mapa[nome];
    if (!campo || !mapeamento)
      throw new Error(
        `Campo sem mapeamento Prisma: ${esquema.recurso}.${nome}`,
      );
    return [campo, mapeamento];
  };
  // Nenhuma linha: `in: []` na chave do recurso. (`OR: []` aninhado em `AND` não é confiável.)
  const FALSO: Where = (() => {
    const chave = mapa[esquema.desempate[0]]?.caminho;
    if (!chave)
      throw new Error(`Recurso sem chave mapeada: ${esquema.recurso}`);
    return aninhar(chave, { in: [] });
  })();
  // Todas as linhas: negação do falso (`{}` aninhado em OR/AND não é confiável).
  const VERDADEIRO: Where = { NOT: FALSO };
  const virtual = (resultado: Where | boolean, negado: boolean): Where => {
    if (typeof resultado === 'boolean')
      return resultado !== negado ? VERDADEIRO : FALSO;
    return negado ? { NOT: resultado } : resultado;
  };
  const naoNulo = (campo: CampoOData, caminho: readonly string[]): Where[] =>
    campo.anulavel ? [aninhar(caminho, { not: null })] : [];
  const e = (partes: Where[]): Where =>
    partes.length === 1 ? partes[0] : { AND: partes };

  const comparacao = (
    n: Extract<NoFiltro, { tipo: 'comparacao' }>,
    negado: boolean,
  ): Where => {
    const [campo, mapeamento] = definicao(n.campo.nome);
    if (mapeamento.construir) {
      return virtual(
        mapeamento.construir({
          tipo: 'comparacao',
          operador: n.operador,
          valor: n.valor,
          minusculas: n.campo.minusculas,
        }),
        negado,
      );
    }
    const caminho = mapeamento.caminho!;
    const operador = negado ? COMPLEMENTO[n.operador] : n.operador;
    if (n.valor.tipo === 'nulo')
      return aninhar(caminho, operador === 'eq' ? null : { not: null });
    const minusculas = n.campo.minusculas;
    const valor = valorPrisma(n.valor);
    if (
      minusculas &&
      typeof valor === 'string' &&
      valor !== valor.toLowerCase()
    )
      // Nenhum texto em minúsculas é igual a um literal com maiúsculas.
      return operador === 'eq'
        ? FALSO
        : e([...naoNulo(campo, caminho), VERDADEIRO]);
    const folha = {
      // `mode: 'insensitive'` vira ILIKE no Prisma, então o valor precisa de escape também aqui.
      [OPERADOR_PRISMA[operador]]:
        minusculas && typeof valor === 'string' ? escaparLike(valor) : valor,
      ...(minusculas ? { mode: 'insensitive' } : {}),
    };
    // `ne` exclui nulos de forma explícita (não depende do comportamento do Prisma).
    return operador === 'ne'
      ? e([...naoNulo(campo, caminho), aninhar(caminho, folha)])
      : aninhar(caminho, folha);
  };

  const em = (n: Extract<NoFiltro, { tipo: 'em' }>, negado: boolean): Where => {
    const [campo, mapeamento] = definicao(n.campo.nome);
    if (mapeamento.construir) {
      return virtual(
        mapeamento.construir({
          tipo: 'em',
          valores: n.valores,
          minusculas: n.campo.minusculas,
        }),
        negado,
      );
    }
    const caminho = mapeamento.caminho!;
    let valores = n.valores
      .filter(
        (l): l is Exclude<LiteralOData, { tipo: 'nulo' }> => l.tipo !== 'nulo',
      )
      .map(valorPrisma);
    if (n.campo.minusculas)
      valores = valores.filter(
        (v) => typeof v !== 'string' || v === v.toLowerCase(),
      );
    if (!valores.length)
      return negado ? e([...naoNulo(campo, caminho), VERDADEIRO]) : FALSO;
    const folha = {
      [negado ? 'notIn' : 'in']: valores,
      ...(n.campo.minusculas ? { mode: 'insensitive' } : {}),
    };
    return negado
      ? e([...naoNulo(campo, caminho), aninhar(caminho, folha)])
      : aninhar(caminho, folha);
  };

  const funcao = (
    n: Extract<NoFiltro, { tipo: 'funcao' }>,
    negado: boolean,
  ): Where => {
    const [campo, mapeamento] = definicao(n.campo.nome);
    if (mapeamento.construir) {
      return virtual(
        mapeamento.construir({
          tipo: 'funcao',
          funcao: n.funcao,
          valor: n.valor,
          minusculas: n.campo.minusculas,
        }),
        negado,
      );
    }
    const caminho = mapeamento.caminho!;
    if (n.campo.minusculas && n.valor !== n.valor.toLowerCase())
      return negado ? e([...naoNulo(campo, caminho), VERDADEIRO]) : FALSO;
    const chave = {
      contains: 'contains',
      startswith: 'startsWith',
      endswith: 'endsWith',
    }[n.funcao];
    const folha = aninhar(caminho, {
      [chave]: escaparLike(n.valor),
      ...(n.campo.minusculas ? { mode: 'insensitive' } : {}),
    });
    return negado ? e([...naoNulo(campo, caminho), { NOT: folha }]) : folha;
  };

  const visitar = (n: NoFiltro, negado: boolean): Where => {
    switch (n.tipo) {
      case 'e':
      case 'ou': {
        const juncao = (n.tipo === 'e') !== negado ? 'AND' : 'OR';
        return {
          [juncao]: [visitar(n.esquerda, negado), visitar(n.direita, negado)],
        };
      }
      case 'nao':
        return visitar(n.operando, !negado);
      case 'comparacao':
        return comparacao(n, negado);
      case 'em':
        return em(n, negado);
      case 'funcao':
        return funcao(n, negado);
    }
  };
  return visitar(no, false);
}
