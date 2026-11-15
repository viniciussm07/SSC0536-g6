import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ESQUEMA_INVENTARIOS,
  type AcessoAtual,
  type InventarioResumo,
} from '@ssc0536/common';
import { Plus } from 'lucide-react';
import { GradeColecao } from '@/components/grade-colecao';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { acessoService } from '@/services/acesso';
import { inventarioService } from '@/services/inventario';
import { escopo, permite } from '@/utils/acesso';
import {
  CAMPOS_FORMULARIO,
  ROTULOS_CONFERENCIA,
  anteriorDe,
  dataBr,
  formatarValorCapacidade,
} from '@/utils/inventario';
import { colunasInventarios } from '../../colunas';
import { ConferirVersao } from './conferir-versao';
import { DetalheVersao } from './detalhe-versao';

type Dialogo =
  | { tipo: 'detalhe'; versao: InventarioResumo }
  | { tipo: 'conferir'; versao: InventarioResumo }
  | null;

/** Capacidade vigente hoje, linha do tempo de versões (com histórico) e ações de atualização. */
export function SecaoInventario({
  acesso,
  id,
}: {
  acesso: AcessoAtual;
  id: number;
}) {
  const navegar = useNavigate();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const podeCriar = permite(acesso, 'inventarios', 'criar');
  const podeConferir =
    permite(acesso, 'inventarios', 'alterar') &&
    escopo(acesso, 'inventarios', 'alterar') === 'todos';
  const chave = ['inventarios', acesso.usuarioId, acesso.revisao, id];
  const vigente = useQuery({
    queryKey: [...chave, 'vigente'],
    queryFn: ({ signal }) => inventarioService.vigente(id, undefined, signal),
    retry: false,
  });
  // Linha do tempo completa (inclusive substituídas) para localizar a versão anterior.
  const linhas = useQuery({
    queryKey: [...chave, 'linha-do-tempo'],
    queryFn: ({ signal }) =>
      acessoService.inventarios(
        id,
        { top: 100, skip: 0, count: false },
        signal,
      ),
    retry: false,
  });
  const colunas = useMemo(
    () =>
      colunasInventarios({
        podeCriar,
        podeConferir,
        onDetalhe: (versao) => setDialogo({ tipo: 'detalhe', versao }),
        onCorrigir: (versao) =>
          void navegar({
            to: '/inventario/nova-versao',
            search: { corrigir: versao.id },
          }),
        onConferir: (versao) => setDialogo({ tipo: 'conferir', versao }),
      }),
    [podeCriar, podeConferir, navegar],
  );

  return (
    <section aria-label="Inventário" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Inventário</h2>
        {podeCriar && (
          <Button asChild>
            <Link to="/inventario/nova-versao">
              <Plus aria-hidden="true" />
              Atualizar inventário
            </Link>
          </Button>
        )}
      </div>

      <div
        aria-label="Capacidade vigente"
        role="group"
        className="rounded-xl border bg-card p-5 shadow-card sm:p-6"
      >
        {vigente.isPending ? (
          <p role="status">Carregando capacidade vigente…</p>
        ) : vigente.isError ? (
          <p role="alert">{vigente.error.message}</p>
        ) : vigente.data === null ? (
          <p>Nenhuma versão vigente hoje.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              Vigente desde {dataBr(vigente.data.vigenciaInicio)} · conferência{' '}
              {ROTULOS_CONFERENCIA[
                vigente.data.situacaoConferencia
              ].toLowerCase()}{' '}
              · registrada por {vigente.data.autor}
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              {CAMPOS_FORMULARIO.map(({ campo, rotulo }) => (
                <div key={campo} className="rounded-[9px] bg-muted/60 p-4">
                  <dt className="text-muted-foreground">{rotulo}</dt>
                  <dd className="mt-1 font-heading text-xl font-bold text-primary">
                    {formatarValorCapacidade(vigente.data!.capacidade[campo])}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>

      <GradeColecao
        id="inventarios"
        rotulo="Versões do inventário"
        esquema={ESQUEMA_INVENTARIOS}
        colunas={colunas}
        getRowId={(v) => String(v.id)}
        chave={chave}
        buscar={(consulta, signal) =>
          acessoService.inventarios(id, consulta, signal)
        }
        colunasADireita={['acoes']}
        mensagemVazia="Nenhuma versão disponível."
      />

      <Dialog
        open={dialogo !== null}
        onOpenChange={(a) => !a && setDialogo(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {dialogo?.tipo === 'detalhe' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Versão de {dataBr(dialogo.versao.vigenciaInicio)}
                </DialogTitle>
                <DialogDescription>
                  Leitura histórica: rótulos e regras como valiam quando a
                  versão foi registrada.
                </DialogDescription>
              </DialogHeader>
              <DetalheVersao
                id={id}
                versaoId={dialogo.versao.id}
                anteriorId={
                  anteriorDe(dialogo.versao, linhas.data?.data ?? [])?.id ??
                  null
                }
              />
            </>
          )}
          {dialogo?.tipo === 'conferir' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Conferir versão de {dataBr(dialogo.versao.vigenciaInicio)}
                </DialogTitle>
                <DialogDescription>
                  A conferência é uma decisão da equipe do OTO e não altera o
                  conteúdo da versão.
                </DialogDescription>
              </DialogHeader>
              <ConferirVersao
                id={id}
                versao={dialogo.versao}
                onConcluir={() => setDialogo(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
