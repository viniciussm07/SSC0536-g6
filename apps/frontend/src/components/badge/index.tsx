import type { ComponentProps } from 'react';
import { Badge as BadgePrimitive } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

export type CorBadge =
  'azul' | 'laranja' | 'amarelo' | 'vermelho' | 'cinza' | 'escuro';
const cores: Record<CorBadge, string> = {
  azul: 'bg-badge-blue text-badge-blue-foreground',
  laranja: 'bg-badge-orange text-badge-orange-foreground',
  amarelo: 'bg-warning text-warning-foreground',
  vermelho: 'bg-badge-red text-badge-red-foreground',
  cinza: 'bg-muted text-muted-foreground',
  escuro: 'bg-foreground text-background',
};

/** Badge de informação OTO. A legenda continua legível sem depender da cor. */
export function Badge({
  cor = 'azul',
  ponto = true,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof BadgePrimitive>, 'variant'> & {
  cor?: CorBadge;
  ponto?: boolean;
}) {
  return (
    <BadgePrimitive
      {...props}
      variant="secondary"
      data-cor={cor}
      className={cn(
        'gap-1.5 rounded-full px-2.5 py-1 font-heading text-[11.5px] font-bold tracking-wide',
        cores[cor],
        className,
      )}
    >
      {ponto && (
        <span
          aria-hidden="true"
          className="size-[7px] shrink-0 rounded-full bg-current"
        />
      )}
      {children}
    </BadgePrimitive>
  );
}
