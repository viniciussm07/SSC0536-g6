import { SENHA_LIMITES, type EntradaAtivacao } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { validarCodigoAtivacao, validarSenhaAtivacao } from '../../validators';

export function AtivacaoForm({
  onSubmit,
}: {
  onSubmit: (entrada: EntradaAtivacao) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: { token: '', senha: '' },
    onSubmit: async ({ value, formApi }) => {
      try {
        await onSubmit(value);
      } catch {
        /* A mutation apresenta a mensagem do servidor na página. */
      } finally {
        formApi.reset();
      }
    },
  });
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <fieldset className="space-y-4" disabled={isSubmitting}>
            <form.AppField
              name="token"
              validators={{ onChange: validarCodigoAtivacao }}
            >
              {(field) => (
                <field.Input
                  label="Código fornecido pelo administrador"
                  type="password"
                  autoComplete="off"
                  required
                  minLength={64}
                  maxLength={64}
                  description="O código é válido por uma hora e só pode ser usado uma vez."
                />
              )}
            </form.AppField>
            <form.AppField
              name="senha"
              validators={{ onChange: validarSenhaAtivacao }}
            >
              {(field) => (
                <field.Input
                  label="Senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={SENHA_LIMITES.minimo}
                  maxLength={SENHA_LIMITES.maximo}
                  description="Use entre 12 e 128 caracteres."
                />
              )}
            </form.AppField>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Aguarde…' : 'Salvar senha'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
