import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import {
  campoPergunta,
  conferirItensResposta,
  type AcessoAtual,
  type ErroCampo,
  type FormularioResposta,
  type ItemResposta,
  type PerguntaResposta,
} from '@ssc0536/common';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useAppForm } from '@/hooks/use-app-form';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import {
  useBaseFormulario,
  useProtecaoFormulario,
} from '@/hooks/use-protecao-formulario';
import { errosDeCampo } from '@/services/cadastro';
import { HttpError } from '@/services/http';
import { permite } from '@/utils/acesso';
import { formatarInstante } from '@/utils/data-hora';
import {
  CORES_SITUACAO_PESQUISA,
  CORES_TIPO_COLETA,
  ROTULOS_SITUACAO_PESQUISA,
  ROTULOS_TIPO_COLETA,
} from '@/utils/pesquisa';
import { useEnviarResposta, useFormularioResposta } from './hooks';

const MENSAGENS: Record<string, string> = {
  PESQUISA_FORA_DO_PRAZO:
    'Esta pesquisa não está recebendo respostas agora; nada foi registrado.',
  PESQUISA_NAO_DESTINATARIO:
    'Este empreendimento não faz parte do público desta pesquisa.',
};
const AVISOS: Partial<Record<FormularioResposta['situacao'], string>> = {
  agendada: 'Esta pesquisa ainda não abriu. Volte a partir da abertura.',
  expirada: 'O prazo terminou. Novas respostas e correções não são aceitas.',
  encerrada: 'A pesquisa foi encerrada. Novas respostas não são aceitas.',
};

const nomeCampo = (perguntaId: number) => `p${perguntaId}`;
const paraItens = (
  perguntas: readonly PerguntaResposta[],
  valores: Record<string, string>,
): ItemResposta[] =>
  perguntas.map((p) => ({
    perguntaId: p.id,
    valor: valores[nomeCampo(p.id)] ?? '',
  }));
const valoresIniciais = (form: FormularioResposta) => {
  const itens = new Map(
    form.resposta?.itens.map((i) => [i.perguntaId, i.valor]) ?? [],
  );
  return Object.fromEntries(
    form.perguntas.map((p) => [nomeCampo(p.id), itens.get(p.id) ?? '']),
  );
};
const valorExibido = (
  pergunta: PerguntaResposta,
  valor: string | undefined,
) => {
  if (valor === undefined) return 'Não respondida';
  if (pergunta.tipoValor === 'percentual') return `${valor.replace('.', ',')}%`;
  if (pergunta.tipoValor === 'escolha')
    return pergunta.opcoes?.find((o) => o.chave === valor)?.rotulo ?? valor;
  return valor;
};
const porPeriodo = (form: FormularioResposta) =>
  form.periodos.map((periodo) => ({
    periodo,
    perguntas: form.perguntas.filter((p) => p.periodoId === periodo.id),
  }));
const dataBr = (iso: string) => iso.split('-').reverse().join('/');

export function ResponderPesquisaPage() {
  const acesso = useAcessoAtual();
  const { entidade } = useContextoEntidade();
  const { pesquisaId } = useParams({ strict: false }) as { pesquisaId: string };
  const numero = Number(pesquisaId);
  if (!entidade) return null;
  if (!Number.isSafeInteger(numero) || numero < 1)
    return <p role="alert">Pesquisa inválida.</p>;
  return (
    <Pagina
      acesso={acesso}
      id={entidade.id}
      nome={entidade.nome}
      pesquisaId={numero}
    />
  );
}

function Pagina({
  acesso,
  id,
  nome,
  pesquisaId,
}: {
  acesso: AcessoAtual;
  id: number;
  nome: string;
  pesquisaId: number;
}) {
  const consulta = useFormularioResposta(acesso, id, pesquisaId);
  const form = consulta.data;
  return (
    <section className="space-y-6" aria-label="Responder pesquisa">
      <Link to="/" className="text-sm underline">
        Voltar ao empreendimento
      </Link>
      {consulta.isPending ? (
        <p role="status">Carregando pesquisa…</p>
      ) : consulta.isError ? (
        <div className="space-y-3">
          <p role="alert">
            {consulta.error instanceof HttpError &&
            consulta.error.status === 404
              ? 'Pesquisa não encontrada para este empreendimento.'
              : consulta.error.message}
          </p>
          <Button variant="outline" onClick={() => void consulta.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <header className="space-y-2">
            <h1 className="font-heading text-[22px] font-extrabold sm:text-[26px]">
              {form!.titulo}
            </h1>
            <p className="text-muted-foreground">{nome}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge cor={CORES_TIPO_COLETA[form!.tipoColeta]}>
                {ROTULOS_TIPO_COLETA[form!.tipoColeta]}
              </Badge>
              <Badge cor={CORES_SITUACAO_PESQUISA[form!.situacao]}>
                {ROTULOS_SITUACAO_PESQUISA[form!.situacao]}
              </Badge>
            </div>
            <p className="text-sm">
              Prazo: {formatarInstante(form!.prazo)} (horário de Brasília)
            </p>
          </header>
          <Situacao form={form!} />
          {form!.situacao === 'recebendo' &&
          permite(acesso, 'respostas', form!.resposta ? 'alterar' : 'criar') ? (
            // Os valores iniciais ficam congelados no formulário: a atualização após o
            // envio não substitui o que está preenchido.
            <Formulario
              key={JSON.stringify([
                acesso.usuarioId,
                acesso.revisao,
                id,
                pesquisaId,
              ])}
              id={id}
              pesquisaId={pesquisaId}
              form={form!}
            />
          ) : (
            <Leitura form={form!} />
          )}
        </>
      )}
    </section>
  );
}

function Situacao({ form }: { form: FormularioResposta }) {
  const aviso = AVISOS[form.situacao];
  const resposta = form.resposta;
  return (
    <div className="space-y-2">
      {resposta && (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          Resposta registrada em {formatarInstante(resposta.respondidaEm)}
          {resposta.atualizadaEm
            ? `, corrigida em ${formatarInstante(resposta.atualizadaEm)}`
            : ''}
          .
        </p>
      )}
      {aviso && (
        <p role="alert" className="text-sm">
          {aviso}
        </p>
      )}
    </div>
  );
}

function Leitura({ form }: { form: FormularioResposta }) {
  if (!form.resposta) return null;
  const valores = new Map(
    form.resposta.itens.map((i) => [i.perguntaId, i.valor]),
  );
  return (
    <div className="space-y-4">
      {porPeriodo(form).map(({ periodo, perguntas }) => (
        <section
          key={periodo.id}
          aria-label={periodo.rotulo}
          className="space-y-2 rounded-xl border bg-card p-5 shadow-card"
        >
          <h2 className="text-lg font-semibold">{periodo.rotulo}</h2>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
            {perguntas.map((p) => (
              <div key={p.id} className="contents">
                <dt className="text-sm text-muted-foreground">{p.rotulo}</dt>
                <dd>{valorExibido(p, valores.get(p.id))}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function Formulario({
  id,
  pesquisaId,
  form: dados,
}: {
  id: number;
  pesquisaId: number;
  form: FormularioResposta;
}) {
  const enviar = useEnviarResposta(id, pesquisaId);
  const [errosServidor, setErrosServidor] = useState<ErroCampo[]>([]);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const [base, definirBase] = useBaseFormulario(valoresIniciais(dados));
  const corrigindo = dados.resposta !== null;
  const form = useAppForm({
    defaultValues: base as Record<string, string>,
    validators: {
      // Mesmas regras do servidor (common); o servidor continua decidindo.
      onSubmit: ({ value }) => {
        const r = conferirItensResposta(
          dados.perguntas,
          paraItens(dados.perguntas, value),
        );
        if (r.valido) return undefined;
        return {
          fields: Object.fromEntries(
            r.erros.map((e) => [
              nomeCampo(Number(e.field.split('.')[1])),
              e.message,
            ]),
          ),
        };
      },
    },
    onSubmit: async ({ value, formApi }) => {
      setErrosServidor([]);
      setConfirmacao(null);
      try {
        const resultado = await enviar.mutateAsync(
          paraItens(dados.perguntas, value),
        );
        const registrada = resultado.resposta;
        const novos = valoresIniciais(resultado);
        definirBase(novos);
        formApi.reset(novos);
        setConfirmacao(
          registrada
            ? `Resposta registrada em ${formatarInstante(registrada.atualizadaEm ?? registrada.respondidaEm)}.`
            : 'Resposta registrada.',
        );
      } catch (erro) {
        if (erro instanceof HttpError)
          setErrosServidor(errosDeCampo(erro.details));
      }
    },
  });
  useProtecaoFormulario(form);
  const erroDe = (perguntaId: number) =>
    errosServidor.find((e) => e.field === campoPergunta(perguntaId))?.message;
  const erroGeral =
    enviar.error instanceof HttpError && enviar.error.code
      ? (MENSAGENS[enviar.error.code] ?? enviar.error.message)
      : enviar.error?.message;

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <p className="text-sm text-muted-foreground">
        Percentuais de 0 a 100 (use vírgula ou ponto). Campos marcados com * são
        obrigatórios.
      </p>
      {porPeriodo(dados).map(({ periodo, perguntas }) => (
        <fieldset
          key={periodo.id}
          className="space-y-4 rounded-xl border bg-card p-5 shadow-card sm:p-6"
        >
          <legend className="px-1 text-lg font-semibold">
            {periodo.rotulo}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              ({dataBr(periodo.dataInicio)} a {dataBr(periodo.dataFim)})
            </span>
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            {perguntas.map((p) => (
              <div key={p.id} className="space-y-1">
                <form.AppField name={nomeCampo(p.id)}>
                  {(f) =>
                    p.tipoValor === 'escolha' ? (
                      <f.Select
                        label={`${p.rotulo}${p.obrigatorio ? ' *' : ''}`}
                        required={p.obrigatorio}
                        options={[
                          { value: '', label: 'Selecione…' },
                          ...(p.opcoes ?? []).map((o) => ({
                            value: o.chave,
                            label: o.rotulo,
                          })),
                        ]}
                      />
                    ) : (
                      <f.Input
                        label={`${p.rotulo}${p.obrigatorio ? ' *' : ''}`}
                        required={p.obrigatorio}
                        inputMode={
                          p.tipoValor === 'percentual' ? 'decimal' : undefined
                        }
                        autoComplete="off"
                        maxLength={2000}
                      />
                    )
                  }
                </form.AppField>
                {erroDe(p.id) && (
                  <p role="alert" className="text-sm text-destructive">
                    {erroDe(p.id)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      {erroGeral && errosServidor.length === 0 && (
        <p role="alert" className="text-sm text-destructive">
          {erroGeral}
        </p>
      )}
      {confirmacao && (
        <p
          role="status"
          className="rounded-lg border border-primary bg-muted p-3 font-medium"
        >
          {confirmacao}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(enviando) => (
            <Button type="submit" disabled={enviando}>
              {enviando
                ? 'Enviando…'
                : corrigindo
                  ? 'Salvar correção'
                  : 'Enviar resposta'}
            </Button>
          )}
        </form.Subscribe>
        <Button asChild variant="outline">
          <Link to="/">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
