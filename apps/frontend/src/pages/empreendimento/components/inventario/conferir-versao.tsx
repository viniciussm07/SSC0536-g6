import {
  useProtecaoFormulario,
  useBaseFormulario,
} from '@/hooks/use-protecao-formulario';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  InventarioResumo,
  SituacaoConferenciaInventario,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { inventarioService } from '@/services/inventario';
import { ROTULOS_CONFERENCIA } from '@/utils/inventario';

const OPCOES = (
  Object.keys(ROTULOS_CONFERENCIA) as SituacaoConferenciaInventario[]
).map((valor) => ({ value: valor, label: ROTULOS_CONFERENCIA[valor] }));

/** Conferência da versão (equipe do OTO): completo exige UH e leitos informados. */
export function ConferirVersao({
  id,
  versao,
  onConcluir,
}: {
  id: number;
  versao: InventarioResumo;
  onConcluir: () => void;
}) {
  const client = useQueryClient();
  const conferir = useMutation({
    mutationFn: ({
      situacao,
      motivo,
    }: {
      situacao: SituacaoConferenciaInventario;
      motivo?: string;
    }) => inventarioService.conferir(id, versao.id, situacao, motivo),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['inventarios'] });
    },
  });
  const [baseFormulario, definirBaseFormulario] = useBaseFormulario({
    situacao: versao.situacaoConferencia,
    motivo: '',
  });
  const form = useAppForm({
    defaultValues: baseFormulario,
    onSubmit: async ({ value, formApi }) => {
      try {
        await conferir.mutateAsync({
          situacao: value.situacao as SituacaoConferenciaInventario,
          motivo: value.motivo.trim() || undefined,
        });
        definirBaseFormulario(value);
        formApi.reset(value);
        onConcluir();
      } catch {
        /* Erro apresentado abaixo. */
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
            <form.AppField name="situacao">
              {(f) => (
                <f.Select label="Situação da conferência" options={OPCOES} />
              )}
            </form.AppField>
            <form.AppField name="motivo">
              {(f) => (
                <f.Input
                  label="Observação (opcional)"
                  maxLength={300}
                  description="Registrada na auditoria."
                />
              )}
            </form.AppField>
            {conferir.isError && (
              <p role="alert" className="text-sm text-destructive">
                {conferir.error.message}
              </p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar conferência'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
