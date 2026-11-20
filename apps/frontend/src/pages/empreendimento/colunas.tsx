import { Badge } from '@/components/badge';
import {
  situacaoPesquisa,
  type CadasturCadastro,
  type ContatoCadastro,
  type InventarioResumo,
  type PesquisaRespondenteLinha,
  type RespostaResumo,
} from '@ssc0536/common';
import { ClipboardCheck, Eye, Pencil, Send } from 'lucide-react';
import { AcoesLinha } from '@/components/acoes-linha';
import { criarColunas } from '@/components/data-table/recursos';
import {
  ROTULOS_CONFERENCIA,
  ROTULOS_TIPO_ALTERACAO,
  dataBr,
} from '@/utils/inventario';
import {
  ROTULOS_FINALIDADE,
  ROTULOS_SITUACAO_CADASTUR,
  ROTULOS_TIPO_CONTATO,
} from '@/utils/cadastro';
import { formatarInstante } from '@/utils/data-hora';
import {
  CORES_STATUS_PESQUISA,
  CORES_TIPO_COLETA,
  ROTULOS_SITUACAO_RESPOSTA,
  ROTULOS_STATUS_PESQUISA,
  ROTULOS_TIPO_COLETA,
} from '@/utils/pesquisa';

const numero = (valor: number | null) => valor ?? 'desconhecido';

const inventario = criarColunas<InventarioResumo>();
/** Versões do inventário: vigência, tipo, conferência, autor e situação (vigente ou substituída). */
export const colunasInventarios = (opcoes: {
  podeCriar: boolean;
  podeConferir: boolean;
  onDetalhe: (versao: InventarioResumo) => void;
  onCorrigir: (versao: InventarioResumo) => void;
  onConferir: (versao: InventarioResumo) => void;
}) =>
  inventario.columns([
    inventario.accessor('vigenciaInicio', {
      header: 'Vigência desde',
      meta: { campo: 'vigenciaInicio', rotulo: 'Vigência desde' },
      cell: ({ row }) => dataBr(row.original.vigenciaInicio),
    }),
    inventario.accessor('vigenciaFim', {
      header: 'Vigência até',
      meta: { campo: 'vigenciaFim', rotulo: 'Vigência até' },
      cell: ({ row }) =>
        row.original.vigenciaFim ? dataBr(row.original.vigenciaFim) : 'sem fim',
    }),
    inventario.accessor('totalUh', {
      header: 'UH',
      meta: { campo: 'totalUh', rotulo: 'UH' },
      cell: ({ row }) => numero(row.original.totalUh),
    }),
    inventario.accessor('leitos', {
      header: 'Leitos',
      meta: { campo: 'leitos', rotulo: 'Leitos' },
      cell: ({ row }) => numero(row.original.leitos),
    }),
    inventario.accessor('tipoAlteracao', {
      header: 'Tipo',
      meta: {
        campo: 'tipoAlteracao',
        rotulo: 'Tipo',
        rotulosValores: ROTULOS_TIPO_ALTERACAO,
      },
      cell: ({ row }) =>
        ROTULOS_TIPO_ALTERACAO[
          row.original.tipoAlteracao as keyof typeof ROTULOS_TIPO_ALTERACAO
        ] ?? row.original.tipoAlteracao,
    }),
    inventario.accessor('situacaoConferencia', {
      header: 'Conferência',
      meta: {
        campo: 'situacaoConferencia',
        rotulo: 'Conferência',
        rotulosValores: ROTULOS_CONFERENCIA,
      },
      cell: ({ row }) => (
        <Badge
          cor={
            row.original.situacaoConferencia === 'completo'
              ? 'azul'
              : row.original.situacaoConferencia === 'parcial'
                ? 'laranja'
                : 'amarelo'
          }
        >
          {ROTULOS_CONFERENCIA[
            row.original.situacaoConferencia as keyof typeof ROTULOS_CONFERENCIA
          ] ?? row.original.situacaoConferencia}
        </Badge>
      ),
    }),
    inventario.accessor('autor', {
      header: 'Registrada por',
      meta: { campo: 'autor', rotulo: 'Registrada por' },
    }),
    inventario.accessor('criadaEm', {
      header: 'Registrada em',
      meta: { campo: 'criadaEm', rotulo: 'Registrada em' },
      cell: ({ row }) =>
        new Date(row.original.criadaEm).toLocaleDateString('pt-BR'),
    }),
    inventario.accessor('substituidaPorId', {
      header: 'Situação',
      meta: { campo: 'substituidaPorId', rotulo: 'Substituída por (versão)' },
      cell: ({ row }) =>
        row.original.substituidaPorId === null
          ? 'Vigente na linha do tempo'
          : `Substituída pela versão ${row.original.substituidaPorId}`,
    }),
    inventario.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => {
        const v = row.original;
        const aberta = v.substituidaPorId === null;
        return (
          <AcoesLinha
            rotulo={`versão de ${dataBr(v.vigenciaInicio)}`}
            acoes={[
              {
                rotulo: 'Ver detalhes',
                icone: Eye,
                onSelecionar: () => opcoes.onDetalhe(v),
              },
              ...(opcoes.podeCriar && aberta
                ? [
                    {
                      rotulo: 'Corrigir',
                      icone: Pencil,
                      onSelecionar: () => opcoes.onCorrigir(v),
                    },
                  ]
                : []),
              ...(opcoes.podeConferir && aberta
                ? [
                    {
                      rotulo: 'Conferir',
                      icone: ClipboardCheck,
                      onSelecionar: () => opcoes.onConferir(v),
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    }),
  ]);

const resposta = criarColunas<RespostaResumo>();
export const colunasRespostas = (onAbrir: (linha: RespostaResumo) => void) =>
  resposta.columns([
    resposta.accessor('titulo', {
      header: 'Pesquisa',
      meta: { campo: 'titulo', rotulo: 'Pesquisa' },
    }),
    resposta.accessor('respondidaEm', {
      header: 'Respondida em',
      meta: { campo: 'respondidaEm', rotulo: 'Respondida em' },
      cell: ({ row }) =>
        new Date(row.original.respondidaEm).toLocaleDateString('pt-BR'),
    }),
    resposta.accessor('canal', {
      header: 'Canal',
      meta: { campo: 'canal', rotulo: 'Canal' },
    }),
    resposta.display({
      id: 'acoes',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={row.original.titulo}
          acoes={[
            {
              rotulo: 'Ver resposta',
              icone: Eye,
              onSelecionar: () => onAbrir(row.original),
            },
          ]}
        />
      ),
    }),
  ]);

const pesquisa = criarColunas<PesquisaRespondenteLinha>();
/** Painel do empresário: edições destinadas ao empreendimento e a situação da sua resposta. */
export const colunasPesquisasRespondente = (opcoes: {
  onAbrir: (linha: PesquisaRespondenteLinha) => void;
}) =>
  pesquisa.columns([
    pesquisa.accessor('titulo', {
      header: 'Pesquisa',
      meta: { campo: 'titulo', rotulo: 'Pesquisa' },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.titulo}</span>
      ),
    }),
    pesquisa.accessor('tipoColeta', {
      header: 'Tipo',
      meta: {
        campo: 'tipoColeta',
        rotulo: 'Tipo',
        rotulosValores: ROTULOS_TIPO_COLETA,
      },
      cell: ({ row }) => (
        <Badge cor={CORES_TIPO_COLETA[row.original.tipoColeta]}>
          {ROTULOS_TIPO_COLETA[row.original.tipoColeta]}
        </Badge>
      ),
    }),
    pesquisa.accessor('status', {
      header: 'Edição',
      meta: {
        campo: 'status',
        rotulo: 'Edição',
        rotulosValores: ROTULOS_STATUS_PESQUISA,
      },
      cell: ({ row }) => (
        <Badge cor={CORES_STATUS_PESQUISA[row.original.status]}>
          {ROTULOS_STATUS_PESQUISA[row.original.status]}
        </Badge>
      ),
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
    pesquisa.accessor('situacaoResposta', {
      header: 'Sua resposta',
      meta: {
        campo: 'situacaoResposta',
        rotulo: 'Sua resposta',
        rotulosValores: ROTULOS_SITUACAO_RESPOSTA,
      },
      cell: ({ row }) => (
        <Badge
          cor={
            row.original.situacaoResposta === 'respondeu' ? 'azul' : 'amarelo'
          }
        >
          {ROTULOS_SITUACAO_RESPOSTA[row.original.situacaoResposta]}
        </Badge>
      ),
    }),
    pesquisa.accessor('respondidaEm', {
      header: 'Respondida em',
      meta: { campo: 'respondidaEm', rotulo: 'Respondida em' },
      cell: ({ row }) =>
        row.original.respondidaEm
          ? formatarInstante(row.original.respondidaEm)
          : '—',
    }),
    pesquisa.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={row.original.titulo}
          acoes={[
            {
              rotulo:
                row.original.situacaoResposta === 'respondeu'
                  ? 'Ver resposta'
                  : situacaoPesquisa(row.original, new Date()) === 'recebendo'
                    ? 'Responder'
                    : 'Ver pesquisa',
              icone: row.original.situacaoResposta === 'pendente' ? Send : Eye,
              onSelecionar: () => opcoes.onAbrir(row.original),
            },
          ]}
        />
      ),
    }),
  ]);

const contato = criarColunas<ContatoCadastro>();
export const colunasContatos = contato.columns([
  contato.accessor('tipo', {
    header: 'Tipo',
    meta: {
      campo: 'tipo',
      rotulo: 'Tipo',
      rotulosValores: ROTULOS_TIPO_CONTATO,
    },
    cell: ({ row }) => ROTULOS_TIPO_CONTATO[row.original.tipo],
  }),
  contato.accessor('valor', {
    header: 'Contato',
    meta: { campo: 'valor', rotulo: 'Contato' },
  }),
  contato.accessor('finalidade', {
    header: 'Finalidade',
    meta: {
      campo: 'finalidade',
      rotulo: 'Finalidade',
      rotulosValores: ROTULOS_FINALIDADE,
    },
    cell: ({ row }) => ROTULOS_FINALIDADE[row.original.finalidade],
  }),
  contato.accessor('responsavelNome', {
    header: 'Responsável',
    meta: { campo: 'responsavelNome', rotulo: 'Responsável' },
    cell: ({ row }) => row.original.responsavelNome ?? '—',
  }),
  contato.accessor('responsavelCargo', {
    header: 'Cargo',
    meta: { campo: 'responsavelCargo', rotulo: 'Cargo' },
    cell: ({ row }) => row.original.responsavelCargo ?? '—',
  }),
]);

const cadastur = criarColunas<CadasturCadastro>();
export const colunasCadastur = cadastur.columns([
  cadastur.accessor('situacao', {
    header: 'Situação',
    meta: {
      campo: 'situacao',
      rotulo: 'Situação',
      rotulosValores: ROTULOS_SITUACAO_CADASTUR,
    },
    cell: ({ row }) => (
      <Badge cor={row.original.situacao === 'nao_possui' ? 'amarelo' : 'azul'}>
        {ROTULOS_SITUACAO_CADASTUR[row.original.situacao]}
      </Badge>
    ),
  }),
  cadastur.accessor('numero', {
    header: 'Número',
    meta: { campo: 'numero', rotulo: 'Número' },
    cell: ({ row }) => row.original.numero ?? '—',
  }),
  cadastur.accessor('vencimento', {
    header: 'Vencimento',
    meta: { campo: 'vencimento', rotulo: 'Vencimento' },
    cell: ({ row }) => dataBr(row.original.vencimento),
  }),
]);
