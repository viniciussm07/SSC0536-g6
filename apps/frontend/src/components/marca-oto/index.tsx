import { cn } from '@/utils/cn';

export function MarcaOto({ inversa = false }: { inversa?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src="/brand/brasao-olimpia.png"
        alt="Brasão de Olímpia"
        width={40}
        height={44}
        className="h-11 w-10 shrink-0 object-contain"
      />
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            'font-heading text-xl font-black tracking-wide',
            inversa ? 'text-white' : 'text-primary',
          )}
        >
          OTO
        </p>
        <p
          className={cn(
            'hidden text-[11px] font-medium sm:block',
            inversa ? 'text-white/85' : 'text-muted-foreground',
          )}
        >
          Observatório de Turismo de Olímpia
        </p>
      </div>
    </div>
  );
}
