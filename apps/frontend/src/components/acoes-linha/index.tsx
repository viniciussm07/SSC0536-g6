import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface AcaoLinha {
  rotulo: string;
  icone: LucideIcon;
  onSelecionar: () => void;
  desabilitada?: boolean;
  destrutiva?: boolean;
}

/** Coluna de ações das grades: um menu com ícone e nome de cada ação da linha. */
export function AcoesLinha({
  rotulo,
  acoes,
}: {
  /** Identifica a linha para leitores de tela (ex.: nome do registro). */
  rotulo: string;
  acoes: readonly AcaoLinha[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Ações de ${rotulo}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {acoes.map(({ rotulo: nome, icone: Icone, ...acao }) => (
          <DropdownMenuItem
            key={nome}
            disabled={acao.desabilitada}
            variant={acao.destrutiva ? 'destructive' : 'default'}
            onSelect={acao.onSelecionar}
          >
            <Icone aria-hidden="true" />
            {nome}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
