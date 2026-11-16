import type { EmpreendimentoListado } from '@ssc0536/common';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/badge';
import { criarColunas } from '@/components/data-table/recursos';
import { ROTULOS_PENDENCIA, ROTULOS_SITUACAO } from '@/utils/cadastro';
import { formatarCnpj } from '@/utils/documento';
import { AcoesEmpreendimento } from './components/acoes-empreendimento';

const coluna = criarColunas<EmpreendimentoListado>();
const quantidade = (valor: number | null | undefined) =>
  valor ?? (
    <span
      className="text-muted-foreground"
      title="Não informado"
      aria-label="Não informado"
    >
      —
    </span>
  );
const ROTULOS_ZONA = { urbana: 'Urbana', rural: 'Rural' };
const coresSegmento = (tipo: string | null) =>
  tipo?.toLocaleLowerCase('pt-BR').includes('resort')
    ? 'laranja'
    : tipo?.toLocaleLowerCase('pt-BR').includes('hotel')
      ? 'azul'
      : 'cinza';

/** Uma informação por coluna; funcionários apresenta somente o total conhecido. */
export const colunasEmpreendimentos = coluna.columns([
  coluna.accessor('nomeFantasia', {
    header: 'Empreendimento',
    meta: {
      campo: 'nomeFantasia',
      rotulo: 'Empreendimento',
    },
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
        >
          <Building2 className="size-[18px]" />
        </span>
        <span className="font-semibold">{row.original.nomeFantasia}</span>
      </div>
    ),
  }),
  coluna.accessor((linha) => linha.cnpj ?? String(linha.id), {
    id: 'identificacao',
    header: 'Identificação',
    enableSorting: false,
    meta: { campo: 'identificacao', rotulo: 'Identificação' },
    cell: ({ row }) =>
      row.original.cnpj?.trim()
        ? formatarCnpj(row.original.cnpj.trim())
        : String(row.original.id),
  }),
  coluna.accessor('tipoHospedagem', {
    header: 'Segmento',
    meta: { campo: 'tipoHospedagem', rotulo: 'Segmento' },
    cell: ({ row }) =>
      row.original.tipoHospedagem ? (
        <Badge cor={coresSegmento(row.original.tipoHospedagem)} ponto={false}>
          {row.original.tipoHospedagem}
        </Badge>
      ) : (
        <span className="text-muted-foreground">Não informado</span>
      ),
  }),
  coluna.accessor('zona', {
    header: 'Zona',
    meta: { campo: 'zona', rotulo: 'Zona', rotulosValores: ROTULOS_ZONA },
    cell: ({ row }) =>
      row.original.zona ? ROTULOS_ZONA[row.original.zona] : 'Não informado',
  }),
  coluna.accessor('endereco', {
    header: 'Endereço',
    meta: { campo: 'endereco', rotulo: 'Endereço' },
    cell: ({ row }) => (
      <span className="block max-w-56 whitespace-normal">
        {row.original.endereco ?? 'Não informado'}
      </span>
    ),
  }),
  coluna.accessor('leitos', {
    header: 'Leitos',
    meta: { campo: 'leitos', rotulo: 'Leitos', alinhamento: 'direita' },
    cell: ({ row }) => quantidade(row.original.leitos),
  }),
  coluna.accessor('totalUh', {
    header: 'UH',
    meta: { campo: 'totalUh', rotulo: 'UH', alinhamento: 'direita' },
    cell: ({ row }) => quantidade(row.original.totalUh),
  }),
  coluna.accessor('funcFixos', {
    header: 'Funcionários',
    meta: {
      campo: 'funcFixos',
      rotulo: 'Funcionários fixos',
      alinhamento: 'direita',
      filtrosAdicionais: [
        { campo: 'funcTemporarios', rotulo: 'Funcionários temporários' },
      ],
    },
    cell: ({ row }) => {
      const { funcFixos, funcTemporarios } = row.original;
      const completo = funcFixos != null && funcTemporarios != null;
      return completo ? funcFixos + funcTemporarios : 'Não informado';
    },
  }),
  coluna.accessor('situacao', {
    header: 'Situação',
    meta: {
      campo: 'situacao',
      rotulo: 'Situação',
      rotulosValores: ROTULOS_SITUACAO,
    },
    cell: ({ row }) => (
      <Badge cor={row.original.situacao === 'ativo' ? 'azul' : 'cinza'}>
        {ROTULOS_SITUACAO[
          row.original.situacao as keyof typeof ROTULOS_SITUACAO
        ] ?? row.original.situacao}
      </Badge>
    ),
  }),
  coluna.accessor((linha) => linha.pendencias, {
    id: 'pendencia',
    header: 'Pendências cadastrais',
    enableSorting: false,
    meta: {
      campo: 'pendencia',
      rotulo: 'Pendências cadastrais',
      rotulosValores: ROTULOS_PENDENCIA,
      alinhamento: 'direita',
    },
    cell: ({ row }) => (
      <Badge
        cor={row.original.pendencias.length ? 'amarelo' : 'azul'}
        ponto={false}
        title={
          row.original.pendencias.length
            ? row.original.pendencias
                .map((p) => ROTULOS_PENDENCIA[p])
                .join('; ')
            : 'Cadastro completo'
        }
      >
        {row.original.pendencias.length}
      </Badge>
    ),
  }),
  coluna.display({
    id: 'acoes',
    header: 'Ações',
    cell: ({ row }) => <AcoesEmpreendimento empreendimento={row.original} />,
  }),
]);
