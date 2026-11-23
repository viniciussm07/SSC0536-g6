import { useId, type ComponentProps } from 'react';
import { useStore } from '@tanstack/react-form';
import { cn } from '@/utils/cn';
import { Label } from '@/components/ui/label';
import { useFieldContext } from '@/components/form-input/context';

type FormSelectProps = Omit<
  ComponentProps<'select'>,
  'value' | 'defaultValue' | 'onChange' | 'onBlur'
> & {
  label: string;
  options: { value: string; label: string }[];
  /** Mantém o rótulo só para leitores de tela (campos repetidos em tabelas). */
  ocultarRotulo?: boolean;
  /** Altura de botão pequeno, para alinhar ao lado de ações em linhas de tabela. */
  compacto?: boolean;
};
export function FormSelect({
  label,
  options,
  ocultarRotulo = false,
  compacto = false,
  id,
  name,
  'aria-describedby': describedBy,
  ...props
}: FormSelectProps) {
  const field = useFieldContext<string>();
  const state = useStore(field.store, (s) => s);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const erros = state.meta.isTouched
    ? state.meta.errors.filter((e): e is string => typeof e === 'string')
    : [];
  return (
    <div className={ocultarRotulo ? undefined : 'space-y-2'}>
      <Label
        htmlFor={inputId}
        className={ocultarRotulo ? 'sr-only' : undefined}
      >
        {label}
      </Label>
      <select
        {...props}
        id={inputId}
        name={name ?? field.name}
        value={state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={erros.length > 0}
        aria-describedby={
          [describedBy, erros.length ? `${inputId}-erro` : undefined]
            .filter(Boolean)
            .join(' ') || undefined
        }
        className={cn(
          'w-full rounded-[9px] border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
          compacto ? 'h-8 rounded-md px-2' : 'h-11',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {erros.length > 0 && (
        <p
          id={`${inputId}-erro`}
          role="alert"
          className="text-sm text-destructive"
        >
          {erros.join(' ')}
        </p>
      )}
    </div>
  );
}
