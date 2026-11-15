import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import { EmpreendimentoPage } from '@/pages/empreendimento';
import { VisaoGeralPage } from '@/pages/visao-geral';

// A página inicial segue o contexto: o empreendimento selecionado ou a visão geral do OTO.
export function InicioPage() {
  const { entidade } = useContextoEntidade();
  return entidade ? <EmpreendimentoPage /> : <VisaoGeralPage />;
}
