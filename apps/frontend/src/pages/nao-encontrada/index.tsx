import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/layout/app-layout';

export function NaoEncontradaPage() {
  return (
    <AppLayout>
      <section className="space-y-3">
        <h1 className="font-heading text-[22px] font-extrabold sm:text-[26px]">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground">
          O endereço acessado não existe nesta aplicação.
        </p>
        <Link to="/" className="underline">
          Ir para o início
        </Link>
      </section>
    </AppLayout>
  );
}
