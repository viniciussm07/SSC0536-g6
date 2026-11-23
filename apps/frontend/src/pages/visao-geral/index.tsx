import {
  ScrollText,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  Send,
  ListChecks,
  ShieldCheck,
  Coins,
  FileSpreadsheet,
  Calculator,
} from 'lucide-react';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { Link } from '@tanstack/react-router';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useContextoAutenticado } from '@/hooks/use-acesso-atual';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import { itensVisiveis } from '@/utils/navegacao';

const icones = {
  '/auditoria': ScrollText,
  '/empreendimentos': Building2,
  '/indicadores': ChartNoAxesCombined,
  '/administracao': ShieldCheck,
  '/catalogos': ListChecks,
  '/periodos': CalendarDays,
  '/diarias': Coins,
  '/modelos-pesquisa': ClipboardList,
  '/pesquisas': Send,
  '/importacoes': FileSpreadsheet,
  '/calculos': Calculator,
  '/': Building2,
  '/editar': Building2,
};

export function VisaoGeralPage() {
  const { usuario, acesso } = useContextoAutenticado();
  const { podeSelecionar, podeVisaoGeral } = useContextoEntidade();
  const secoes = itensVisiveis(acesso, false).filter(
    (item) => item.caminho !== '/',
  );
  return (
    <section className="space-y-6" aria-label="Visão geral">
      <CabecalhoPagina
        titulo={`Olá, ${usuario.nome}`}
        descricao="Acompanhe os dados turísticos e acesse as áreas disponíveis para o seu perfil."
      />
      {podeVisaoGeral && (
        <p>
          Você está na visão geral do OTO. Escolha um empreendimento no menu do
          cabeçalho para ver os dados dele.
        </p>
      )}
      {podeSelecionar && !podeVisaoGeral && (
        <p>
          Você não tem empreendimento vinculado. Procure o administrador do OTO.
        </p>
      )}
      {secoes.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {secoes.map((item) => (
            <li key={item.caminho}>
              <Link
                to={item.caminho}
                className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                  <CardHeader>
                    <div className="mb-4 flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {(() => {
                          const Icone = icones[item.caminho];
                          return (
                            <Icone className="size-5" aria-hidden="true" />
                          );
                        })()}
                      </span>
                      <ArrowUpRight
                        className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <CardTitle>{item.rotulo}</CardTitle>
                    <CardDescription>{item.descricao}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          Seu acesso ainda não tem permissões liberadas. Procure o
          administrador.
        </p>
      )}
    </section>
  );
}
