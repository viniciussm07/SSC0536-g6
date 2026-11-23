import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';
import type {
  AlteracaoColetaDiaria,
  EntradaColetaDiaria,
} from './coleta.types.js';
import {
  LIMITES_DIARIAS,
  MOEDA_PADRAO,
  SITUACOES_CONFERENCIA_FONTE,
  TIPOS_DIA,
  UNIDADE_PRECO_PADRAO,
  UNIDADES_PRECO,
  type SituacaoConferenciaFonte,
  type TipoDia,
  type UnidadePreco,
} from './fontes.constants.js';
import {
  dataValida,
  inteiroPositivo,
  lerDecimal,
  objeto,
  recusarDesconhecidos,
  textoOpcional,
  validarMoeda,
  type Objeto,
} from './fontes.validators.js';

const CAMPOS = [
  'empreendimentoId',
  'periodoId',
  'fonte',
  'dataColeta',
  'dataEstadia',
  'tipoDia',
  'valorDiaria',
  'moeda',
  'unidadePreco',
  'referenciaOrigem',
  'observacao',
] as const;
const CAMPOS_ALTERACAO = [...CAMPOS, 'situacaoConferencia'] as const;

function lerFonte(valor: unknown, erros: ErroCampo[]): string | null {
  if (
    typeof valor !== 'string' ||
    !valor.trim() ||
    valor.trim().length > LIMITES_DIARIAS.fonte
  ) {
    erros.push({
      field: 'fonte',
      message: `Informe a fonte comercial em 1 a ${LIMITES_DIARIAS.fonte} caracteres.`,
    });
    return null;
  }
  return valor.trim();
}

function lerTipoDia(valor: unknown, erros: ErroCampo[]): TipoDia | null {
  if (!(TIPOS_DIA as readonly unknown[]).includes(valor)) {
    erros.push({ field: 'tipoDia', message: `Use: ${TIPOS_DIA.join(', ')}.` });
    return null;
  }
  return valor as TipoDia;
}

function lerUnidade(valor: unknown, erros: ErroCampo[]): UnidadePreco | null {
  if (!(UNIDADES_PRECO as readonly unknown[]).includes(valor)) {
    erros.push({
      field: 'unidadePreco',
      message: `Use: ${UNIDADES_PRECO.join(', ')}.`,
    });
    return null;
  }
  return valor as UnidadePreco;
}

function lerValor(valor: unknown, erros: ErroCampo[]): string | null {
  const lido = lerDecimal(valor);
  if (lido === null)
    erros.push({
      field: 'valorDiaria',
      message: `Informe um valor positivo com até ${LIMITES_DIARIAS.casasDecimais} casas decimais.`,
    });
  return lido;
}

function lerData(
  origem: Objeto,
  chave: 'dataColeta' | 'dataEstadia',
  erros: ErroCampo[],
): string | null {
  const valor = origem[chave];
  if (!dataValida(valor)) {
    erros.push({
      field: chave,
      message: 'Informe uma data válida (YYYY-MM-DD).',
    });
    return null;
  }
  return valor;
}

export function validarEntradaColetaDiaria(
  corpo: unknown,
): ResultadoEntrada<EntradaColetaDiaria> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo inválido.' }],
    };
  recusarDesconhecidos(corpo, CAMPOS, erros);

  if (!inteiroPositivo(corpo.empreendimentoId))
    erros.push({
      field: 'empreendimentoId',
      message: 'Informe o empreendimento.',
    });
  if (!inteiroPositivo(corpo.periodoId))
    erros.push({ field: 'periodoId', message: 'Informe o período.' });

  const fonte = lerFonte(corpo.fonte, erros);
  const dataColeta = lerData(corpo, 'dataColeta', erros);
  const dataEstadia = lerData(corpo, 'dataEstadia', erros);
  const tipoDia = lerTipoDia(corpo.tipoDia, erros);
  const valorDiaria = lerValor(corpo.valorDiaria, erros);
  const moeda =
    corpo.moeda === undefined ? MOEDA_PADRAO : validarMoeda(corpo.moeda, erros);
  const unidadePreco =
    corpo.unidadePreco === undefined
      ? UNIDADE_PRECO_PADRAO
      : lerUnidade(corpo.unidadePreco, erros);
  const saida: Objeto = {};
  textoOpcional(
    corpo,
    'referenciaOrigem',
    LIMITES_DIARIAS.referenciaOrigem,
    saida,
    erros,
  );
  textoOpcional(corpo, 'observacao', LIMITES_DIARIAS.observacao, saida, erros);

  if (erros.length) return { valido: false, erros };
  return {
    valido: true,
    data: {
      empreendimentoId: corpo.empreendimentoId as number,
      periodoId: corpo.periodoId as number,
      fonte: fonte as string,
      dataColeta: dataColeta as string,
      dataEstadia: dataEstadia as string,
      tipoDia: tipoDia as TipoDia,
      valorDiaria: valorDiaria as string,
      moeda: moeda as string,
      unidadePreco: unidadePreco as UnidadePreco,
      ...(saida.referenciaOrigem !== undefined
        ? { referenciaOrigem: saida.referenciaOrigem as string | null }
        : {}),
      ...(saida.observacao !== undefined
        ? { observacao: saida.observacao as string | null }
        : {}),
    },
  };
}

export function validarAlteracaoColetaDiaria(
  corpo: unknown,
): ResultadoEntrada<AlteracaoColetaDiaria> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo inválido.' }],
    };
  recusarDesconhecidos(corpo, CAMPOS_ALTERACAO, erros);
  const saida: Objeto = {};

  if (corpo.empreendimentoId !== undefined) {
    if (!inteiroPositivo(corpo.empreendimentoId))
      erros.push({
        field: 'empreendimentoId',
        message: 'Informe o empreendimento.',
      });
    else saida.empreendimentoId = corpo.empreendimentoId;
  }
  if (corpo.periodoId !== undefined) {
    if (!inteiroPositivo(corpo.periodoId))
      erros.push({ field: 'periodoId', message: 'Informe o período.' });
    else saida.periodoId = corpo.periodoId;
  }
  if (corpo.fonte !== undefined) {
    const fonte = lerFonte(corpo.fonte, erros);
    if (fonte !== null) saida.fonte = fonte;
  }
  if (corpo.dataColeta !== undefined) {
    const data = lerData(corpo, 'dataColeta', erros);
    if (data !== null) saida.dataColeta = data;
  }
  if (corpo.dataEstadia !== undefined) {
    const data = lerData(corpo, 'dataEstadia', erros);
    if (data !== null) saida.dataEstadia = data;
  }
  if (corpo.tipoDia !== undefined) {
    const tipo = lerTipoDia(corpo.tipoDia, erros);
    if (tipo !== null) saida.tipoDia = tipo;
  }
  if (corpo.valorDiaria !== undefined) {
    const valor = lerValor(corpo.valorDiaria, erros);
    if (valor !== null) saida.valorDiaria = valor;
  }
  if (corpo.moeda !== undefined) {
    const moeda = validarMoeda(corpo.moeda, erros);
    if (moeda !== null) saida.moeda = moeda;
  }
  if (corpo.unidadePreco !== undefined) {
    const unidade = lerUnidade(corpo.unidadePreco, erros);
    if (unidade !== null) saida.unidadePreco = unidade;
  }
  textoOpcional(
    corpo,
    'referenciaOrigem',
    LIMITES_DIARIAS.referenciaOrigem,
    saida,
    erros,
  );
  textoOpcional(corpo, 'observacao', LIMITES_DIARIAS.observacao, saida, erros);
  if (corpo.situacaoConferencia !== undefined) {
    if (
      !(SITUACOES_CONFERENCIA_FONTE as readonly unknown[]).includes(
        corpo.situacaoConferencia,
      )
    )
      erros.push({
        field: 'situacaoConferencia',
        message: `Use: ${SITUACOES_CONFERENCIA_FONTE.join(', ')}.`,
      });
    else
      saida.situacaoConferencia =
        corpo.situacaoConferencia as SituacaoConferenciaFonte;
  }
  if (erros.length) return { valido: false, erros };
  if (!Object.keys(saida).length)
    return {
      valido: false,
      erros: [
        { field: '', message: 'Informe ao menos um campo para alterar.' },
      ],
    };
  return { valido: true, data: saida as AlteracaoColetaDiaria };
}
