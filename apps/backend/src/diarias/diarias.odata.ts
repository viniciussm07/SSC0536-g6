import type { LiteralOData } from '@ssc0536/common';
import type {
  MapeamentoRecurso,
  OperacaoVirtual,
  Where,
} from '../odata/prisma-where';

/**
 * `conferidoPor` é uma relação opcional: o caminho aninhado sozinho não representa a
 * ausência da relação. O construtor usa `is` para texto e `null` para a relação vazia.
 */
const filtroConferidoPor = (operacao: OperacaoVirtual): Where | boolean => {
  if (operacao.tipo === 'comparacao' && operacao.valor.tipo === 'nulo')
    return operacao.operador === 'eq'
      ? { conferidoPor: null }
      : { NOT: { conferidoPor: null } };
  if (operacao.tipo === 'em') {
    const valores = operacao.valores
      .filter(
        (valor): valor is Extract<LiteralOData, { tipo: 'texto' }> =>
          valor.tipo === 'texto',
      )
      .map((valor) => valor.valor);
    if (!valores.length) return false;
    return {
      conferidoPor: {
        is: {
          nome: {
            in: valores,
            ...(operacao.minusculas ? { mode: 'insensitive' as const } : {}),
          },
        },
      },
    };
  }
  if (operacao.tipo === 'funcao') {
    const chave = {
      contains: 'contains',
      startswith: 'startsWith',
      endswith: 'endsWith',
    }[operacao.funcao];
    return {
      conferidoPor: {
        is: {
          nome: {
            [chave]: operacao.valor,
            ...(operacao.minusculas ? { mode: 'insensitive' as const } : {}),
          },
        },
      },
    };
  }
  if (operacao.tipo !== 'comparacao' || operacao.valor.tipo !== 'texto')
    return false;
  const operador = {
    eq: 'equals',
    ne: 'not',
    gt: 'gt',
    ge: 'gte',
    lt: 'lt',
    le: 'lte',
  }[operacao.operador];
  const onde = {
    conferidoPor: {
      is: {
        nome: {
          [operador]: operacao.valor.valor,
          ...(operacao.minusculas ? { mode: 'insensitive' as const } : {}),
        },
      },
    },
  };
  return operacao.operador === 'ne' ? { NOT: onde } : onde;
};

/** Mapeamento de `GET /coletas-diarias`. */
export const MAPA_COLETAS_DIARIAS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  empreendimentoId: { caminho: ['empreendimentoId'] },
  empreendimentoNome: { caminho: ['empreendimento', 'nomeFantasia'] },
  periodoId: { caminho: ['periodoId'] },
  periodoRotulo: { caminho: ['periodo', 'rotulo'] },
  fonte: { caminho: ['fonte'] },
  dataColeta: { caminho: ['dataColeta'] },
  dataEstadia: { caminho: ['dataEstadia'] },
  tipoDia: { caminho: ['tipoDia'] },
  valorDiaria: { caminho: ['valorDiaria'] },
  moeda: { caminho: ['moeda'] },
  unidadePreco: { caminho: ['unidadePreco'] },
  origem: { caminho: ['origem'] },
  situacaoConferencia: { caminho: ['situacaoConferencia'] },
  referenciaOrigem: { caminho: ['referenciaOrigem'] },
  observacao: { caminho: ['observacao'] },
  conferidoEm: { caminho: ['conferidoEm'] },
  conferidoPor: {
    caminho: ['conferidoPor', 'nome'],
    construir: filtroConferidoPor,
  },
};

/** Mapeamento de `GET /rhc-periodos`. */
export const MAPA_RHC_PERIODOS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  periodoId: { caminho: ['periodoId'] },
  periodoRotulo: { caminho: ['periodo', 'rotulo'] },
  qtdRhc: { caminho: ['qtdRhc'] },
  leitos: { caminho: ['leitos'] },
  origem: { caminho: ['origem'] },
  situacaoConferencia: { caminho: ['situacaoConferencia'] },
  revisao: { caminho: ['revisao'] },
  observacao: { caminho: ['observacao'] },
  conferidoEm: { caminho: ['conferidoEm'] },
  conferidoPor: {
    caminho: ['conferidoPor', 'nome'],
    construir: filtroConferidoPor,
  },
};

/** Mapeamento de `GET /parametros-calculo`. */
export const MAPA_PARAMETROS_CALCULO: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  chave: { caminho: ['chave'] },
  valor: { caminho: ['valor'] },
  unidade: { caminho: ['unidade'] },
  vigenciaInicio: { caminho: ['vigenciaInicio'] },
  vigenciaFim: { caminho: ['vigenciaFim'] },
  fonte: { caminho: ['fonte'] },
  situacao: { caminho: ['situacao'] },
  observacao: { caminho: ['observacao'] },
};
