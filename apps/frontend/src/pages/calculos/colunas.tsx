import type { ExecucaoCalculoLinha } from '@ssc0536/common';
import { Eye } from 'lucide-react';
import { criarColunas } from '@/components/data-table/recursos';
import { AcoesLinha } from '@/components/acoes-linha';
import { BadgePublicacao, BadgeSituacao } from './components/situacao-calculo';
import { ROTULOS_PUBLICACAO, ROTULOS_SITUACAO_EXECUCAO } from './rotulos';

const formatarInstante = (valor: string | null) =>
  valor === null
    ? '—'
    : new Date(valor).toLocaleString('pt-BR', { timeZone: 'UTC' }) + ' UTC';

const execucao = criarColunas<ExecucaoCalculoLinha>();
export const colunasCalculos = (opcoes: {
  onDetalhar: (linha: ExecucaoCalculoLinha) => void;
}) =>
  execucao.columns([
    execucao.accessor('periodo', {
      header: 'Período',
      meta: { campo: 'periodo', rotulo: 'Período' },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.periodo}</span>
      ),
    }),
    execucao.accessor('pesquisa', {
      header: 'Edição',
      meta: { campo: 'pesquisa', rotulo: 'Edição' },
    }),
    execucao.accessor('revisao', {
      header: 'Revisão',
      meta: { campo: 'revisao', rotulo: 'Revisão' },
      cell: ({ row }) => row.original.revisao ?? '—',
    }),
    execucao.accessor('situacao', {
      header: 'Situação',
      meta: {
        campo: 'situacao',
        rotulo: 'Situação',
        rotulosValores: ROTULOS_SITUACAO_EXECUCAO,
      },
      cell: ({ row }) => <BadgeSituacao situacao={row.original.situacao} />,
    }),
    execucao.accessor('publicacao', {
      header: 'Publicação',
      meta: {
        campo: 'publicacao',
        rotulo: 'Publicação',
        rotulosValores: ROTULOS_PUBLICACAO,
      },
      cell: ({ row }) => (
        <BadgePublicacao publicacao={row.original.publicacao} />
      ),
    }),
    execucao.accessor('solicitadaEm', {
      header: 'Solicitada em',
      meta: { campo: 'solicitadaEm', rotulo: 'Solicitada em' },
      cell: ({ row }) => formatarInstante(row.original.solicitadaEm),
    }),
    execucao.accessor('solicitadaPor', {
      header: 'Solicitada por',
      meta: { campo: 'solicitadaPor', rotulo: 'Solicitada por' },
    }),
    execucao.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={`${row.original.periodo} revisão ${row.original.revisao ?? 'sem número'}`}
          acoes={[
            {
              rotulo: 'Detalhes',
              icone: Eye,
              onSelecionar: () => opcoes.onDetalhar(row.original),
            },
          ]}
        />
      ),
    }),
  ]);
