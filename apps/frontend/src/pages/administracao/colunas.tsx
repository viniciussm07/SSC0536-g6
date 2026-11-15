import type {
  ContaResumo,
  PermissaoAcesso,
  VinculoConta,
  VisibilidadeIndicador,
} from '@ssc0536/common';
import { criarColunas } from '@/components/data-table/recursos';
import { Eye, EyeOff, UserCog } from 'lucide-react';
import { AcoesLinha } from '@/components/acoes-linha';

const SITUACAO_CONTA = { true: 'Ativa', false: 'Inativa' };
const SITUACAO_VINCULO = { true: 'Ativo', false: 'Inativo' };
const VISIBILIDADE = { true: 'Liberado', false: 'Restrito' };

const conta = criarColunas<ContaResumo>();
/** Colunas de contas; ações dependem do usuário logado e do gerenciamento selecionado. */
export const colunasContas = (opcoes: {
  usuarioId: number;
  onGerenciar: (conta: ContaResumo) => void;
}) =>
  conta.columns([
    conta.accessor('nome', {
      header: 'Nome',
      meta: { campo: 'nome', rotulo: 'Nome' },
    }),
    conta.accessor('email', {
      header: 'E-mail',
      meta: { campo: 'email', rotulo: 'E-mail' },
    }),
    conta.accessor('perfil', {
      header: 'Perfil',
      meta: { campo: 'perfil', rotulo: 'Perfil' },
    }),
    conta.accessor('ativo', {
      header: 'Situação',
      meta: { campo: 'ativo', rotulo: 'Situação' },
      cell: ({ row }) => SITUACAO_CONTA[String(row.original.ativo) as 'true'],
    }),
    conta.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={row.original.nome}
          acoes={[
            {
              rotulo: 'Gerenciar',
              icone: UserCog,
              desabilitada: row.original.id === opcoes.usuarioId,
              onSelecionar: () => opcoes.onGerenciar(row.original),
            },
          ]}
        />
      ),
    }),
  ]);

const vinculo = criarColunas<VinculoConta>();
export const colunasVinculos = vinculo.columns([
  vinculo.accessor('nomeFantasia', {
    header: 'Empreendimento',
    meta: { campo: 'nomeFantasia', rotulo: 'Empreendimento' },
  }),
  vinculo.accessor('empreendimentoId', {
    header: 'ID',
    meta: { campo: 'empreendimentoId', rotulo: 'ID' },
  }),
  vinculo.accessor('ativo', {
    header: 'Situação',
    meta: { campo: 'ativo', rotulo: 'Situação' },
    cell: ({ row }) => SITUACAO_VINCULO[String(row.original.ativo) as 'true'],
  }),
]);

const permissao = criarColunas<PermissaoAcesso>();
export const colunasPermissoes = permissao.columns([
  permissao.accessor('recurso', {
    header: 'Recurso',
    meta: { campo: 'recurso', rotulo: 'Recurso' },
  }),
  permissao.accessor('acao', {
    header: 'Ação',
    meta: { campo: 'acao', rotulo: 'Ação' },
  }),
  permissao.accessor('escopo', {
    header: 'Escopo',
    meta: { campo: 'escopo', rotulo: 'Escopo' },
  }),
]);

const visibilidade = criarColunas<VisibilidadeIndicador>();
export const colunasVisibilidades = (opcoes: {
  pendente: boolean;
  onAlternar: (indicadorId: number, permitido: boolean) => void;
}) =>
  visibilidade.columns([
    visibilidade.accessor('nome', {
      header: 'Indicador',
      meta: { campo: 'nome', rotulo: 'Indicador' },
    }),
    visibilidade.accessor('permitido', {
      header: 'Visibilidade',
      meta: { campo: 'permitido', rotulo: 'Visibilidade' },
      cell: ({ row }) => VISIBILIDADE[String(row.original.permitido) as 'true'],
    }),
    visibilidade.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <AcoesLinha
          rotulo={row.original.nome}
          acoes={[
            {
              rotulo: row.original.permitido ? 'Restringir' : 'Liberar',
              icone: row.original.permitido ? EyeOff : Eye,
              desabilitada: opcoes.pendente,
              onSelecionar: () =>
                opcoes.onAlternar(
                  row.original.indicadorId,
                  !row.original.permitido,
                ),
            },
          ]}
        />
      ),
    }),
  ]);
