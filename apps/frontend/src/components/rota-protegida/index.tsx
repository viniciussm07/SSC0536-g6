import type { ReactNode } from 'react';
import { Link, Navigate } from '@tanstack/react-router';
import type { AcaoAcesso, RecursoAcesso } from '@ssc0536/common';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import { permite } from '@/utils/acesso';

// A decisão real de acesso continua no servidor; aqui apenas evitamos exibir telas sem permissão.
export function RotaProtegida({
  recurso,
  acao = 'consultar',
  visaoGeral = false,
  exigeEntidade = false,
  children,
}: {
  recurso: RecursoAcesso;
  acao?: AcaoAcesso;
  /** Área que só existe com um empreendimento contextualizado; sem ele, volta ao início. */
  exigeEntidade?: boolean;
  /** Área da visão geral do OTO: com empreendimento contextualizado, volta ao início. */
  visaoGeral?: boolean;
  children: ReactNode;
}) {
  const acesso = useAcessoAtual();
  const { entidade } = useContextoEntidade();
  if ((visaoGeral && entidade) || (exigeEntidade && !entidade))
    return <Navigate to="/" replace />;
  if (permite(acesso, recurso, acao)) return children;
  return (
    <section className="space-y-3" aria-label="Acesso negado">
      <h1 className="text-2xl font-semibold">Acesso negado</h1>
      <p>Seu perfil não tem permissão para acessar esta área.</p>
      <Link to="/" className="underline">
        Voltar ao início
      </Link>
    </section>
  );
}
