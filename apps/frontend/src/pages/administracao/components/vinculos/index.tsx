import { ESQUEMA_VINCULOS_CONTA, type AcessoAtual } from '@ssc0536/common';
import { GradeColecao } from '@/components/grade-colecao';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { acessoService } from '@/services/acesso';
import { colunasVinculos } from '../../colunas';
import { useVinculos } from '../../hooks';

export function VinculosConta({
  acesso,
  usuarioId,
}: {
  acesso: AcessoAtual;
  usuarioId: number;
}) {
  const { alterar } = useVinculos(usuarioId);
  const form = useAppForm({
    defaultValues: { empreendimentoId: '', situacao: 'ativo' },
    onSubmit: async ({ value }) => {
      try {
        await alterar.mutateAsync({
          empreendimentoId: Number(value.empreendimentoId),
          ativo: value.situacao === 'ativo',
        });
      } catch {
        /* Erro exibido abaixo. */
      }
    },
  });
  return (
    <section className="space-y-3" aria-label="Vínculos da conta">
      <h3 className="font-semibold">Vínculos da conta</h3>
      <p className="text-sm text-muted-foreground">
        Empreendimentos que a pessoa pode acessar.
      </p>
      <GradeColecao
        id="vinculos"
        rotulo="Vínculos"
        esquema={ESQUEMA_VINCULOS_CONTA}
        colunas={colunasVinculos}
        getRowId={(v) => String(v.empreendimentoId)}
        chave={['vinculos', acesso.usuarioId, acesso.revisao, usuarioId]}
        buscar={(consulta, signal) =>
          acessoService.vinculos(usuarioId, consulta, signal)
        }
        mensagemVazia="Nenhum vínculo cadastrado."
      />
      <form
        className="space-y-3 rounded-lg border bg-muted/30 p-4"
        aria-label="Adicionar ou alterar vínculo"
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
                name="empreendimentoId"
                validators={{
                  onChange: ({ value }) =>
                    /^\d+$/.test(value) &&
                    Number.isSafeInteger(Number(value)) &&
                    Number(value) > 0
                      ? undefined
                      : 'Informe o ID positivo do empreendimento.',
                }}
              >
                {(f) => (
                  <f.Input
                    label="ID do empreendimento"
                    type="text"
                    inputMode="numeric"
                    required
                    description="Consulte o ID na lista de empreendimentos autorizados."
                  />
                )}
              </form.AppField>
              <form.AppField name="situacao">
                {(f) => (
                  <f.Select
                    label="Situação do vínculo"
                    options={[
                      { value: 'ativo', label: 'Ativo' },
                      { value: 'inativo', label: 'Inativo' },
                    ]}
                  />
                )}
              </form.AppField>
              <Button type="submit" disabled={pending}>
                Salvar vínculo
              </Button>
            </fieldset>
          )}
        </form.Subscribe>
      </form>
      {alterar.isError && <p role="alert">{alterar.error.message}</p>}
    </section>
  );
}
