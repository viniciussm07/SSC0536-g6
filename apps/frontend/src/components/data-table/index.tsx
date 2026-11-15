import {
  useTable,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  montarFiltro,
  type CondicaoColuna,
  type EsquemaOData,
  type OrdenacaoOData,
} from '@ssc0536/common';
import { ArrowDown, ArrowUp, ChevronsUpDown, X } from 'lucide-react';
import { FiltroColuna } from '@/components/filtro-coluna';
import { rotuloOperador } from '@/components/filtro-coluna/rotulos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/utils/cn';
import { filtroComCondicao } from '@/utils/grade';
import { recursosTabela, type Colunas } from './recursos';

export interface ControleGrade {
  esquema: EsquemaOData;
  filter: string;
  condicoes: CondicaoColuna[] | null;
  ordenacao: OrdenacaoOData[];
  page: number;
  pageSize: number;
  total: number;
  onFilterChange: (filter: string) => void;
  onOrderbyChange: (ordenacao: OrdenacaoOData[]) => void;
  onPageChange: (page: number) => void;
}

const resolver = <T,>(atualizador: T | ((anterior: T) => T), anterior: T) =>
  typeof atualizador === 'function'
    ? (atualizador as (valor: T) => T)(anterior)
    : atualizador;

const resumoCondicao = (
  condicao: CondicaoColuna,
  rotulos: Readonly<Record<string, string>> = {},
) => {
  const rotulo = (valor: string | undefined) =>
    valor ? (rotulos[valor] ?? valor) : valor;
  const valor =
    condicao.operador === 'em'
      ? condicao.valores?.map(rotulo).join(', ')
      : condicao.operador === 'entre'
        ? `${rotulo(condicao.valor)} e ${rotulo(condicao.valor2)}`
        : rotulo(condicao.valor);
  return [rotuloOperador(condicao.operador), valor].filter(Boolean).join(' ');
};

/** Grade manual: o servidor é responsável por filtrar, ordenar e paginar. */
export function DataTable<TData extends RowData>({
  rotulo,
  colunas,
  dados,
  getRowId,
  colunasADireita = [],
  controle,
  mensagemVazia = 'Nenhum resultado encontrado.',
}: {
  rotulo: string;
  colunas: Colunas<TData>;
  dados: readonly TData[];
  getRowId: (linha: TData) => string;
  colunasADireita?: readonly string[];
  controle?: ControleGrade;
  mensagemVazia?: string;
}) {
  const [erroFiltro, setErroFiltro] = useState('');
  const sorting: SortingState = (controle?.ordenacao ?? []).map((item) => ({
    id: item.campo,
    desc: item.direcao === 'desc',
  }));
  const columnFilters = (controle?.condicoes ?? []).map((condicao) => ({
    id: condicao.campo,
    value: condicao,
  }));
  const pagination = {
    pageIndex: (controle?.page ?? 1) - 1,
    pageSize: controle?.pageSize ?? Math.max(dados.length, 1),
  };
  const tabela = useTable({
    features: recursosTabela,
    columns: colunas,
    data: dados as TData[],
    getRowId,
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    rowCount: controle?.total ?? dados.length,
    maxMultiSortColCount: 3,
    enableMultiSort: true,
    enableSortingRemoval: true,
    sortDescFirst: false,
    autoResetPageIndex: false,
    state: { sorting, columnFilters, pagination },
    onColumnFiltersChange: () => undefined,
    onSortingChange: (atualizador) => {
      if (!controle) return;
      const proxima = resolver(atualizador, sorting);
      controle.onOrderbyChange(
        proxima.map((item) => ({
          campo: item.id,
          direcao: item.desc ? 'desc' : 'asc',
        })),
      );
    },
    onPaginationChange: (atualizador) => {
      if (!controle) return;
      const proxima = resolver(atualizador, pagination);
      controle.onPageChange(proxima.pageIndex + 1);
    },
  });
  // A coluna de ações fica fixa à direita, sempre visível ao rolar a grade na horizontal.
  const alinhamento = (id: string) =>
    cn(
      colunasADireita.includes(id) && 'text-right',
      id === 'acoes' &&
        'sticky right-0 z-10 w-px bg-background shadow-[-1px_0_0_0_var(--color-border)]',
    );

  const atualizarCondicao = (condicao: CondicaoColuna) => {
    if (!controle) return;
    const resultado = filtroComCondicao(
      controle.filter,
      condicao,
      controle.esquema,
    );
    setErroFiltro(
      resultado.valido
        ? ''
        : resultado.erros.map((item) => item.message).join(' '),
    );
    if (resultado.valido) controle.onFilterChange(resultado.data);
  };
  const removerCondicao = (indice: number) => {
    if (!controle?.condicoes) return;
    const resultado = montarFiltro(
      controle.condicoes.filter((_, atual) => atual !== indice),
      controle.esquema,
    );
    if (resultado.valido) controle.onFilterChange(resultado.data);
  };
  const totalPaginas = controle
    ? Math.ceil(controle.total / controle.pageSize)
    : 1;

  return (
    <div className="space-y-3">
      {erroFiltro && (
        <p role="alert" className="text-sm text-destructive">
          {erroFiltro}
        </p>
      )}
      {controle && controle.filter && (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Filtros ativos"
        >
          {controle.condicoes === null ? (
            <Badge variant="outline" title={controle.filter}>
              Filtro personalizado
              <button
                type="button"
                aria-label="Remover filtro personalizado"
                onClick={() => controle.onFilterChange('')}
              >
                <X aria-hidden="true" />
              </button>
            </Badge>
          ) : (
            controle.condicoes.map((condicao, indice) => {
              const coluna = tabela.getColumn(condicao.campo);
              const nome = coluna?.columnDef.meta?.rotulo ?? condicao.campo;
              return (
                <Badge key={`${condicao.campo}-${indice}`} variant="outline">
                  {nome}{' '}
                  {resumoCondicao(
                    condicao,
                    coluna?.columnDef.meta?.rotulosValores,
                  )}
                  <button
                    type="button"
                    aria-label={`Remover filtro de ${nome}`}
                    onClick={() => removerCondicao(indice)}
                  >
                    <X aria-hidden="true" />
                  </button>
                </Badge>
              );
            })
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => controle.onFilterChange('')}
          >
            Limpar filtros
          </Button>
        </div>
      )}
      <div className="overflow-hidden rounded-md border">
        <Table aria-label={rotulo}>
          <TableHeader>
            {tabela.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id}>
                {grupo.headers.map((cabecalho) => {
                  const coluna = cabecalho.column;
                  const meta = coluna.columnDef.meta;
                  const ordenada = coluna.getIsSorted();
                  const campo = controle?.esquema.campos.find(
                    (item) => item.nome === meta?.campo,
                  );
                  return (
                    <TableHead
                      key={cabecalho.id}
                      className={alinhamento(coluna.id)}
                      aria-sort={
                        ordenada === 'asc'
                          ? 'ascending'
                          : ordenada === 'desc'
                            ? 'descending'
                            : undefined
                      }
                    >
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          colunasADireita.includes(coluna.id) && 'justify-end',
                        )}
                      >
                        {cabecalho.isPlaceholder ? null : campo?.ordenavel ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="-ml-3 px-2"
                            onClick={coluna.getToggleSortingHandler()}
                            aria-label={`Ordenar por ${meta?.rotulo ?? coluna.id}`}
                          >
                            <tabela.FlexRender header={cabecalho} />
                            {ordenada === 'asc' ? (
                              <ArrowUp aria-hidden="true" />
                            ) : ordenada === 'desc' ? (
                              <ArrowDown aria-hidden="true" />
                            ) : (
                              <ChevronsUpDown aria-hidden="true" />
                            )}
                          </Button>
                        ) : (
                          <tabela.FlexRender header={cabecalho} />
                        )}
                        {controle && campo?.filtravel && (
                          <FiltroColuna
                            key={`${campo.nome}-${controle.filter}`}
                            campo={campo}
                            rotulo={meta?.rotulo ?? campo.nome}
                            esquema={controle.esquema}
                            atual={controle.condicoes?.find(
                              (item) => item.campo === campo.nome,
                            )}
                            rotulosValores={meta?.rotulosValores}
                            onAplicar={atualizarCondicao}
                          />
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tabela.getRowModel().rows.length ? (
              tabela.getRowModel().rows.map((linha) => (
                <TableRow key={linha.id}>
                  {linha.getAllCells().map((celula) => (
                    <TableCell
                      key={celula.id}
                      className={alinhamento(celula.column.id)}
                    >
                      <tabela.FlexRender cell={celula} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tabela.getAllLeafColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {mensagemVazia}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {controle && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {controle.total} {controle.total === 1 ? 'resultado' : 'resultados'}
          </p>
          <nav
            aria-label={`Páginas de ${rotulo.toLowerCase()}`}
            className="flex items-center gap-3"
          >
            <Button
              type="button"
              variant="outline"
              disabled={!tabela.getCanPreviousPage()}
              onClick={() => tabela.previousPage()}
            >
              Anterior
            </Button>
            <span>
              Página {controle.page} de {Math.max(totalPaginas, 1)}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={!tabela.getCanNextPage()}
              onClick={() => tabela.nextPage()}
            >
              Próxima
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}
