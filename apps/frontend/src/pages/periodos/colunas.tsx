import type { PeriodoLinha, TipoPeriodo } from '@ssc0536/common';
import { criarColunas } from '@/components/data-table/recursos';
import { Pencil } from 'lucide-react';
import { AcoesLinha } from '@/components/acoes-linha';
import { Badge } from '@/components/badge';

export const ROTULOS_TIPO_PERIODO: Record<TipoPeriodo, string> = {
  mes: 'Mês de referência',
  feriado_prolongado: 'Feriado prolongado',
};
const CORES_TIPO_PERIODO: Record<TipoPeriodo, 'azul' | 'laranja'> = {
  mes: 'azul',
  feriado_prolongado: 'laranja',
};

const periodo = criarColunas<PeriodoLinha>();
export const colunasPeriodos = (opcoes: {
  onEditar: (periodo: PeriodoLinha) => void;
}) =>
  periodo.columns([
    periodo.accessor('tipo', {
      header: 'Tipo',
      meta: {
        campo: 'tipo',
        rotulo: 'Tipo',
        rotulosValores: ROTULOS_TIPO_PERIODO,
      },
      cell: ({ row }) => (
        <Badge cor={CORES_TIPO_PERIODO[row.original.tipo]}>
          {ROTULOS_TIPO_PERIODO[row.original.tipo]}
        </Badge>
      ),
    }),
    periodo.accessor('rotulo', {
      header: 'Rótulo',
      meta: { campo: 'rotulo', rotulo: 'Rótulo' },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.rotulo}</span>
      ),
    }),
    periodo.accessor('dataInicio', {
      header: 'Início',
      meta: { campo: 'dataInicio', rotulo: 'Início' },
    }),
    periodo.accessor('dataFim', {
      header: 'Fim',
      meta: { campo: 'dataFim', rotulo: 'Fim' },
    }),
    periodo.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={row.original.rotulo}
          acoes={[
            {
              rotulo: 'Editar',
              icone: Pencil,
              onSelecionar: () => opcoes.onEditar(row.original),
            },
          ]}
        />
      ),
    }),
  ]);
