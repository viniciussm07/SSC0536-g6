import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { MarcaOto } from '@/components/marca-oto';

export function AppHeader({
  menuAberto,
  conta,
}: {
  menuAberto: boolean;
  conta?: ReactNode;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 h-[66px] border-b bg-card">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <Dialog.Trigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 min-[1025px]:hidden"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
          >
            <Menu aria-hidden="true" />
          </Button>
        </Dialog.Trigger>
        <MarcaOto />
        <p className="ml-3 hidden border-l pl-5 text-xs font-semibold text-muted-foreground min-[1181px]:block">
          Plataforma de gestão de dados turísticos
        </p>
        <div className="ml-auto min-w-0">{conta}</div>
      </div>
    </header>
  );
}
