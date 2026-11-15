import type { ReactNode } from 'react';
import { AppFooter } from '@/layout/app-footer';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      {children}
      <AppFooter />
    </main>
  );
}
