import { FileSearch } from 'lucide-react';
import type { LoteImportacaoLinha } from '@ssc0536/common';
import { AcoesLinha } from '@/components/acoes-linha';
import { Badge } from '@/components/badge';
import { criarColunas } from '@/components/data-table/recursos';

import {
  CORES_ESTADO,
  ROTULOS_ESTADO,
  ROTULOS_FONTE,
  formatarInstante,
  formatarTamanho,
} from '@/utils/importacao';

const lote = criarColunas<LoteImportacaoLinha>();
export const colunasLotes = (opcoes: {
  onVer: (lote: LoteImportacaoLinha) => void;
}) =>
  lote.columns([
    lote.accessor('nomeArquivo', {
      header: 'Arquivo',
      meta: { campo: 'nomeArquivo', rotulo: 'Arquivo' },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.nomeArquivo}</span>
      ),
    }),
    lote.accessor('fonte', {
      header: 'Fonte',
      meta: {
        campo: 'fonte',
        rotulo: 'Fonte',
        rotulosValores: ROTULOS_FONTE,
      },
      cell: ({ row }) => ROTULOS_FONTE[row.original.fonte],
    }),
    lote.accessor('estado', {
      header: 'Estado',
      meta: {
        campo: 'estado',
        rotulo: 'Estado',
        rotulosValores: ROTULOS_ESTADO,
      },
      cell: ({ row }) => (
        <Badge cor={CORES_ESTADO[row.original.estado]}>
          {ROTULOS_ESTADO[row.original.estado]}
        </Badge>
      ),
    }),
    lote.accessor('tamanhoBytes', {
      header: 'Tamanho',
      meta: { campo: 'tamanhoBytes', rotulo: 'Tamanho' },
      cell: ({ row }) => formatarTamanho(row.original.tamanhoBytes),
    }),
    lote.accessor('criadoEm', {
      header: 'Recebido em',
      meta: { campo: 'criadoEm', rotulo: 'Recebido em' },
      cell: ({ row }) => formatarInstante(row.original.criadoEm),
    }),
    lote.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={row.original.nomeArquivo}
          acoes={[
            {
              rotulo: 'Abrir',
              icone: FileSearch,
              onSelecionar: () => opcoes.onVer(row.original),
            },
          ]}
        />
      ),
    }),
  ]);
