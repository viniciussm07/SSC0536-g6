import type {
  ColetaDiariaLinha,
  OrigemColeta,
  ParametroCalculoLinha,
  RhcPeriodoLinha,
  SituacaoConferenciaFonte,
  SituacaoParametro,
  TipoDia,
  UnidadePreco,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { dataCivil } from '../periodos/periodos.leitura';

type RelacaoNome = { nome: string } | null;
type RelacaoPeriodo = { rotulo: string };
type RelacaoEmpreendimento = { nomeFantasia: string };

export type ColetaBanco = {
  id: number;
  empreendimentoId: number;
  periodoId: number;
  fonte: string;
  dataColeta: Date;
  dataEstadia: Date;
  tipoDia: string;
  valorDiaria: Prisma.Decimal;
  moeda: string;
  unidadePreco: string;
  origem: string;
  situacaoConferencia: string;
  referenciaOrigem: string | null;
  observacao: string | null;
  conferidoEm: Date | null;
  empreendimento: RelacaoEmpreendimento;
  periodo: RelacaoPeriodo;
  conferidoPor: RelacaoNome;
};

export type RhcBanco = {
  id: number;
  periodoId: number;
  qtdRhc: number;
  leitos: number;
  origem: string;
  situacaoConferencia: string;
  revisao: number;
  observacao: string | null;
  conferidoEm: Date | null;
  periodo: RelacaoPeriodo;
  conferidoPor: RelacaoNome;
};

export type ParametroBanco = {
  id: number;
  chave: string;
  valor: Prisma.Decimal;
  unidade: string;
  vigenciaInicio: Date;
  vigenciaFim: Date | null;
  fonte: string | null;
  situacao: string;
  observacao: string | null;
};

/** Compara decimais pelo significado, sem depender de zeros finais do Prisma/entrada. */
export const normalizarDecimal = (valor: string): string => {
  const limpo = valor.trim().replace(',', '.');
  const [inteiro, fracao = ''] = limpo.split('.');
  const semZeros = inteiro.replace(/^0+(?=\d)/, '') || '0';
  const fracaoLimpa = fracao.replace(/0+$/, '');
  return fracaoLimpa ? `${semZeros}.${fracaoLimpa}` : semZeros;
};

export const incluirColeta = {
  empreendimento: { select: { nomeFantasia: true } },
  periodo: { select: { rotulo: true } },
  conferidoPor: { select: { nome: true } },
} as const;

export const incluirRhc = {
  periodo: { select: { rotulo: true } },
  conferidoPor: { select: { nome: true } },
} as const;

export const paraColeta = (row: ColetaBanco): ColetaDiariaLinha => ({
  id: row.id,
  empreendimentoId: row.empreendimentoId,
  empreendimentoNome: row.empreendimento.nomeFantasia,
  periodoId: row.periodoId,
  periodoRotulo: row.periodo.rotulo,
  fonte: row.fonte,
  dataColeta: dataCivil(row.dataColeta),
  dataEstadia: dataCivil(row.dataEstadia),
  tipoDia: row.tipoDia as TipoDia,
  valorDiaria: row.valorDiaria.toString(),
  moeda: row.moeda,
  unidadePreco: row.unidadePreco as UnidadePreco,
  origem: row.origem as OrigemColeta,
  situacaoConferencia: row.situacaoConferencia as SituacaoConferenciaFonte,
  referenciaOrigem: row.referenciaOrigem,
  observacao: row.observacao,
  conferidoEm: row.conferidoEm?.toISOString() ?? null,
  conferidoPor: row.conferidoPor?.nome ?? null,
});

export const paraRhc = (row: RhcBanco): RhcPeriodoLinha => ({
  id: row.id,
  periodoId: row.periodoId,
  periodoRotulo: row.periodo.rotulo,
  qtdRhc: row.qtdRhc,
  leitos: row.leitos,
  origem: row.origem as OrigemColeta,
  situacaoConferencia: row.situacaoConferencia as SituacaoConferenciaFonte,
  revisao: row.revisao,
  observacao: row.observacao,
  conferidoEm: row.conferidoEm?.toISOString() ?? null,
  conferidoPor: row.conferidoPor?.nome ?? null,
});

export const paraParametro = (row: ParametroBanco): ParametroCalculoLinha => ({
  id: row.id,
  chave: row.chave,
  valor: row.valor.toString(),
  unidade: row.unidade,
  vigenciaInicio: dataCivil(row.vigenciaInicio),
  vigenciaFim: row.vigenciaFim === null ? null : dataCivil(row.vigenciaFim),
  fonte: row.fonte,
  situacao: row.situacao as SituacaoParametro,
  observacao: row.observacao,
});
