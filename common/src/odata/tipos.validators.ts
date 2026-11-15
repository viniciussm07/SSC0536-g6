import type {
  CampoOData,
  ErroConsulta,
  EsquemaOData,
  LiteralOData,
  NoFiltro,
  OperadorComparacao,
  ReferenciaCampo,
} from './odata.types.js';

const ORDENAVEIS: readonly OperadorComparacao[] = ['gt', 'ge', 'lt', 'le'];

export function buscarCampo(esquema: EsquemaOData, nome: string) {
  return esquema.campos.find((c) => c.nome === nome);
}

function literalCompativel(campo: CampoOData, literal: LiteralOData) {
  switch (campo.tipo) {
    case 'texto':
      return literal.tipo === 'texto';
    case 'enum':
      return (
        literal.tipo === 'texto' &&
        (campo.valores ?? []).includes(literal.valor)
      );
    case 'inteiro':
      return literal.tipo === 'inteiro';
    case 'decimal':
      return literal.tipo === 'inteiro' || literal.tipo === 'decimal';
    case 'booleano':
      return literal.tipo === 'booleano';
    case 'data':
      return literal.tipo === 'data';
    case 'datahora':
      return literal.tipo === 'datahora';
  }
}
const nomeTipo: Record<CampoOData['tipo'], string> = {
  texto: 'texto',
  enum: 'valor do domínio',
  inteiro: 'inteiro',
  decimal: 'número',
  booleano: 'true ou false',
  data: 'data (AAAA-MM-DD)',
  datahora: 'data e hora (ISO 8601 com fuso)',
};

/** Confere campos, operadores e literais do AST contra o esquema do recurso. */
export function validarFiltro(
  no: NoFiltro,
  esquema: EsquemaOData,
): ErroConsulta[] {
  const erros: ErroConsulta[] = [];
  const erro = (position: number, message: string): void => {
    erros.push({ field: '$filter', message, position });
  };

  const operadorPermitido = (
    campo: CampoOData,
    operador: string,
    posicao: number,
  ) => {
    if (campo.operadores && !campo.operadores.includes(operador))
      erro(
        posicao,
        `O operador ${operador} não está disponível para o campo ${campo.nome} (use: ${campo.operadores.join(', ')}).`,
      );
  };
  const campoValido = (ref: ReferenciaCampo, exigirTexto = false) => {
    const campo = buscarCampo(esquema, ref.nome);
    if (!campo) {
      erro(ref.posicao, `Campo desconhecido: ${ref.nome}.`);
      return null;
    }
    if (!campo.filtravel) {
      erro(ref.posicao, `Campo não filtrável: ${ref.nome}.`);
      return null;
    }
    if ((ref.minusculas || exigirTexto) && campo.tipo !== 'texto') {
      erro(
        ref.posicao,
        `${ref.minusculas ? 'tolower' : 'Esta função'} só se aplica a campos de texto: ${ref.nome}.`,
      );
      return null;
    }
    return campo;
  };
  const literal = (campo: CampoOData, valor: LiteralOData, pos: number) => {
    if (valor.tipo === 'nulo') {
      if (!campo.anulavel) erro(pos, `O campo ${campo.nome} não aceita null.`);
      return;
    }
    if (!literalCompativel(campo, valor))
      erro(
        pos,
        campo.tipo === 'enum'
          ? `Valor fora do domínio de ${campo.nome}: ${(campo.valores ?? []).join(', ')}.`
          : `O campo ${campo.nome} espera ${nomeTipo[campo.tipo]}.`,
      );
  };

  const visitar = (n: NoFiltro): void => {
    switch (n.tipo) {
      case 'e':
      case 'ou':
        visitar(n.esquerda);
        visitar(n.direita);
        return;
      case 'nao':
        visitar(n.operando);
        return;
      case 'funcao': {
        const campo = campoValido(n.campo, true);
        if (campo) operadorPermitido(campo, n.funcao, n.campo.posicao);
        return;
      }
      case 'comparacao': {
        const campo = campoValido(n.campo);
        if (!campo) return;
        if (
          n.valor.tipo === 'nulo' &&
          n.operador !== 'eq' &&
          n.operador !== 'ne'
        )
          return erro(n.campo.posicao, 'null só admite eq e ne.');
        if (n.campo.minusculas && ORDENAVEIS.includes(n.operador))
          return erro(
            n.campo.posicao,
            'tolower só admite eq, ne e in; para ordenar texto use o campo sem tolower.',
          );
        operadorPermitido(campo, n.operador, n.campo.posicao);
        if (
          ORDENAVEIS.includes(n.operador) &&
          (campo.tipo === 'booleano' || campo.tipo === 'enum')
        )
          return erro(
            n.campo.posicao,
            `O operador ${n.operador} não se aplica ao campo ${campo.nome}.`,
          );
        literal(campo, n.valor, n.campo.posicao);
        return;
      }
      case 'em': {
        const campo = campoValido(n.campo);
        if (!campo) return;
        if (campo.tipo === 'booleano')
          return erro(n.campo.posicao, 'in não se aplica a campos booleanos.');
        operadorPermitido(campo, 'in', n.campo.posicao);
        for (const valor of n.valores) {
          if (valor.tipo === 'nulo')
            erro(n.campo.posicao, 'Use "eq null" em vez de null dentro de in.');
          else literal(campo, valor, n.campo.posicao);
        }
      }
    }
  };
  visitar(no);
  return erros;
}
