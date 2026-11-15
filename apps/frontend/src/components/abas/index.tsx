import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface Aba {
  id: string;
  rotulo: string;
}

/** Abas acessíveis (WAI-ARIA tabs): setas, Home e End movem o foco e a seleção. */
export function Abas({
  rotulo,
  abas,
  ativa,
  onChange,
  children,
}: {
  rotulo: string;
  abas: readonly Aba[];
  ativa: string;
  onChange: (id: string) => void;
  children: (id: string) => ReactNode;
}) {
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});
  const teclado = (evento: KeyboardEvent, indice: number) => {
    const destino =
      evento.key === 'ArrowRight'
        ? (indice + 1) % abas.length
        : evento.key === 'ArrowLeft'
          ? (indice - 1 + abas.length) % abas.length
          : evento.key === 'Home'
            ? 0
            : evento.key === 'End'
              ? abas.length - 1
              : null;
    if (destino === null) return;
    evento.preventDefault();
    onChange(abas[destino].id);
    botoes.current[abas[destino].id]?.focus();
  };
  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label={rotulo}
        className="flex max-w-full gap-1 overflow-x-auto border-b"
      >
        {abas.map((aba, indice) => (
          <button
            key={aba.id}
            ref={(el) => {
              botoes.current[aba.id] = el;
            }}
            type="button"
            role="tab"
            id={`aba-${aba.id}`}
            aria-selected={aba.id === ativa}
            aria-controls={`painel-${aba.id}`}
            tabIndex={aba.id === ativa ? 0 : -1}
            onClick={() => onChange(aba.id)}
            onKeyDown={(e) => teclado(e, indice)}
            className={cn(
              '-mb-px min-h-11 border-b-2 px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              aba.id === ativa
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`painel-${ativa}`}
        aria-labelledby={`aba-${ativa}`}
        className="space-y-6"
      >
        {children(ativa)}
      </div>
    </div>
  );
}
