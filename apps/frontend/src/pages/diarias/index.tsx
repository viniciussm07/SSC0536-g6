import { useProtecaoAlteracoes } from '@/hooks/use-protecao-alteracoes';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { useMemo, useState } from 'react';
import {
  COLECOES,
  ESQUEMA_COLETAS_DIARIAS,
  ESQUEMA_PARAMETROS_CALCULO,
  ESQUEMA_RHC_PERIODOS,
  type ColetaDiariaLinha,
  type ParametroCalculoLinha,
  type RhcPeriodoLinha,
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
import { HttpError } from '@/services/http';
import { diariasService } from '@/services/diarias';
import { errosDeCampo } from '@/services/cadastro';
import { permite } from '@/utils/acesso';
import { colunasColetas, colunasParametros, colunasRhc } from './colunas';
import { ColetaForm } from './components/coleta-form';
import { ParametroForm } from './components/parametro-form';
import { RhcForm } from './components/rhc-form';
import { opcoes } from './form-utils';
import { useApoioDiarias, useDiariasMutations } from './hooks';

type Dialogo =
  | { tipo: 'coleta-nova' }
  | { tipo: 'coleta-editar'; linha: ColetaDiariaLinha }
  | { tipo: 'rhc-nova' }
  | { tipo: 'rhc-editar'; linha: RhcPeriodoLinha }
  | { tipo: 'parametro-novo' }
  | { tipo: 'parametro-editar'; linha: ParametroCalculoLinha }
  | null;

const ABAS = [
  { id: 'diarias', rotulo: 'Diárias' },
  { id: 'rhc', rotulo: 'RHC' },
  { id: 'parametros', rotulo: 'Parâmetros' },
];

/** Conflitos das fontes têm explicação própria; os demais erros seguem a mensagem padrão. */
function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpError) {
    if (erro.code === 'COLETA_DIARIA_DUPLICADA')
      return 'Já existe uma coleta com este empreendimento, período, fonte, data de estadia e tipo de dia.';
    if (erro.code === 'COLETA_DIARIA_CONFLITO')
      return 'A mesma observação já existe com outro valor. Revise o conflito em vez de sobrescrever.';
    if (erro.code === 'RHC_JA_CONFERIDO')
      return 'Já existe um RHC conferido para este período. Desmarque a conferência anterior antes de confirmar outra.';
    if (erro.code === 'PARAMETRO_DUPLICADO')
      return 'Já existe um parâmetro com esta chave e início de vigência.';
    if (erro.code === 'PARAMETRO_VIGENCIA_SOBREPOSTA')
      return 'A vigência se sobrepõe a outro parâmetro com a mesma chave.';
    if (erro.code === 'ENTRADA_INVALIDA') {
      const detalhes = errosDeCampo(erro.details).map((item) => item.message);
      if (detalhes.length) return [...new Set(detalhes)].join(' ');
    }
  }
  return erro instanceof Error
    ? erro.message
    : 'Não foi possível salvar o registro.';
}

export function DiariasPage() {
  const protecao = useProtecaoAlteracoes();
  const executar = (acao: () => unknown) => {
    if (protecao) void protecao.executar(acao);
    else acao();
  };
  const acesso = useAcessoAtual();
  const [aba, setAba] = useState('diarias');
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const mutacoes = useDiariasMutations();
  const apoio = useApoioDiarias(acesso);
  const podeCriar = permite(acesso, 'calculos', 'criar');
  const podeAlterar = permite(acesso, 'calculos', 'alterar');
  const empreendimentos = opcoes(
    apoio.empreendimentos.data?.map((item) => ({
      id: item.id,
      nome: item.nomeFantasia,
    })) ?? [],
  );
  const periodos = opcoes(
    apoio.periodos.data?.map((item) => ({
      id: item.id,
      nome: item.rotulo,
    })) ?? [],
  );
  const temEmpreendimentos = (apoio.empreendimentos.data?.length ?? 0) > 0;
  const temPeriodos = (apoio.periodos.data?.length ?? 0) > 0;
  const fechar = () => {
    setDialogo(null);
    mutacoes.criarColeta.reset();
    mutacoes.alterarColeta.reset();
    mutacoes.criarRhc.reset();
    mutacoes.alterarRhc.reset();
    mutacoes.criarParametro.reset();
    mutacoes.alterarParametro.reset();
  };
  const erro =
    mutacoes.criarColeta.error ??
    mutacoes.alterarColeta.error ??
    mutacoes.criarRhc.error ??
    mutacoes.alterarRhc.error ??
    mutacoes.criarParametro.error ??
    mutacoes.alterarParametro.error;
  const semApoio =
    apoio.empreendimentos.isError || apoio.periodos.isError
      ? 'Não foi possível carregar empreendimentos ou períodos; a fonte complementar fica indisponível até a correção.'
      : null;

  const colunasDeColetas = useMemo(
    () =>
      colunasColetas({
        onEditar: (linha) => setDialogo({ tipo: 'coleta-editar', linha }),
      }),
    [],
  );
  const colunasDeRhc = useMemo(
    () =>
      colunasRhc({
        onEditar: (linha) => setDialogo({ tipo: 'rhc-editar', linha }),
      }),
    [],
  );
  const colunasDeParametros = useMemo(
    () =>
      colunasParametros({
        onEditar: (linha) => setDialogo({ tipo: 'parametro-editar', linha }),
      }),
    [],
  );
  const chave = (recurso: string) => [
    'diarias',
    recurso,
    acesso.usuarioId,
    acesso.revisao,
  ];

  return (
    <section className="space-y-6" aria-label="Fontes complementares">
      <CabecalhoPagina
        titulo="Diárias, RHC e parâmetros"
        descricao="Coleta manual autorizada das fontes complementares. Preços são ofertados, não receita realizada; a importação de planilhas depende das partes 08 e 09."
      />
      {semApoio && (
        <p role="alert" className="text-sm text-destructive">
          {semApoio}
        </p>
      )}
      <Abas
        rotulo="Seções das fontes complementares"
        abas={ABAS}
        ativa={aba}
        onChange={(valor) => executar(() => setAba(valor))}
      >
        {(ativa) =>
          ativa === 'diarias' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Filtre pelo ícone de cada coluna. Mudanças de negócio voltam a
                  observação para pendente.
                </p>
                {podeCriar && (
                  <Button
                    disabled={!temEmpreendimentos || !temPeriodos}
                    onClick={() => setDialogo({ tipo: 'coleta-nova' })}
                  >
                    <Plus aria-hidden="true" />
                    Nova coleta
                  </Button>
                )}
              </div>
              <GradeColecao
                id="diarias"
                rotulo="Coletas de diária"
                esquema={ESQUEMA_COLETAS_DIARIAS}
                colunas={colunasDeColetas}
                getRowId={(linha) => String(linha.id)}
                chave={chave('coletas')}
                colecao={COLECOES.coletasDiarias}
                buscar={(consulta, signal) =>
                  diariasService.listarColetas(consulta, signal)
                }
                colunasADireita={['acoes']}
                mensagemVazia="Nenhuma coleta de diária encontrada. A fonte está indisponível até que haja uma observação autorizada."
              />
            </>
          ) : ativa === 'rhc' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Um único RHC conferido por período; o histórico permanece na
                  auditoria e na revisão.
                </p>
                {podeCriar && (
                  <Button
                    disabled={!temPeriodos}
                    onClick={() => setDialogo({ tipo: 'rhc-nova' })}
                  >
                    <Plus aria-hidden="true" />
                    Novo RHC
                  </Button>
                )}
              </div>
              <GradeColecao
                id="rhc"
                rotulo="RHC por período"
                esquema={ESQUEMA_RHC_PERIODOS}
                colunas={colunasDeRhc}
                getRowId={(linha) => String(linha.id)}
                chave={chave('rhc')}
                colecao={COLECOES.rhcPeriodos}
                buscar={(consulta, signal) =>
                  diariasService.listarRhc(consulta, signal)
                }
                colunasADireita={['acoes']}
                mensagemVazia="Nenhum RHC encontrado. A fonte está indisponível até que haja um agregado conferido."
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Parâmetros com vigência e situação; valores de hipótese não
                  são metodologia homologada.
                </p>
                {podeCriar && (
                  <Button
                    onClick={() => setDialogo({ tipo: 'parametro-novo' })}
                  >
                    <Plus aria-hidden="true" />
                    Novo parâmetro
                  </Button>
                )}
              </div>
              <GradeColecao
                id="parametros"
                rotulo="Parâmetros de cálculo"
                esquema={ESQUEMA_PARAMETROS_CALCULO}
                colunas={colunasDeParametros}
                getRowId={(linha) => String(linha.id)}
                chave={chave('parametros')}
                colecao={COLECOES.parametrosCalculo}
                buscar={(consulta, signal) =>
                  diariasService.listarParametros(consulta, signal)
                }
                colunasADireita={['acoes']}
                mensagemVazia="Nenhum parâmetro encontrado. A fonte está indisponível até que haja um valor registrado."
              />
            </>
          )
        }
      </Abas>

      <Dialog
        open={dialogo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) executar(fechar);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {(dialogo?.tipo === 'coleta-nova' ||
            dialogo?.tipo === 'coleta-editar') && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialogo.tipo === 'coleta-nova'
                    ? 'Nova coleta de diária'
                    : 'Editar coleta de diária'}
                </DialogTitle>
                <DialogDescription>
                  Preço ofertado por UH/diária, com data da coleta e data da
                  estadia distintas.
                </DialogDescription>
              </DialogHeader>
              <ColetaForm
                coleta={
                  dialogo.tipo === 'coleta-editar' ? dialogo.linha : undefined
                }
                empreendimentos={empreendimentos}
                periodos={periodos}
                onCriar={async (entrada) => {
                  await mutacoes.criarColeta.mutateAsync(entrada);
                  fechar();
                }}
                onAlterar={async (alteracao) => {
                  if (!podeAlterar || dialogo.tipo !== 'coleta-editar') return;
                  await mutacoes.alterarColeta.mutateAsync({
                    id: dialogo.linha.id,
                    alteracao,
                  });
                  fechar();
                }}
              />
            </>
          )}
          {(dialogo?.tipo === 'rhc-nova' || dialogo?.tipo === 'rhc-editar') && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialogo.tipo === 'rhc-nova'
                    ? 'Novo RHC por período'
                    : 'Editar RHC por período'}
                </DialogTitle>
                <DialogDescription>
                  Quantidade de casas e leitos, sem cadastro pessoal dos
                  proprietários.
                </DialogDescription>
              </DialogHeader>
              <RhcForm
                rhc={dialogo.tipo === 'rhc-editar' ? dialogo.linha : undefined}
                periodos={periodos}
                onCriar={async (entrada) => {
                  await mutacoes.criarRhc.mutateAsync(entrada);
                  fechar();
                }}
                onAlterar={async (alteracao) => {
                  if (!podeAlterar || dialogo.tipo !== 'rhc-editar') return;
                  await mutacoes.alterarRhc.mutateAsync({
                    id: dialogo.linha.id,
                    alteracao,
                  });
                  fechar();
                }}
              />
            </>
          )}
          {(dialogo?.tipo === 'parametro-novo' ||
            dialogo?.tipo === 'parametro-editar') && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialogo.tipo === 'parametro-novo'
                    ? 'Novo parâmetro de cálculo'
                    : 'Editar parâmetro de cálculo'}
                </DialogTitle>
                <DialogDescription>
                  Registre fonte e vigência; alterações ficam na auditoria.
                </DialogDescription>
              </DialogHeader>
              <ParametroForm
                parametro={
                  dialogo.tipo === 'parametro-editar'
                    ? dialogo.linha
                    : undefined
                }
                onCriar={async (entrada) => {
                  await mutacoes.criarParametro.mutateAsync(entrada);
                  fechar();
                }}
                onAlterar={async (alteracao) => {
                  if (!podeAlterar || dialogo.tipo !== 'parametro-editar')
                    return;
                  await mutacoes.alterarParametro.mutateAsync({
                    id: dialogo.linha.id,
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
