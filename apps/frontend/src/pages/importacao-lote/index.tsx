import { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { Abas } from '@/components/abas';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui/button';
import { Etapas, type Etapa } from '@/components/etapas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { HttpError } from '@/services/http';
import { permite } from '@/utils/acesso';
import {
  CORES_CONFIRMACAO,
  CORES_ESTADO,
  ROTULOS_CONFIRMACAO,
  ROTULOS_ESTADO,
  ROTULOS_FONTE,
  formatarInstante,
  formatarTamanho,
} from '@/utils/importacao';
import type { LoteImportacaoDetalhe, PlanoImportacao } from '@ssc0536/common';
import { AbaArquivo } from './components/aba-arquivo';
import { AbaAvisos } from './components/aba-avisos';
import { AbaLinhas } from './components/aba-linhas';
import { Conciliacao } from './components/conciliacao';
import { useExcluirLote, useLote, usePlano, useReler } from './hooks';

/** Etapas do fluxo; a leitura e a conciliação nunca são apresentadas como importação concluída. */
function etapasDoLote(
  lote: LoteImportacaoDetalhe,
  plano: PlanoImportacao | undefined,
): Etapa[] {
  const leituraOk = lote.estado === 'lido';
  const pend = plano ? plano.totais.pendentes + plano.totais.conflitos : null;
  const confirmado = lote.confirmacao !== 'nao_confirmado';
  return [
    {
      id: 'leitura',
      rotulo: 'Leitura',
      detalhe: leituraOk
        ? `${lote.totais.linhas} linhas, ${lote.totais.erros} erros, ${lote.totais.avisos} avisos`
        : (ROTULOS_ESTADO[lote.estado] ?? ''),
      estado:
        lote.estado === 'erro' ? 'erro' : leituraOk ? 'concluida' : 'atual',
    },
    {
      id: 'destino',
      rotulo: 'Destino',
      detalhe: lote.destino
        ? lote.destino.tituloPesquisa
        : 'Escolha a edição de pesquisa',
      estado: !leituraOk ? 'pendente' : lote.destino ? 'concluida' : 'atual',
    },
    {
      id: 'conciliacao',
      rotulo: 'Conciliação',
      detalhe:
        pend === null
          ? undefined
          : pend === 0
            ? 'Sem pendências'
            : `${pend} a resolver`,
      estado: !lote.destino
        ? 'pendente'
        : confirmado || pend === 0
          ? 'concluida'
          : 'atual',
    },
    {
      id: 'confirmacao',
      rotulo: 'Confirmação',
      detalhe: ROTULOS_CONFIRMACAO[lote.confirmacao],
      estado:
        lote.confirmacao === 'concluido'
          ? 'concluida'
          : lote.confirmacao === 'parcial' ||
              (lote.destino !== null && pend === 0)
            ? 'atual'
            : 'pendente',
    },
  ];
}

function Resumo({ lote }: { lote: LoteImportacaoDetalhe }) {
  const r = lote.resumo;
  const cartoes: Array<[string, string]> = [
    ['Linhas lidas', String(r?.linhasEntrada ?? lote.totais.linhas)],
    ['Erros', String(lote.totais.erros)],
    ['Avisos', String(lote.totais.avisos)],
    [
      'Período no arquivo',
      r?.rotuloPeriodo
        ? `${r.rotuloPeriodo}${r.diarias !== null ? ` · ${r.diarias} diárias` : ''}`
        : '—',
    ],
  ];
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)]">
      {cartoes.map(([rotulo, valor]) => (
        <div key={rotulo} className="min-w-0 rounded-lg border bg-card p-3">
          <dt className="text-sm text-muted-foreground">{rotulo}</dt>
          <dd className="text-lg font-bold leading-snug">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ImportacaoLotePage() {
  const { loteId } = useParams({ strict: false }) as { loteId: string };
  const id = Number(loteId);
  if (!Number.isSafeInteger(id) || id < 1)
    return (
      <section aria-label="Importação inválida" className="space-y-3">
        <p role="alert">Importação inválida.</p>
        <Link to="/importacoes" className="underline">
          Voltar às importações
        </Link>
      </section>
    );
  return <Pagina id={id} />;
}

function Pagina({ id }: { id: number }) {
  const acesso = useAcessoAtual();
  const lote = useLote(id);
  const lido = lote.data?.estado === 'lido';
  const plano = usePlano(id, lido);
  const reler = useReler(id);
  const excluir = useExcluirLote(id);
  const navegar = useNavigate();
  const [excluindo, definirExcluindo] = useState(false);
  const [escolhida, escolher] = useState<string | null>(null);
  const podeReler = permite(acesso, 'importacoes', 'alterar');

  const voltar = (
    <Link
      to="/importacoes"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Importação de planilhas
    </Link>
  );
  if (lote.isPending)
    return (
      <section aria-label="Importação" className="space-y-4">
        {voltar}
        <p role="status">Carregando a leitura…</p>
      </section>
    );
  if (lote.isError)
    return (
      <section aria-label="Importação" className="space-y-4">
        {voltar}
        <p role="alert" className="text-destructive">
          {lote.error instanceof HttpError && lote.error.status === 404
            ? 'Importação não encontrada.'
            : 'Não foi possível carregar esta importação.'}
        </p>
        <Button variant="outline" onClick={() => void lote.refetch()}>
          Tentar de novo
        </Button>
      </section>
    );

  const dados = lote.data;
  const abas = [
    ...(dados.estado === 'lido'
      ? [{ id: 'conciliacao', rotulo: 'Conciliação' }]
      : []),
    {
      id: 'avisos',
      rotulo: `Erros e avisos (${dados.totais.erros + dados.totais.avisos})`,
    },
    { id: 'linhas', rotulo: 'Linhas lidas' },
    { id: 'arquivo', rotulo: 'Arquivo' },
  ];
  const ativa =
    escolhida && abas.some((a) => a.id === escolhida) ? escolhida : abas[0].id;

  return (
    <section aria-label="Importação" className="space-y-6">
      {voltar}
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words font-heading text-[22px] font-extrabold leading-tight sm:text-[26px]">
            {dados.nomeArquivo}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ROTULOS_FONTE[dados.fonte]} · {formatarTamanho(dados.tamanhoBytes)}{' '}
            · recebido em {formatarInstante(dados.criadoEm)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge cor={CORES_ESTADO[dados.estado]}>
              {ROTULOS_ESTADO[dados.estado]}
            </Badge>
            <Badge cor={CORES_CONFIRMACAO[dados.confirmacao]}>
              {ROTULOS_CONFIRMACAO[dados.confirmacao]}
            </Badge>
          </div>
        </div>
        {podeReler && dados.confirmacao === 'nao_confirmado' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={reler.isPending}
              onClick={() => reler.mutate()}
            >
              <RefreshCw aria-hidden="true" />
              {reler.isPending ? 'Lendo…' : 'Refazer leitura'}
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => definirExcluindo(true)}
            >
              <Trash2 aria-hidden="true" />
              Excluir planilha
            </Button>
          </div>
        )}
      </header>

      {reler.isError && (
        <p role="alert" className="text-sm text-destructive">
          {reler.error instanceof HttpError &&
          reler.error.code === 'LEITURA_EM_ANDAMENTO'
            ? 'Este lote já está sendo lido. Aguarde alguns instantes.'
            : 'Não foi possível refazer a leitura.'}
        </p>
      )}
      {dados.erroMensagem && (
        <div
          role="alert"
          className="rounded-lg border border-destructive bg-card p-4 text-sm"
        >
          <p className="font-semibold text-destructive">
            A leitura não foi concluída
          </p>
          <p>{dados.erroMensagem}</p>
          <p className="text-muted-foreground">
            Veja como corrigir na aba “Erros e avisos” e envie o arquivo de
            novo.
          </p>
        </div>
      )}

      <div
        role="note"
        className="rounded-lg border bg-muted p-3 text-sm leading-relaxed"
      >
        {dados.confirmacao === 'nao_confirmado' ? (
          <>
            <strong>Isto é uma leitura, não uma importação.</strong> Nada foi
            gravado como resposta ainda; isso só acontece quando você conferir a
            conciliação e confirmar.
          </>
        ) : (
          <>
            <strong>
              {dados.confirmacao === 'concluido'
                ? 'Confirmação concluída.'
                : 'Confirmação parcial.'}
            </strong>{' '}
            {dados.confirmacao === 'parcial' &&
              'Linhas pendentes ou em conflito continuam sem gravar. '}
            {dados.recalculoPendente &&
              'Há indicadores desta edição a recalcular; nada foi publicado.'}
          </>
        )}
      </div>

      <Etapas
        rotulo="Etapas da importação"
        etapas={etapasDoLote(dados, plano.data)}
      />
      <Resumo lote={dados} />

      <Abas
        rotulo="Seções da importação"
        abas={abas}
        ativa={ativa}
        onChange={escolher}
      >
        {(aba) =>
          aba === 'conciliacao' ? (
            <Conciliacao loteId={id} fonte={dados.fonte} />
          ) : aba === 'avisos' ? (
            <AbaAvisos loteId={id} />
          ) : aba === 'linhas' ? (
            <AbaLinhas loteId={id} fonte={dados.fonte} />
          ) : (
            <AbaArquivo lote={dados} />
          )
        }
      </Abas>
      <Dialog
        open={excluindo}
        onOpenChange={(aberto) => {
          if (aberto || excluir.isPending) return;
          definirExcluindo(false);
          excluir.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir esta planilha?</DialogTitle>
            <DialogDescription>
              O arquivo “{dados.nomeArquivo}”, a leitura e as decisões de
              conciliação deste lote serão removidos. Nenhuma resposta foi
              gravada por ele, então nada mais muda. Depois você poderá enviar o
              mesmo arquivo de novo. A exclusão fica registrada na auditoria e
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {excluir.isError && (
            <p role="alert" className="text-sm text-destructive">
              {excluir.error instanceof HttpError &&
              excluir.error.code === 'LOTE_CONFIRMADO'
                ? 'Este lote já gravou respostas e não pode mais ser excluído.'
                : excluir.error instanceof HttpError &&
                    excluir.error.code === 'LEITURA_EM_ANDAMENTO'
                  ? 'Este lote está sendo lido. Aguarde e tente de novo.'
                  : 'Não foi possível excluir a planilha.'}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={excluir.isPending}
              onClick={() => {
                definirExcluindo(false);
                excluir.reset();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={excluir.isPending}
              onClick={() =>
                excluir.mutate(undefined, {
                  onSuccess: () => {
                    definirExcluindo(false);
                    void navegar({ to: '/importacoes' });
                  },
                })
              }
            >
              {excluir.isPending ? 'Excluindo…' : 'Excluir planilha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
