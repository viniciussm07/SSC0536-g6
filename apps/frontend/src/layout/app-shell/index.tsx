import { useEffect, useState, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { AppFooter } from '@/layout/app-footer';
import { AppHeader } from '@/layout/app-header';
import { AppNav } from '@/layout/app-nav';
import { MarcaOto } from '@/components/marca-oto';
import { Button } from '@/components/ui/button';
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
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1025px)');
    const fechar = () => {
      if (desktop.matches) setMenuAberto(false);
    };
    desktop.addEventListener('change', fechar);
    return () => desktop.removeEventListener('change', fechar);
  }, []);
  return (
    <Dialog.Root open={menuAberto} onOpenChange={setMenuAberto}>
      <div className="min-h-svh bg-background pt-[66px]">
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-2"
        >
          Ir para o conteúdo principal
        </a>
        <AppHeader menuAberto={menuAberto} conta={conta} />
        <aside className="fixed bottom-0 left-0 top-[66px] hidden w-[262px] overflow-y-auto border-r bg-card p-4 min-[1025px]:block">
          <AppNav secoes={secoes} />
        </aside>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-xs" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[min(85vw,300px)] overflow-y-auto border-r bg-card p-4 shadow-xl focus:outline-none"
          >
            <Dialog.Title className="sr-only">Menu de navegação</Dialog.Title>
            <div className="mb-8 flex items-center justify-between gap-2">
              <MarcaOto />
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar menu">
                  <X aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
            <AppNav secoes={secoes} onNavegar={() => setMenuAberto(false)} />
          </Dialog.Content>
        </Dialog.Portal>
        <div className="min-w-0 min-[1025px]:ml-[262px]">
          <main
            id="conteudo"
            tabIndex={-1}
            className="mx-auto min-h-[calc(100svh-180px)] max-w-[100rem] space-y-6 px-4 py-7 outline-none sm:px-6 min-[1181px]:px-9"
          >
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </Dialog.Root>
  );
}
