import {
  useBaseFormulario,
  useProtecaoFormulario,
} from '@/hooks/use-protecao-formulario';
import {
  SITUACOES_CONFERENCIA_FONTE,
  validarAlteracaoRhcPeriodo,
  validarEntradaRhcPeriodo,
  type AlteracaoRhcPeriodo,
  type EntradaRhcPeriodo,
  type RhcPeriodoLinha,
  type SituacaoConferenciaFonte,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { errosDoValidador } from '../../form-utils';

type Opcao = { value: string; label: string };
type Valores = {
  periodoId: string;
  qtdRhc: string;
  leitos: string;
  observacao: string;
  situacaoConferencia: string;
};

const ROTULOS_CONFERENCIA: Record<SituacaoConferenciaFonte, string> = {
  pendente: 'Pendente',
  conferida: 'Conferida',
  divergente: 'Divergente',
};

const textoOuNulo = (valor: string): string | null => {
  const limpo = valor.trim();
  return limpo ? limpo : null;
};

/** Vazio não pode virar zero: só inteiros digitados são aceitos. */
const inteiro = (valor: string): number =>
  /^\d+$/.test(valor.trim()) ? Number(valor) : Number.NaN;

function corpoCriacao(v: Valores): EntradaRhcPeriodo {
  const observacao = v.observacao.trim();
  return {
    periodoId: Number(v.periodoId),
    qtdRhc: inteiro(v.qtdRhc),
    leitos: inteiro(v.leitos),
    ...(observacao ? { observacao } : {}),
  };
}

function corpoAlteracao(v: Valores, rhc: RhcPeriodoLinha): AlteracaoRhcPeriodo {
  const corpo: AlteracaoRhcPeriodo = {};
  if (Number(v.periodoId) !== rhc.periodoId)
    corpo.periodoId = Number(v.periodoId);
  if (inteiro(v.qtdRhc) !== rhc.qtdRhc) corpo.qtdRhc = inteiro(v.qtdRhc);
  if (inteiro(v.leitos) !== rhc.leitos) corpo.leitos = inteiro(v.leitos);
  const observacao = textoOuNulo(v.observacao);
  if (observacao !== rhc.observacao) corpo.observacao = observacao;
  if (v.situacaoConferencia !== rhc.situacaoConferencia)
    corpo.situacaoConferencia =
      v.situacaoConferencia as SituacaoConferenciaFonte;
  return corpo;
}

/** Agregado de RHC por período; só uma observação conferida por período. */
export function RhcForm({
  rhc,
  periodos,
  onCriar,
  onAlterar,
}: {
  rhc?: RhcPeriodoLinha;
  periodos: Opcao[];
  onCriar: (entrada: EntradaRhcPeriodo) => Promise<unknown>;
  onAlterar: (alteracao: AlteracaoRhcPeriodo) => Promise<unknown>;
}) {
  const [baseFormulario, definirBaseFormulario] = useBaseFormulario<Valores>({
    periodoId: rhc ? String(rhc.periodoId) : '',
    qtdRhc: rhc ? String(rhc.qtdRhc) : '',
    leitos: rhc ? String(rhc.leitos) : '',
    observacao: rhc?.observacao ?? '',
    situacaoConferencia: rhc?.situacaoConferencia ?? 'pendente',
  });
  const form = useAppForm({
    defaultValues: baseFormulario,
    validators: {
      onSubmit: ({ value }) => {
        const resultado = rhc
          ? validarAlteracaoRhcPeriodo(corpoAlteracao(value, rhc))
          : validarEntradaRhcPeriodo(corpoCriacao(value));
        if (!resultado.valido) return errosDoValidador(resultado.erros);
        if (rhc && Object.keys(resultado.data).length === 0)
          return 'Informe ao menos um campo para alterar.';
        return undefined;
      },
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (rhc) await onAlterar(corpoAlteracao(value, rhc));
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
            <form.AppField name="periodoId">
              {(f) => <f.Select label="Período" required options={periodos} />}
            </form.AppField>
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="qtdRhc">
                {(f) => (
                  <f.Input
                    label="Quantidade de RHC"
                    required
                    inputMode="numeric"
                  />
                )}
              </form.AppField>
              <form.AppField name="leitos">
                {(f) => (
                  <f.Input label="Leitos de RHC" required inputMode="numeric" />
                )}
              </form.AppField>
            </div>
            <form.AppField name="observacao">
              {(f) => <f.Input label="Observação" />}
            </form.AppField>
            {rhc && (
              <form.AppField name="situacaoConferencia">
                {(f) => (
                  <f.Select
                    label="Conferência"
                    options={SITUACOES_CONFERENCIA_FONTE.map((situacao) => ({
                      value: situacao,
                      label: ROTULOS_CONFERENCIA[situacao],
                    }))}
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
              {pending ? 'Salvando…' : rhc ? 'Salvar RHC' : 'Criar RHC'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
