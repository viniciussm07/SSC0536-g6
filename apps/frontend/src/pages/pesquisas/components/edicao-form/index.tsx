import {
  useBaseFormulario,
  useProtecaoFormulario,
} from '@/hooks/use-protecao-formulario';
import {
  LIMITES_EDICOES,
  TIPOS_COLETA,
  validarAlteracaoPesquisa,
  validarEntradaPesquisa,
  type AlteracaoPesquisa,
  type EntradaPesquisa,
  type ErroCampo,
  type ModeloPesquisaLinha,
  type PeriodoLinha,
  type PesquisaDetalhe,
  type SegmentoResumo,
  type TipoColeta,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { deEntradaLocal, paraEntradaLocal } from '@/utils/data-hora';
import { ROTULOS_TIPO_COLETA } from '../../colunas';

type Valores = {
  titulo: string;
  tipoColeta: string;
  modeloId: string;
  periodoIds: string[];
  segmentoIds: string[];
  abertura: string;
  prazo: string;
  motivo: string;
  adotarVersao: boolean;
  todos: boolean;
};

const ids = (valores: string[]) => valores.map(Number).sort((a, b) => a - b);
const mesmos = (a: number[], b: number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** Corpo bruto para o validador do common; datas locais viram ISO no fuso operacional. */
function corpoCriacao(v: Valores): Record<string, unknown> {
  return {
    titulo: v.titulo,
    tipoColeta: v.tipoColeta,
    modeloId: v.modeloId ? Number(v.modeloId) : undefined,
    periodoIds: ids(v.periodoIds),
    segmentoIds: ids(v.segmentoIds),
    // Vazio = ausente ("Campo obrigatório."); valor local inválido segue para o validador.
    abertura: v.abertura
      ? (deEntradaLocal(v.abertura) ?? v.abertura)
      : undefined,
    prazo: v.prazo ? (deEntradaLocal(v.prazo) ?? v.prazo) : undefined,
  };
}

/** Só envia o que mudou; após a abertura o servidor recusa mudanças estruturais. */
function corpoAlteracao(
  v: Valores,
  d: PesquisaDetalhe,
): Record<string, unknown> {
  const novo = corpoCriacao(v);
  const corpo: Record<string, unknown> = {};
  if (String(novo.titulo).trim() !== d.titulo) corpo.titulo = novo.titulo;
  if (novo.tipoColeta !== d.tipoColeta) corpo.tipoColeta = novo.tipoColeta;
  if (novo.modeloId !== d.modeloId || v.adotarVersao)
    corpo.modeloId = novo.modeloId;
  if (
    !mesmos(
      novo.periodoIds as number[],
      d.periodos.map((p) => p.id).sort((a, b) => a - b),
    )
  )
    corpo.periodoIds = novo.periodoIds;
  if (
    !mesmos(
      novo.segmentoIds as number[],
      [...d.segmentoIds].sort((a, b) => a - b),
    )
  )
    corpo.segmentoIds = novo.segmentoIds;
  if (v.abertura !== paraEntradaLocal(d.abertura))
    corpo.abertura = novo.abertura;
  if (v.prazo !== paraEntradaLocal(d.prazo)) corpo.prazo = novo.prazo;
  if (v.motivo.trim()) corpo.motivo = v.motivo;
  return corpo;
}

function errosDoValidador(erros: readonly ErroCampo[]) {
  const geral = erros.find((e) => e.field === '' || e.field === 'corpo');
  if (geral) return geral.message;
  const fields: Record<string, string> = {};
  for (const { field, message } of erros) fields[field] ??= message;
  return { fields };
}

/**
 * Rascunho: todos os campos. Aberta: só título, prazo (com motivo) e, enquanto
 * agendada, a abertura. O fuso dos horários é sempre o de Brasília.
 */
export function EdicaoForm({
  detalhe,
  modelos,
  periodos,
  segmentos,
  onCriar,
  onAlterar,
}: {
  detalhe?: PesquisaDetalhe;
  modelos: readonly ModeloPesquisaLinha[];
  periodos: readonly PeriodoLinha[];
  segmentos: readonly SegmentoResumo[];
  onCriar: (entrada: EntradaPesquisa) => Promise<unknown>;
  onAlterar: (alteracao: AlteracaoPesquisa) => Promise<unknown>;
}) {
  const rascunho = !detalhe || detalhe.status === 'rascunho';
  const aberturaLivre = rascunho || detalhe?.situacao === 'agendada';
  const [base, definirBase] = useBaseFormulario<Valores>({
    titulo: detalhe?.titulo ?? '',
    tipoColeta: detalhe?.tipoColeta ?? TIPOS_COLETA[0],
    modeloId: detalhe ? String(detalhe.modeloId) : '',
    periodoIds: detalhe?.periodos.map((p) => String(p.id)) ?? [],
    segmentoIds: detalhe?.segmentoIds.map(String) ?? [],
    abertura: detalhe ? paraEntradaLocal(detalhe.abertura) : '',
    prazo: detalhe ? paraEntradaLocal(detalhe.prazo) : '',
    motivo: '',
    adotarVersao: false,
    todos: !!detalhe && detalhe.segmentoIds.length === 0,
  });
  const form = useAppForm({
    defaultValues: base,
    validators: {
      onSubmit: ({ value }) => {
        const resultado = detalhe
          ? validarAlteracaoPesquisa(corpoAlteracao(value, detalhe))
          : validarEntradaPesquisa(corpoCriacao(value));
        if (!resultado.valido) {
          if (
            detalhe &&
            resultado.erros.some((e) => e.message === 'Nada a alterar.')
          )
            return 'Informe ao menos um campo para alterar.';
          return errosDoValidador(resultado.erros);
        }
        if (rascunho && value.segmentoIds.length === 0 && !value.todos)
          return 'Confirme a seleção de todos os empreendimentos ativos ou escolha segmentos.';
        return undefined;
      },
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (detalhe) {
          const r = validarAlteracaoPesquisa(corpoAlteracao(value, detalhe));
          if (r.valido) await onAlterar(r.data);
        } else {
          const r = validarEntradaPesquisa(corpoCriacao(value));
          if (r.valido) await onCriar(r.data);
        }
        definirBase(value);
        formApi.reset(value);
      } catch {
        /* Erro apresentado pela página. */
      }
    },
  });
  useProtecaoFormulario(form);
  const modeloAtual = detalhe
    ? modelos.find((m) => m.id === detalhe.modeloId)
    : undefined;
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(pending) => (
          <fieldset disabled={pending} className="space-y-4">
            {!rascunho && (
              <p className="text-sm text-muted-foreground">
                Edição aberta: tipo de coleta, modelo, períodos e público estão
                congelados. Mudanças de prazo ficam registradas na auditoria.
              </p>
            )}
            <form.AppField name="titulo">
              {(f) => (
                <f.Input
                  label="Título"
                  required
                  maxLength={LIMITES_EDICOES.titulo}
                />
              )}
            </form.AppField>
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="tipoColeta">
                {(f) => (
                  <f.Select
                    label="Tipo de coleta"
                    disabled={!rascunho}
                    options={TIPOS_COLETA.map((t: TipoColeta) => ({
                      value: t,
                      label: ROTULOS_TIPO_COLETA[t],
                    }))}
                  />
                )}
              </form.AppField>
              <form.AppField name="modeloId">
                {(f) => (
                  <f.Select
                    label="Modelo de pesquisa"
                    required
                    disabled={!rascunho}
                    options={[
                      { value: '', label: 'Selecione um modelo' },
                      ...modelos.map((m) => ({
                        value: String(m.id),
                        label: `${m.nome} (v${m.versao})`,
                      })),
                    ]}
                  />
                )}
              </form.AppField>
            </div>
            {detalhe &&
              modeloAtual &&
              modeloAtual.versao !== detalhe.modeloVersao && (
                <div className="text-sm text-muted-foreground">
                  A edição usa a versão {detalhe.modeloVersao} do modelo; a
                  vigente é a {modeloAtual.versao}.
                  {rascunho && (
                    <form.Field name="adotarVersao">
                      {(f) => (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={f.state.value}
                            onBlur={f.handleBlur}
                            onChange={(e) => f.handleChange(e.target.checked)}
                          />
                          Adotar a versão vigente ao salvar
                        </label>
                      )}
                    </form.Field>
                  )}
                </div>
              )}
            <form.AppField name="periodoIds">
              {(f) => (
                <f.Checkboxes
                  label="Períodos de referência"
                  disabled={!rascunho}
                  description="Expectativa: o prazo termina até o fim do período. Consolidado: o período termina antes da data do prazo. Regra proposta, pendente de confirmação do OTO."
                  options={periodos.map((p) => ({
                    value: String(p.id),
                    label: `${p.rotulo} (${p.dataInicio} a ${p.dataFim})`,
                  }))}
                />
              )}
            </form.AppField>
            <form.AppField name="segmentoIds">
              {(f) => (
                <f.Checkboxes
                  label="Público por segmento"
                  disabled={!rascunho}
                  description="Sem seleção, todos os empreendimentos ativos são elegíveis. O público é congelado na abertura."
                  options={segmentos.map((s) => ({
                    value: String(s.id),
                    label: s.nome,
                  }))}
                />
              )}
            </form.AppField>
            {rascunho && (
              <form.Field name="todos">
                {(f) => (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={f.state.value}
                      onBlur={f.handleBlur}
                      onChange={(e) => f.handleChange(e.target.checked)}
                    />
                    Confirmo todos os empreendimentos ativos quando nenhum
                    segmento estiver selecionado
                  </label>
                )}
              </form.Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="abertura">
                {(f) => (
                  <f.Input
                    label="Abertura (horário de Brasília)"
                    type="datetime-local"
                    required
                    disabled={!aberturaLivre}
                  />
                )}
              </form.AppField>
              <form.AppField name="prazo">
                {(f) => (
                  <f.Input
                    label="Prazo (horário de Brasília)"
                    disabled={detalhe?.situacao === 'expirada'}
                    type="datetime-local"
                    required
                    description="No instante do prazo a edição deixa de receber respostas."
                  />
                )}
              </form.AppField>
            </div>
            {!rascunho && (
              <form.AppField name="motivo">
                {(f) => (
                  <f.Input
                    label="Motivo da alteração"
                    maxLength={LIMITES_EDICOES.motivo}
                    description="Opcional; registrado na auditoria."
                  />
                )}
              </form.AppField>
            )}
            <form.Subscribe selector={(s) => s.errors}>
              {(erros) =>
                erros.some((e) => typeof e === 'string') && (
                  <p role="alert" className="text-sm text-destructive">
                    {erros.filter((e) => typeof e === 'string').join(' ')}
                  </p>
                )
              }
            </form.Subscribe>
            <Button type="submit" disabled={pending}>
              {pending
                ? 'Salvando…'
                : detalhe
                  ? 'Salvar edição'
                  : 'Criar rascunho'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
