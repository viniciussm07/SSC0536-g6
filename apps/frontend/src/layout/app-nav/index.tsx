import { Link } from '@tanstack/react-router';
import { cn } from '@/utils/cn';
import type { SecaoNavegacao } from '@/utils/navegacao';

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
      className={cn('space-y-4', className)}
    >
      {secoes.map((secao) => (
        <section key={secao.id} aria-label={secao.titulo}>
          <h2 className="mb-1 truncate px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {secao.titulo}
          </h2>
          <ul className="flex flex-col gap-1">
            {secao.itens.map((item) => (
              <li key={item.caminho}>
                <Link
                  to={item.caminho}
                  activeOptions={{ exact: item.caminho === '/' }}
                  onClick={onNavegar}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  activeProps={{
                    className: 'bg-accent text-accent-foreground',
                    'aria-current': 'page',
                  }}
                >
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
