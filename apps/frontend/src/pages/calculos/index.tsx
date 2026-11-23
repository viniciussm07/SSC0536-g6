import { useMemo, useState } from 'react';
import {
  COLECOES,
  ESQUEMA_CALCULOS,
  type ExecucaoCalculoLinha,
} from '@ssc0536/common';
import { Calculator } from 'lucide-react';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
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
import { useProtecaoAlteracoes } from '@/hooks/use-protecao-alteracoes';
import { HttpError } from '@/services/http';
import { calculosService } from '@/services/calculos';
import { permite } from '@/utils/acesso';
import { colunasCalculos } from './colunas';
import { CalculoForm } from './components/calculo-form';
import { DetalheCalculo } from './components/detalhe-calculo';
import {
  useCalculoDetalhe,
  useCalculoMutations,
  usePublicadaDaPergunta,
} from './hooks';

type Dialogo =
  { tipo: 'novo' } | { tipo: 'detalhe'; id: number; rotulo: string } | null;

/** Conflitos do ciclo de cálculo têm explicação própria; o resto segue a mensagem do servidor. */
function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpError) {
    if (erro.code === 'CALCULO_EM_ANDAMENTO')
      return 'Já há um cálculo em andamento para esta pergunta. Aguarde e atualize a lista.';
    if (erro.code === 'PERGUNTA_NAO_CALCULAVEL')
      return 'A pergunta escolhida não é percentual; escolha a pergunta de taxa de ocupação.';
  }
  return erro instanceof Error
    ? erro.message
    : 'Não foi possível concluir a operação.';
}

export function CalculosPage() {
  const protecao = useProtecaoAlteracoes();
  const executarProtegido = (acao: () => unknown) => {
    if (protecao) void protecao.executar(acao);
    else acao();
  };
  const acesso = useAcessoAtual();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const mutacoes = useCalculoMutations();
  const podeCalcular = permite(acesso, 'calculos', 'criar');
  const podePublicar = permite(acesso, 'publicacoes', 'publicar');
  const detalhe = useCalculoDetalhe(
    dialogo?.tipo === 'detalhe' ? dialogo.id : undefined,
  );
  const publicada = usePublicadaDaPergunta(
    dialogo?.tipo === 'detalhe' && podePublicar
      ? detalhe.data?.perguntaId
      : undefined,
  );
  const fechar = () => {
    setDialogo(null);
    setAviso(null);
    mutacoes.executar.reset();
    mutacoes.retomar.reset();
    mutacoes.publicar.reset();
  };
  const erro =
    mutacoes.executar.error ??
    mutacoes.retomar.error ??
    mutacoes.publicar.error;
  const colunas = useMemo(
    () =>
      colunasCalculos({
        onDetalhar: (linha: ExecucaoCalculoLinha) =>
          setDialogo({ tipo: 'detalhe', id: linha.id, rotulo: linha.periodo }),
      }),
    [],
  );

  return (
    <section className="space-y-6" aria-label="Cálculos de indicadores">
      <CabecalhoPagina
        titulo="Cálculos"
        descricao="Execuções da fórmula v1 por pergunta de taxa de ocupação, com insumos congelados, revisões e publicação. Resultados só chegam a Indicadores depois de publicados."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Valores são demonstrativos: a metodologia ainda não foi homologada
          pelo OTO.
        </p>
        {podeCalcular && (
          <Button onClick={() => setDialogo({ tipo: 'novo' })}>
            <Calculator aria-hidden="true" />
            Novo cálculo
          </Button>
        )}
      </div>
      <GradeColecao
        id="calculos"
        rotulo="Cálculos"
        esquema={ESQUEMA_CALCULOS}
        colunas={colunas}
        getRowId={(e) => String(e.id)}
        chave={['calculos', acesso.usuarioId, acesso.revisao]}
        colecao={COLECOES.calculos}
        buscar={(consulta, signal) => calculosService.listar(consulta, signal)}
        colunasADireita={['acoes']}
        mensagemVazia="Nenhum cálculo executado. Escolha uma edição e a pergunta de taxa de ocupação para calcular."
      />

      <Dialog
        open={dialogo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) executarProtegido(fechar);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {dialogo?.tipo === 'novo' && (
            <>
              <DialogHeader>
                <DialogTitle>Novo cálculo</DialogTitle>
                <DialogDescription>
                  Período e tipo de coleta vêm da pergunta escolhida.
                </DialogDescription>
              </DialogHeader>
              <CalculoForm
                onExecutar={async (entrada) => {
                  const r = await mutacoes.executar.mutateAsync(entrada);
                  setAviso(
                    r.reaproveitada
                      ? 'Insumos iguais aos da última revisão: o resultado existente foi reaproveitado.'
                      : r.execucao.situacao === 'falhou'
                        ? 'O cálculo falhou; veja o erro registrado.'
                        : 'Cálculo concluído.',
                  );
                  setDialogo({
                    tipo: 'detalhe',
                    id: r.execucao.id,
                    rotulo: r.execucao.periodo,
                  });
                }}
              />
            </>
          )}
          {dialogo?.tipo === 'detalhe' && (
            <>
              <DialogHeader>
                <DialogTitle>Cálculo de {dialogo.rotulo}</DialogTitle>
                <DialogDescription>
                  {detalhe.data
                    ? `${detalhe.data.pesquisa} · solicitado por ${detalhe.data.solicitadaPor}`
                    : 'Carregando execução…'}
                </DialogDescription>
              </DialogHeader>
              {aviso && (
                <p role="status" className="text-sm">
                  {aviso}
                </p>
              )}
              {detalhe.isPending && (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              )}
              {detalhe.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {mensagemDeErro(detalhe.error)}
                </p>
              )}
              {detalhe.data && (
                <DetalheCalculo
                  execucao={detalhe.data}
                  podePublicar={podePublicar}
                  podeRetomar={podeCalcular}
                  existePublicada={
                    !!publicada.data && publicada.data.id !== detalhe.data.id
                  }
                  retomando={mutacoes.retomar.isPending}
                  onRetomar={() => {
                    setAviso(null);
                    mutacoes.retomar.mutate(dialogo.id);
                  }}
                  onPublicar={async (entrada) => {
                    await mutacoes.publicar.mutateAsync({
                      id: dialogo.id,
                      entrada,
                    });
                    setAviso('Resultados publicados em Indicadores.');
                  }}
                />
              )}
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
