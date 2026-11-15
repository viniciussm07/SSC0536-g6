import { permite } from '@/utils/acesso';
import { useState } from 'react';
import type { ContaResumo, CriarConta, AlterarConta } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useAdministracao } from './hooks';
import { ContaForm } from './components/conta-form';
import { VinculosConta } from './components/vinculos';
import { PoliticasPerfil } from './components/politicas';

export function AdministracaoPage() {
  const acesso = useAcessoAtual();
  const [page, setPage] = useState(1);
  const [selecionada, setSelecionada] = useState<ContaResumo | null>(null);
  const { contas, criar, alterar, recuperar } = useAdministracao(acesso, page);
  const codigo = criar.data ?? recuperar.data;
  const erro = criar.error ?? alterar.error ?? recuperar.error;
  return (
    <section className="space-y-6" aria-label="Administração de acesso">
      <h1 className="text-2xl font-semibold">Administração de acesso</h1>
      {permite(acesso, 'contas', 'criar') && (
        <div className="space-y-3 rounded-md border p-4">
          <h3 className="font-semibold">Nova conta individual</h3>
          <ContaForm
            onSubmit={(body) => criar.mutateAsync(body as CriarConta)}
          />
        </div>
      )}
      {codigo && (
        <section
          className="space-y-2 rounded-md border p-4"
          aria-label="Código de ativação"
        >
          <p>
            Entregue este código ao titular por canal separado. Expira em uma
            hora.
          </p>
          <p className="break-all font-mono text-sm">{codigo.token}</p>
          <Button
            variant="outline"
            onClick={() => {
              criar.reset();
              recuperar.reset();
            }}
          >
            Ocultar código
          </Button>
        </section>
      )}
      {erro && <p role="alert">{erro.message}</p>}
      {contas.isPending ? (
        <p role="status">Carregando contas…</p>
      ) : contas.isError ? (
        <>
          <p role="alert">{contas.error.message}</p>
          <Button onClick={() => void contas.refetch()}>
            Recarregar contas
          </Button>
        </>
      ) : (
        <>
          {!contas.data.data.length && <p>Nenhuma conta cadastrada.</p>}
          <ul className="space-y-2">
            {contas.data.data.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3">
                <span>
                  {c.nome} — {c.email} ({c.perfil},{' '}
                  {c.ativo ? 'ativa' : 'inativa'})
                </span>
                <Button
                  variant="outline"
                  disabled={c.id === acesso.usuarioId}
                  onClick={() => {
                    setSelecionada(c);
                    alterar.reset();
                    recuperar.reset();
                    criar.reset();
                  }}
                >
                  Gerenciar {c.nome}
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Contas anteriores
            </Button>
            <span>Página {page}</span>
            <Button
              variant="outline"
              disabled={page >= contas.data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Mais contas
            </Button>
          </div>
        </>
      )}
      {selecionada && (
        <section
          className="space-y-4 rounded-md border p-4"
          aria-label="Conta selecionada"
        >
          <h3 className="font-semibold">Gerenciar {selecionada.nome}</h3>
          {permite(acesso, 'contas', 'alterar') && (
            <>
              <ContaForm
                key={`${selecionada.id}:${selecionada.perfil}:${selecionada.ativo}`}
                conta={selecionada}
                onSubmit={async (body) => {
                  const nova = await alterar.mutateAsync({
                    id: selecionada.id,
                    body: body as AlterarConta,
                  });
                  setSelecionada(nova);
                }}
              />
              <Button
                variant="outline"
                disabled={!selecionada.ativo || recuperar.isPending}
                onClick={() => {
                  criar.reset();
                  recuperar.mutate(selecionada.id);
                }}
              >
                Gerar novo código para {selecionada.nome}
              </Button>
            </>
          )}
          {permite(acesso, 'vinculos', 'consultar') && (
            <VinculosConta
              key={selecionada.id}
              acesso={acesso}
              usuarioId={selecionada.id}
            />
          )}
          <Button
            variant="outline"
            onClick={() => {
              setSelecionada(null);
              recuperar.reset();
            }}
          >
            Fechar conta
          </Button>
        </section>
      )}
      {permite(acesso, 'permissoes', 'consultar') &&
        permite(acesso, 'visibilidade', 'consultar') && (
          <PoliticasPerfil acesso={acesso} />
        )}
    </section>
  );
}
