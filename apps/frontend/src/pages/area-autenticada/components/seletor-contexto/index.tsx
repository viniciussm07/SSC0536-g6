import { useId, useState, type UIEvent } from 'react';
import { Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import { useValorAtrasado } from '@/hooks/use-valor-atrasado';
import { cn } from '@/utils/cn';
import { escopo } from '@/utils/acesso';
import { rotuloIdentificacao } from '@/utils/documento';
import type { EntidadeContexto } from '@/utils/contexto-entidade';
import { useCatalogoEmpreendimentos } from '../../hooks';

// Distância (px) do fim da lista a partir da qual a próxima página é pedida.
const MARGEM_ROLAGEM = 48;

function Opcao({
  rotulo,
  detalhe,
  ativa,
  onEscolher,
}: {
  rotulo: string;
  detalhe: string;
  ativa: boolean;
  onEscolher: () => void;
}) {
  const detalheId = useId();
  return (
    <li>
      <Button
        variant={ativa ? 'default' : 'ghost'}
        aria-pressed={ativa}
        aria-label={rotulo}
        aria-describedby={detalheId}
        className="h-auto w-full flex-col items-start gap-0 py-2 text-left"
        onClick={onEscolher}
      >
        <span className="w-full truncate">{rotulo}</span>
        <span
          id={detalheId}
          className={cn(
            'w-full truncate text-xs font-normal',
            ativa ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {detalhe}
        </span>
      </Button>
    </li>
  );
}

// Visão geral não é um empreendimento: destaque próprio (ícone, borda e legenda) e separador.
function OpcaoVisaoGeral({
  ativa,
  onEscolher,
}: {
  ativa: boolean;
  onEscolher: () => void;
}) {
  const detalheId = useId();
  return (
    <li className="space-y-2 pb-1">
      <Button
        variant={ativa ? 'default' : 'outline'}
        aria-pressed={ativa}
        aria-label="Visão geral do OTO"
        aria-describedby={detalheId}
        className={cn(
          'h-auto w-full justify-start gap-3 py-2.5 text-left',
          !ativa && 'border-primary/50 bg-primary/5 hover:bg-primary/10',
        )}
        onClick={onEscolher}
      >
        <Landmark aria-hidden="true" className="size-5" />
        <span className="min-w-0 whitespace-normal">
          <span className="block truncate font-semibold">
            Visão geral do OTO
          </span>
          <span
            id={detalheId}
            className={cn(
              'block whitespace-normal text-xs font-normal',
              ativa ? 'text-primary-foreground/80' : 'text-muted-foreground',
            )}
          >
            Todo o Observatório — não é um empreendimento
          </span>
        </span>
      </Button>
      <p
        aria-hidden="true"
        className="border-t px-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Empreendimentos
      </p>
    </li>
  );
}

/** Seleção de entidade dentro do dropdown da conta (busca, lista infinita ou vínculos). */
export function SeletorContexto({ onEscolher }: { onEscolher: () => void }) {
  const acesso = useAcessoAtual();
  const { entidade, selecionar, podeSelecionar, podeVisaoGeral } =
    useContextoEntidade();
  const [busca, setBusca] = useState('');
  const termo = useValorAtrasado(busca.trim());
  const global = escopo(acesso, 'empreendimentos', 'consultar') === 'todos';
  const catalogo = useCatalogoEmpreendimentos(acesso, termo, global);
  // Uma única opção (empresário com um vínculo) ou nenhuma não precisa de seletor.
  if (!podeSelecionar || (!global && acesso.vinculos.length <= 1)) return null;
  const escolher = async (nova: EntidadeContexto | null) => {
    if (await selecionar(nova)) onEscolher();
  };
  const opcoes: EntidadeContexto[] = global
    ? (catalogo.data?.pages ?? []).flatMap((pagina) =>
        pagina.data.map((e) => ({
          id: e.id,
          nome: e.nomeFantasia,
          cnpj: e.cnpj,
        })),
      )
    : acesso.vinculos.map((v) => ({
        id: v.empreendimentoId,
        nome: v.nomeFantasia,
        cnpj: v.cnpj,
      }));
  const aoRolar = (evento: UIEvent<HTMLUListElement>) => {
    const lista = evento.currentTarget;
    const restante = lista.scrollHeight - lista.scrollTop - lista.clientHeight;
    if (
      restante <= MARGEM_ROLAGEM &&
      catalogo.hasNextPage &&
      !catalogo.isFetchingNextPage
    )
      void catalogo.fetchNextPage();
  };
  return (
    <section aria-label="Selecionar empreendimento" className="space-y-3">
      {global && (
        <div className="space-y-1">
          <Label htmlFor="busca-empreendimento">Buscar empreendimento</Label>
          <Input
            id="busca-empreendimento"
            type="search"
            value={busca}
            autoComplete="off"
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </div>
      )}
      <ul
        aria-label="Empreendimentos"
        className={cn(
          'max-h-64 space-y-1 overflow-y-auto overflow-x-hidden pr-1',
          // Barra de rolagem fina e discreta (padrão e WebKit).
          '[scrollbar-width:thin] [scrollbar-color:color-mix(in_oklab,var(--muted-foreground)_35%,transparent)_transparent]',
          '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35',
          '[&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/60',
        )}
        onScroll={aoRolar}
      >
        {podeVisaoGeral && (
          <OpcaoVisaoGeral
            ativa={entidade === null}
            onEscolher={() => escolher(null)}
          />
        )}
        {opcoes.map((opcao) => (
          <Opcao
            key={opcao.id}
            rotulo={opcao.nome}
            detalhe={rotuloIdentificacao(opcao.cnpj, opcao.id)}
            ativa={entidade?.id === opcao.id}
            onEscolher={() => escolher(opcao)}
          />
        ))}
      </ul>
      {global && catalogo.isPending && (
        <p role="status">Carregando empreendimentos…</p>
      )}
      {global && catalogo.isFetchingNextPage && (
        <p role="status">Carregando mais…</p>
      )}
      {global && catalogo.isError && (
        <p role="alert">{catalogo.error.message}</p>
      )}
      {global && catalogo.data && !opcoes.length && (
        <p>Nenhum empreendimento encontrado.</p>
      )}
    </section>
  );
}
