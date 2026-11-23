import { useId, type ComponentProps } from 'react';
import { useStore } from '@tanstack/react-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFieldContext } from '@/components/form-input/context';

type FormArquivoProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'multiple'
> & { label: string; description?: string };

/** Seleção de um único arquivo; o valor do campo é o `File` escolhido ou `null`. */
export function FormArquivo({
  label,
  description,
  id,
  name,
  'aria-describedby': describedBy,
  ...props
}: FormArquivoProps) {
  const field = useFieldContext<File | null>();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const meta = useStore(field.store, (state) => state.meta);
  const erros = meta.isTouched
    ? [
        ...new Set(
          meta.errors.flatMap((erro: unknown) =>
            typeof erro === 'string'
              ? [erro]
              : typeof erro === 'object' &&
                  erro !== null &&
                  'message' in erro &&
                  typeof erro.message === 'string'
                ? [erro.message]
                : [],
          ),
        ),
      ]
    : [];
  const descricaoId = description ? `${inputId}-description` : undefined;
  const erroId = erros.length ? `${inputId}-errors` : undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        {...props}
        id={inputId}
        name={name ?? field.name}
        type="file"
        onChange={(evento) =>
          field.handleChange(evento.target.files?.[0] ?? null)
        }
        onBlur={field.handleBlur}
        aria-invalid={erros.length > 0}
        aria-describedby={
          [describedBy, descricaoId, erroId].filter(Boolean).join(' ') ||
          undefined
        }
      />
      {description && (
        <p id={descricaoId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {erros.length > 0 && (
        <p id={erroId} role="alert" className="text-sm text-destructive">
          {erros.join(' ')}
        </p>
      )}
    </div>
  );
}
