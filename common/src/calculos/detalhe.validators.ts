import { MOTIVOS_INDISPONIBILIDADE } from '../indicadores/indicadores.constants.js';
import type { ValorIndicador } from '../indicadores/indicadores.types.js';
import { TIPOS_COLETA } from '../pesquisas/edicao.constants.js';
import {
  COMPARACOES_INSUMOS,
  ORIGENS_POPULACAO,
  SITUACOES_EXECUCAO,
  SITUACOES_PUBLICACAO,
} from './calculo.constants.js';
import type {
  ExecucaoCalculoDetalhe,
  ExecucaoCalculoLinha,
  InsumosCalculo,
  ResultadoCalculo,
  SolicitacaoCalculo,
} from './calculo.types.js';

type Objeto = Record<string, unknown>;

const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const inteiro = (v: unknown): v is number => Number.isInteger(v);
const texto = (v: unknown): v is string => typeof v === 'string';
const ou =
  (guarda: (v: unknown) => boolean) =>
  (v: unknown): boolean =>
    v === null || guarda(v);
const em =
  (valores: readonly string[]) =>
  (v: unknown): boolean =>
    typeof v === 'string' && valores.includes(v);

export function isValorIndicador(v: unknown): v is ValorIndicador {
  if (!objeto(v)) return false;
  if (v.estado === 'disponivel') return texto(v.valor);
  return (
    v.estado === 'indisponivel' &&
    em(MOTIVOS_INDISPONIBILIDADE)(v.motivo) &&
    texto(v.detalhe)
  );
}

export function isExecucaoCalculoLinha(v: unknown): v is ExecucaoCalculoLinha {
  return (
    objeto(v) &&
    inteiro(v.id) &&
    inteiro(v.periodoId) &&
    texto(v.periodo) &&
    em(TIPOS_COLETA)(v.tipoColeta) &&
    inteiro(v.pesquisaId) &&
    texto(v.pesquisa) &&
    inteiro(v.perguntaId) &&
    ou(inteiro)(v.revisao) &&
    inteiro(v.versaoFormula) &&
    em(SITUACOES_EXECUCAO)(v.situacao) &&
    em(SITUACOES_PUBLICACAO)(v.publicacao) &&
    ou(texto)(v.motivo) &&
    ou(texto)(v.erro) &&
    texto(v.solicitadaEm) &&
    texto(v.solicitadaPor) &&
    ou(texto)(v.concluidaEm) &&
    ou(texto)(v.publicadaEm) &&
    ou(inteiro)(v.publicadaPorId)
  );
}

function isResultadoCalculo(v: unknown): v is ResultadoCalculo {
  return (
    objeto(v) &&
    inteiro(v.id) &&
    inteiro(v.indicadorId) &&
    texto(v.codigo) &&
    texto(v.nome) &&
    texto(v.unidade) &&
    texto(v.recorte) &&
    texto(v.metodo) &&
    isValorIndicador(v.valor)
  );
}

function isInsumosCalculo(v: unknown): v is InsumosCalculo {
  return (
    objeto(v) &&
    inteiro(v.versaoFormula) &&
    objeto(v.periodo) &&
    inteiro(v.periodo.diasPeriodo) &&
    objeto(v.pesquisa) &&
    objeto(v.pergunta) &&
    em(ORIGENS_POPULACAO)(v.populacao) &&
    Array.isArray(v.meios) &&
    objeto(v.rhc) &&
    Array.isArray(v.parametros)
  );
}

export function isExecucaoCalculoDetalhe(
  v: unknown,
): v is ExecucaoCalculoDetalhe {
  return (
    isExecucaoCalculoLinha(v) &&
    ou(texto)((v as unknown as Objeto).motivoPublicacao) &&
    ou(inteiro)((v as unknown as Objeto).substituidaPorId) &&
    isInsumosCalculo((v as unknown as Objeto).insumos) &&
    ou(em(COMPARACOES_INSUMOS))((v as unknown as Objeto).insumosAtuais) &&
    Array.isArray((v as unknown as Objeto).resultados) &&
    ((v as unknown as Objeto).resultados as unknown[]).every(isResultadoCalculo)
  );
}

export function isSolicitacaoCalculo(v: unknown): v is SolicitacaoCalculo {
  return (
    objeto(v) &&
    typeof v.reaproveitada === 'boolean' &&
    isExecucaoCalculoDetalhe(v.execucao)
  );
}
