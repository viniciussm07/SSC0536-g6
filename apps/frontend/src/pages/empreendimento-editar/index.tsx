import { Link, useNavigate } from '@tanstack/react-router';
import { EmpreendimentoForm } from '@/components/empreendimento-form';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import { useDetalheEmpreendimento } from '@/hooks/use-detalhe-empreendimento';
import { useSegmentos } from '@/hooks/use-segmentos';
import { escopo } from '@/utils/acesso';
import { useAlterarEmpreendimento } from './hooks';

export function EditarEmpreendimentoPage() {
  const acesso = useAcessoAtual();
  const { entidade } = useContextoEntidade();
  if (!entidade) return null;
  return <Edicao acesso={acesso} id={entidade.id} nome={entidade.nome} />;
}

function Edicao({
  acesso,
  id,
  nome,
}: {
  acesso: ReturnType<typeof useAcessoAtual>;
  id: number;
  nome: string;
}) {
  const navegar = useNavigate();
  const detalhe = useDetalheEmpreendimento(acesso, id);
  const segmentos = useSegmentos(acesso);
  const alterar = useAlterarEmpreendimento(id);
  const restrito = escopo(acesso, 'empreendimentos', 'alterar') !== 'todos';
  return (
    <section className="space-y-6" aria-label="Editar cadastro">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Editar cadastro</h1>
        <p className="text-muted-foreground">{nome}</p>
        {restrito && (
          <p className="text-sm text-muted-foreground">
            Identificação, classificação, situação e segmentos só podem ser
            alterados pela equipe do OTO.
          </p>
        )}
      </div>
      {detalhe.isPending || segmentos.isPending ? (
        <p role="status">Carregando cadastro…</p>
      ) : detalhe.isError || segmentos.isError ? (
        <>
          <p role="alert">{(detalhe.error ?? segmentos.error)?.message}</p>
          <Button
            onClick={() => {
              void detalhe.refetch();
              void segmentos.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </>
      ) : (
        <EmpreendimentoForm
          key={`${detalhe.dataUpdatedAt}`}
          modo="alterar"
          detalhe={detalhe.data}
          segmentos={segmentos.data}
          restrito={restrito}
          rotuloEnvio="Salvar cadastro"
          onSubmit={async (entrada) => {
            await alterar.mutateAsync(entrada);
            await navegar({ to: '/' });
          }}
        />
      )}
      <Link to="/" className="underline">
        Cancelar e voltar à ficha
      </Link>
    </section>
  );
}
