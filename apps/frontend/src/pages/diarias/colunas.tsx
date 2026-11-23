import type {
  ColetaDiariaLinha,
  ParametroCalculoLinha,
  RhcPeriodoLinha,
  SituacaoConferenciaFonte,
  SituacaoParametro,
  TipoDia,
} from '@ssc0536/common';
import { criarColunas } from '@/components/data-table/recursos';
import { Pencil } from 'lucide-react';
import { AcoesLinha } from '@/components/acoes-linha';
import { Badge, type CorBadge } from '@/components/badge';

export const ROTULOS_CONFERENCIA: Record<SituacaoConferenciaFonte, string> = {
  pendente: 'Pendente',
  conferida: 'Conferida',
  divergente: 'Divergente',
};
const CORES_CONFERENCIA: Record<SituacaoConferenciaFonte, CorBadge> = {
  pendente: 'amarelo',
  conferida: 'azul',
  divergente: 'vermelho',
};
export const ROTULOS_TIPO_DIA: Record<TipoDia, string> = {
  semana: 'Semana',
  fim_de_semana: 'Fim de semana',
};
export const ROTULOS_SITUACAO_PARAMETRO: Record<SituacaoParametro, string> = {
  hipotese_pendente_homologacao: 'Hipótese pendente',
  homologado: 'Homologado',
};

const renderConferencia = (situacao: SituacaoConferenciaFonte) => (
  <Badge cor={CORES_CONFERENCIA[situacao]}>
    {ROTULOS_CONFERENCIA[situacao]}
  </Badge>
);

const coleta = criarColunas<ColetaDiariaLinha>();
export const colunasColetas = (opcoes: {
  onEditar: (linha: ColetaDiariaLinha) => void;
}) =>
  coleta.columns([
    coleta.accessor('empreendimentoNome', {
      header: 'Empreendimento',
      meta: { campo: 'empreendimentoNome', rotulo: 'Empreendimento' },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.empreendimentoNome}</span>
      ),
    }),
    coleta.accessor('periodoRotulo', {
      header: 'Período',
      meta: { campo: 'periodoRotulo', rotulo: 'Período' },
    }),
    coleta.accessor('fonte', {
      header: 'Fonte',
      meta: { campo: 'fonte', rotulo: 'Fonte' },
    }),
    coleta.accessor('dataEstadia', {
      header: 'Estadia',
      meta: { campo: 'dataEstadia', rotulo: 'Estadia' },
    }),
    coleta.accessor('dataColeta', {
      header: 'Coleta',
      meta: { campo: 'dataColeta', rotulo: 'Coleta' },
    }),
    coleta.accessor('tipoDia', {
      header: 'Tipo de dia',
      meta: {
        campo: 'tipoDia',
        rotulo: 'Tipo de dia',
        rotulosValores: ROTULOS_TIPO_DIA,
      },
      cell: ({ row }) => ROTULOS_TIPO_DIA[row.original.tipoDia],
    }),
    coleta.accessor('valorDiaria', {
      header: 'Diária',
      meta: { campo: 'valorDiaria', rotulo: 'Diária' },
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.moeda} {row.original.valorDiaria}
        </span>
      ),
    }),
    coleta.accessor('situacaoConferencia', {
      header: 'Conferência',
      meta: {
        campo: 'situacaoConferencia',
        rotulo: 'Conferência',
        rotulosValores: ROTULOS_CONFERENCIA,
      },
      cell: ({ row }) => renderConferencia(row.original.situacaoConferencia),
    }),
    coleta.accessor('origem', {
      header: 'Origem',
      meta: { campo: 'origem', rotulo: 'Origem' },
      cell: ({ row }) =>
        row.original.origem === 'manual' ? 'Manual' : 'Importação',
    }),
    coleta.accessor('referenciaOrigem', {
      header: 'Referência',
      meta: { campo: 'referenciaOrigem', rotulo: 'Referência' },
      cell: ({ row }) => row.original.referenciaOrigem ?? '—',
    }),
    coleta.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={`${row.original.empreendimentoNome} em ${row.original.dataEstadia}`}
          acoes={[
            {
              rotulo: 'Editar',
              icone: Pencil,
              onSelecionar: () => opcoes.onEditar(row.original),
            },
          ]}
        />
      ),
    }),
  ]);

const rhc = criarColunas<RhcPeriodoLinha>();
export const colunasRhc = (opcoes: {
  onEditar: (linha: RhcPeriodoLinha) => void;
}) =>
  rhc.columns([
    rhc.accessor('periodoRotulo', {
      header: 'Período',
      meta: { campo: 'periodoRotulo', rotulo: 'Período' },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.periodoRotulo}</span>
      ),
    }),
    rhc.accessor('qtdRhc', {
      header: 'Casas RHC',
      meta: { campo: 'qtdRhc', rotulo: 'Casas RHC' },
    }),
    rhc.accessor('leitos', {
      header: 'Leitos',
      meta: { campo: 'leitos', rotulo: 'Leitos' },
    }),
    rhc.accessor('revisao', {
      header: 'Revisão',
      meta: { campo: 'revisao', rotulo: 'Revisão' },
    }),
    rhc.accessor('situacaoConferencia', {
      header: 'Conferência',
      meta: {
        campo: 'situacaoConferencia',
        rotulo: 'Conferência',
        rotulosValores: ROTULOS_CONFERENCIA,
      },
      cell: ({ row }) => renderConferencia(row.original.situacaoConferencia),
    }),
    rhc.accessor('origem', {
      header: 'Origem',
      meta: { campo: 'origem', rotulo: 'Origem' },
    }),
    rhc.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={`RHC de ${row.original.periodoRotulo}`}
          acoes={[
            {
              rotulo: 'Editar',
              icone: Pencil,
              onSelecionar: () => opcoes.onEditar(row.original),
            },
          ]}
        />
      ),
    }),
  ]);

const parametro = criarColunas<ParametroCalculoLinha>();
export const colunasParametros = (opcoes: {
  onEditar: (linha: ParametroCalculoLinha) => void;
}) =>
  parametro.columns([
    parametro.accessor('chave', {
      header: 'Chave',
      meta: { campo: 'chave', rotulo: 'Chave' },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.chave}</span>
      ),
    }),
    parametro.accessor('valor', {
      header: 'Valor',
      meta: { campo: 'valor', rotulo: 'Valor' },
    }),
    parametro.accessor('unidade', {
      header: 'Unidade',
      meta: { campo: 'unidade', rotulo: 'Unidade' },
    }),
    parametro.accessor('fonte', {
      header: 'Fonte',
      meta: { campo: 'fonte', rotulo: 'Fonte' },
      cell: ({ row }) => row.original.fonte ?? '—',
    }),
    parametro.accessor('vigenciaInicio', {
      header: 'Vigência inicial',
      meta: { campo: 'vigenciaInicio', rotulo: 'Vigência inicial' },
    }),
    parametro.accessor('vigenciaFim', {
      header: 'Vigência final',
      meta: { campo: 'vigenciaFim', rotulo: 'Vigência final' },
      cell: ({ row }) => row.original.vigenciaFim ?? '—',
    }),
    parametro.accessor('situacao', {
      header: 'Situação',
      meta: {
        campo: 'situacao',
        rotulo: 'Situação',
        rotulosValores: ROTULOS_SITUACAO_PARAMETRO,
      },
      cell: ({ row }) => (
        <Badge
          cor={row.original.situacao === 'homologado' ? 'azul' : 'amarelo'}
        >
          {ROTULOS_SITUACAO_PARAMETRO[row.original.situacao]}
        </Badge>
      ),
    }),
    parametro.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={`parâmetro ${row.original.chave}`}
          acoes={[
            {
              rotulo: 'Editar',
              icone: Pencil,
              onSelecionar: () => opcoes.onEditar(row.original),
            },
          ]}
        />
      ),
    }),
  ]);
