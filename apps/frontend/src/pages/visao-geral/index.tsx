import {
  ScrollText,
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
import { PainelIndicadores } from '@/components/painel-indicadores';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { useContextoAutenticado } from '@/hooks/use-acesso-atual';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import { permite } from '@/utils/acesso';
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
        <ul
          aria-label="Atalhos"
          className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2"
        >
          {secoes.map((item) => {
            const Icone = icones[item.caminho];
            return (
              <li key={item.caminho}>
                <Link
                  to={item.caminho}
                  className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  <Card className="aspect-square justify-center gap-0 py-0 transition-all group-hover:border-primary/40 group-hover:shadow-md">
                    <CardContent className="flex h-full flex-col items-stretch justify-between p-2.5 text-left">
                      <span className="flex size-7 items-center justify-center self-end rounded-md bg-primary/10 text-primary">
                        <Icone className="size-3.5" aria-hidden="true" />
                      </span>
                      <span className="font-heading text-[11px] font-normal leading-tight">
                        {item.rotulo}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>
          Seu acesso ainda não tem permissões liberadas. Procure o
          administrador.
        </p>
      )}
      {permite(acesso, 'indicadores', 'consultar') && <PainelIndicadores />}
    </section>
  );
}
