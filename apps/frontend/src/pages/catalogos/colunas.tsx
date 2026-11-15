import type {
  GrupoCatalogoLinha,
  ItemCatalogoLinha,
  VersaoItemCatalogo,
} from '@ssc0536/common';
import { criarColunas } from '@/components/data-table/recursos';
import { Button } from '@/components/ui/button';
import { ROTULOS_SELECAO, simNao } from '@/utils/catalogo';

const grupo = criarColunas<GrupoCatalogoLinha>();
export const colunasGrupos = (opcoes: {
  onEditar: (grupo: GrupoCatalogoLinha) => void;
  onAlternar: (grupo: GrupoCatalogoLinha) => void;
}) =>
  grupo.columns([
    grupo.accessor('chave', {
      header: 'Chave',
      meta: { campo: 'chave', rotulo: 'Chave' },
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.chave}</span>
      ),
    }),
    grupo.accessor('pergunta', {
      header: 'Pergunta',
      meta: { campo: 'pergunta', rotulo: 'Pergunta' },
    }),
    grupo.accessor('secao', {
      header: 'Seção',
      meta: { campo: 'secao', rotulo: 'Seção' },
      cell: ({ row }) => row.original.secao ?? '—',
    }),
    grupo.accessor('selecao', {
      header: 'Seleção',
      meta: {
        campo: 'selecao',
        rotulo: 'Seleção',
        rotulosValores: ROTULOS_SELECAO,
      },
      cell: ({ row }) => ROTULOS_SELECAO[row.original.selecao],
    }),
    grupo.accessor('permiteOutro', {
      header: 'Permite outro',
      meta: { campo: 'permiteOutro', rotulo: 'Permite outro' },
      cell: ({ row }) => simNao(row.original.permiteOutro),
    }),
    grupo.accessor('ordem', {
      header: 'Ordem',
      meta: { campo: 'ordem', rotulo: 'Ordem' },
    }),
    grupo.accessor('ativo', {
      header: 'Situação',
      meta: { campo: 'ativo', rotulo: 'Situação' },
      cell: ({ row }) => (row.original.ativo ? 'Ativo' : 'Inativo'),
    }),
    grupo.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label={`Editar grupo ${row.original.chave}`}
            onClick={() => opcoes.onEditar(row.original)}
          >
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={`${row.original.ativo ? 'Inativar' : 'Ativar'} grupo ${row.original.chave}`}
            onClick={() => opcoes.onAlternar(row.original)}
          >
            {row.original.ativo ? 'Inativar' : 'Ativar'}
          </Button>
        </div>
      ),
    }),
  ]);

const item = criarColunas<ItemCatalogoLinha>();
/** Chave do grupo sem o prefixo do segmento (o valor completo continua o filtrável). */
const grupoCurto = (chave: string) =>
  chave.split('.').slice(1).join('.') || chave;
export const colunasItens = (opcoes: {
  onEditar: (item: ItemCatalogoLinha) => void;
  onHistorico: (item: ItemCatalogoLinha) => void;
  onAlternar: (item: ItemCatalogoLinha) => void;
}) =>
  item.columns([
    item.accessor('rotulo', {
      header: 'Rótulo',
      meta: { campo: 'rotulo', rotulo: 'Rótulo' },
      cell: ({ row }) => (
        <>
          <span className="block font-medium">{row.original.rotulo}</span>
          <span
            className="block font-mono text-xs text-muted-foreground"
            title={row.original.chave}
          >
            {row.original.chave}
          </span>
        </>
      ),
    }),
    item.accessor('grupoChave', {
      header: 'Grupo',
      meta: { campo: 'grupoChave', rotulo: 'Grupo' },
      cell: ({ row }) => (
        <span className="font-mono text-xs" title={row.original.grupoChave}>
          {grupoCurto(row.original.grupoChave)}
        </span>
      ),
    }),
    item.accessor('exclusivo', {
      header: 'Exclusivo',
      meta: { campo: 'exclusivo', rotulo: 'Exclusivo' },
      cell: ({ row }) => simNao(row.original.exclusivo),
    }),
    item.accessor('outro', {
      header: 'Outro',
      meta: { campo: 'outro', rotulo: 'Outro' },
      cell: ({ row }) => simNao(row.original.outro),
    }),
    item.accessor('aceitaQuantidade', {
      header: 'Qtd.',
      meta: { campo: 'aceitaQuantidade', rotulo: 'Aceita quantidade' },
      cell: ({ row }) => simNao(row.original.aceitaQuantidade),
    }),
    item.accessor('versao', {
      header: 'Versão',
      meta: { campo: 'versao', rotulo: 'Versão' },
    }),
    item.accessor('ativo', {
      header: 'Situação',
      meta: { campo: 'ativo', rotulo: 'Situação' },
      cell: ({ row }) => (row.original.ativo ? 'Ativo' : 'Inativo'),
    }),
    item.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            aria-label={`Editar item ${row.original.chave}`}
            onClick={() => opcoes.onEditar(row.original)}
          >
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Histórico do item ${row.original.chave}`}
            onClick={() => opcoes.onHistorico(row.original)}
          >
            Histórico
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={`${row.original.ativo ? 'Inativar' : 'Ativar'} item ${row.original.chave}`}
            onClick={() => opcoes.onAlternar(row.original)}
          >
            {row.original.ativo ? 'Inativar' : 'Ativar'}
          </Button>
        </div>
      ),
    }),
  ]);

const versao = criarColunas<VersaoItemCatalogo>();
export const colunasVersoes = versao.columns([
  versao.accessor('numero', {
    header: 'Versão',
    meta: { campo: 'numero', rotulo: 'Versão' },
  }),
  versao.accessor('rotulo', {
    header: 'Rótulo',
    meta: { campo: 'rotulo', rotulo: 'Rótulo' },
  }),
  versao.accessor('pergunta', {
    header: 'Pergunta do grupo',
    meta: { campo: 'pergunta', rotulo: 'Pergunta do grupo' },
  }),
  versao.accessor('selecao', {
    header: 'Seleção',
    meta: {
      campo: 'selecao',
      rotulo: 'Seleção',
      rotulosValores: ROTULOS_SELECAO,
    },
    cell: ({ row }) => ROTULOS_SELECAO[row.original.selecao],
  }),
  versao.accessor('exclusivo', {
    header: 'Exclusivo',
    meta: { campo: 'exclusivo', rotulo: 'Exclusivo' },
    cell: ({ row }) => simNao(row.original.exclusivo),
  }),
  versao.accessor('outro', {
    header: 'Outro',
    meta: { campo: 'outro', rotulo: 'Outro' },
    cell: ({ row }) => simNao(row.original.outro),
  }),
  versao.accessor('aceitaQuantidade', {
    header: 'Quantidade',
    meta: { campo: 'aceitaQuantidade', rotulo: 'Quantidade' },
    cell: ({ row }) => simNao(row.original.aceitaQuantidade),
  }),
  versao.accessor('criadaEm', {
    header: 'Criada em',
    meta: { campo: 'criadaEm', rotulo: 'Criada em' },
    cell: ({ row }) => new Date(row.original.criadaEm).toLocaleString('pt-BR'),
  }),
  versao.accessor('motivo', {
    header: 'Motivo',
    meta: { campo: 'motivo', rotulo: 'Motivo' },
    cell: ({ row }) => row.original.motivo ?? '—',
  }),
]);
