import type {
  ModeloPesquisaLinha,
  TipoValorCampo,
  VersaoModeloLinha,
} from '@ssc0536/common';
import { criarColunas } from '@/components/data-table/recursos';
import { History, Pencil } from 'lucide-react';
import { AcoesLinha } from '@/components/acoes-linha';

export const ROTULOS_TIPO_VALOR_CAMPO: Record<TipoValorCampo, string> = {
  percentual: 'Percentual',
  texto: 'Texto',
  escolha: 'Escolha',
};
export const OPCOES_TIPO_VALOR_CAMPO = (
  Object.keys(ROTULOS_TIPO_VALOR_CAMPO) as TipoValorCampo[]
).map((valor) => ({ value: valor, label: ROTULOS_TIPO_VALOR_CAMPO[valor] }));

const criadaEm = (valor: string) => new Date(valor).toLocaleString('pt-BR');

const modelo = criarColunas<ModeloPesquisaLinha>();
export const colunasModelos = (opcoes: {
  onEditar: (modelo: ModeloPesquisaLinha) => void;
  onHistorico: (modelo: ModeloPesquisaLinha) => void;
}) =>
  modelo.columns([
    modelo.accessor('nome', {
      header: 'Nome',
      meta: { campo: 'nome', rotulo: 'Nome' },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.nome}</span>
      ),
    }),
    modelo.accessor('publicoAlvo', {
      header: 'Público-alvo',
      meta: { campo: 'publicoAlvo', rotulo: 'Público-alvo' },
    }),
    modelo.accessor('versao', {
      header: 'Versão',
      meta: { campo: 'versao', rotulo: 'Versão' },
    }),
    modelo.accessor('criadaEm', {
      header: 'Criada em',
      meta: { campo: 'criadaEm', rotulo: 'Criada em' },
      cell: ({ row }) => criadaEm(row.original.criadaEm),
    }),
    modelo.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={row.original.nome}
          acoes={[
            {
              rotulo: 'Editar',
              icone: Pencil,
              onSelecionar: () => opcoes.onEditar(row.original),
            },
            {
              rotulo: 'Histórico',
              icone: History,
              onSelecionar: () => opcoes.onHistorico(row.original),
            },
          ]}
        />
      ),
    }),
  ]);

const versao = criarColunas<VersaoModeloLinha>();
export const colunasVersoes = versao.columns([
  versao.accessor('numero', {
    header: 'Versão',
    meta: { campo: 'numero', rotulo: 'Versão' },
  }),
  versao.accessor('nome', {
    header: 'Nome',
    meta: { campo: 'nome', rotulo: 'Nome' },
  }),
  versao.accessor('publicoAlvo', {
    header: 'Público-alvo',
    meta: { campo: 'publicoAlvo', rotulo: 'Público-alvo' },
  }),
  versao.accessor('criadaEm', {
    header: 'Criada em',
    meta: { campo: 'criadaEm', rotulo: 'Criada em' },
    cell: ({ row }) => criadaEm(row.original.criadaEm),
  }),
  versao.accessor('motivo', {
    header: 'Motivo',
    meta: { campo: 'motivo', rotulo: 'Motivo' },
    cell: ({ row }) => row.original.motivo ?? '—',
  }),
]);
