import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Building2,
  ChevronsUpDown,
  Landmark,
  LogOut,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/utils/cn';

export interface RotuloContexto {
  texto: string;
  /** Visão geral do OTO (não é um empreendimento) usa ícone próprio. */
  visaoGeral: boolean;
}

/**
 * Botão do canto direito do cabeçalho: contexto (entidade) em destaque e o nome da pessoa em
 * segundo plano. O dropdown traz e-mail, perfil, a seleção de entidade (quando houver) e Sair.
 */
export function MenuUsuario({
  nome,
  email,
  perfil,
  contexto,
  aoSairDoContexto,
  onSair,
  saindo,
  children,
}: {
  nome: string;
  email: string;
  perfil: string;
  contexto: RotuloContexto | null;
  /** Presente só com um empreendimento contextualizado: volta à visão geral do OTO. */
  aoSairDoContexto?: () => void;
  onSair: () => void;
  saindo: boolean;
  /** Seleção de entidade; recebe a função que fecha o dropdown. */
  children?: (fechar: () => void) => ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const Icone = contexto ? (contexto.visaoGeral ? Landmark : Building2) : User;
  const conteudo = children?.(() => setAberto(false));
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <div className="flex max-w-[min(22rem,70vw)] items-stretch rounded-md border bg-background shadow-xs">
        {aoSairDoContexto && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto rounded-r-none"
              aria-label="Voltar para a visão geral do OTO"
              title="Voltar para a visão geral do OTO"
              onClick={aoSairDoContexto}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <Separator orientation="vertical" />
          </>
        )}
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'h-auto min-w-0 flex-1 justify-start gap-2 py-1.5 text-left',
              aoSairDoContexto && 'rounded-l-none',
            )}
            aria-label={
              contexto
                ? `Contexto: ${contexto.texto}. Conta de ${nome}. Abrir menu`
                : `Conta de ${nome}. Abrir menu`
            }
          >
            <Icone aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {contexto?.texto ?? nome}
              </span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {contexto ? nome : perfil}
              </span>
            </span>
            <ChevronsUpDown aria-hidden="true" className="opacity-60" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] space-y-3"
        aria-label="Menu da conta"
      >
        <div className="space-y-1">
          <p className="truncate text-sm font-medium" title={email}>
            {email}
          </p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            Perfil <Badge variant="secondary">{perfil}</Badge>
          </p>
        </div>
        {conteudo && (
          <>
            <Separator />
            {conteudo}
          </>
        )}
        <Separator />
        <Button
          variant="outline"
          className="w-full justify-start"
          disabled={saindo}
          onClick={onSair}
        >
          <LogOut aria-hidden="true" />
          Sair
        </Button>
      </PopoverContent>
    </Popover>
  );
}
