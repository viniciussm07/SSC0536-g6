import { useState } from 'react';
import { Navigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/layout/app-layout';
import { useSessao } from '@/hooks/use-sessao';
import { LoginForm } from './components/login-form';
import { AtivacaoForm } from './components/ativacao-form';

export function AcessoPage() {
  const { sessao, entrar, sair, ativar } = useSessao();
  const [modo, setModo] = useState<'login' | 'ativacao'>('login');
  const erro = entrar.error ?? sair.error ?? ativar.error;
  const ocupado = entrar.isPending || sair.isPending || ativar.isPending;
  return (
    <AppLayout>
      <Card className="mx-auto w-full max-w-md gap-7 border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-primary">
            Ambiente institucional autenticado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {sessao.isPending ? (
            <p role="status">Recuperando sessão…</p>
          ) : sessao.isError ? (
            <>
              <p role="alert">Não foi possível recuperar a sessão.</p>
              <Button onClick={() => void sessao.refetch()}>
                Tentar novamente
              </Button>
            </>
          ) : sessao.data ? (
            <Navigate to="/" replace />
          ) : (
            <>
              <h1 className="font-heading text-[26px] font-extrabold">
                {modo === 'login' ? 'Acesso à plataforma' : 'Definir senha'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Utilize suas credenciais individuais para acessar o OTO.
              </p>
              {modo === 'login' ? (
                <LoginForm onSubmit={entrar.mutateAsync} />
              ) : (
                <AtivacaoForm
                  onSubmit={async (entrada) => {
                    await ativar.mutateAsync(entrada);
                    setModo('login');
                  }}
                />
              )}
              <p className="text-sm text-muted-foreground">
                Para criar uma conta ou recuperar o acesso, solicite um código
                ao administrador do OTO.
              </p>
              <Button
                variant="outline"
                disabled={ocupado}
                onClick={() => {
                  entrar.reset();
                  ativar.reset();
                  setModo(modo === 'login' ? 'ativacao' : 'login');
                }}
              >
                {modo === 'login'
                  ? 'Tenho um código de acesso'
                  : 'Voltar para entrar'}
              </Button>
              {ativar.isSuccess && (
                <p role="status">
                  Senha definida. Entre com seu e-mail e senha.
                </p>
              )}
            </>
          )}
          {erro && <p role="alert">{erro.message}</p>}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
