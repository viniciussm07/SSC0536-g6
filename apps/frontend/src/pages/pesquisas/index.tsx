import { useMemo, useState } from 'react';
import { COLECOES, ESQUEMA_PESQUISAS } from '@ssc0536/common';
import { Plus } from 'lucide-react';
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
import { useSegmentos } from '@/hooks/use-segmentos';
import { edicoesService } from '@/services/edicoes';
import { HttpError } from '@/services/http';
import { escopo } from '@/utils/acesso';
import { colunasPesquisas } from './colunas';
import { AcompanhamentoEdicao } from './components/acompanhamento-edicao';
import { EdicaoForm } from './components/edicao-form';
import { useEdicaoDetalhe, useEdicaoMutations, useOpcoesEdicao } from './hooks';

type Dialogo =
  | { tipo: 'nova' }
  | { tipo: 'editar'; id: number }
  | { tipo: 'acompanhar'; id: number }
  | null;

const MENSAGENS: Record<string, string> = {
  PESQUISA_CAMPO_BLOQUEADO:
    'Após a abertura, só título e prazo podem mudar (e a abertura, enquanto agendada).',
  PESQUISA_REABERTURA_PENDENTE:
    'O prazo já venceu: prorrogar equivale a reabrir, regra ainda pendente com o OTO.',
  PESQUISA_PRAZO_PASSADO: 'O prazo precisa ser posterior ao momento atual.',
  PESQUISA_SEM_DESTINATARIOS:
    'Nenhum empreendimento ativo atende ao público selecionado.',
  PESQUISA_ESTADO_INVALIDO:
    'A edição mudou de situação. Atualize a página e confira o estado atual.',
};

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpError) {
    if (erro.code && MENSAGENS[erro.code]) return MENSAGENS[erro.code];
    const detalhes: unknown[] = Array.isArray(erro.details) ? erro.details : [];
    const detalhe = detalhes.find(
      (d): d is { message: string } =>
        typeof d === 'object' &&
        d !== null &&
        typeof (d as { message?: unknown }).message === 'string',
    );
    if (erro.status === 400 && detalhe) return detalhe.message;
  }
  return erro instanceof Error
    ? erro.message
    : 'Não foi possível concluir a operação.';
}

export function PesquisasPage() {
  const protecao = useProtecaoAlteracoes();
  const executar = (acao: () => unknown) => {
    if (protecao) void protecao.executar(acao);
    else acao();
  };
  const acesso = useAcessoAtual();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const mutacoes = useEdicaoMutations();
  const podeConsultar = escopo(acesso, 'pesquisas', 'consultar') === 'todos';
  const podeCriar = escopo(acesso, 'pesquisas', 'criar') === 'todos';
  const podeAlterar = escopo(acesso, 'pesquisas', 'alterar') === 'todos';
  const formularioAberto =
    dialogo?.tipo === 'nova' || dialogo?.tipo === 'editar';
  const opcoes = useOpcoesEdicao(acesso);
  const segmentos = useSegmentos(acesso);
  const detalhe = useEdicaoDetalhe(
    acesso,
    dialogo && dialogo.tipo !== 'nova' ? dialogo.id : undefined,
  );
  const reset = () => {
    for (const m of Object.values(mutacoes)) m.reset();
  };
  const fechar = () => {
    setDialogo(null);
    reset();
  };
  const erro = Object.values(mutacoes).find((m) => m.error)?.error;
  const pendente = Object.values(mutacoes).some((m) => m.isPending);
  const colunas = useMemo(
    () =>
      colunasPesquisas({
        podeAlterar,
        onAcompanhar: (p) => setDialogo({ tipo: 'acompanhar', id: p.id }),
        onEditar: (p) => setDialogo({ tipo: 'editar', id: p.id }),
      }),
    [podeAlterar],
  );
  const formulario = (
    <EdicaoForm
      key={dialogo?.tipo === 'editar' ? `e${detalhe.data?.id}` : 'nova'}
      detalhe={dialogo?.tipo === 'editar' ? detalhe.data : undefined}
      modelos={opcoes.modelos.data?.data ?? []}
      periodos={opcoes.periodos.data?.data ?? []}
      segmentos={segmentos.data ?? []}
      onCriar={async (entrada) => {
        const criada = await mutacoes.criar.mutateAsync(entrada);
        reset();
        setDialogo({ tipo: 'acompanhar', id: criada.id });
      }}
      onAlterar={async (alteracao) => {
        if (dialogo?.tipo !== 'editar') return;
        await mutacoes.alterar.mutateAsync({ id: dialogo.id, alteracao });
        reset();
        setDialogo({ tipo: 'acompanhar', id: dialogo.id });
      }}
    />
  );

  return (
    <section className="space-y-6" aria-label="Edições de pesquisa">
      <CabecalhoPagina
        titulo="Edições de pesquisa"
        descricao="Edições de Expectativa e Consolidado: rascunho, abertura com público congelado, prazo e encerramento. As contagens de participação não são taxas de ocupação."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Horários no fuso de Brasília. Filtre pelo ícone de cada coluna.
        </p>
        {podeConsultar && podeCriar && (
          <Button onClick={() => setDialogo({ tipo: 'nova' })}>
            <Plus aria-hidden="true" />
            Nova edição
          </Button>
        )}
      </div>
      {podeConsultar ? (
        <GradeColecao
          id="pesquisas"
          rotulo="Edições de pesquisa"
          esquema={ESQUEMA_PESQUISAS}
          colunas={colunas}
          getRowId={(p) => String(p.id)}
          chave={['pesquisas', acesso.usuarioId, acesso.revisao]}
          colecao={COLECOES.pesquisas}
          buscar={(consulta, signal) => edicoesService.listar(consulta, signal)}
          colunasADireita={['acoes']}
          mensagemVazia="Nenhuma edição encontrada. Crie um rascunho a partir de um modelo e de períodos."
        />
      ) : (
        <p role="alert">
          A gestão de edições exige permissão de consulta para todos os
          empreendimentos.
        </p>
      )}

      <Dialog
        open={dialogo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) executar(fechar);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {dialogo?.tipo === 'nova' && (
            <>
              <DialogHeader>
                <DialogTitle>Nova edição</DialogTitle>
                <DialogDescription>
                  Cria um rascunho com a versão vigente do modelo. Nada é
                  publicado até a abertura.
                </DialogDescription>
              </DialogHeader>
              {segmentos.isPending ? (
                <p>Carregando segmentos…</p>
              ) : segmentos.isError ? (
                <div role="alert">
                  Não foi possível carregar segmentos.{' '}
                  <Button
                    type="button"
                    onClick={() => void segmentos.refetch()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                formulario
              )}
            </>
          )}
          {dialogo?.tipo === 'editar' && (
            <>
              <DialogHeader>
                <DialogTitle>Editar edição</DialogTitle>
                <DialogDescription>
                  {detalhe.data?.titulo ?? 'Carregando…'}
                </DialogDescription>
              </DialogHeader>
              {detalhe.data &&
                (segmentos.isPending ? (
                  <p>Carregando segmentos…</p>
                ) : segmentos.isError ? (
                  <div role="alert">
                    Não foi possível carregar segmentos.{' '}
                    <Button
                      type="button"
                      onClick={() => void segmentos.refetch()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  formulario
                ))}
            </>
          )}
          {dialogo?.tipo === 'acompanhar' && (
            <>
              <DialogHeader>
                <DialogTitle>{detalhe.data?.titulo ?? 'Edição'}</DialogTitle>
                <DialogDescription>
                  Revisão, ciclo e acompanhamento de respondentes.
                </DialogDescription>
              </DialogHeader>
              {detalhe.isPending && (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              )}
              {detalhe.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {mensagemDeErro(detalhe.error)}
                </p>
              )}
              {detalhe.data && (
                <AcompanhamentoEdicao
                  detalhe={detalhe.data}
                  podeAlterar={podeAlterar}
                  pendente={pendente}
                  onEditar={() =>
                    setDialogo({ tipo: 'editar', id: dialogo.id })
                  }
                  onAbrir={() => mutacoes.abrir.mutateAsync(dialogo.id)}
                  onEncerrar={() => mutacoes.encerrar.mutateAsync(dialogo.id)}
                  onExcluir={async () => {
                    await mutacoes.excluir.mutateAsync(dialogo.id);
                    fechar();
                  }}
                />
              )}
            </>
          )}
          {formularioAberto &&
            (opcoes.modelos.isError || opcoes.periodos.isError) && (
              <p role="alert" className="text-sm text-destructive">
                Não foi possível carregar modelos ou períodos.
              </p>
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
