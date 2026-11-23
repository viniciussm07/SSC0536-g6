import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';
import {
  LIMITES_DIARIAS,
  SITUACAO_PARAMETRO_PADRAO,
  SITUACOES_PARAMETRO,
  UNIDADE_PARAMETRO_PADRAO,
  type SituacaoParametro,
} from './fontes.constants.js';
import {
  dataValida,
  lerDecimal,
  objeto,
  recusarDesconhecidos,
  textoOpcional,
  type Objeto,
} from './fontes.validators.js';
import type {
  AlteracaoParametroCalculo,
  EntradaParametroCalculo,
} from './parametro.types.js';

const CAMPOS = [
  'chave',
  'valor',
  'unidade',
  'vigenciaInicio',
  'vigenciaFim',
  'fonte',
  'situacao',
  'observacao',
] as const;

function lerChave(valor: unknown, erros: ErroCampo[]): string | null {
  if (
    typeof valor !== 'string' ||
    !valor.trim() ||
    valor.trim().length > LIMITES_DIARIAS.chaveParametro
  ) {
    erros.push({
      field: 'chave',
      message: `Informe a chave em 1 a ${LIMITES_DIARIAS.chaveParametro} caracteres.`,
    });
    return null;
  }
  return valor.trim();
}

function lerUnidade(valor: unknown, erros: ErroCampo[]): string | null {
  if (
    typeof valor !== 'string' ||
    !valor.trim() ||
    valor.trim().length > LIMITES_DIARIAS.unidadeParametro
  ) {
    erros.push({
      field: 'unidade',
      message: `Informe a unidade em 1 a ${LIMITES_DIARIAS.unidadeParametro} caracteres.`,
    });
    return null;
  }
  return valor.trim();
}

function lerDataObrigatoria(
  origem: Objeto,
  chave: 'vigenciaInicio',
  erros: ErroCampo[],
): string | null {
  if (!dataValida(origem[chave])) {
    erros.push({
      field: chave,
      message: 'Informe uma data válida (YYYY-MM-DD).',
    });
    return null;
  }
  return origem[chave];
}

function lerVigenciaFim(
  origem: Objeto,
  erros: ErroCampo[],
  inicio: string | null,
): string | null | undefined {
  if (!('vigenciaFim' in origem) || origem.vigenciaFim === undefined)
    return undefined;
  const valor = origem.vigenciaFim;
  if (valor === null) return null;
  if (!dataValida(valor)) {
    erros.push({
      field: 'vigenciaFim',
      message: 'Use uma data válida (YYYY-MM-DD) ou null.',
    });
    return undefined;
  }
  if (inicio !== null && valor < inicio) {
    erros.push({
      field: 'vigenciaFim',
      message: 'O fim da vigência não pode ser anterior ao início.',
    });
    return undefined;
  }
  return valor;
}

function lerSituacao(
  valor: unknown,
  erros: ErroCampo[],
): SituacaoParametro | null {
  if (!(SITUACOES_PARAMETRO as readonly unknown[]).includes(valor)) {
    erros.push({
      field: 'situacao',
      message: `Use: ${SITUACOES_PARAMETRO.join(', ')}.`,
    });
    return null;
  }
  return valor as SituacaoParametro;
}

export function validarEntradaParametroCalculo(
  corpo: unknown,
): ResultadoEntrada<EntradaParametroCalculo> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo inválido.' }],
    };
  recusarDesconhecidos(corpo, CAMPOS, erros);
  const chave = lerChave(corpo.chave, erros);
  const valor = lerDecimal(corpo.valor, { permitirZero: true });
  if (valor === null)
    erros.push({
      field: 'valor',
      message: `Informe um decimal não negativo com até ${LIMITES_DIARIAS.casasDecimais} casas.`,
    });
  const unidade =
    corpo.unidade === undefined
      ? UNIDADE_PARAMETRO_PADRAO
      : lerUnidade(corpo.unidade, erros);
  const vigenciaInicio = lerDataObrigatoria(corpo, 'vigenciaInicio', erros);
  const vigenciaFim = lerVigenciaFim(corpo, erros, vigenciaInicio);
  const situacao =
    corpo.situacao === undefined
      ? SITUACAO_PARAMETRO_PADRAO
      : lerSituacao(corpo.situacao, erros);
  const saida: Objeto = {};
  textoOpcional(corpo, 'fonte', LIMITES_DIARIAS.referenciaOrigem, saida, erros);
  textoOpcional(corpo, 'observacao', LIMITES_DIARIAS.observacao, saida, erros);
  if (erros.length) return { valido: false, erros };
  return {
    valido: true,
    data: {
      chave: chave as string,
      valor: valor as string,
      unidade: unidade as string,
      vigenciaInicio: vigenciaInicio as string,
      ...(vigenciaFim !== undefined ? { vigenciaFim } : {}),
      ...(saida.fonte !== undefined
        ? { fonte: saida.fonte as string | null }
        : {}),
      situacao: situacao as SituacaoParametro,
      ...(saida.observacao !== undefined
        ? { observacao: saida.observacao as string | null }
        : {}),
    },
  };
}

export function validarAlteracaoParametroCalculo(
  corpo: unknown,
): ResultadoEntrada<AlteracaoParametroCalculo> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo inválido.' }],
    };
  recusarDesconhecidos(corpo, CAMPOS, erros);
  const saida: Objeto = {};
  if (corpo.chave !== undefined) {
    const chave = lerChave(corpo.chave, erros);
    if (chave !== null) saida.chave = chave;
  }
  if (corpo.valor !== undefined) {
    const valor = lerDecimal(corpo.valor, { permitirZero: true });
    if (valor === null)
      erros.push({
        field: 'valor',
        message: `Informe um decimal não negativo com até ${LIMITES_DIARIAS.casasDecimais} casas.`,
      });
    else saida.valor = valor;
  }
  if (corpo.unidade !== undefined) {
    const unidade = lerUnidade(corpo.unidade, erros);
    if (unidade !== null) saida.unidade = unidade;
  }
  if (corpo.vigenciaInicio !== undefined) {
    const inicio = lerDataObrigatoria(corpo, 'vigenciaInicio', erros);
    if (inicio !== null) saida.vigenciaInicio = inicio;
  }
  const inicioConhecido =
    typeof saida.vigenciaInicio === 'string' ? saida.vigenciaInicio : null;
  const fim = lerVigenciaFim(corpo, erros, inicioConhecido);
  if (fim !== undefined) saida.vigenciaFim = fim;
  textoOpcional(corpo, 'fonte', LIMITES_DIARIAS.referenciaOrigem, saida, erros);
  if (corpo.situacao !== undefined) {
    const situacao = lerSituacao(corpo.situacao, erros);
    if (situacao !== null) saida.situacao = situacao;
  }
  textoOpcional(corpo, 'observacao', LIMITES_DIARIAS.observacao, saida, erros);
  if (erros.length) return { valido: false, erros };
  if (!Object.keys(saida).length)
    return {
      valido: false,
      erros: [
        { field: '', message: 'Informe ao menos um campo para alterar.' },
      ],
    };
  return { valido: true, data: saida as AlteracaoParametroCalculo };
}
