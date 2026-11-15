import { useId } from 'react';
import { useStore } from '@tanstack/react-form';
import { useFieldContext } from '@/components/form-input/context';

/** Grupo de caixas de seleção; o valor do campo é a lista dos `value` marcados. */
export function FormCheckboxes({
  label,
  options,
  description,
  disabled,
}: {
  label: string;
  options: { value: string; label: string }[];
  description?: string;
  disabled?: boolean;
}) {
  const field = useFieldContext<string[]>();
  const id = useId();
  const state = useStore(field.store, (s) => s);
  const erros = state.meta.isTouched
    ? state.meta.errors.filter((e): e is string => typeof e === 'string')
    : [];
  const marcados = state.value;
  return (
    <fieldset
      disabled={disabled}
      aria-describedby={
        [
          description ? `${id}-descricao` : undefined,
          erros.length ? `${id}-erro` : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined
      }
      aria-invalid={erros.length > 0}
      className="space-y-2"
    >
      <legend className="text-sm font-medium">{label}</legend>
      {description && (
        <p id={`${id}-descricao`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map((opcao) => (
          <label key={opcao.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={field.name}
              value={opcao.value}
              checked={marcados.includes(opcao.value)}
              onChange={(evento) =>
                field.handleChange(
                  evento.target.checked
                    ? [...marcados, opcao.value]
                    : marcados.filter((v) => v !== opcao.value),
                )
              }
              onBlur={field.handleBlur}
              className="size-4 rounded border-input accent-primary"
            />
            {opcao.label}
          </label>
        ))}
      </div>
      {erros.length > 0 && (
        <p id={`${id}-erro`} role="alert" className="text-sm text-destructive">
          {erros.join(' ')}
        </p>
      )}
    </fieldset>
  );
}
