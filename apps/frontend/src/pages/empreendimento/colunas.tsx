import type {
  CadasturCadastro,
  ContatoCadastro,
  InventarioResumo,
  RespostaResumo,
} from '@ssc0536/common';
import { ClipboardCheck, Eye, Pencil } from 'lucide-react';
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
      cell: ({ row }) =>
        ROTULOS_CONFERENCIA[
          row.original.situacaoConferencia as keyof typeof ROTULOS_CONFERENCIA
        ] ?? row.original.situacaoConferencia,
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
export const colunasRespostas = resposta.columns([
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
    cell: ({ row }) => ROTULOS_SITUACAO_CADASTUR[row.original.situacao],
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
