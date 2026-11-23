import {
  ORIGENS_COLETA,
  SITUACOES_CONFERENCIA_FONTE,
  SITUACOES_PARAMETRO,
  TIPOS_DIA,
  UNIDADES_PRECO,
} from './fontes.constants.js';
import type { ColetaDiariaLinha } from './coleta.types.js';
import type { ParametroCalculoLinha } from './parametro.types.js';
import type { RhcPeriodoLinha } from './rhc.types.js';

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): v is string => typeof v === 'string';
const data = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const textoOuNulo = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';
const dataHoraOuNulo = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

export function isColetaDiariaLinha(v: unknown): v is ColetaDiariaLinha {
  return (
    objeto(v) &&
    Number.isInteger(v.id) &&
    Number.isInteger(v.empreendimentoId) &&
    texto(v.empreendimentoNome) &&
    Number.isInteger(v.periodoId) &&
    texto(v.periodoRotulo) &&
    texto(v.fonte) &&
    data(v.dataColeta) &&
    data(v.dataEstadia) &&
    (TIPOS_DIA as readonly unknown[]).includes(v.tipoDia) &&
    texto(v.valorDiaria) &&
    texto(v.moeda) &&
    (UNIDADES_PRECO as readonly unknown[]).includes(v.unidadePreco) &&
    (ORIGENS_COLETA as readonly unknown[]).includes(v.origem) &&
    (SITUACOES_CONFERENCIA_FONTE as readonly unknown[]).includes(
      v.situacaoConferencia,
    ) &&
    textoOuNulo(v.referenciaOrigem) &&
    textoOuNulo(v.observacao) &&
    dataHoraOuNulo(v.conferidoEm) &&
    textoOuNulo(v.conferidoPor)
  );
}

export function isRhcPeriodoLinha(v: unknown): v is RhcPeriodoLinha {
  return (
    objeto(v) &&
    Number.isInteger(v.id) &&
    Number.isInteger(v.periodoId) &&
    texto(v.periodoRotulo) &&
    Number.isInteger(v.qtdRhc) &&
    Number.isInteger(v.leitos) &&
    (ORIGENS_COLETA as readonly unknown[]).includes(v.origem) &&
    (SITUACOES_CONFERENCIA_FONTE as readonly unknown[]).includes(
      v.situacaoConferencia,
    ) &&
    Number.isInteger(v.revisao) &&
    textoOuNulo(v.observacao) &&
    dataHoraOuNulo(v.conferidoEm) &&
    textoOuNulo(v.conferidoPor)
  );
}

export function isParametroCalculoLinha(
  v: unknown,
): v is ParametroCalculoLinha {
  return (
    objeto(v) &&
    Number.isInteger(v.id) &&
    texto(v.chave) &&
    texto(v.valor) &&
    texto(v.unidade) &&
    data(v.vigenciaInicio) &&
    (v.vigenciaFim === null || data(v.vigenciaFim)) &&
    textoOuNulo(v.fonte) &&
    (SITUACOES_PARAMETRO as readonly unknown[]).includes(v.situacao) &&
    textoOuNulo(v.observacao)
  );
}
