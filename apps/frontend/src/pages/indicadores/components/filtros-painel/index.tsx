import { TIPOS_PERIODO } from '@ssc0536/common';
import {
  RECORTES_PAINEL,
  TIPOS_COLETA_PAINEL,
  formatarDataCivil,
  rotuloMetodo,
  rotuloTipoPeriodo,
  type IndicadorDisponivel,
  type PeriodoPainel,
} from '@/utils/indicadores';
import { erroIntervalo, type FormFiltrosPainel } from '../../hooks';

/** Filtros do painel; alterações se aplicam imediatamente (sem botão de envio). */
export function FiltrosPainel({
  form,
  indicadores,
  metodos,
  periodos,
}: {
  form: FormFiltrosPainel;
  indicadores: readonly IndicadorDisponivel[];
  metodos: readonly string[];
  periodos: readonly PeriodoPainel[];
}) {
  const semOpcoes = [{ value: '', label: 'Sem opções nos filtros' }];
  return (
    <form
      role="search"
      aria-label="Filtros do painel de indicadores"
      className="grid gap-4 rounded-[14px] border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      noValidate
      onSubmit={(e) => e.preventDefault()}
    >
      <form.AppField name="indicadorId">
        {(f) => (
          <f.Select
            label="Indicador"
            disabled={!indicadores.length}
            options={
              indicadores.length
                ? indicadores.map((i) => ({
                    value: String(i.id),
                    label: `${i.nome} (${i.unidade})`,
                  }))
                : semOpcoes
            }
          />
        )}
      </form.AppField>
      <form.AppField name="tipoColeta">
        {(f) => (
          <f.Select
            label="Tipo de coleta"
            options={[
              { value: 'ambos', label: 'Expectativa e consolidado' },
              ...TIPOS_COLETA_PAINEL.map((t) => ({
                value: t.valor,
                label: t.rotulo,
              })),
            ]}
          />
        )}
      </form.AppField>
      <form.AppField name="recorte">
        {(f) => (
          <f.Select
            label="Recorte da série"
            options={RECORTES_PAINEL.map((r) => ({
              value: r.valor,
              label: r.rotulo,
            }))}
          />
        )}
      </form.AppField>
      <form.AppField name="metodo">
        {(f) => (
          <f.Select
            label="Método de agregação"
            disabled={metodos.length < 2}
            options={
              metodos.length
                ? metodos.map((m) => ({ value: m, label: rotuloMetodo(m) }))
                : semOpcoes
            }
          />
        )}
      </form.AppField>
      <form.AppField name="periodoTipo">
        {(f) => (
          <f.Select
            label="Tipo de período"
            options={TIPOS_PERIODO.map((t) => ({
              value: t,
              label: rotuloTipoPeriodo(t),
            }))}
          />
        )}
      </form.AppField>
      <form.AppField name="inicio">
        {(f) => (
          <f.Input
            label="De"
            type="date"
            description="Períodos que começam nesta data ou depois."
          />
        )}
      </form.AppField>
      <form.AppField
        name="fim"
        validators={{
          onChangeListenTo: ['inicio'],
          onChange: ({ value, fieldApi }) =>
            erroIntervalo(fieldApi.form.getFieldValue('inicio'), value),
        }}
      >
        {(f) => (
          <f.Input
            label="Até"
            type="date"
            description="Períodos que terminam nesta data ou antes."
          />
        )}
      </form.AppField>
      <form.AppField name="referencia">
        {(f) => (
          <f.Select
            label="Período de referência"
            disabled={!periodos.length}
            options={
              periodos.length
                ? periodos.map((p) => ({
                    value: String(p.id),
                    label: `${p.rotulo} (${formatarDataCivil(p.inicio)} a ${formatarDataCivil(p.fim)})`,
                  }))
                : semOpcoes
            }
          />
        )}
      </form.AppField>
    </form>
  );
}
