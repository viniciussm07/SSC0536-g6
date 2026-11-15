import type { ReactNode } from 'react';
import { Database, Hotel, ShieldCheck } from 'lucide-react';
import { MarcaOto } from '@/components/marca-oto';
import { AppFooter } from '@/layout/app-footer';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh min-[1025px]:grid-cols-[minmax(360px,0.9fr)_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary px-12 py-10 text-white min-[1025px]:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-36 size-[600px] rounded-full border-[70px] border-white/5"
        />
        <MarcaOto inversa />
        <div className="relative max-w-lg space-y-7 py-14">
          <span className="inline-flex rounded-full border border-white/30 px-4 py-2 text-xs font-medium">
            Observatório de Turismo de Olímpia
          </span>
          <h2 className="font-heading text-4xl font-extrabold leading-tight text-white">
            Dados turísticos de Olímpia em um só lugar.
          </h2>
          <p className="text-base leading-relaxed text-white/90">
            Centralização, padronização e análise dos dados de hospedagem e da
            ocupação turística do município.
          </p>
          <ul className="space-y-4 text-sm text-white/90">
            <li className="flex items-center gap-3">
              <Hotel className="size-5" aria-hidden="true" />
              Cadastro e inventário dos meios de hospedagem
            </li>
            <li className="flex items-center gap-3">
              <Database className="size-5" aria-hidden="true" />
              Informações organizadas com histórico
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-5" aria-hidden="true" />
              Acesso individual e seguro
            </li>
          </ul>
        </div>
        <p className="relative text-xs leading-relaxed text-white/85">
          Secretaria de Turismo / Prefeitura da Estância Turística de Olímpia
          <br />
          Plataforma de gestão de dados turísticos
        </p>
      </aside>
      <div className="flex min-w-0 flex-col">
        <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10">
          <div className="mb-9 min-[1025px]:hidden">
            <MarcaOto />
          </div>
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
