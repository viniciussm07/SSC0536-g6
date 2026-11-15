import { useNavigate } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import type { EmpreendimentoListado } from '@ssc0536/common';
import { AcoesLinha } from '@/components/acoes-linha';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';

/** Ações da linha: contextualiza o empreendimento e vai para a ficha (página inicial dele). */
export function AcoesEmpreendimento({
  empreendimento,
}: {
  empreendimento: EmpreendimentoListado;
}) {
  const { selecionar } = useContextoEntidade();
  const navegar = useNavigate();
  return (
    <AcoesLinha
      rotulo={empreendimento.nomeFantasia}
      acoes={[
        {
          rotulo: 'Abrir',
          icone: ExternalLink,
          onSelecionar: () => {
            selecionar({
              id: empreendimento.id,
              nome: empreendimento.nomeFantasia,
              cnpj: empreendimento.cnpj,
            });
            void navegar({ to: '/' });
          },
        },
      ]}
    />
  );
}
