import type { ReactNode } from 'react';

export function CabecalhoPagina({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h1 className="font-heading text-[22px] font-extrabold leading-tight sm:text-[26px]">
          {titulo}
        </h1>
        {descricao && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {descricao}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
