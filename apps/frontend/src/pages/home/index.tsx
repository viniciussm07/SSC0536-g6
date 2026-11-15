import {
  ArrowRight,
  CheckCircle2,
  Database,
  Layers3,
  Loader2,
  Server,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AppLayout } from '@/layout/app-layout';
import { useHomeHealth } from './hooks';

const modules = [
  {
    name: 'Cadastros',
    icon: Layers3,
    description: 'Organize os dados dos empreendimentos turísticos.',
  },
  {
    name: 'Inventários',
    icon: Server,
    description:
      'Consulte a capacidade e acompanhe o histórico dos empreendimentos.',
  },
  {
    name: 'Indicadores',
    icon: Database,
    description: 'Consulte os resultados disponíveis para seu perfil.',
  },
];

export function HomePage() {
  const { health, message } = useHomeHealth();
  return (
    <AppLayout>
      <header className="mb-10 space-y-5">
        <Badge variant="secondary">SSC0536 · Grupo 6</Badge>
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Informações para acompanhar o turismo.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Cadastros, inventários e indicadores em um só lugar.
          </p>
        </div>
      </header>

      <section
        aria-label="Módulos da aplicação"
        className="mb-8 grid gap-4 md:grid-cols-3"
      >
        {modules.map(({ name, icon: Icon, description }) => (
          <Card key={name}>
            <CardHeader>
              <Icon
                aria-hidden="true"
                className="mb-3 size-5 text-muted-foreground"
              />
              <CardTitle>{name}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {health.isSuccess && !health.isFetching && (
              <CheckCircle2
                aria-hidden="true"
                className="size-5 text-emerald-600"
              />
            )}
            Conexão com os serviços
          </CardTitle>
          <CardDescription aria-live="polite" role="status">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => void health.refetch()}
            disabled={health.isFetching}
          >
            {health.isFetching ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
            {health.isFetching ? 'Verificando…' : 'Testar conexão'}
          </Button>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
