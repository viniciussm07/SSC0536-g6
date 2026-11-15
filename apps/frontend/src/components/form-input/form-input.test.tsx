import { createRef, type Ref } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useAppForm } from '@/hooks/use-app-form';

function Exemplo({
  onSubmit,
  inputRef,
  disabled = false,
}: {
  onSubmit: (value: { nome: string }) => void;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
}) {
  const form = useAppForm({
    defaultValues: { nome: '' },
    onSubmit: ({ value }) => onSubmit(value),
  });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <p id="contexto">Informação adicional.</p>
      <form.AppField
        name="nome"
        validators={{
          onBlur: ({ value }) =>
            value.trim() ? undefined : 'Informe seu nome.',
        }}
      >
        {(field) => (
          <field.Input
            id="nome"
            ref={inputRef}
            label="Nome"
            description="Nome para contato."
            aria-describedby="contexto"
            required
            autoComplete="name"
            disabled={disabled}
          />
        )}
      </form.AppField>
      <button type="submit">Salvar</button>
    </form>
  );
}

describe('Input integrado ao TanStack Form', () => {
  it('conecta blur, erros e descrição acessível, e submete o valor atualizado', async () => {
    const submit = vi.fn();
    const ref = createRef<HTMLInputElement>();
    render(<Exemplo onSubmit={submit} inputRef={ref} />);
    const user = userEvent.setup();
    const input = screen.getByLabelText('Nome');
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('name', 'nome');
    expect(input).toHaveAttribute('autocomplete', 'name');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription(
      'Informação adicional. Nome para contato.',
    );
    await user.click(input);
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe seu nome.',
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'Informação adicional. Nome para contato. Informe seu nome.',
    );
    await user.type(input, 'Pessoa Fictícia');
    await user.tab();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(submit).toHaveBeenCalledExactlyOnceWith({ nome: 'Pessoa Fictícia' });
  });
  it('propaga disabled e impede edição por teclado', async () => {
    render(<Exemplo onSubmit={vi.fn()} disabled />);
    const input = screen.getByLabelText('Nome');
    await userEvent.setup().type(input, 'Texto');
    expect(input).toBeDisabled();
    expect(input).toHaveValue('');
  });
});
