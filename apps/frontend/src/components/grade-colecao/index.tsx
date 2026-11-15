import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColecaoOData, EsquemaOData } from '@ssc0536/common';
import { montarOrdenacao } from '@ssc0536/common';
import { DataTable } from '@/components/data-table';
import type { Colunas } from '@/components/data-table/recursos';
import { Button } from '@/components/ui/button';
import { useGradeNaUrl } from '@/hooks/use-grade-na-url';
import type { ConsultaColecao } from '@/services/odata';
import {
  TAMANHO_PAGINA_GRADE,
  condicoesEditaveis,
  consultaDaGrade,
  ordenacaoDaGrade,
} from '@/utils/grade';

/**
 * Grade de uma coleção OData: busca no servidor com o estado da URL e renderiza a `DataTable`
 * com os estados de carregamento, erro, vazio e sucesso. A query key inclui a consulta.
 */
export function GradeColecao<T>({
  id,
  rotulo,
  esquema,
  colunas,
  getRowId,
  chave,
  buscar,
  habilitado = true,
  colunasADireita,
  mensagemVazia,
}: {
  /** Prefixo dos search params (`<id>.filter`, `<id>.orderby`, `<id>.page`). */
  id: string;
  rotulo: string;
  esquema: EsquemaOData;
  colunas: Colunas<T & object>;
  getRowId: (linha: T) => string;
  /** Prefixo da query key (recurso, identidade, revisão, escopo); a consulta é acrescentada. */
  chave: readonly unknown[];
  buscar: (
    consulta: ConsultaColecao,
    signal: AbortSignal,
  ) => Promise<ColecaoOData<T>>;
  habilitado?: boolean;
  colunasADireita?: readonly string[];
  mensagemVazia?: string;
}) {
  const grade = useGradeNaUrl(id);
  const consulta = consultaDaGrade(grade);
  const lista = useQuery({
    queryKey: [...chave, consulta],
    queryFn: ({ signal }) => buscar(consulta, signal),
    enabled: habilitado,
    placeholderData: keepPreviousData,
    retry: false,
  });
  if (lista.isPending)
    return <p role="status">Carregando {rotulo.toLowerCase()}…</p>;
  if (lista.isError)
    return (
      <div className="space-y-2">
        <p role="alert">{lista.error.message}</p>
        <Button variant="outline" onClick={() => void lista.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  return (
    <DataTable
      rotulo={rotulo}
      colunas={colunas}
      dados={lista.data.data as (T & object)[]}
      getRowId={getRowId as (linha: T & object) => string}
      colunasADireita={colunasADireita}
      mensagemVazia={mensagemVazia}
      controle={{
        esquema,
        filter: grade.filter,
        condicoes: condicoesEditaveis(grade.filter, esquema),
        ordenacao: ordenacaoDaGrade(grade.orderby, esquema),
        page: grade.page,
        pageSize: TAMANHO_PAGINA_GRADE,
        total: lista.data.meta.total ?? lista.data.data.length,
        onFilterChange: grade.setFilter,
        onOrderbyChange: (proxima) =>
          grade.setOrderby(montarOrdenacao(proxima)),
        onPageChange: grade.setPage,
      }}
    />
  );
}
