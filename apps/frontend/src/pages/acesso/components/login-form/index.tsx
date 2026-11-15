import { SENHA_LIMITES, type EntradaLogin } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { validarEmail, validarSenhaLogin } from '../../validators';

export function LoginForm({
  onSubmit,
}: {
  onSubmit: (entrada: EntradaLogin) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: { email: '', senha: '' },
    onSubmit: async ({ value, formApi }) => {
      try {
        await onSubmit(value);
      } catch {
        /* A mutation apresenta a mensagem do servidor na página. */
      } finally {
        formApi.reset(
          { email: value.email, senha: '' },
          { keepDefaultValues: true },
        );
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
            <form.AppField name="email" validators={{ onChange: validarEmail }}>
              {(field) => (
                <field.Input
                  label="E-mail"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                />
              )}
            </form.AppField>
            <form.AppField
              name="senha"
              validators={{ onChange: validarSenhaLogin }}
            >
              {(field) => (
                <field.Input
                  label="Senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={SENHA_LIMITES.maximo}
                />
              )}
            </form.AppField>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Aguarde…' : 'Entrar'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
