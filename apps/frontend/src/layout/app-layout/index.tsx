import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      {children}
      <footer className="mt-10">
        <Separator className="mb-5" />
        <p className="text-sm text-muted-foreground">
          Observatório de Turismo de Olímpia
        </p>
      </footer>
    </main>
  );
}
