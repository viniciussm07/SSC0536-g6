import {
  useProtecaoFormulario,
  useBaseFormulario,
} from '@/hooks/use-protecao-formulario';
import {
  LIMITES_PERIODOS,
  PADRAO_DATA,
  TIPOS_PERIODO,
  duracaoDias,
  validarAlteracaoPeriodo,
  validarEntradaPeriodo,
  type AlteracaoPeriodo,
  type EntradaPeriodo,
  type ErroCampo,
  type PeriodoDetalhe,
  type PeriodoLinha,
  type TipoPeriodo,
} from '@ssc0536/common';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { ROTULOS_TIPO_PERIODO } from '../../colunas';

type Valores = {
  tipo: string;
  rotulo: string;
  dataInicio: string;
  dataFim: string;
};

function corpoCriacao(v: Valores): EntradaPeriodo {
  return {
    tipo: v.tipo as TipoPeriodo,
    rotulo: v.rotulo.trim(),
    dataInicio: v.dataInicio,
    dataFim: v.dataFim,
  };
}
/** Só envia o que mudou: datas e tipo de período em uso têm mudança recusada pelo servidor. */
function corpoAlteracao(v: Valores, periodo: PeriodoLinha): AlteracaoPeriodo {
  const corpo: AlteracaoPeriodo = {};
  if (v.tipo !== periodo.tipo) corpo.tipo = v.tipo as TipoPeriodo;
  if (v.rotulo.trim() !== periodo.rotulo) corpo.rotulo = v.rotulo.trim();
  if (v.dataInicio !== periodo.dataInicio) corpo.dataInicio = v.dataInicio;
  if (v.dataFim !== periodo.dataFim) corpo.dataFim = v.dataFim;
  return corpo;
}
/** Erros do validador do common no formato do TanStack Form, por campo ou do corpo inteiro. */
function errosDoValidador(erros: readonly ErroCampo[]) {
  const geral = erros.find((e) => e.field === '' || e.field === 'corpo');
  if (geral) return geral.message;
  const fields: Record<string, string> = {};
  for (const { field, message } of erros) fields[field] ??= message;
  return { fields };
}

/** Criação ou edição do período; em uso, datas e tipo ficam travados e só o rótulo muda. */
export function PeriodoForm({
  periodo,
  detalhe,
  onCriar,
  onAlterar,
}: {
  periodo?: PeriodoLinha;
  /** Detalhe consultado na edição; `emUso` trava datas e tipo. */
  detalhe?: PeriodoDetalhe;
  onCriar: (entrada: EntradaPeriodo) => Promise<unknown>;
  onAlterar: (alteracao: AlteracaoPeriodo) => Promise<unknown>;
}) {
  const emUso = detalhe?.emUso ?? false;
  const [baseFormulario, definirBaseFormulario] = useBaseFormulario({
    tipo: periodo?.tipo ?? TIPOS_PERIODO[0],
    rotulo: periodo?.rotulo ?? '',
    dataInicio: periodo?.dataInicio ?? '',
    dataFim: periodo?.dataFim ?? '',
  });
  const form = useAppForm({
    defaultValues: baseFormulario,
    validators: {
      onSubmit: ({ value }) => {
        const resultado = periodo
          ? validarAlteracaoPeriodo(corpoAlteracao(value, periodo), periodo)
          : validarEntradaPeriodo(corpoCriacao(value));
        if (!resultado.valido) return errosDoValidador(resultado.erros);
        if (periodo && Object.keys(resultado.data).length === 0)
          return 'Informe ao menos um campo para alterar.';
        return undefined;
      },
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (periodo) await onAlterar(corpoAlteracao(value, periodo));
        else await onCriar(corpoCriacao(value));
        definirBaseFormulario(value);
        formApi.reset(value);
      } catch {
        /* Erro apresentado pela página. */
      }
    },
  });
  useProtecaoFormulario(form);
  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(pending) => (
          <fieldset disabled={pending} className="space-y-3">
            {periodo && detalhe && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge cor={emUso ? 'amarelo' : 'cinza'}>
                  {emUso ? 'Em uso' : 'Sem uso registrado'}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {emUso
                    ? 'O período já referencia pesquisas, coletas ou indicadores: datas e tipo não podem mudar.'
                    : 'Sem pesquisas, coletas ou indicadores referenciando este período.'}
                </p>
              </div>
            )}
            <form.AppField name="tipo">
              {(f) => (
                <f.Select
                  label="Tipo"
                  disabled={emUso}
                  options={TIPOS_PERIODO.map((tipo) => ({
                    value: tipo,
                    label: ROTULOS_TIPO_PERIODO[tipo],
                  }))}
                />
              )}
            </form.AppField>
            <form.AppField name="rotulo">
              {(f) => (
                <f.Input
                  label="Rótulo"
                  required
                  maxLength={LIMITES_PERIODOS.rotulo}
                  description="Como o período é identificado nas pesquisas e indicadores."
                />
              )}
            </form.AppField>
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="dataInicio">
                {(f) => (
                  <f.Input
                    label="Início"
                    type="date"
                    required
                    disabled={emUso}
                  />
                )}
              </form.AppField>
              <form.AppField name="dataFim">
                {(f) => (
                  <f.Input label="Fim" type="date" required disabled={emUso} />
                )}
              </form.AppField>
            </div>
            <form.Subscribe selector={(s) => s.values}>
              {(valores) =>
                PADRAO_DATA.test(valores.dataInicio) &&
                PADRAO_DATA.test(valores.dataFim) &&
                valores.dataInicio <= valores.dataFim && (
                  <p className="text-sm text-muted-foreground">
                    Duração: {duracaoDias(valores.dataInicio, valores.dataFim)}{' '}
                    dias.
                  </p>
                )
              }
            </form.Subscribe>
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
                : periodo
                  ? 'Salvar período'
                  : 'Criar período'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
