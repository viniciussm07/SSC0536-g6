import type {
  CadasturCadastro,
  ContatoCadastro,
  InventarioResumo,
  RespostaResumo,
} from '@ssc0536/common';
import { criarColunas } from '@/components/data-table/recursos';
import {
  ROTULOS_FINALIDADE,
  ROTULOS_SITUACAO_CADASTUR,
  ROTULOS_TIPO_CONTATO,
} from '@/utils/cadastro';

const dataBr = (data: string | null) =>
  data ? data.split('-').reverse().join('/') : '—';
const ROTULOS_CONFERENCIA = {
  completo: 'Completo',
  parcial: 'Parcial',
  pendente: 'Pendente',
};
const numero = (valor: number | null) => valor ?? 'desconhecido';

const inventario = criarColunas<InventarioResumo>();
export const colunasInventarios = inventario.columns([
  inventario.accessor('vigenciaInicio', {
    header: 'Vigência desde',
    meta: { campo: 'vigenciaInicio', rotulo: 'Vigência desde' },
    cell: ({ row }) => dataBr(row.original.vigenciaInicio),
  }),
  inventario.accessor('vigenciaFim', {
    header: 'Vigência até',
    meta: { campo: 'vigenciaFim', rotulo: 'Vigência até' },
    cell: ({ row }) => dataBr(row.original.vigenciaFim),
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
