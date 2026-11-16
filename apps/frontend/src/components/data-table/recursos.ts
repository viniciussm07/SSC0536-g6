import {
  columnFilteringFeature,
  createColumnHelper,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';

export interface MetaColunaGrade {
  alinhamento?: 'direita' | 'esquerda';
  /** Campos apresentados na mesma célula mantêm filtros próprios e explícitos. */
  filtrosAdicionais?: readonly {
    campo: string;
    rotulo: string;
    rotulosValores?: Readonly<Record<string, string>>;
  }[];
  /** Campo no esquema OData; ausente somente em colunas de apresentação/ação. */
  campo?: string;
  rotulo?: string;
  rotulosValores?: Readonly<Record<string, string>>;
}

// Filtro, ordenação e paginação são do servidor (OData): os recursos abaixo só mantêm o estado
// controlado da grade. Registrar recursos aqui os habilita para todas as grades.
// Deve permanecer estável (escopo de módulo), como exige o TanStack Table.
export const recursosTabela = tableFeatures({
  columnFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  columnMeta: metaHelper<MetaColunaGrade>(),
});

export const criarColunas = <TData extends RowData>() =>
  createColumnHelper<typeof recursosTabela, TData>();
export type Colunas<TData extends RowData> = ColumnDef<
  typeof recursosTabela,
  TData
>[];
