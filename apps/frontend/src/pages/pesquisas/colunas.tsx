import { situacaoPesquisa } from '@ssc0536/common';
import type { DestinatarioLinha, PesquisaLinha } from '@ssc0536/common';
import { Eye, Pencil } from 'lucide-react';
import { criarColunas } from '@/components/data-table/recursos';
import { AcoesLinha } from '@/components/acoes-linha';
import { Badge } from '@/components/badge';
import { formatarInstante } from '@/utils/data-hora';
import {
  CORES_SITUACAO_PESQUISA,
  CORES_TIPO_COLETA,
  ROTULOS_SITUACAO_PESQUISA,
  ROTULOS_SITUACAO_RESPOSTA,
  ROTULOS_STATUS_PESQUISA,
  ROTULOS_TIPO_COLETA,
} from '@/utils/pesquisa';

const pesquisa = criarColunas<PesquisaLinha>();
export const colunasPesquisas = (opcoes: {
  onAcompanhar: (linha: PesquisaLinha) => void;
  onEditar: (linha: PesquisaLinha) => void;
  podeAlterar: boolean;
}) =>
  pesquisa.columns([
    pesquisa.accessor('titulo', {
      header: 'Título',
      meta: { campo: 'titulo', rotulo: 'Título' },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.titulo}</span>
      ),
    }),
    pesquisa.accessor('tipoColeta', {
      header: 'Tipo de coleta',
      meta: {
        campo: 'tipoColeta',
        rotulo: 'Tipo de coleta',
        rotulosValores: ROTULOS_TIPO_COLETA,
      },
      cell: ({ row }) => (
        <Badge cor={CORES_TIPO_COLETA[row.original.tipoColeta]}>
          {ROTULOS_TIPO_COLETA[row.original.tipoColeta]}
        </Badge>
      ),
    }),
    pesquisa.accessor('status', {
      header: 'Estado',
      meta: {
        campo: 'status',
        rotulo: 'Estado',
        rotulosValores: ROTULOS_STATUS_PESQUISA,
      },
      cell: ({ row }) => {
        const situacao = situacaoPesquisa(row.original, new Date());
        return (
          <Badge cor={CORES_SITUACAO_PESQUISA[situacao]}>
            {ROTULOS_SITUACAO_PESQUISA[situacao]}
          </Badge>
        );
      },
    }),
    pesquisa.accessor('abertura', {
      header: 'Abertura',
      meta: { campo: 'abertura', rotulo: 'Abertura' },
      cell: ({ row }) => formatarInstante(row.original.abertura),
    }),
    pesquisa.accessor('prazo', {
      header: 'Prazo',
      meta: { campo: 'prazo', rotulo: 'Prazo' },
      cell: ({ row }) => formatarInstante(row.original.prazo),
    }),
    pesquisa.accessor('modeloVersao', {
      header: 'Versão do modelo',
      meta: { campo: 'modeloVersao', rotulo: 'Versão do modelo' },
      cell: ({ row }) => `v${row.original.modeloVersao}`,
    }),
    pesquisa.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={row.original.titulo}
          acoes={[
            {
              rotulo: 'Acompanhar',
              icone: Eye,
              onSelecionar: () => opcoes.onAcompanhar(row.original),
            },
            ...(opcoes.podeAlterar && row.original.status !== 'encerrada'
              ? [
                  {
                    rotulo: 'Editar',
                    icone: Pencil,
                    onSelecionar: () => opcoes.onEditar(row.original),
                  },
                ]
              : []),
          ]}
        />
      ),
    }),
  ]);

const destinatario = criarColunas<DestinatarioLinha>();
export const colunasDestinatarios = destinatario.columns([
  destinatario.accessor('nomeFantasia', {
    header: 'Empreendimento',
    meta: { campo: 'nomeFantasia', rotulo: 'Empreendimento' },
  }),
  destinatario.accessor('situacaoResposta', {
    header: 'Situação',
    meta: {
      campo: 'situacaoResposta',
      rotulo: 'Situação',
      rotulosValores: ROTULOS_SITUACAO_RESPOSTA,
    },
    cell: ({ row }) => (
      <Badge
        cor={row.original.situacaoResposta === 'respondeu' ? 'azul' : 'amarelo'}
      >
        {ROTULOS_SITUACAO_RESPOSTA[row.original.situacaoResposta]}
      </Badge>
    ),
  }),
  destinatario.accessor('respondidaEm', {
    header: 'Respondida em',
    meta: { campo: 'respondidaEm', rotulo: 'Respondida em' },
    cell: ({ row }) =>
      row.original.respondidaEm
        ? formatarInstante(row.original.respondidaEm)
        : '—',
  }),
]);
