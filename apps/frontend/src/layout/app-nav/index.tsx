import {
  Building2,
  ChartNoAxesCombined,
  House,
  ListChecks,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/utils/cn';
import type { SecaoNavegacao } from '@/utils/navegacao';

const icones = {
  '/': House,
  '/empreendimentos': Building2,
  '/indicadores': ChartNoAxesCombined,
  '/administracao': ShieldCheck,
  '/catalogos': ListChecks,
  '/editar': Pencil,
};

export function AppNav({
  secoes,
  onNavegar,
  className,
}: {
  secoes: readonly SecaoNavegacao[];
  onNavegar?: () => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className={cn('space-y-7', className)}
    >
      {secoes.map((secao) => (
        <section key={secao.id} aria-label={secao.titulo}>
          <h2 className="mb-3 truncate px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {secao.titulo}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {secao.itens.map((item) => (
              <li key={item.caminho}>
                <Link
                  to={item.caminho}
                  activeOptions={{ exact: item.caminho === '/' }}
                  onClick={onNavegar}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  activeProps={{
                    className:
                      'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground',
                    'aria-current': 'page',
                  }}
                >
                  {(() => {
                    const Icone = icones[item.caminho];
                    return (
                      <Icone
                        aria-hidden="true"
                        className="size-[18px] shrink-0"
                      />
                    );
                  })()}
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
