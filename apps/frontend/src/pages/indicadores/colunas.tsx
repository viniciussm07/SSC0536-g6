import type { IndicadorConsulta } from '@ssc0536/common';
import { criarColunas } from '@/components/data-table/recursos';

const coluna = criarColunas<IndicadorConsulta>();
export const colunasIndicadores = coluna.columns([
  coluna.accessor('nome', {
    header: 'Indicador',
    meta: { campo: 'nome', rotulo: 'Indicador' },
  }),
  coluna.accessor('valor', {
    header: 'Valor',
    meta: { campo: 'valor', rotulo: 'Valor' },
  }),
  coluna.accessor('unidade', {
    header: 'Unidade',
    meta: { campo: 'unidade', rotulo: 'Unidade' },
  }),
  coluna.accessor('periodo', {
    header: 'Período',
    meta: { campo: 'periodo', rotulo: 'Período' },
  }),
  coluna.accessor('tipoColeta', {
    header: 'Coleta',
    meta: { campo: 'tipoColeta', rotulo: 'Coleta' },
  }),
  coluna.accessor('recorte', {
    header: 'Recorte',
    meta: { campo: 'recorte', rotulo: 'Recorte' },
  }),
  coluna.accessor('metodo', {
    header: 'Método',
    meta: { campo: 'metodo', rotulo: 'Método' },
  }),
]);
