import type {
  CampoOData,
  ErroConsulta,
  EsquemaOData,
  LiteralOData,
  NoFiltro,
  OrdenacaoOData,
  ResultadoOData,
} from './odata.types.js';
import { dataCivilExiste, lerFiltro } from './filtro.validators.js';
import { buscarCampo, validarFiltro } from './tipos.validators.js';

/** Operadores que a interface de filtro por coluna oferece. */
export type OperadorColuna =
  | 'contem'
  | 'comecaCom'
  | 'terminaCom'
  | 'igual'
  | 'diferente'
  | 'maior'
  | 'maiorOuIgual'
  | 'menor'
  | 'menorOuIgual'
  | 'entre'
  | 'em'
  | 'nulo'
  | 'naoNulo';

/** Condição de uma coluna, com valores como texto de formulário. */
export interface CondicaoColuna {
  campo: string;
  operador: OperadorColuna;
  valor?: string;
  /** Segundo valor de `entre`. */
  valor2?: string;
  /** Valores de `em`. */
  valores?: string[];
}

export function operadoresDoCampo(campo: CampoOData): OperadorColuna[] {
  const nulos: OperadorColuna[] = campo.anulavel ? ['nulo', 'naoNulo'] : [];
  const comparaveis: OperadorColuna[] = [
    'igual',
    'diferente',
    'maior',
    'maiorOuIgual',
    'menor',
    'menorOuIgual',
    'entre',
  ];
  const candidatos = (() => {
    switch (campo.tipo) {
      case 'texto':
        return campo.virtual
          ? ['contem', 'igual']
          : [
              'contem',
              'comecaCom',
              'terminaCom',
              'igual',
              'diferente',
              ...nulos,
            ];
      case 'enum':
        return ['igual', 'diferente', 'em', ...nulos];
      case 'booleano':
        return ['igual', 'diferente'];
      default:
        return [...comparaveis, ...nulos];
    }
  })() as OperadorColuna[];
  if (!campo.operadores) return candidatos;
  const odataPorOperador: Record<OperadorColuna, readonly string[]> = {
    contem: ['contains'],
    comecaCom: ['startswith'],
    terminaCom: ['endswith'],
    igual: ['eq'],
    diferente: ['ne'],
    maior: ['gt'],
    maiorOuIgual: ['ge'],
    menor: ['lt'],
    menorOuIgual: ['le'],
    entre: ['ge', 'le'],
    em: ['in'],
    nulo: ['eq'],
    naoNulo: ['ne'],
  };
  return candidatos.filter((operador) =>
    odataPorOperador[operador].every((o) => campo.operadores?.includes(o)),
  );
}

const aspas = (texto: string) => `'${texto.replace(/'/g, "''")}'`;
const RE_DATAHORA =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function literalDoFormulario(
  campo: CampoOData,
  bruto: string | undefined,
): string | null {
  const v = (bruto ?? '').trim();
  if (v === '') return null;
  switch (campo.tipo) {
    case 'texto':
      return aspas(v);
    case 'enum':
      return (campo.valores ?? []).includes(v) ? aspas(v) : null;
    case 'inteiro':
      return /^-?\d+$/.test(v) ? v : null;
    case 'decimal': {
      const n = v.replace(',', '.');
      return /^-?\d+(\.\d+)?$/.test(n) ? n : null;
    }
    case 'booleano':
      return v === 'true' || v === 'false' ? v : null;
    case 'data':
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && dataCivilExiste(v) ? v : null;
    case 'datahora':
      if (/^\d{4}-\d{2}-\d{2}$/.test(v) && dataCivilExiste(v))
        return `${v}T00:00:00Z`;
      return RE_DATAHORA.test(v) ? v : null;
  }
}

function expressao(
  esquema: EsquemaOData,
  c: CondicaoColuna,
): string | ErroConsulta {
  const campo = buscarCampo(esquema, c.campo);
  const erro = (message: string): ErroConsulta => ({ field: c.campo, message });
  if (!campo || !campo.filtravel)
    return erro(`Campo não filtrável: ${c.campo}.`);
  if (!operadoresDoCampo(campo).includes(c.operador))
    return erro(`Operador não disponível para ${c.campo}.`);
  // Texto: comparações sem diferenciar maiúsculas (o servidor é sensível por padrão).
  const ref = campo.tipo === 'texto' ? `tolower(${campo.nome})` : campo.nome;
  const valorDe = (bruto: string | undefined) => {
    const texto = campo.tipo === 'texto' ? (bruto ?? '').toLowerCase() : bruto;
    return literalDoFormulario(campo, texto);
  };
  if (c.operador === 'nulo') return `${campo.nome} eq null`;
  if (c.operador === 'naoNulo') return `${campo.nome} ne null`;
  if (c.operador === 'em') {
    const itens = (c.valores ?? []).map((v) => valorDe(v));
    if (!itens.length || itens.some((i) => i === null))
      return erro('Informe valores válidos.');
    return `${ref} in (${itens.join(',')})`;
  }
  const primeiro = valorDe(c.valor);
  if (primeiro === null) return erro('Informe um valor válido.');
  switch (c.operador) {
    case 'contem':
      return `contains(${ref},${primeiro})`;
    case 'comecaCom':
      return `startswith(${ref},${primeiro})`;
    case 'terminaCom':
      return `endswith(${ref},${primeiro})`;
    case 'igual':
      return `${ref} eq ${primeiro}`;
    case 'diferente':
      return `${ref} ne ${primeiro}`;
    case 'maior':
      return `${ref} gt ${primeiro}`;
    case 'maiorOuIgual':
      return `${ref} ge ${primeiro}`;
    case 'menor':
      return `${ref} lt ${primeiro}`;
    case 'menorOuIgual':
      return `${ref} le ${primeiro}`;
    case 'entre': {
      const segundo = valorDe(c.valor2);
      if (segundo === null) return erro('Informe o segundo valor.');
      return `(${ref} ge ${primeiro} and ${ref} le ${segundo})`;
    }
  }
}

/**
 * Monta o texto de `$filter` (condições ligadas por `and`) e o confere com o próprio parser e
 * com o esquema; o que sai daqui sempre é aceito pelo servidor. Sem condições devolve "".
 */
export function montarFiltro(
  condicoes: readonly CondicaoColuna[],
  esquema: EsquemaOData,
): ResultadoOData<string> {
  const partes: string[] = [];
  const erros: ErroConsulta[] = [];
  for (const c of condicoes) {
    const e = expressao(esquema, c);
    if (typeof e === 'string') partes.push(e);
    else erros.push(e);
  }
  if (erros.length) return { valido: false, erros };
  const texto = partes.join(' and ');
  if (texto) {
    const lido = lerFiltro(texto);
    const problemas = lido.valido
      ? validarFiltro(lido.data, esquema)
      : lido.erros;
    if (problemas.length) return { valido: false, erros: problemas };
  }
  return { valido: true, data: texto };
}

export function montarOrdenacao(ordenacao: readonly OrdenacaoOData[]): string {
  return ordenacao.map((o) => `${o.campo} ${o.direcao}`).join(', ');
}

function textoDoLiteral(literal: LiteralOData): string | null {
  switch (literal.tipo) {
    case 'nulo':
      return null;
    case 'booleano':
      return String(literal.valor);
    default:
      return String(literal.valor);
  }
}

/**
 * Inverso de `montarFiltro` para o que a interface sabe editar: uma conjunção de condições por
 * coluna. Devolve `null` quando a expressão tem `or`, `not` ou formato fora desse modelo (a
 * interface mostra "filtro personalizado" e não tenta editá-lo). `entre` volta como duas
 * condições (maior ou igual e menor ou igual).
 */
export function condicoesDoFiltro(
  no: NoFiltro | null,
): CondicaoColuna[] | null {
  if (no === null) return [];
  const folhas: NoFiltro[] = [];
  const achatar = (n: NoFiltro): boolean => {
    if (n.tipo === 'e') return achatar(n.esquerda) && achatar(n.direita);
    if (n.tipo === 'ou' || n.tipo === 'nao') return false;
    folhas.push(n);
    return true;
  };
  if (!achatar(no)) return null;
  const condicoes: CondicaoColuna[] = [];
  for (const n of folhas) {
    if (n.tipo === 'funcao')
      condicoes.push({
        campo: n.campo.nome,
        operador:
          n.funcao === 'contains'
            ? 'contem'
            : n.funcao === 'startswith'
              ? 'comecaCom'
              : 'terminaCom',
        valor: n.valor,
      });
    else if (n.tipo === 'em') {
      const valores = n.valores.map(textoDoLiteral);
      if (valores.some((v) => v === null)) return null;
      condicoes.push({
        campo: n.campo.nome,
        operador: 'em',
        valores: valores as string[],
      });
    } else if (n.tipo === 'comparacao') {
      if (n.valor.tipo === 'nulo') {
        condicoes.push({
          campo: n.campo.nome,
          operador: n.operador === 'eq' ? 'nulo' : 'naoNulo',
        });
        continue;
      }
      const operador = {
        eq: 'igual',
        ne: 'diferente',
        gt: 'maior',
        ge: 'maiorOuIgual',
        lt: 'menor',
        le: 'menorOuIgual',
      }[n.operador] as OperadorColuna;
      condicoes.push({
        campo: n.campo.nome,
        operador,
        valor: textoDoLiteral(n.valor) ?? '',
      });
    }
  }
  return condicoes;
}
