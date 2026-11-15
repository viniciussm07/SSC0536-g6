import { useState } from 'react';
import {
  ACOES_ACESSO,
  ESCOPOS_ACESSO,
  PERFIS,
  RECURSOS_ACESSO,
  isPermissaoAcesso,
  permissaoCompativel,
  type AcessoAtual,
  type Perfil,
  type PermissaoAcesso,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { usePoliticas } from '../../hooks';

function RegraForm({
  perfil,
  permissoes,
  onSubmit,
}: {
  perfil: Perfil;
  permissoes: PermissaoAcesso[];
  onSubmit: (regras: PermissaoAcesso[]) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: {
      recurso: 'empreendimentos',
      acao: 'consultar',
      escopo: 'nenhum',
    },
    validators: {
      onSubmit: ({ value }) =>
        isPermissaoAcesso(value) && permissaoCompativel(perfil, value)
          ? undefined
          : {
              fields: {
                escopo: 'Esta combinação não é permitida para o perfil.',
              },
            },
    },
    onSubmit: async ({ value }) => {
      if (!isPermissaoAcesso(value)) return;
      const regras = [
        ...permissoes.filter(
          (p) => p.recurso !== value.recurso || p.acao !== value.acao,
        ),
        value,
      ];
      try {
        await onSubmit(regras);
      } catch {
        /* Erro apresentado pela mutation. */
      }
    },
  });
  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(pending) => (
          <fieldset disabled={pending} className="space-y-3">
            <form.AppField name="recurso">
              {(f) => (
                <f.Select
                  label="Recurso da permissão"
                  options={RECURSOS_ACESSO.map((v) => ({ value: v, label: v }))}
                />
              )}
            </form.AppField>
            <form.AppField name="acao">
              {(f) => (
                <f.Select
                  label="Ação da permissão"
                  options={ACOES_ACESSO.map((v) => ({ value: v, label: v }))}
                />
              )}
            </form.AppField>
            <form.AppField name="escopo">
              {(f) => (
                <f.Select
                  label="Escopo da permissão"
                  options={ESCOPOS_ACESSO.map((v) => ({ value: v, label: v }))}
                />
              )}
            </form.AppField>
            <Button type="submit" disabled={pending}>
              Salvar permissão
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
export function PoliticasPerfil({ acesso }: { acesso: AcessoAtual }) {
  const [perfil, setPerfil] = useState<Perfil>('visualizador');
  const [page, setPage] = useState(1);
  const { permissoes, visibilidades, alterarPermissoes, alterarVisibilidade } =
    usePoliticas(acesso, perfil, page);
  return (
    <section className="space-y-4" aria-label="Permissões e visibilidade">
      <h2 className="text-xl font-semibold">Permissões e visibilidade</h2>
      <p className="text-sm text-muted-foreground">
        Alterações encerram sessões do perfil afetado. Nenhum indicador é
        público.
      </p>
      <div className="flex flex-wrap gap-2">
        {PERFIS.map((p) => (
          <Button
            key={p}
            variant={p === perfil ? 'default' : 'outline'}
            aria-pressed={p === perfil}
            onClick={() => {
              setPerfil(p);
              setPage(1);
              alterarPermissoes.reset();
              alterarVisibilidade.reset();
            }}
          >
            {p}
          </Button>
        ))}
      </div>
      {permissoes.isPending ? (
        <p role="status">Carregando permissões…</p>
      ) : permissoes.isError ? (
        <p role="alert">{permissoes.error.message}</p>
      ) : (
        <>
          <ul className="max-h-64 overflow-auto text-sm">
            {permissoes.data
              .filter((p) => p.escopo !== 'nenhum')
              .map((p) => (
                <li key={`${p.recurso}:${p.acao}`}>
                  {p.recurso} / {p.acao}: {p.escopo}
                </li>
              ))}
          </ul>
          <RegraForm
            key={perfil}
            perfil={perfil}
            permissoes={permissoes.data}
            onSubmit={alterarPermissoes.mutateAsync}
          />
        </>
      )}
      {alterarPermissoes.isError && (
        <p role="alert">{alterarPermissoes.error.message}</p>
      )}
      <h3 className="font-semibold">Indicadores visíveis para {perfil}</h3>
      {visibilidades.isPending ? (
        <p role="status">Carregando visibilidade…</p>
      ) : visibilidades.isError ? (
        <p role="alert">{visibilidades.error.message}</p>
      ) : (
        <>
          {!visibilidades.data.data.length && (
            <p>Nenhum indicador cadastrado para configurar.</p>
          )}
          <ul className="space-y-2">
            {visibilidades.data.data.map((i) => (
              <li
                key={i.indicadorId}
                className="flex flex-wrap items-center gap-3"
              >
                <span>
                  {i.nome}: {i.permitido ? 'liberado' : 'restrito'}
                </span>
                <Button
                  variant="outline"
                  disabled={alterarVisibilidade.isPending}
                  onClick={() =>
                    alterarVisibilidade.mutate({
                      indicadorId: i.indicadorId,
                      permitido: !i.permitido,
                    })
                  }
                >
                  {i.permitido ? 'Restringir' : 'Liberar'} {i.nome}
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Indicadores anteriores
            </Button>
            <Button
              variant="outline"
              disabled={page >= visibilidades.data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Mais indicadores
            </Button>
          </div>
        </>
      )}
      {alterarVisibilidade.isError && (
        <p role="alert">{alterarVisibilidade.error.message}</p>
      )}
    </section>
  );
}
