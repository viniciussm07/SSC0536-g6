import { useId, useState, type ReactNode } from 'react';
import { AppFooter } from '@/layout/app-footer';
import { AppHeader } from '@/layout/app-header';
import { AppNav } from '@/layout/app-nav';
import type { SecaoNavegacao } from '@/utils/navegacao';

export function AppShell({
  secoes,
  conta,
  children,
}: {
  secoes: readonly SecaoNavegacao[];
  conta?: ReactNode;
  children: ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuId = useId();
  return (
    <div className="min-h-svh bg-background">
      <AppHeader
        menuAberto={menuAberto}
        menuId={menuId}
        conta={conta}
        onAlternarMenu={() => setMenuAberto((aberto) => !aberto)}
      />
      <div className="mx-auto grid max-w-[100rem] gap-6 px-4 py-6 sm:px-6 md:grid-cols-[14rem_1fr]">
        <div id={menuId} className={menuAberto ? 'block' : 'hidden md:block'}>
          <AppNav secoes={secoes} onNavegar={() => setMenuAberto(false)} />
        </div>
        <div className="min-w-0">
          <main id="conteudo" className="space-y-6">
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
