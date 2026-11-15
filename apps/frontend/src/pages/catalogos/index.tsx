import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ESQUEMA_CATALOGO_GRUPOS,
  ESQUEMA_CATALOGO_ITENS,
  type GrupoCatalogoLinha,
  type ItemCatalogoLinha,
} from '@ssc0536/common';
import { Plus } from 'lucide-react';
import { Abas } from '@/components/abas';
import { GradeColecao } from '@/components/grade-colecao';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useSegmentos } from '@/hooks/use-segmentos';
import { catalogoService } from '@/services/catalogo';
import { permite } from '@/utils/acesso';
import { colunasGrupos, colunasItens } from './colunas';
import { GrupoForm } from './components/grupo-form';
import { HistoricoItem } from './components/historico-item';
import { ItemForm } from './components/item-form';
import { useCatalogoMutations } from './hooks';

type Dialogo =
  | { tipo: 'grupo-novo' }
  | { tipo: 'grupo-editar'; grupo: GrupoCatalogoLinha }
  | { tipo: 'item-novo' }
  | { tipo: 'item-editar'; item: ItemCatalogoLinha }
  | { tipo: 'historico'; item: ItemCatalogoLinha }
  | null;

const ABAS = [
  { id: 'itens', rotulo: 'Itens' },
  { id: 'grupos', rotulo: 'Grupos' },
];

export function CatalogosPage() {
  const acesso = useAcessoAtual();
  const [aba, setAba] = useState('itens');
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const mutacoes = useCatalogoMutations();
  const podeCriar = permite(acesso, 'catalogos', 'criar');
  const podeAlterar = permite(acesso, 'catalogos', 'alterar');
  const segmentos = useSegmentos(acesso);
  // Grupos para escolher ao criar item (catálogo de apoio; até o máximo de uma página do servidor).
  const gruposDeApoio = useQuery({
    queryKey: ['catalogos', 'grupos-apoio', acesso.usuarioId, acesso.revisao],
    queryFn: ({ signal }) =>
      catalogoService.grupos({ top: 100, skip: 0, count: false }, signal),
    retry: false,
  });
  const fechar = () => {
    setDialogo(null);
    mutacoes.criarGrupo.reset();
    mutacoes.alterarGrupo.reset();
    mutacoes.criarItem.reset();
    mutacoes.alterarItem.reset();
  };
  const erro =
    mutacoes.criarGrupo.error ??
    mutacoes.alterarGrupo.error ??
    mutacoes.criarItem.error ??
    mutacoes.alterarItem.error;
  // Segmento do formulário atual: o de hospedagem, ou o primeiro disponível.
  const segmentoId =
    segmentos.data?.find((s) => s.chave === 'hospedagem')?.id ??
    segmentos.data?.[0]?.id;

  const { alterarGrupo, alterarItem } = mutacoes;
  const colunasDeGrupos = useMemo(
    () =>
      colunasGrupos({
        onEditar: (grupo) => setDialogo({ tipo: 'grupo-editar', grupo }),
        onAlternar: (grupo) =>
          alterarGrupo.mutate({
            id: grupo.id,
            alteracao: { ativo: !grupo.ativo },
          }),
      }),
    // `mutate` é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const colunasDeItens = useMemo(
    () =>
      colunasItens({
        onEditar: (item) => setDialogo({ tipo: 'item-editar', item }),
        onHistorico: (item) => setDialogo({ tipo: 'historico', item }),
        onAlternar: (item) =>
          alterarItem.mutate({
            id: item.id,
            alteracao: { ativo: !item.ativo },
          }),
      }),
    // `mutate` é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const chave = (recurso: string) => [
    'catalogos',
    recurso,
    acesso.usuarioId,
    acesso.revisao,
  ];

  return (
    <section className="space-y-6" aria-label="Catálogos do inventário">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Catálogos do inventário</h1>
        <p className="text-sm text-muted-foreground">
          Grupos e itens do formulário canônico. Editar rótulo ou regra cria uma
          nova versão; inventários antigos continuam lendo a versão que usaram.
          Itens e grupos são inativados, nunca removidos.
        </p>
        <p className="text-sm text-muted-foreground">
          Carga inicial: dicionário técnico v1 dos cabeçalhos do inventário,
          ainda não homologado pelo OTO.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/formulario-inventario">Pré-visualizar o formulário</Link>
        </Button>
      </header>
      {(alterarGrupo.isError || alterarItem.isError) && !dialogo && (
        <p role="alert" className="text-sm text-destructive">
          {(alterarGrupo.error ?? alterarItem.error)?.message}
        </p>
      )}
      <Abas
        rotulo="Seções dos catálogos"
        abas={ABAS}
        ativa={aba}
        onChange={setAba}
      >
        {(ativa) =>
          ativa === 'itens' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Filtre pelo ícone de cada coluna.
                </p>
                {podeCriar && (
                  <Button
                    disabled={!gruposDeApoio.data?.data.length}
                    onClick={() => setDialogo({ tipo: 'item-novo' })}
                  >
                    <Plus aria-hidden="true" />
                    Novo item
                  </Button>
                )}
              </div>
              <GradeColecao
                id="itens"
                rotulo="Itens do catálogo"
                esquema={ESQUEMA_CATALOGO_ITENS}
                colunas={colunasDeItens}
                getRowId={(i) => String(i.id)}
                chave={chave('itens')}
                buscar={(consulta, signal) =>
                  catalogoService.itens(consulta, signal)
                }
                colunasADireita={['acoes']}
                mensagemVazia="Nenhum item encontrado. Execute a carga inicial (pnpm db:catalogos) ou crie itens."
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Chave, tipo de seleção e “outro” não mudam depois de criados.
                </p>
                {podeCriar && segmentoId !== undefined && (
                  <Button onClick={() => setDialogo({ tipo: 'grupo-novo' })}>
                    <Plus aria-hidden="true" />
                    Novo grupo
                  </Button>
                )}
              </div>
              <GradeColecao
                id="grupos"
                rotulo="Grupos do catálogo"
                esquema={ESQUEMA_CATALOGO_GRUPOS}
                colunas={colunasDeGrupos}
                getRowId={(g) => String(g.id)}
                chave={chave('grupos')}
                buscar={(consulta, signal) =>
                  catalogoService.grupos(consulta, signal)
                }
                colunasADireita={['acoes']}
                mensagemVazia="Nenhum grupo encontrado."
              />
            </>
          )
        }
      </Abas>

      <Dialog
        open={dialogo !== null}
        onOpenChange={(aberto) => !aberto && fechar()}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {dialogo?.tipo === 'grupo-novo' && segmentoId !== undefined && (
            <>
              <DialogHeader>
                <DialogTitle>Novo grupo</DialogTitle>
                <DialogDescription>
                  Uma pergunta do formulário e suas opções.
                </DialogDescription>
              </DialogHeader>
              <GrupoForm
                segmentoId={segmentoId}
                onCriar={async (entrada) => {
                  await mutacoes.criarGrupo.mutateAsync(entrada);
                  fechar();
                }}
                onAlterar={async () => undefined}
              />
            </>
          )}
          {dialogo?.tipo === 'grupo-editar' && (
            <>
              <DialogHeader>
                <DialogTitle>Editar grupo</DialogTitle>
                <DialogDescription>{dialogo.grupo.chave}</DialogDescription>
              </DialogHeader>
              <GrupoForm
                grupo={dialogo.grupo}
                segmentoId={dialogo.grupo.segmentoId}
                onCriar={async () => undefined}
                onAlterar={async (alteracao) => {
                  if (!podeAlterar) return;
                  await mutacoes.alterarGrupo.mutateAsync({
                    id: dialogo.grupo.id,
                    alteracao,
                  });
                  fechar();
                }}
              />
            </>
          )}
          {dialogo?.tipo === 'item-novo' && (
            <>
              <DialogHeader>
                <DialogTitle>Novo item</DialogTitle>
                <DialogDescription>
                  Cria a versão 1 do item no grupo escolhido.
                </DialogDescription>
              </DialogHeader>
              <ItemForm
                grupos={gruposDeApoio.data?.data ?? []}
                onCriar={async (entrada) => {
                  await mutacoes.criarItem.mutateAsync(entrada);
                  fechar();
                }}
                onAlterar={async () => undefined}
              />
            </>
          )}
          {dialogo?.tipo === 'item-editar' && (
            <>
              <DialogHeader>
                <DialogTitle>Editar item</DialogTitle>
                <DialogDescription>
                  {dialogo.item.chave} · versão {dialogo.item.versao}. Mudar
                  rótulo ou regra cria a versão {dialogo.item.versao + 1}.
                </DialogDescription>
              </DialogHeader>
              <ItemForm
                item={dialogo.item}
                grupos={gruposDeApoio.data?.data ?? []}
                onCriar={async () => undefined}
                onAlterar={async (alteracao) => {
                  if (!podeAlterar) return;
                  await mutacoes.alterarItem.mutateAsync({
                    id: dialogo.item.id,
                    alteracao,
                  });
                  fechar();
                }}
              />
            </>
          )}
          {dialogo?.tipo === 'historico' && (
            <>
              <DialogHeader>
                <DialogTitle>Histórico de {dialogo.item.rotulo}</DialogTitle>
                <DialogDescription>{dialogo.item.chave}</DialogDescription>
              </DialogHeader>
              <HistoricoItem item={dialogo.item} />
            </>
          )}
          {erro && dialogo && dialogo.tipo !== 'historico' && (
            <p role="alert" className="text-sm text-destructive">
              {erro.message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
