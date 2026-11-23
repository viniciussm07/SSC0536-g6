import {
  useBaseFormulario,
  useProtecaoFormulario,
} from '@/hooks/use-protecao-formulario';
import {
  SITUACOES_PARAMETRO,
  validarAlteracaoParametroCalculo,
  validarEntradaParametroCalculo,
  type AlteracaoParametroCalculo,
  type EntradaParametroCalculo,
  type ParametroCalculoLinha,
  type SituacaoParametro,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { errosDoValidador } from '../../form-utils';

type Valores = {
  chave: string;
  valor: string;
  unidade: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  fonte: string;
  situacao: string;
  observacao: string;
};

const ROTULOS_SITUACAO: Record<SituacaoParametro, string> = {
  hipotese_pendente_homologacao: 'Hipótese pendente de homologação',
  homologado: 'Homologado',
};

const textoOuNulo = (valor: string): string | null => {
  const limpo = valor.trim();
  return limpo ? limpo : null;
};

function corpoCriacao(v: Valores): EntradaParametroCalculo {
  const fonte = v.fonte.trim();
  const observacao = v.observacao.trim();
  return {
    chave: v.chave.trim(),
    valor: v.valor,
    unidade: v.unidade.trim(),
    vigenciaInicio: v.vigenciaInicio,
    ...(v.vigenciaFim ? { vigenciaFim: v.vigenciaFim } : {}),
    ...(fonte ? { fonte } : {}),
    situacao: v.situacao as SituacaoParametro,
    ...(observacao ? { observacao } : {}),
  };
}

function corpoAlteracao(
  v: Valores,
  parametro: ParametroCalculoLinha,
): AlteracaoParametroCalculo {
  const corpo: AlteracaoParametroCalculo = {};
  if (v.chave.trim() !== parametro.chave) corpo.chave = v.chave.trim();
  if (v.valor !== parametro.valor) corpo.valor = v.valor;
  if (v.unidade.trim() !== parametro.unidade) corpo.unidade = v.unidade.trim();
  if (v.vigenciaInicio !== parametro.vigenciaInicio)
    corpo.vigenciaInicio = v.vigenciaInicio;
  const fim = v.vigenciaFim ? v.vigenciaFim : null;
  if (fim !== parametro.vigenciaFim) corpo.vigenciaFim = fim;
  const fonte = textoOuNulo(v.fonte);
  if (fonte !== parametro.fonte) corpo.fonte = fonte;
  if (v.situacao !== parametro.situacao)
    corpo.situacao = v.situacao as SituacaoParametro;
  const observacao = textoOuNulo(v.observacao);
  if (observacao !== parametro.observacao) corpo.observacao = observacao;
  return corpo;
}

/** Parâmetro de cálculo com vigência; histórico é preservado por linhas e auditoria. */
export function ParametroForm({
  parametro,
  onCriar,
  onAlterar,
}: {
  parametro?: ParametroCalculoLinha;
  onCriar: (entrada: EntradaParametroCalculo) => Promise<unknown>;
  onAlterar: (alteracao: AlteracaoParametroCalculo) => Promise<unknown>;
}) {
  const [baseFormulario, definirBaseFormulario] = useBaseFormulario<Valores>({
    chave: parametro?.chave ?? '',
    valor: parametro?.valor ?? '',
    unidade: parametro?.unidade ?? 'indefinida',
    vigenciaInicio: parametro?.vigenciaInicio ?? '',
    vigenciaFim: parametro?.vigenciaFim ?? '',
    fonte: parametro?.fonte ?? '',
    situacao: parametro?.situacao ?? 'hipotese_pendente_homologacao',
    observacao: parametro?.observacao ?? '',
  });
  const form = useAppForm({
    defaultValues: baseFormulario,
    validators: {
      onSubmit: ({ value }) => {
        const resultado = parametro
          ? validarAlteracaoParametroCalculo(corpoAlteracao(value, parametro))
          : validarEntradaParametroCalculo(corpoCriacao(value));
        if (!resultado.valido) return errosDoValidador(resultado.erros);
        if (parametro && Object.keys(resultado.data).length === 0)
          return 'Informe ao menos um campo para alterar.';
        return undefined;
      },
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (parametro) await onAlterar(corpoAlteracao(value, parametro));
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
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="chave">
                {(f) => <f.Input label="Chave" required />}
              </form.AppField>
              <form.AppField name="valor">
                {(f) => (
                  <f.Input
                    label="Valor"
                    required
                    inputMode="decimal"
                    description="Decimal em texto; vírgula é aceita."
                  />
                )}
              </form.AppField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="unidade">
                {(f) => <f.Input label="Unidade" required />}
              </form.AppField>
              <form.AppField name="situacao">
                {(f) => (
                  <f.Select
                    label="Situação"
                    options={SITUACOES_PARAMETRO.map((situacao) => ({
                      value: situacao,
                      label: ROTULOS_SITUACAO[situacao],
                    }))}
                  />
                )}
              </form.AppField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="vigenciaInicio">
                {(f) => (
                  <f.Input label="Início da vigência" type="date" required />
                )}
              </form.AppField>
              <form.AppField name="vigenciaFim">
                {(f) => <f.Input label="Fim da vigência" type="date" />}
              </form.AppField>
            </div>
            <form.AppField name="fonte">
              {(f) => (
                <f.Input
                  label="Fonte"
                  description="Origem ou referência da metodologia."
                />
              )}
            </form.AppField>
            <form.AppField name="observacao">
              {(f) => <f.Input label="Observação" />}
            </form.AppField>
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
                : parametro
                  ? 'Salvar parâmetro'
                  : 'Criar parâmetro'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
