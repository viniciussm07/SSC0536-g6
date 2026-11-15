import { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type {
  ErroCampo,
  FormularioCatalogo,
  VersaoInventarioDetalhe,
} from '@ssc0536/common';
import { SecoesCatalogo } from '@/components/secoes-catalogo';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useAppForm } from '@/hooks/use-app-form';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import { useDetalheEmpreendimento } from '@/hooks/use-detalhe-empreendimento';
import { errosDeCampo } from '@/services/cadastro';
import { HttpError } from '@/services/http';
import {
  distribuirErros,
  montarRespostas,
  valoresIniciaisCatalogo,
} from '@/utils/catalogo';
import {
  CAMPOS_FORMULARIO,
  OPCOES_ESTADO_CAMPO,
  chaveEstadoCampo,
  chaveValorCampo,
  dataBr,
  hojeOperacional,
  montarCapacidade,
  valoresIniciaisCapacidade,
} from '@/utils/inventario';
import { useCatalogoDoSegmento, useCriarVersao, useVersaoBase } from './hooks';

const OPCOES_TIPO = [
  { value: 'mudanca_real', label: 'Mudança real (nova vigência)' },
  { value: 'correcao', label: 'Correção da versão vigente' },
];
const OPCOES_SIM_NAO = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
];

export function InventarioVersaoPage() {
  const acesso = useAcessoAtual();
  const { entidade } = useContextoEntidade();
  const busca = useSearch({ strict: false }) as { corrigir?: number };
  if (!entidade) return null;
  return (
    <Pagina
      acesso={acesso}
      id={entidade.id}
      nome={entidade.nome}
      corrigir={busca.corrigir}
    />
  );
}

function Pagina({
  acesso,
  id,
  nome,
  corrigir,
}: {
  acesso: ReturnType<typeof useAcessoAtual>;
  id: number;
  nome: string;
  corrigir?: number;
}) {
  const detalhe = useDetalheEmpreendimento(acesso, id);
  // O formulário usa o catálogo do segmento de hospedagem do empreendimento (ou o primeiro).
  const segmento =
    detalhe.data?.segmentos.find((s) => s.chave === 'hospedagem') ??
    detalhe.data?.segmentos[0];
  const catalogo = useCatalogoDoSegmento(acesso, segmento?.id);
  const base = useVersaoBase(acesso, id, corrigir);
  const carregando = detalhe.isPending || base.isPending || catalogo.isPending;
  const erro = detalhe.error ?? base.error ?? catalogo.error;

  return (
    <section className="space-y-6" aria-label="Atualizar inventário">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {corrigir ? 'Corrigir inventário' : 'Atualizar inventário'}
        </h1>
        <p className="text-muted-foreground">{nome}</p>
        <p className="text-sm text-muted-foreground">
          Cada atualização cria uma nova versão com autor e data; as anteriores
          continuam consultáveis. “Não se aplica”, “desconhecido” e zero são
          respostas diferentes.
        </p>
      </header>
      {segmento === undefined && detalhe.isSuccess ? (
        <p role="alert">
          Este empreendimento não tem segmento. Associe um segmento ao cadastro
          para preencher o inventário.
        </p>
      ) : carregando ? (
        <p role="status">Carregando inventário…</p>
      ) : erro ? (
        <p role="alert">{erro.message}</p>
      ) : (
        <Formulario
          key={`${base.dataUpdatedAt}:${catalogo.dataUpdatedAt}`}
          id={id}
          base={base.data ?? null}
          formulario={catalogo.data!}
          corrigir={corrigir}
        />
      )}
    </section>
  );
}

function Formulario({
  id,
  base,
  formulario,
  corrigir,
}: {
  id: number;
  base: VersaoInventarioDetalhe | null;
  formulario: FormularioCatalogo;
  corrigir?: number;
}) {
  const navegar = useNavigate();
  const criar = useCriarVersao(id);
  const [errosServidor, setErrosServidor] = useState<ErroCampo[]>([]);
  const [errosItem, setErrosItem] = useState<Record<number, string[]>>({});
  const [errosGrupo, setErrosGrupo] = useState<Record<string, string>>({});
  const corrigindo = corrigir !== undefined;
  const idsDaBase = new Set(base?.itens.map((i) => i.itemId));
  const form = useAppForm({
    defaultValues: {
      tipoAlteracao: corrigindo ? 'correcao' : 'mudanca_real',
      vigenciaInicio: hojeOperacional(),
      vigenciaFim: '',
      motivo: '',
      ...valoresIniciaisCapacidade(base?.capacidade),
      ...valoresIniciaisCatalogo(formulario, base?.itens),
    } as Record<string, string>,
    onSubmit: async ({ value }) => {
      setErrosServidor([]);
      setErrosItem({});
      setErrosGrupo({});
      const itens = montarRespostas(formulario, value, idsDaBase);
      const correcao = value.tipoAlteracao === 'correcao';
      try {
        await criar.mutateAsync({
          tipoAlteracao: correcao ? 'correcao' : 'mudanca_real',
          ...(correcao
            ? { corrigeId: corrigir ?? base?.id }
            : {
                vigenciaInicio: value.vigenciaInicio,
                ...(value.vigenciaFim
                  ? { vigenciaFim: value.vigenciaFim }
                  : {}),
              }),
          ...(value.motivo.trim() ? { motivo: value.motivo.trim() } : {}),
          capacidade: montarCapacidade(value),
          itens,
        });
        await navegar({ to: '/' });
      } catch (erro) {
        if (!(erro instanceof HttpError)) return;
        const distribuidos = distribuirErros(errosDeCampo(erro.details), itens);
        setErrosItem(distribuidos.porItem);
        setErrosGrupo(distribuidos.porGrupo);
        setErrosServidor(distribuidos.outros);
      }
    },
  });
  const erroDe = (campo: string) =>
    errosServidor.find((e) => e.field === campo)?.message;
  const semCampo = errosServidor.filter(
    (e) =>
      !CAMPOS_FORMULARIO.some((c) => e.field === `capacidade.${c.campo}`) &&
      !['vigenciaInicio', 'vigenciaFim', 'motivo'].includes(e.field),
  );

  return (
    <form
      className="space-y-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <section
        aria-label="Vigência"
        className="space-y-4 rounded-lg border p-4"
      >
        <h2 className="text-lg font-semibold">Vigência</h2>
        {corrigindo ? (
          <p className="text-sm">
            Correção da versão de {dataBr(base?.vigenciaInicio ?? null)} a{' '}
            {base?.vigenciaFim ? dataBr(base.vigenciaFim) : 'sem fim'}. A
            vigência é mantida e a versão anterior fica guardada.
          </p>
        ) : (
          <>
            {base && (
              <form.AppField name="tipoAlteracao">
                {(f) => (
                  <f.Select label="Tipo de alteração" options={OPCOES_TIPO} />
                )}
              </form.AppField>
            )}
            <form.Subscribe selector={(s) => s.values.tipoAlteracao}>
              {(tipo) =>
                tipo === 'mudanca_real' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <form.AppField name="vigenciaInicio">
                        {(f) => (
                          <f.Input
                            label="Início da vigência"
                            type="date"
                            required
                            description="A versão anterior termina no dia anterior."
                          />
                        )}
                      </form.AppField>
                      {erroDe('vigenciaInicio') && (
                        <p role="alert" className="text-sm text-destructive">
                          {erroDe('vigenciaInicio')}
                        </p>
                      )}
                    </div>
                    <div>
                      <form.AppField name="vigenciaFim">
                        {(f) => (
                          <f.Input
                            label="Fim da vigência (opcional)"
                            type="date"
                          />
                        )}
                      </form.AppField>
                      {erroDe('vigenciaFim') && (
                        <p role="alert" className="text-sm text-destructive">
                          {erroDe('vigenciaFim')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">
                    A correção mantém a vigência da versão atual.
                  </p>
                )
              }
            </form.Subscribe>
          </>
        )}
        <form.Subscribe selector={(s) => s.values.tipoAlteracao}>
          {(tipo) => (
            <div>
              <form.AppField name="motivo">
                {(f) => (
                  <f.Input
                    label={
                      tipo === 'correcao'
                        ? 'Motivo da correção'
                        : 'Motivo (opcional)'
                    }
                    required={tipo === 'correcao'}
                    maxLength={300}
                  />
                )}
              </form.AppField>
              {erroDe('motivo') && (
                <p role="alert" className="text-sm text-destructive">
                  {erroDe('motivo')}
                </p>
              )}
            </div>
          )}
        </form.Subscribe>
      </section>

      <section
        aria-label="Capacidade e funcionamento"
        className="space-y-4 rounded-lg border p-4"
      >
        <h2 className="text-lg font-semibold">Capacidade e funcionamento</h2>
        <p className="text-sm text-muted-foreground">
          Informe o valor, ou marque “não se aplica” / “desconhecido”. Zero é um
          valor informado.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {CAMPOS_FORMULARIO.map((meta) => (
            <div key={meta.campo} className="space-y-2">
              <form.AppField name={chaveEstadoCampo(meta.campo)}>
                {(f) => (
                  <f.Select label={meta.rotulo} options={OPCOES_ESTADO_CAMPO} />
                )}
              </form.AppField>
              <form.Subscribe
                selector={(s) => s.values[chaveEstadoCampo(meta.campo)]}
              >
                {(estado) =>
                  estado === 'informado' && (
                    <form.AppField name={chaveValorCampo(meta.campo)}>
                      {(f) =>
                        meta.tipo === 'booleano' ? (
                          <f.Select
                            label={`Valor de ${meta.rotulo}`}
                            options={OPCOES_SIM_NAO}
                          />
                        ) : (
                          <f.Input
                            label={`Valor de ${meta.rotulo}${meta.unidade ? ` (${meta.unidade})` : ''}`}
                            type={meta.tipo === 'horario' ? 'time' : 'text'}
                            inputMode={
                              meta.tipo === 'inteiro' ? 'numeric' : undefined
                            }
                          />
                        )
                      }
                    </form.AppField>
                  )
                }
              </form.Subscribe>
              {erroDe(`capacidade.${meta.campo}`) && (
                <p role="alert" className="text-sm text-destructive">
                  {erroDe(`capacidade.${meta.campo}`)}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <SecoesCatalogo
        form={form}
        formulario={formulario}
        errosItem={errosItem}
        errosGrupo={errosGrupo}
      />

      {semCampo.length > 0 && (
        <ul role="alert" className="list-disc pl-5 text-sm text-destructive">
          {semCampo.map((e) => (
            <li key={`${e.field}:${e.message}`}>{e.message}</li>
          ))}
        </ul>
      )}
      {criar.isError &&
        errosServidor.length === 0 &&
        Object.keys(errosItem).length === 0 &&
        Object.keys(errosGrupo).length === 0 && (
          <p role="alert" className="text-sm text-destructive">
            {criar.error.message}
          </p>
        )}
      <div className="flex flex-wrap gap-3">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(pending) => (
            <Button type="submit" disabled={pending}>
              {pending
                ? 'Salvando…'
                : corrigindo
                  ? 'Registrar correção'
                  : 'Salvar nova versão'}
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
