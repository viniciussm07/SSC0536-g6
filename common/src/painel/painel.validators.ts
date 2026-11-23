import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';
import { MOTIVOS_INDISPONIBILIDADE } from '../indicadores/indicadores.constants.js';
import { TIPOS_COLETA } from '../pesquisas/index.js';
import {
  FORMATOS_EXPORTACAO_PAINEL,
  GRUPOS_PAINEL,
  ORIGENS_RESULTADO_PAINEL,
  SITUACOES_PAINEL,
} from './painel.constants.js';
import type {
  ComparacaoPainel,
  ConsultaExportacaoPainel,
  ConsultaPainel,
  FontePainel,
  ItemPainel,
  OpcaoPainel,
  Painel,
  PeriodoPainel,
  SerieIndicador,
  SeriePainel,
  EdicaoParticipacao,
  ParticipacaoPainel,
  ValorPainel,
} from './painel.types.js';

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): v is string => typeof v === 'string';
const inteiro = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1;
const decimal = (v: unknown): v is string =>
  texto(v) && /^-?\d+(?:\.\d+)?$/.test(v);
const dataOuNula = (v: unknown) => v === null || texto(v);
const inclui = (lista: readonly string[], v: unknown) =>
  texto(v) && lista.includes(v);

function lerId(
  bruto: unknown,
  campo: string,
  erros: ErroCampo[],
): number | undefined {
  if (typeof bruto !== 'string' || !/^[1-9]\d{0,9}$/.test(bruto)) {
    erros.push({
      field: campo,
      message: 'Informe um identificador inteiro positivo.',
    });
    return undefined;
  }
  const n = Number(bruto);
  if (n > 2147483647) {
    erros.push({ field: campo, message: 'Identificador fora do limite.' });
    return undefined;
  }
  return n;
}

/**
 * Valida os parâmetros de consulta (texto) do painel. Parâmetros desconhecidos são recusados:
 * o painel não aceita filtros livres, só uma seleção explícita de período e tipo de coleta.
 */
export function validarConsultaPainel(
  query: unknown,
): ResultadoEntrada<ConsultaPainel> {
  if (!objeto(query))
    return {
      valido: false,
      erros: [{ field: '', message: 'Consulta inválida.' }],
    };
  const erros: ErroCampo[] = [];
  for (const chave of Object.keys(query))
    if (!['periodoId', 'tipoColeta', 'comparacaoPeriodoId'].includes(chave))
      erros.push({ field: chave, message: 'Parâmetro não permitido.' });
  const periodoId = lerId(query.periodoId, 'periodoId', erros);
  let tipoColeta: ConsultaPainel['tipoColeta'] | undefined;
  if (inclui(TIPOS_COLETA, query.tipoColeta))
    tipoColeta = query.tipoColeta as ConsultaPainel['tipoColeta'];
  else
    erros.push({
      field: 'tipoColeta',
      message: `Informe o tipo de coleta: ${TIPOS_COLETA.join(' ou ')}.`,
    });
  let comparacaoPeriodoId: number | undefined;
  if (query.comparacaoPeriodoId !== undefined) {
    comparacaoPeriodoId = lerId(
      query.comparacaoPeriodoId,
      'comparacaoPeriodoId',
      erros,
    );
    if (comparacaoPeriodoId !== undefined && comparacaoPeriodoId === periodoId)
      erros.push({
        field: 'comparacaoPeriodoId',
        message: 'Escolha um período diferente do período principal.',
      });
  }
  if (erros.length > 0 || periodoId === undefined || tipoColeta === undefined)
    return { valido: false, erros };
  return {
    valido: true,
    data: {
      periodoId,
      tipoColeta,
      ...(comparacaoPeriodoId === undefined ? {} : { comparacaoPeriodoId }),
    },
  };
}

export function isFontePainel(v: unknown): v is FontePainel {
  return (
    objeto(v) &&
    inclui(ORIGENS_RESULTADO_PAINEL, v.origem) &&
    (v.execucaoId === null || inteiro(v.execucaoId)) &&
    (v.revisao === null || inteiro(v.revisao)) &&
    dataOuNula(v.publicadaEm) &&
    texto(v.calculadoEm)
  );
}

export function isValorPainel(v: unknown): v is ValorPainel {
  if (!objeto(v)) return false;
  if (v.estado === 'disponivel') return decimal(v.valor);
  return (
    v.estado === 'indisponivel' &&
    inclui(MOTIVOS_INDISPONIBILIDADE, v.motivo) &&
    dataOuNula(v.detalhe)
  );
}

function isComparacaoPainel(v: unknown): v is ComparacaoPainel {
  if (!objeto(v)) return false;
  if (v.estado === 'disponivel')
    return decimal(v.valor) && decimal(v.variacao) && isFontePainel(v.fonte);
  return v.estado === 'indisponivel' || v.estado === 'ausente';
}

function isPeriodoPainel(v: unknown): v is PeriodoPainel {
  return (
    objeto(v) &&
    inteiro(v.id) &&
    texto(v.rotulo) &&
    texto(v.tipo) &&
    texto(v.dataInicio) &&
    texto(v.dataFim)
  );
}

function isItemPainel(v: unknown): v is ItemPainel {
  return (
    objeto(v) &&
    inteiro(v.indicadorId) &&
    ['codigo', 'nome', 'unidade', 'recorte', 'metodo'].every((k) =>
      texto(v[k]),
    ) &&
    inclui(GRUPOS_PAINEL, v.grupo) &&
    isValorPainel(v.valor) &&
    isFontePainel(v.fonte) &&
    (v.comparacao === null || isComparacaoPainel(v.comparacao))
  );
}

export function isPainel(v: unknown): v is Painel {
  return (
    objeto(v) &&
    isPeriodoPainel(v.periodo) &&
    inclui(TIPOS_COLETA, v.tipoColeta) &&
    (v.comparacao === null || isPeriodoPainel(v.comparacao)) &&
    inclui(SITUACOES_PAINEL, v.situacao) &&
    Array.isArray(v.itens) &&
    v.itens.every(isItemPainel) &&
    dataOuNula(v.atualizadoEm) &&
    texto(v.aviso)
  );
}

export function isOpcaoPainel(v: unknown): v is OpcaoPainel {
  return (
    objeto(v) &&
    inteiro(v.periodoId) &&
    texto(v.periodo) &&
    texto(v.periodoTipo) &&
    inclui(TIPOS_COLETA, v.tipoColeta)
  );
}

/** Valida a consulta da série (`?tipoColeta=`); outros parâmetros são recusados. */
export function validarConsultaSerie(
  query: unknown,
): ResultadoEntrada<{ tipoColeta: ConsultaPainel['tipoColeta'] }> {
  const erros: ErroCampo[] = [];
  if (!objeto(query))
    return {
      valido: false,
      erros: [{ field: '', message: 'Consulta inválida.' }],
    };
  for (const chave of Object.keys(query))
    if (chave !== 'tipoColeta')
      erros.push({ field: chave, message: 'Parâmetro não permitido.' });
  if (!inclui(TIPOS_COLETA, query.tipoColeta))
    erros.push({
      field: 'tipoColeta',
      message: `Informe o tipo de coleta: ${TIPOS_COLETA.join(' ou ')}.`,
    });
  if (erros.length > 0) return { valido: false, erros };
  return {
    valido: true,
    data: { tipoColeta: query.tipoColeta as ConsultaPainel['tipoColeta'] },
  };
}

function isSerieIndicador(v: unknown): v is SerieIndicador {
  return (
    objeto(v) &&
    inteiro(v.indicadorId) &&
    ['codigo', 'nome', 'unidade', 'recorte', 'metodo'].every((k) =>
      texto(v[k]),
    ) &&
    Array.isArray(v.pontos) &&
    v.pontos.every(
      (p) =>
        objeto(p) &&
        inteiro(p.periodoId) &&
        (p.valor === null || decimal(p.valor)),
    )
  );
}

export function isSeriePainel(v: unknown): v is SeriePainel {
  return (
    objeto(v) &&
    inclui(TIPOS_COLETA, v.tipoColeta) &&
    Array.isArray(v.periodos) &&
    v.periodos.every(isPeriodoPainel) &&
    Array.isArray(v.series) &&
    v.series.every(isSerieIndicador) &&
    Array.isArray(v.feriados) &&
    v.feriados.every(isPeriodoPainel)
  );
}

/** Consulta da exportação: a do painel mais `formato` (`pdf` ou `xlsx`). */
export function validarConsultaExportacaoPainel(
  query: unknown,
): ResultadoEntrada<ConsultaExportacaoPainel> {
  if (!objeto(query))
    return {
      valido: false,
      erros: [{ field: '', message: 'Consulta inválida.' }],
    };
  const { formato, ...resto } = query;
  const base = validarConsultaPainel(resto);
  const erros: ErroCampo[] = base.valido ? [] : [...base.erros];
  if (!inclui(FORMATOS_EXPORTACAO_PAINEL, formato))
    erros.push({
      field: 'formato',
      message: `Informe o formato: ${FORMATOS_EXPORTACAO_PAINEL.join(' ou ')}.`,
    });
  if (erros.length > 0 || !base.valido) return { valido: false, erros };
  return {
    valido: true,
    data: {
      ...base.data,
      formato: formato as ConsultaExportacaoPainel['formato'],
    },
  };
}

const contagem = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

function isEdicaoParticipacao(v: unknown): v is EdicaoParticipacao {
  return (
    objeto(v) &&
    inteiro(v.pesquisaId) &&
    inteiro(v.periodoId) &&
    texto(v.periodo) &&
    texto(v.dataInicio) &&
    contagem(v.destinatarios) &&
    contagem(v.respondentes)
  );
}

export function isParticipacaoPainel(v: unknown): v is ParticipacaoPainel {
  return (
    objeto(v) &&
    inclui(TIPOS_COLETA, v.tipoColeta) &&
    Array.isArray(v.edicoes) &&
    v.edicoes.every(isEdicaoParticipacao)
  );
}
