import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/layout/app-layout';
import { useAcesso } from './hooks';
import { LoginForm } from './components/login-form';
import { AtivacaoForm } from './components/ativacao-form';

export function AcessoPage() {
  const { sessao, entrar, sair, ativar } = useAcesso();
  const [modo, setModo] = useState<'login' | 'ativacao'>('login');
  const erro = entrar.error ?? sair.error ?? ativar.error;
  const ocupado = entrar.isPending || sair.isPending || ativar.isPending;
  return (
    <AppLayout>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Observatório de Turismo de Olímpia</CardTitle>
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
            <>
              <h1 className="text-xl font-semibold">
                Olá, {sessao.data.usuario.nome}
              </h1>
              <p>Você está conectado como {sessao.data.usuario.email}.</p>
              <Button disabled={ocupado} onClick={() => sair.mutate()}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold">
                {modo === 'login' ? 'Entrar' : 'Definir senha'}
              </h1>
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
