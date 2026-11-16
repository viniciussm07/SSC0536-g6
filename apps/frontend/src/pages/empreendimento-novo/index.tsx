import { Link, useNavigate } from '@tanstack/react-router';
import type {
  EmpreendimentoDetalhe,
  EntradaEmpreendimento,
} from '@ssc0536/common';
import { EmpreendimentoForm } from '@/components/empreendimento-form';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import { useSegmentos } from '@/hooks/use-segmentos';
import { Button } from '@/components/ui/button';
import { useCriarEmpreendimento } from './hooks';

export function NovoEmpreendimentoPage() {
  const acesso = useAcessoAtual();
  const { selecionar } = useContextoEntidade();
  const navegar = useNavigate();
  const segmentos = useSegmentos(acesso);
  const criar = useCriarEmpreendimento();
  return (
    <section className="space-y-6" aria-label="Novo empreendimento">
      <div className="space-y-1">
        <h1 className="font-heading text-[22px] font-extrabold sm:text-[26px]">
          Novo empreendimento
        </h1>
        <p className="text-muted-foreground">
          Cadastro parcial é aceito: só o nome, a situação e um segmento são
          obrigatórios. Capacidade e leitos pertencem ao inventário.
        </p>
      </div>
      {segmentos.isPending ? (
        <p role="status">Carregando segmentos…</p>
      ) : segmentos.isError ? (
        <>
          <p role="alert">{segmentos.error.message}</p>
          <Button onClick={() => void segmentos.refetch()}>
            Tentar novamente
          </Button>
        </>
      ) : (
        <EmpreendimentoForm
          modo="criar"
          segmentos={segmentos.data}
          rotuloEnvio="Cadastrar empreendimento"
          onSubmit={async (entrada) => {
            return await criar.mutateAsync(entrada as EntradaEmpreendimento);
          }}
          onSalvo={async (resultado) => {
            const criado = resultado as EmpreendimentoDetalhe;
            await selecionar({
              id: criado.id,
              nome: criado.nomeFantasia,
              cnpj: criado.cnpj,
            });
            await navegar({ to: '/' });
          }}
        />
      )}
      <Link to="/empreendimentos" className="underline">
        Voltar à lista
      </Link>
    </section>
  );
}
