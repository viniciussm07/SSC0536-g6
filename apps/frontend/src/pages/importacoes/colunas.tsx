import { FileSearch } from 'lucide-react';
import type {
  EstadoLote,
  FonteImportacao,
  LoteImportacaoLinha,
} from '@ssc0536/common';
import { AcoesLinha } from '@/components/acoes-linha';
import { Badge, type CorBadge } from '@/components/badge';
import { criarColunas } from '@/components/data-table/recursos';

export const ROTULOS_FONTE: Record<FonteImportacao, string> = {
  tabulacao_consolidado: 'Tabulação de ocupação consolidada',
};
/** Estado da leitura do arquivo; a confirmação é outra etapa, mostrada no detalhe. */
export const ROTULOS_ESTADO: Record<EstadoLote, string> = {
  recebido: 'Recebido',
  lendo: 'Em leitura',
  lido: 'Leitura concluída',
  erro: 'Erro na leitura',
};
export const CORES_ESTADO: Record<EstadoLote, CorBadge> = {
  recebido: 'cinza',
  lendo: 'amarelo',
  lido: 'azul',
  erro: 'vermelho',
};

export const formatarTamanho = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
export const formatarInstante = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR') : '—';

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
              rotulo: 'Ver leitura',
              icone: FileSearch,
              onSelecionar: () => opcoes.onVer(row.original),
            },
          ]}
        />
      ),
    }),
  ]);
