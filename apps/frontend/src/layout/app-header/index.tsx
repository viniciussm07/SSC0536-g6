import type { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppHeader({
  menuAberto,
  menuId,
  onAlternarMenu,
  conta,
}: {
  menuAberto: boolean;
  menuId: string;
  onAlternarMenu: () => void;
  /** Menu da conta, alinhado ao canto direito. */
  conta?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls={menuId}
          onClick={onAlternarMenu}
        >
          {menuAberto ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
        <p className="font-semibold tracking-tight">
          <span className="sm:hidden">OTO</span>
          <span className="hidden sm:inline">
            Observatório de Turismo de Olímpia
          </span>
        </p>
        <div className="ml-auto min-w-0">{conta}</div>
      </div>
    </header>
  );
}
