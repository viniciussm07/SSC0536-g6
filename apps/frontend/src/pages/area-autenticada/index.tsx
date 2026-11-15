import { useProtecaoAlteracoes } from '@/hooks/use-protecao-alteracoes';
import type { ReactNode } from 'react';
import { Navigate, Outlet } from '@tanstack/react-router';
import type { AcessoAtual, IdentidadeSessao } from '@ssc0536/common';
import { ContextoAutenticadoProvider } from '@/components/contexto-autenticado';
import { ContextoEntidadeProvider } from '@/components/contexto-entidade';
import { Button } from '@/components/ui/button';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import { usePermissoes } from '@/hooks/use-permissoes';
import { useSessao } from '@/hooks/use-sessao';
import { AppLayout } from '@/layout/app-layout';
import { AppShell } from '@/layout/app-shell';
import { ROTULOS_PERFIL, secoesNavegacao } from '@/utils/navegacao';
import { MenuUsuario, type RotuloContexto } from './components/menu-usuario';
import { SeletorContexto } from './components/seletor-contexto';

interface PropsArea {
  usuario: IdentidadeSessao;
  onSair: () => void;
  saindo: boolean;
  erroSaida?: string;
}
const dadosUsuario = (usuario: IdentidadeSessao) => ({
  nome: usuario.nome,
  email: usuario.email,
  perfil: ROTULOS_PERFIL[usuario.perfil as keyof typeof ROTULOS_PERFIL],
});

function MenuConta({
  usuario,
  contexto,
  aoSairDoContexto,
  onSair,
  saindo,
  children,
}: PropsArea & {
  contexto: RotuloContexto | null;
  aoSairDoContexto?: () => void;
  children?: (fechar: () => void) => ReactNode;
}) {
  const dados = dadosUsuario(usuario);
  return (
    <MenuUsuario
      nome={dados.nome}
      email={dados.email}
      perfil={dados.perfil}
      contexto={contexto}
      aoSairDoContexto={aoSairDoContexto}
      onSair={onSair}
      saindo={saindo}
    >
      {children}
    </MenuUsuario>
  );
}

function ShellComContexto({
  usuario,
  acesso,
  onSair,
  saindo,
  erroSaida,
}: PropsArea & { acesso: AcessoAtual }) {
  const { entidade, selecionar, podeSelecionar, podeVisaoGeral } =
    useContextoEntidade();
  const contexto: RotuloContexto | null = entidade
    ? { texto: entidade.nome, visaoGeral: false }
    : podeVisaoGeral
      ? { texto: 'Visão geral do OTO', visaoGeral: true }
      : podeSelecionar
        ? { texto: 'Sem empreendimento vinculado', visaoGeral: false }
        : null;
  return (
    <AppShell
      secoes={secoesNavegacao(acesso, entidade?.nome ?? null)}
      conta={
        <MenuConta
          usuario={usuario}
          contexto={contexto}
          // Só com empreendimento e para quem tem visão geral (empresário não tem).
          aoSairDoContexto={
            entidade && podeVisaoGeral ? () => selecionar(null) : undefined
          }
          onSair={onSair}
          saindo={saindo}
        >
          {(fechar) => <SeletorContexto onEscolher={fechar} />}
        </MenuConta>
      }
    >
      {erroSaida && <p role="alert">{erroSaida}</p>}
      <Outlet />
    </AppShell>
  );
}

function AreaComSessao(props: PropsArea) {
  const { usuario, onSair, saindo, erroSaida } = props;
  const permissoes = usePermissoes(usuario.id);
  if (permissoes.data && !permissoes.isError)
    return (
      <ContextoAutenticadoProvider valor={{ usuario, acesso: permissoes.data }}>
        <ContextoEntidadeProvider
          usuarioId={usuario.id}
          acesso={permissoes.data}
        >
          <ShellComContexto {...props} acesso={permissoes.data} />
        </ContextoEntidadeProvider>
      </ContextoAutenticadoProvider>
    );
  return (
    <AppShell
      secoes={[]}
      conta={
        <MenuConta
          usuario={usuario}
          contexto={null}
          onSair={onSair}
          saindo={saindo}
        />
      }
    >
      {erroSaida && <p role="alert">{erroSaida}</p>}
      {permissoes.isError ? (
        <section className="space-y-3">
          <p role="alert">{permissoes.error.message}</p>
          <Button onClick={() => void permissoes.refetch()}>
            Conferir acesso novamente
          </Button>
        </section>
      ) : (
        <p role="status">Conferindo permissões…</p>
      )}
    </AppShell>
  );
}

export function AreaAutenticadaPage() {
  const { sessao, sair } = useSessao();
  const protecao = useProtecaoAlteracoes();
  if (sessao.isPending)
    return (
      <AppLayout>
        <p role="status">Recuperando sessão…</p>
      </AppLayout>
    );
  if (sessao.isError)
    return (
      <AppLayout>
        <p role="alert">Não foi possível recuperar a sessão.</p>
        <Button
          className="mt-4 self-start"
          onClick={() => void sessao.refetch()}
        >
          Tentar novamente
        </Button>
      </AppLayout>
    );
  if (!sessao.data) return <Navigate to="/entrar" replace />;
  return (
    <AreaComSessao
      key={sessao.data.usuario.id}
      usuario={sessao.data.usuario}
      onSair={() => {
        if (protecao) void protecao.executar(() => sair.mutateAsync());
        else sair.mutate();
      }}
      saindo={sair.isPending}
      erroSaida={sair.error?.message}
    />
  );
}
