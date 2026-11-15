import { useNavigate } from '@tanstack/react-router';
import type { EmpreendimentoListado } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';

/** Contextualiza o empreendimento e vai para a ficha (página inicial dele). */
export function BotaoAbrir({
  empreendimento,
}: {
  empreendimento: EmpreendimentoListado;
}) {
  const { selecionar } = useContextoEntidade();
  const navegar = useNavigate();
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={`Abrir ${empreendimento.nomeFantasia}`}
      onClick={() => {
        selecionar({
          id: empreendimento.id,
          nome: empreendimento.nomeFantasia,
          cnpj: empreendimento.cnpj,
        });
        void navegar({ to: '/' });
      }}
    >
      Abrir
    </Button>
  );
}
