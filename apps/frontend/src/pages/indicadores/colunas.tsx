import type { IndicadorConsulta } from '@ssc0536/common';
import { criarColunas } from '@/components/data-table/recursos';
import {
  ROTULOS_METODO,
  ROTULOS_RECORTE,
  ROTULOS_TIPO_COLETA,
  ROTULOS_TIPO_PERIODO,
  formatarDataCivil,
  formatarValor,
  rotuloMetodo,
  rotuloRecorte,
  rotuloTipoColeta,
  rotuloTipoPeriodo,
} from '@/utils/indicadores';

// Ordem pensada para tela estreita (~360 px visíveis): o nome quebra linha e as colunas curtas
// (coleta, recorte, valor) vêm antes dos textos longos do período, que ficam na rolagem.
const coluna = criarColunas<IndicadorConsulta>();
export const colunasIndicadores = coluna.columns([
  coluna.accessor('nome', {
    header: 'Indicador',
    meta: { campo: 'nome', rotulo: 'Indicador' },
    cell: ({ row }) => (
      <span className="block min-w-32 max-w-44 whitespace-normal">
        {row.original.nome}
      </span>
    ),
  }),
  coluna.accessor('tipoColeta', {
    header: 'Coleta',
    meta: {
      campo: 'tipoColeta',
      rotulo: 'Coleta',
      rotulosValores: ROTULOS_TIPO_COLETA,
    },
    cell: ({ row }) => rotuloTipoColeta(row.original.tipoColeta),
  }),
  coluna.accessor('recorte', {
    header: 'Recorte',
    meta: {
      campo: 'recorte',
      rotulo: 'Recorte',
      rotulosValores: ROTULOS_RECORTE,
    },
    cell: ({ row }) => rotuloRecorte(row.original.recorte),
  }),
  coluna.accessor('valor', {
    header: 'Valor',
    meta: { campo: 'valor', rotulo: 'Valor' },
    cell: ({ row }) => formatarValor(row.original.valor, row.original.unidade),
  }),
  coluna.accessor('periodo', {
    header: 'Período',
    meta: { campo: 'periodo', rotulo: 'Período' },
    cell: ({ row }) => (
      <span className="block min-w-36 max-w-56 whitespace-normal">
        {row.original.periodo}
      </span>
    ),
  }),
  coluna.accessor('unidade', {
    header: 'Unidade',
    meta: { campo: 'unidade', rotulo: 'Unidade' },
  }),
  coluna.accessor('metodo', {
    header: 'Método',
    meta: { campo: 'metodo', rotulo: 'Método', rotulosValores: ROTULOS_METODO },
    cell: ({ row }) => rotuloMetodo(row.original.metodo),
  }),
  coluna.accessor('periodoTipo', {
    header: 'Tipo de período',
    meta: {
      campo: 'periodoTipo',
      rotulo: 'Tipo de período',
      rotulosValores: ROTULOS_TIPO_PERIODO,
    },
    cell: ({ row }) => rotuloTipoPeriodo(row.original.periodoTipo),
  }),
  coluna.accessor('periodoInicio', {
    header: 'Início',
    meta: { campo: 'periodoInicio', rotulo: 'Início' },
    cell: ({ row }) => formatarDataCivil(row.original.periodoInicio),
  }),
  coluna.accessor('periodoFim', {
    header: 'Fim',
    meta: { campo: 'periodoFim', rotulo: 'Fim' },
    cell: ({ row }) => formatarDataCivil(row.original.periodoFim),
  }),
]);
