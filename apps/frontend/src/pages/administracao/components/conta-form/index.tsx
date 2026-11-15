import {
  PERFIS,
  isPerfil,
  type CriarConta,
  type AlterarConta,
  type ContaResumo,
} from '@ssc0536/common';
import { useAppForm } from '@/hooks/use-app-form';
import { Button } from '@/components/ui/button';

export function ContaForm({
  conta,
  onSubmit,
}: {
  conta?: ContaResumo;
  onSubmit: (body: CriarConta | AlterarConta) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: {
      nome: conta?.nome ?? '',
      email: conta?.email ?? '',
      perfil: conta?.perfil ?? 'empresario',
      situacao: conta?.ativo === false ? 'inativa' : 'ativa',
    },
    onSubmit: async ({ value, formApi }) => {
      if (!isPerfil(value.perfil)) return;
      try {
        await onSubmit(
          conta
            ? { perfil: value.perfil, ativo: value.situacao === 'ativa' }
            : { nome: value.nome, email: value.email, perfil: value.perfil },
        );
        if (!conta) formApi.reset();
      } catch {
        /* O estado de erro da mutation é apresentado pela página. */
      }
    },
  });
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
            {!conta && (
              <>
                <form.AppField
                  name="nome"
                  validators={{
                    onChange: ({ value }) =>
                      value.trim().length > 0 && value.length <= 200
                        ? undefined
                        : 'Informe o nome (até 200 caracteres).',
                  }}
                >
                  {(f) => (
                    <f.Input
                      label="Nome da pessoa"
                      required
                      maxLength={200}
                      autoComplete="name"
                    />
                  )}
                </form.AppField>
                <form.AppField
                  name="email"
                  validators={{
                    onChange: ({ value }) =>
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) &&
                      value.length <= 254
                        ? undefined
                        : 'Informe um e-mail válido.',
                  }}
                >
                  {(f) => (
                    <f.Input
                      label="E-mail da conta"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                    />
                  )}
                </form.AppField>
              </>
            )}
            <form.AppField
              name="perfil"
              validators={{
                onChange: ({ value }) =>
                  isPerfil(value) ? undefined : 'Escolha um perfil válido.',
              }}
            >
              {(f) => (
                <f.Select
                  label="Perfil da conta"
                  options={PERFIS.map((p) => ({ value: p, label: p }))}
                />
              )}
            </form.AppField>
            {conta && (
              <form.AppField name="situacao">
                {(f) => (
                  <f.Select
                    label="Situação da conta"
                    options={[
                      { value: 'ativa', label: 'Ativa' },
                      { value: 'inativa', label: 'Inativa' },
                    ]}
                  />
                )}
              </form.AppField>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando…' : conta ? 'Salvar conta' : 'Criar conta'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
