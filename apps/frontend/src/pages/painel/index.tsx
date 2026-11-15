import { permite } from '@/utils/acesso';
import type { IdentidadeSessao } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { usePermissoes } from './hooks';
import { EmpreendimentosPainel } from './components/empreendimentos';
import { IndicadoresPainel } from './components/indicadores';
import { AdministracaoPainel } from '@/pages/administracao';

export function PainelPage({ usuario }: { usuario: IdentidadeSessao }) {
  const query = usePermissoes(usuario.id);
  if (query.isPending) return <p role="status">Conferindo permissões…</p>;
  if (query.isError)
    return (
      <section>
        <p role="alert">{query.error.message}</p>
        <Button onClick={() => void query.refetch()}>
          Conferir acesso novamente
        </Button>
      </section>
    );
  const acesso = query.data;
  return (
    <div key={usuario.id} className="space-y-8">
      {permite(acesso, 'contas', 'consultar') && (
        <AdministracaoPainel acesso={acesso} />
      )}
      {permite(acesso, 'empreendimentos', 'consultar') && (
        <EmpreendimentosPainel key={acesso.revisao} acesso={acesso} />
      )}
      {permite(acesso, 'indicadores', 'consultar') && (
        <IndicadoresPainel key={acesso.revisao} acesso={acesso} />
      )}
      {!acesso.permissoes.some((p) => p.escopo !== 'nenhum') && (
        <p>
          Seu acesso ainda não tem permissões liberadas. Procure o
          administrador.
        </p>
      )}
    </div>
  );
}
