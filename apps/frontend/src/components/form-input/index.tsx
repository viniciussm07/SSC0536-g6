import { useId, type ComponentProps } from 'react';
import { useStore } from '@tanstack/react-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFieldContext } from './context';

type FormInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'defaultValue' | 'onChange' | 'onBlur'
> & {
  label: string;
  description?: string;
};

/** Campo textual, de e-mail ou senha; regras de domínio pertencem ao formulário. */
export function FormInput({
  label,
  description,
  id,
  name,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: FormInputProps) {
  const field = useFieldContext<string>();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const meta = useStore(field.store, (state) => state.meta);
  const value = useStore(field.store, (state) => state.value);
  const errors = meta.isTouched
    ? [
        ...new Set(
          meta.errors.flatMap((error: unknown) => {
            if (typeof error === 'string') return [error];
            if (
              typeof error === 'object' &&
              error !== null &&
              'message' in error &&
              typeof error.message === 'string'
            )
              return [error.message];
            return [];
          }),
        ),
      ]
    : [];
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = errors.length ? `${inputId}-errors` : undefined;
  const descriptions =
    [describedBy, descriptionId, errorId].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        {...props}
        id={inputId}
        name={name ?? field.name}
        value={value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={errors.length > 0 || ariaInvalid}
        aria-describedby={descriptions}
      />
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {errors.length > 0 && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {errors.join(' ')}
        </p>
      )}
    </div>
  );
}
