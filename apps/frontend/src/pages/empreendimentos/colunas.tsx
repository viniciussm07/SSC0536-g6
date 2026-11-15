import type { EmpreendimentoListado } from '@ssc0536/common';
import { Badge } from '@/components/ui/badge';
import { criarColunas } from '@/components/data-table/recursos';
import { ROTULOS_PENDENCIA, ROTULOS_SITUACAO } from '@/utils/cadastro';
import { rotuloIdentificacao } from '@/utils/documento';
import { AcoesEmpreendimento } from './components/acoes-empreendimento';

const coluna = criarColunas<EmpreendimentoListado>();

/** Colunas da grade de empreendimentos (estáveis, em escopo de módulo, como exige o TanStack Table). */
export const colunasEmpreendimentos = coluna.columns([
  coluna.accessor('nomeFantasia', {
    header: 'Empreendimento',
    meta: { campo: 'nomeFantasia', rotulo: 'Empreendimento' },
    cell: ({ row }) => (
      <>
        <span className="block font-medium">{row.original.nomeFantasia}</span>
        {row.original.tipoHospedagem && (
          <span className="block text-xs text-muted-foreground">
            {row.original.tipoHospedagem}
          </span>
        )}
      </>
    ),
  }),
  coluna.accessor((linha) => linha.cnpj ?? String(linha.id), {
    id: 'identificacao',
    header: 'Identificação',
    enableSorting: false,
    meta: { campo: 'identificacao', rotulo: 'Identificação' },
    cell: ({ row }) => rotuloIdentificacao(row.original.cnpj, row.original.id),
  }),
  coluna.accessor('situacao', {
    header: 'Situação',
    meta: {
      campo: 'situacao',
      rotulo: 'Situação',
      rotulosValores: ROTULOS_SITUACAO,
    },
    cell: ({ row }) => (
      <Badge
        variant={row.original.situacao === 'ativo' ? 'secondary' : 'outline'}
      >
        {ROTULOS_SITUACAO[
          row.original.situacao as keyof typeof ROTULOS_SITUACAO
        ] ?? row.original.situacao}
      </Badge>
    ),
  }),
  coluna.accessor((linha) => linha.pendencias, {
    id: 'pendencia',
    header: 'Cadastro',
    enableSorting: false,
    meta: {
      campo: 'pendencia',
      rotulo: 'Cadastro',
      rotulosValores: ROTULOS_PENDENCIA,
    },
    cell: ({ row }) => {
      const { pendencias } = row.original;
      return pendencias.length ? (
        <span title={pendencias.map((p) => ROTULOS_PENDENCIA[p]).join('; ')}>
          {pendencias.length}{' '}
          {pendencias.length === 1 ? 'pendência' : 'pendências'}
        </span>
      ) : (
        'Completo'
      );
    },
  }),
  coluna.display({
    id: 'acoes',
    header: 'Ações',
    cell: ({ row }) => <AcoesEmpreendimento empreendimento={row.original} />,
  }),
]);
