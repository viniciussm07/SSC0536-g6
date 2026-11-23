import { Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export type EstadoEtapa = 'concluida' | 'atual' | 'pendente' | 'erro';
export interface Etapa {
  id: string;
  rotulo: string;
  /** Texto curto sob o rótulo, por exemplo o resultado da etapa. */
  detalhe?: string;
  estado: EstadoEtapa;
}

const ROTULO_ESTADO: Record<EstadoEtapa, string> = {
  concluida: 'concluída',
  atual: 'em andamento',
  pendente: 'pendente',
  erro: 'com erro',
};

/** Linha do tempo horizontal de um fluxo em etapas; o estado nunca depende só da cor. */
export function Etapas({
  rotulo,
  etapas,
}: {
  rotulo: string;
  etapas: readonly Etapa[];
}) {
  return (
    <ol
      aria-label={rotulo}
      className="grid gap-3 sm:grid-flow-col sm:auto-cols-fr"
    >
      {etapas.map((etapa, indice) => (
        <li
          key={etapa.id}
          aria-current={etapa.estado === 'atual' ? 'step' : undefined}
          className={cn(
            'flex items-start gap-3 rounded-lg border bg-card p-3',
            etapa.estado === 'atual' && 'border-primary ring-1 ring-primary',
            etapa.estado === 'erro' && 'border-destructive',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
              etapa.estado === 'concluida' &&
                'border-primary bg-primary text-primary-foreground',
              etapa.estado === 'atual' && 'border-primary text-primary',
              etapa.estado === 'erro' &&
                'border-destructive bg-destructive text-white',
              etapa.estado === 'pendente' && 'text-muted-foreground',
            )}
          >
            {etapa.estado === 'concluida' ? (
              <Check className="size-3.5" />
            ) : etapa.estado === 'erro' ? (
              <X className="size-3.5" />
            ) : (
              indice + 1
            )}
          </span>
          <span className="min-w-0 text-sm">
            <span className="block font-semibold leading-tight">
              {etapa.rotulo}
              <span className="sr-only"> — {ROTULO_ESTADO[etapa.estado]}</span>
            </span>
            {etapa.detalhe && (
              <span className="block text-muted-foreground">
                {etapa.detalhe}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
