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

export function VisaoGeralPage() {
  const { usuario, acesso } = useContextoAutenticado();
  const { podeSelecionar, podeVisaoGeral } = useContextoEntidade();
  const secoes = itensVisiveis(acesso, false).filter(
    (item) => item.caminho !== '/',
  );
  return (
    <section className="space-y-6" aria-label="Visão geral">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Olá, {usuario.nome}</h1>
        <p className="text-muted-foreground">
          Você está conectado como {usuario.email}.
        </p>
      </div>
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
        <ul className="grid gap-4 sm:grid-cols-2">
          {secoes.map((item) => (
            <li key={item.caminho}>
              <Link to={item.caminho} className="block">
                <Card className="h-full transition-colors hover:bg-accent">
                  <CardHeader>
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
