import {
  FUNCOES_TEXTO,
  ODATA_LIMITES,
  OPERADORES_COMPARACAO,
} from './odata.constants.js';
import type {
  ErroConsulta,
  FuncaoTexto,
  LiteralOData,
  NoFiltro,
  OperadorComparacao,
  ReferenciaCampo,
  ResultadoOData,
} from './odata.types.js';

type Token =
  | { tipo: 'ident'; valor: string; pos: number }
  | { tipo: 'texto'; valor: string; pos: number }
  | { tipo: 'numero'; valor: string; pos: number }
  | { tipo: 'data'; valor: string; pos: number }
  | { tipo: 'datahora'; valor: string; pos: number }
  | { tipo: 'abre' | 'fecha' | 'virgula' | 'fim'; valor: string; pos: number };

/** Erro controlado de sintaxe; nunca vaza da API pública. */
class ErroSintaxe extends Error {
  constructor(
    message: string,
    readonly posicao: number,
  ) {
    super(message);
  }
}

const RE_DATAHORA =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})/;
const RE_DATA = /^\d{4}-\d{2}-\d{2}/;
const RE_NUMERO = /^-?\d+(?:\.\d+)?/;
const RE_IDENT = /^[A-Za-z_][A-Za-z0-9_]*/;

/** Data civil existente no calendário (AAAA-MM-DD). */
export function dataCivilExiste(valor: string): boolean {
  const [a, m, d] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  return (
    a >= 1 &&
    data.getUTCFullYear() === a &&
    data.getUTCMonth() === m - 1 &&
    data.getUTCDate() === d
  );
}

function tokenizar(texto: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < texto.length) {
    const c = texto[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (c === '(' || c === ')' || c === ',') {
      tokens.push({
        tipo: c === '(' ? 'abre' : c === ')' ? 'fecha' : 'virgula',
        valor: c,
        pos: i,
      });
      i++;
      continue;
    }
    if (c === "'") {
      let valor = '';
      let j = i + 1;
      for (;;) {
        if (j >= texto.length)
          throw new ErroSintaxe('Texto sem aspa de fechamento.', i);
        if (texto[j] === "'") {
          if (texto[j + 1] === "'") {
            valor += "'";
            j += 2;
            continue;
          }
          break;
        }
        valor += texto[j];
        j++;
      }
      tokens.push({ tipo: 'texto', valor, pos: i });
      i = j + 1;
      continue;
    }
    const resto = texto.slice(i, i + 40);
    if (/[0-9-]/.test(c)) {
      const datahora = RE_DATAHORA.exec(resto);
      const data = RE_DATA.exec(resto);
      const numero = RE_NUMERO.exec(resto);
      let token: Token | null = null;
      if (datahora) token = { tipo: 'datahora', valor: datahora[0], pos: i };
      else if (data && !/^\d{4}-\d{2}-\d{2}[T\d]/.test(resto))
        token = { tipo: 'data', valor: data[0], pos: i };
      else if (data) throw new ErroSintaxe('Data e hora inválidas.', i);
      else if (numero) token = { tipo: 'numero', valor: numero[0], pos: i };
      if (!token) throw new ErroSintaxe('Caractere inesperado.', i);
      const fim = i + token.valor.length;
      if (/[A-Za-z0-9_.]/.test(texto[fim] ?? ''))
        throw new ErroSintaxe('Valor mal formado.', i);
      tokens.push(token);
      i = fim;
      continue;
    }
    const ident = RE_IDENT.exec(texto.slice(i));
    if (ident) {
      tokens.push({ tipo: 'ident', valor: ident[0], pos: i });
      i += ident[0].length;
      continue;
    }
    throw new ErroSintaxe(`Caractere inesperado: ${c}`, i);
  }
  tokens.push({ tipo: 'fim', valor: '', pos: texto.length });
  return tokens;
}

class Analisador {
  private i = 0;
  private nos = 0;
  private profundidade = 0;
  constructor(private readonly tokens: Token[]) {}

  private atual() {
    return this.tokens[this.i];
  }
  private avancar() {
    return this.tokens[this.i++];
  }
  private no<T extends NoFiltro>(no: T, pos: number): T {
    if (++this.nos > ODATA_LIMITES.nos)
      throw new ErroSintaxe('Expressão complexa demais.', pos);
    return no;
  }
  private entrar(pos: number) {
    if (++this.profundidade > ODATA_LIMITES.profundidade)
      throw new ErroSintaxe('Expressão aninhada demais.', pos);
  }
  private ehPalavra(palavra: string) {
    const t = this.atual();
    return t.tipo === 'ident' && t.valor === palavra;
  }
  private esperar(tipo: Token['tipo'], descricao: string) {
    const t = this.atual();
    if (t.tipo !== tipo) throw new ErroSintaxe(`Esperado ${descricao}.`, t.pos);
    return this.avancar();
  }

  analisar(): NoFiltro {
    const no = this.ou();
    if (this.atual().tipo !== 'fim')
      throw new ErroSintaxe('Esperado o fim da expressão.', this.atual().pos);
    return no;
  }
  private ou(): NoFiltro {
    let no = this.e();
    while (this.ehPalavra('or')) {
      const pos = this.avancar().pos;
      no = this.no({ tipo: 'ou', esquerda: no, direita: this.e() }, pos);
    }
    return no;
  }
  private e(): NoFiltro {
    let no = this.nao();
    while (this.ehPalavra('and')) {
      const pos = this.avancar().pos;
      no = this.no({ tipo: 'e', esquerda: no, direita: this.nao() }, pos);
    }
    return no;
  }
  private nao(): NoFiltro {
    if (this.ehPalavra('not')) {
      const pos = this.avancar().pos;
      this.entrar(pos);
      const operando = this.nao();
      this.profundidade--;
      return this.no({ tipo: 'nao', operando }, pos);
    }
    return this.primario();
  }
  private primario(): NoFiltro {
    const t = this.atual();
    if (t.tipo === 'abre') {
      this.avancar();
      this.entrar(t.pos);
      const no = this.ou();
      this.esperar('fecha', "')'");
      this.profundidade--;
      return no;
    }
    if (t.tipo !== 'ident')
      throw new ErroSintaxe('Esperado um campo ou uma função.', t.pos);
    const seguinte = this.tokens[this.i + 1];
    if (
      (FUNCOES_TEXTO as readonly string[]).includes(t.valor) &&
      seguinte.tipo === 'abre'
    )
      return this.funcao();
    const campo = this.campo();
    const operador = this.atual();
    if (operador.tipo !== 'ident')
      throw new ErroSintaxe(
        'Esperado um operador de comparação.',
        operador.pos,
      );
    if (operador.valor === 'in') {
      this.avancar();
      this.esperar('abre', "'('");
      const valores: LiteralOData[] = [this.literal()];
      while (this.atual().tipo === 'virgula') {
        this.avancar();
        valores.push(this.literal());
        if (valores.length > ODATA_LIMITES.itensEm)
          throw new ErroSintaxe(
            `Use até ${ODATA_LIMITES.itensEm} valores em "in".`,
            this.atual().pos,
          );
      }
      this.esperar('fecha', "')'");
      return this.no({ tipo: 'em', campo, valores }, campo.posicao);
    }
    if (!(OPERADORES_COMPARACAO as readonly string[]).includes(operador.valor))
      throw new ErroSintaxe(
        `Operador desconhecido: ${operador.valor}.`,
        operador.pos,
      );
    this.avancar();
    return this.no(
      {
        tipo: 'comparacao',
        operador: operador.valor as OperadorComparacao,
        campo,
        valor: this.literal(),
      },
      campo.posicao,
    );
  }
  private funcao(): NoFiltro {
    const nome = this.avancar();
    this.esperar('abre', "'('");
    const campo = this.campo();
    this.esperar('virgula', "','");
    const valor = this.esperar('texto', 'um texto entre aspas simples');
    this.esperar('fecha', "')'");
    return this.no(
      {
        tipo: 'funcao',
        funcao: nome.valor as FuncaoTexto,
        campo,
        valor: valor.valor,
      },
      nome.pos,
    );
  }
  private campo(): ReferenciaCampo {
    const t = this.esperar('ident', 'o nome de um campo');
    if (t.valor === 'tolower' && this.atual().tipo === 'abre') {
      this.avancar();
      const interno = this.esperar('ident', 'o nome de um campo');
      this.esperar('fecha', "')'");
      return { nome: interno.valor, minusculas: true, posicao: t.pos };
    }
    return { nome: t.valor, minusculas: false, posicao: t.pos };
  }
  private literal(): LiteralOData {
    const t = this.avancar();
    switch (t.tipo) {
      case 'texto':
        return { tipo: 'texto', valor: t.valor };
      case 'data':
        if (!dataCivilExiste(t.valor))
          throw new ErroSintaxe('Data inexistente.', t.pos);
        return { tipo: 'data', valor: t.valor };
      case 'datahora':
        if (!dataCivilExiste(t.valor.slice(0, 10)))
          throw new ErroSintaxe('Data inexistente.', t.pos);
        if (Number.isNaN(Date.parse(t.valor)))
          throw new ErroSintaxe('Data e hora inválidas.', t.pos);
        return { tipo: 'datahora', valor: t.valor };
      case 'numero':
        if (t.valor.includes('.')) return { tipo: 'decimal', valor: t.valor };
        // Inteiro além da faixa segura segue como decimal em texto (sem perda); campos
        // inteiros o recusam na checagem de tipos.
        if (!Number.isSafeInteger(Number(t.valor)))
          return { tipo: 'decimal', valor: t.valor };
        return { tipo: 'inteiro', valor: Number(t.valor) };
      case 'ident':
        if (t.valor === 'true') return { tipo: 'booleano', valor: true };
        if (t.valor === 'false') return { tipo: 'booleano', valor: false };
        if (t.valor === 'null') return { tipo: 'nulo' };
        throw new ErroSintaxe(`Valor inesperado: ${t.valor}.`, t.pos);
      default:
        throw new ErroSintaxe('Esperado um valor.', t.pos);
    }
  }
}

/** Interpreta `$filter`. Nunca lança: devolve o AST ou erros com posição. */
export function lerFiltro(texto: string): ResultadoOData<NoFiltro> {
  const erro = (
    message: string,
    position?: number,
  ): ResultadoOData<NoFiltro> => ({
    valido: false,
    erros: [
      {
        field: '$filter',
        message,
        ...(position === undefined ? {} : { position }),
      } satisfies ErroConsulta,
    ],
  });
  if (typeof texto !== 'string') return erro('O filtro deve ser um texto.');
  if (texto.length > ODATA_LIMITES.filtroCaracteres)
    return erro(
      `Use até ${ODATA_LIMITES.filtroCaracteres} caracteres no filtro.`,
    );
  try {
    return { valido: true, data: new Analisador(tokenizar(texto)).analisar() };
  } catch (e) {
    if (e instanceof ErroSintaxe) return erro(e.message, e.posicao);
    return erro('Filtro inválido.');
  }
}
