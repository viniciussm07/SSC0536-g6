import { situacaoPesquisa } from '@ssc0536/common';
import type {
  DestinatarioLinha,
  PesquisaLinha,
  SituacaoDestinatario,
  SituacaoPesquisa,
  StatusPesquisa,
  TipoColeta,
} from '@ssc0536/common';
import { Eye, Pencil } from 'lucide-react';
import { criarColunas } from '@/components/data-table/recursos';
import { AcoesLinha } from '@/components/acoes-linha';
import { Badge, type CorBadge } from '@/components/badge';
import { formatarInstante } from '@/utils/data-hora';

export const ROTULOS_TIPO_COLETA: Record<TipoColeta, string> = {
  expectativa: 'Expectativa',
  consolidado: 'Consolidado',
};
export const ROTULOS_STATUS: Record<StatusPesquisa, string> = {
  rascunho: 'Rascunho',
  aberta: 'Aberta',
  encerrada: 'Encerrada',
};
export const ROTULOS_SITUACAO: Record<SituacaoPesquisa, string> = {
  rascunho: 'Rascunho',
  agendada: 'Agendada',
  recebendo: 'Recebendo respostas',
  expirada: 'Prazo vencido',
  encerrada: 'Encerrada',
};
export const CORES_SITUACAO: Record<SituacaoPesquisa, CorBadge> = {
  rascunho: 'cinza',
  agendada: 'azul',
  recebendo: 'laranja',
  expirada: 'amarelo',
  encerrada: 'escuro',
};
export const ROTULOS_SITUACAO_DESTINATARIO: Record<
  SituacaoDestinatario,
  string
> = { respondeu: 'Respondeu', pendente: 'Pendente' };

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
        <Badge
          cor={row.original.tipoColeta === 'expectativa' ? 'azul' : 'laranja'}
        >
          {ROTULOS_TIPO_COLETA[row.original.tipoColeta]}
        </Badge>
      ),
    }),
    pesquisa.accessor('status', {
      header: 'Estado',
      meta: {
        campo: 'status',
        rotulo: 'Estado',
        rotulosValores: ROTULOS_STATUS,
      },
      cell: ({ row }) => {
        const situacao = situacaoPesquisa(row.original, new Date());
        return (
          <Badge cor={CORES_SITUACAO[situacao]}>
            {ROTULOS_SITUACAO[situacao]}
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
      rotulosValores: ROTULOS_SITUACAO_DESTINATARIO,
    },
    cell: ({ row }) => (
      <Badge
        cor={row.original.situacaoResposta === 'respondeu' ? 'azul' : 'amarelo'}
      >
        {ROTULOS_SITUACAO_DESTINATARIO[row.original.situacaoResposta]}
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
