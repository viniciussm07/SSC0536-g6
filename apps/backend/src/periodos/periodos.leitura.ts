import type {
  PeriodoDetalhe,
  PeriodoLinha,
  TipoPeriodo,
} from '@ssc0536/common';

/** Data `@db.Date` do Prisma (meia-noite UTC) para `YYYY-MM-DD` do contrato. */
export const dataCivil = (d: Date): string => d.toISOString().slice(0, 10);

export type PeriodoBanco = {
  id: number;
  tipo: string;
  rotulo: string;
  dataInicio: Date;
  dataFim: Date;
};

export const paraLinha = (row: PeriodoBanco): PeriodoLinha => ({
  id: row.id,
  tipo: row.tipo as TipoPeriodo,
  rotulo: row.rotulo,
  dataInicio: dataCivil(row.dataInicio),
  dataFim: dataCivil(row.dataFim),
});

export const paraDetalhe = (
  row: PeriodoBanco & {
    _count: {
      perguntas: number;
      coletasDiarias: number;
      resultados: number;
      rhc: number;
    };
  },
): PeriodoDetalhe => ({
  ...paraLinha(row),
  emUso:
    row._count.perguntas +
      row._count.coletasDiarias +
      row._count.resultados +
      row._count.rhc >
    0,
});
