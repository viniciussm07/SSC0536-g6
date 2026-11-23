import {
  LIMITES_CALCULO,
  validarEntradaExecucaoCalculo,
  type EntradaExecucaoCalculo,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { useProtecaoFormulario } from '@/hooks/use-protecao-formulario';
import { useEdicoesCalculo, usePerguntasCalculo } from '../../hooks';

type Valores = { pesquisaId: string; perguntaId: string; motivo: string };

const corpo = (v: Valores): EntradaExecucaoCalculo => ({
  perguntaId: Number(v.perguntaId),
  ...(v.motivo.trim() ? { motivo: v.motivo.trim() } : {}),
});

/** Opções de pergunta dependem da edição; a lista recarrega ao trocá-la. */
function OpcoesPergunta({
  pesquisaId,
  children,
}: {
  pesquisaId?: number;
  children: (
    opcoes: { value: string; label: string }[],
    estado: 'vazio' | 'carregando' | 'erro' | 'pronto',
  ) => React.ReactNode;
}) {
  const perguntas = usePerguntasCalculo(pesquisaId);
  const estado =
    pesquisaId === undefined
      ? 'vazio'
      : perguntas.isPending
        ? 'carregando'
        : perguntas.isError
          ? 'erro'
          : 'pronto';
  return children(
    [
      { value: '', label: 'Selecione a pergunta' },
      ...(perguntas.data ?? []).map((p) => ({
        value: String(p.id),
        label: p.rotulo,
      })),
    ],
    estado,
  );
}

/** Solicita o cálculo de uma pergunta percentual; período e tipo de coleta vêm da pergunta. */
export function CalculoForm({
  onExecutar,
}: {
  onExecutar: (entrada: EntradaExecucaoCalculo) => Promise<unknown>;
}) {
  const edicoes = useEdicoesCalculo(true);
  const form = useAppForm({
    defaultValues: { pesquisaId: '', perguntaId: '', motivo: '' } as Valores,
    validators: {
      onSubmit: ({ value }) => {
        const fields: Record<string, string> = {};
        if (!value.pesquisaId) fields.pesquisaId = 'Escolha a edição.';
        const r = validarEntradaExecucaoCalculo(corpo(value));
        if (!r.valido) for (const e of r.erros) fields[e.field] ??= e.message;
        return Object.keys(fields).length ? { fields } : undefined;
      },
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await onExecutar(corpo(value));
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
            <form.AppField
              name="pesquisaId"
              listeners={{
                onChange: () => form.setFieldValue('perguntaId', ''),
              }}
            >
              {(f) => (
                <f.Select
                  label="Edição de pesquisa"
                  required
                  disabled={edicoes.isPending}
                  options={[
                    {
                      value: '',
                      label: edicoes.isPending
                        ? 'Carregando edições…'
                        : 'Selecione a edição',
                    },
                    ...(edicoes.data?.data ?? []).map((e) => ({
                      value: String(e.id),
                      label: e.titulo,
                    })),
                  ]}
                />
              )}
            </form.AppField>
            {edicoes.isError && (
              <p role="alert" className="text-sm text-destructive">
                Não foi possível carregar as edições de pesquisa.
              </p>
            )}
            <form.Subscribe selector={(s) => s.values.pesquisaId}>
              {(pesquisaId) => (
                <OpcoesPergunta
                  pesquisaId={pesquisaId ? Number(pesquisaId) : undefined}
                >
                  {(opcoes, estado) => (
                    <>
                      <form.AppField name="perguntaId">
                        {(f) => (
                          <f.Select
                            label="Pergunta de taxa de ocupação"
                            required
                            disabled={estado !== 'pronto'}
                            options={opcoes}
                          />
                        )}
                      </form.AppField>
                      {estado === 'pronto' && opcoes.length === 1 && (
                        <p className="text-sm text-muted-foreground">
                          Esta edição não tem pergunta percentual para calcular.
                        </p>
                      )}
                      {estado === 'erro' && (
                        <p role="alert" className="text-sm text-destructive">
                          Não foi possível carregar as perguntas da edição.
                        </p>
                      )}
                    </>
                  )}
                </OpcoesPergunta>
              )}
            </form.Subscribe>
            <form.AppField name="motivo">
              {(f) => (
                <f.Input
                  label="Motivo (opcional)"
                  maxLength={LIMITES_CALCULO.motivo}
                  description="Por que recalcular: correção de resposta, inventário ou parâmetro."
                />
              )}
            </form.AppField>
            <p className="text-sm text-muted-foreground">
              Insumos iguais aos da última revisão reaproveitam o resultado;
              qualquer mudança gera nova revisão, sem alterar a publicada.
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? 'Calculando…' : 'Calcular'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
