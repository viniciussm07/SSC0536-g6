import { useProtecaoAlteracoes } from '@/hooks/use-protecao-alteracoes';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { useMemo, useState } from 'react';
import { COLECOES, ESQUEMA_PERIODOS, type PeriodoLinha } from '@ssc0536/common';
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
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { HttpError } from '@/services/http';
import { periodosService } from '@/services/periodos';
import { permite } from '@/utils/acesso';
import { colunasPeriodos, ROTULOS_TIPO_PERIODO } from './colunas';
import { PeriodoForm } from './components/periodo-form';
import { usePeriodoDetalhe, usePeriodoMutations } from './hooks';

type Dialogo =
  | { tipo: 'periodo-novo' }
  | { tipo: 'periodo-editar'; periodo: PeriodoLinha }
  | null;

/** Conflitos do período têm explicação própria; os demais erros seguem a mensagem padrão. */
function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpError) {
    if (erro.code === 'PERIODO_DUPLICADO')
      return 'Já existe um período com este tipo e intervalo. Ajuste as datas ou o tipo.';
    if (erro.code === 'PERIODO_EM_USO')
      return 'O período já referencia pesquisas, coletas ou indicadores: datas e tipo não podem mudar. Altere apenas o rótulo ou crie um novo período.';
  }
  return erro instanceof Error
    ? erro.message
    : 'Não foi possível salvar o período.';
}

export function PeriodosPage() {
  const protecao = useProtecaoAlteracoes();
  const executar = (acao: () => unknown) => {
    if (protecao) void protecao.executar(acao);
    else acao();
  };
  const acesso = useAcessoAtual();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const mutacoes = usePeriodoMutations();
  const podeCriar = permite(acesso, 'pesquisas', 'criar');
  const podeAlterar = permite(acesso, 'pesquisas', 'alterar');
  const detalhe = usePeriodoDetalhe(
    dialogo?.tipo === 'periodo-editar' ? dialogo.periodo.id : undefined,
  );
  const fechar = () => {
    setDialogo(null);
    mutacoes.criar.reset();
    mutacoes.alterar.reset();
  };
  const erro = mutacoes.criar.error ?? mutacoes.alterar.error;
  const colunasDePeriodos = useMemo(
    () =>
      colunasPeriodos({
        onEditar: (periodo) => setDialogo({ tipo: 'periodo-editar', periodo }),
      }),
    [],
  );

  return (
    <section className="space-y-6" aria-label="Períodos de pesquisa">
      <CabecalhoPagina
        titulo="Períodos"
        descricao="Meses de referência e feriados prolongados que estruturam pesquisas, coletas e indicadores. Períodos em uso mantêm datas e tipo; o rótulo pode mudar."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Filtre pelo ícone de cada coluna.
        </p>
        {podeCriar && (
          <Button onClick={() => setDialogo({ tipo: 'periodo-novo' })}>
            <Plus aria-hidden="true" />
            Novo período
          </Button>
        )}
      </div>
      <GradeColecao
        id="periodos"
        rotulo="Períodos"
        esquema={ESQUEMA_PERIODOS}
        colunas={colunasDePeriodos}
        getRowId={(p) => String(p.id)}
        chave={['periodos', acesso.usuarioId, acesso.revisao]}
        colecao={COLECOES.periodos}
        buscar={(consulta, signal) => periodosService.listar(consulta, signal)}
        colunasADireita={['acoes']}
        mensagemVazia="Nenhum período encontrado. Crie um período ou procure a administração do OTO."
      />

      <Dialog
        open={dialogo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) executar(fechar);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {dialogo?.tipo === 'periodo-novo' && (
            <>
              <DialogHeader>
                <DialogTitle>Novo período</DialogTitle>
                <DialogDescription>
                  Mês de referência ou feriado prolongado, com data civil de
                  início e fim.
                </DialogDescription>
              </DialogHeader>
              <PeriodoForm
                onCriar={async (entrada) => {
                  await mutacoes.criar.mutateAsync(entrada);
                  fechar();
                }}
                onAlterar={async () => undefined}
              />
            </>
          )}
          {dialogo?.tipo === 'periodo-editar' && (
            <>
              <DialogHeader>
                <DialogTitle>Editar período</DialogTitle>
                <DialogDescription>
                  {dialogo.periodo.rotulo} ·{' '}
                  {ROTULOS_TIPO_PERIODO[dialogo.periodo.tipo]}
                </DialogDescription>
              </DialogHeader>
              <PeriodoForm
                periodo={dialogo.periodo}
                detalhe={detalhe.data}
                onCriar={async () => undefined}
                onAlterar={async (alteracao) => {
                  if (!podeAlterar) return;
                  await mutacoes.alterar.mutateAsync({
                    id: dialogo.periodo.id,
                    alteracao,
                  });
                  fechar();
                }}
              />
            </>
          )}
          {erro && dialogo && (
            <p role="alert" className="text-sm text-destructive">
              {mensagemDeErro(erro)}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
