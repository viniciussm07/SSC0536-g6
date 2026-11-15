import type { EventoAuditoriaResumo } from '@ssc0536/common';
import { Eye } from 'lucide-react';
import { criarColunas } from '@/components/data-table/recursos';
import { AcoesLinha } from '@/components/acoes-linha';
export const ROTULOS_ORIGEM = {
  manual: 'Pessoa',
  automatica: 'Processo automático',
};
const coluna = criarColunas<EventoAuditoriaResumo>();
export const colunasAuditoria = (
  onDetalhe: (evento: EventoAuditoriaResumo) => void,
) =>
  coluna.columns([
    coluna.accessor('id', {
      header: 'Evento',
      meta: { campo: 'id', rotulo: 'Evento' },
    }),
    coluna.accessor('em', {
      header: 'Data e hora',
      meta: { campo: 'em', rotulo: 'Data e hora' },
      cell: ({ row }) => new Date(row.original.em).toLocaleString('pt-BR'),
    }),
    coluna.accessor('entidade', {
      header: 'Entidade',
      meta: { campo: 'entidade', rotulo: 'Entidade' },
    }),
    coluna.accessor('entidadeId', {
      header: 'Registro',
      meta: { campo: 'entidadeId', rotulo: 'Registro' },
    }),
    coluna.accessor('acao', {
      header: 'Ação',
      meta: { campo: 'acao', rotulo: 'Ação' },
    }),
    coluna.accessor('autor', {
      header: 'Autor',
      meta: { campo: 'autor', rotulo: 'Autor' },
    }),
    coluna.accessor('usuarioId', {
      header: 'ID da pessoa',
      meta: { campo: 'usuarioId', rotulo: 'ID da pessoa' },
      cell: ({ row }) => row.original.usuarioId ?? '—',
    }),
    coluna.accessor('origem', {
      header: 'Origem',
      meta: {
        campo: 'origem',
        rotulo: 'Origem',
        rotulosValores: ROTULOS_ORIGEM,
      },
      cell: ({ row }) => ROTULOS_ORIGEM[row.original.origem],
    }),
    coluna.accessor('processo', {
      header: 'Processo',
      meta: { campo: 'processo', rotulo: 'Processo' },
      cell: ({ row }) => row.original.processo ?? '—',
    }),
    coluna.accessor('correlacaoId', {
      header: 'Correlação',
      meta: { campo: 'correlacaoId', rotulo: 'Correlação' },
      cell: ({ row }) => row.original.correlacaoId ?? '—',
    }),
    coluna.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={`evento ${row.original.id}`}
          acoes={[
            {
              rotulo: 'Ver detalhes',
              icone: Eye,
              onSelecionar: () => onDetalhe(row.original),
            },
          ]}
        />
      ),
    }),
  ]);
