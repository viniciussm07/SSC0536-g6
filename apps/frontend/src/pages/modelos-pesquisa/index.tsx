import { useProtecaoAlteracoes } from '@/hooks/use-protecao-alteracoes';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { useMemo, useState } from 'react';
import {
  COLECOES,
  ESQUEMA_MODELOS_PESQUISA,
  type ModeloPesquisaLinha,
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
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { HttpError } from '@/services/http';
import { modelosPesquisaService } from '@/services/pesquisas';
import { permite } from '@/utils/acesso';
import { colunasModelos } from './colunas';
import { HistoricoModelo } from './components/historico-modelo';
import { ModeloForm } from './components/modelo-form';
import { useModeloDetalhe, useModeloMutations } from './hooks';

type Dialogo =
  | { tipo: 'modelo-novo' }
  | { tipo: 'modelo-editar'; modelo: ModeloPesquisaLinha }
  | { tipo: 'historico'; modelo: ModeloPesquisaLinha }
  | null;

/** Conflito de chave tem explicação própria; os demais erros seguem a mensagem padrão. */
function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpError && erro.code === 'CHAVE_DUPLICADA')
    return 'Já existe um campo ou opção com esta chave no modelo. Escolha outra chave.';
  return erro instanceof Error
    ? erro.message
    : 'Não foi possível salvar o modelo.';
}

export function ModelosPesquisaPage() {
  const protecao = useProtecaoAlteracoes();
  const executar = (acao: () => unknown) => {
    if (protecao) void protecao.executar(acao);
    else acao();
  };
  const acesso = useAcessoAtual();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const mutacoes = useModeloMutations();
  const podeCriar = permite(acesso, 'pesquisas', 'criar');
  const podeAlterar = permite(acesso, 'pesquisas', 'alterar');
  const detalhe = useModeloDetalhe(
    dialogo?.tipo === 'modelo-editar' ? dialogo.modelo.id : undefined,
  );
  const fechar = () => {
    setDialogo(null);
    mutacoes.criar.reset();
    mutacoes.alterar.reset();
  };
  const erro = mutacoes.criar.error ?? mutacoes.alterar.error;
  const colunasDeModelos = useMemo(
    () =>
      colunasModelos({
        onEditar: (modelo) => setDialogo({ tipo: 'modelo-editar', modelo }),
        onHistorico: (modelo) => setDialogo({ tipo: 'historico', modelo }),
      }),
    [],
  );

  return (
    <section className="space-y-6" aria-label="Modelos de pesquisa">
      <CabecalhoPagina
        titulo="Modelos de pesquisa"
        descricao="Questionários aplicados aos hóspedes: campos, tipos de valor e opções. Editar campos cria uma nova versão do modelo; pesquisas anteriores continuam lendo a versão que usaram."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Filtre pelo ícone de cada coluna.
        </p>
        {podeCriar && (
          <Button onClick={() => setDialogo({ tipo: 'modelo-novo' })}>
            <Plus aria-hidden="true" />
            Novo modelo
          </Button>
        )}
      </div>
      <GradeColecao
        id="modelos"
        rotulo="Modelos de pesquisa"
        esquema={ESQUEMA_MODELOS_PESQUISA}
        colunas={colunasDeModelos}
        getRowId={(m) => String(m.id)}
        chave={['modelos', acesso.usuarioId, acesso.revisao]}
        colecao={COLECOES.modelosPesquisa}
        buscar={(consulta, signal) =>
          modelosPesquisaService.listar(consulta, signal)
        }
        colunasADireita={['acoes']}
        mensagemVazia="Nenhum modelo encontrado. Crie um modelo ou procure a administração do OTO."
      />

      <Dialog
        open={dialogo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) executar(fechar);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {dialogo?.tipo === 'modelo-novo' && (
            <>
              <DialogHeader>
                <DialogTitle>Novo modelo de pesquisa</DialogTitle>
                <DialogDescription>
                  Cria a versão 1 do modelo com os campos e opções informados.
                </DialogDescription>
              </DialogHeader>
              <ModeloForm
                onCriar={async (entrada) => {
                  await mutacoes.criar.mutateAsync(entrada);
                  fechar();
                }}
                onAlterar={async () => undefined}
              />
            </>
          )}
          {dialogo?.tipo === 'modelo-editar' && (
            <>
              <DialogHeader>
                <DialogTitle>Editar modelo</DialogTitle>
                <DialogDescription>
                  {dialogo.modelo.nome} · versão {dialogo.modelo.versao}. Mudar
                  os campos cria a versão {dialogo.modelo.versao + 1}.
                </DialogDescription>
              </DialogHeader>
              {detalhe.isPending ? (
                <p role="status">Carregando modelo…</p>
              ) : detalhe.data ? (
                <ModeloForm
                  modelo={detalhe.data}
                  onCriar={async () => undefined}
                  onAlterar={async (alteracao) => {
                    if (!podeAlterar) return;
                    await mutacoes.alterar.mutateAsync({
                      id: dialogo.modelo.id,
                      alteracao,
                    });
                    fechar();
                  }}
                />
              ) : (
                <p role="alert" className="text-sm text-destructive">
                  {detalhe.error?.message ??
                    'Não foi possível carregar o modelo.'}
                </p>
              )}
            </>
          )}
          {dialogo?.tipo === 'historico' && (
            <>
              <DialogHeader>
                <DialogTitle>Histórico de {dialogo.modelo.nome}</DialogTitle>
                <DialogDescription>
                  {dialogo.modelo.publicoAlvo}
                </DialogDescription>
              </DialogHeader>
              <HistoricoModelo modelo={dialogo.modelo} />
            </>
          )}
          {erro && dialogo && dialogo.tipo !== 'historico' && (
            <p role="alert" className="text-sm text-destructive">
              {mensagemDeErro(erro)}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
