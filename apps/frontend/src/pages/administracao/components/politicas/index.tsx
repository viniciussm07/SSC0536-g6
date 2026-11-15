import { useMemo, useState } from 'react';
import {
  ACOES_ACESSO,
  ESCOPOS_ACESSO,
  PERFIS,
  ESQUEMA_PERMISSOES,
  ESQUEMA_VISIBILIDADES,
  RECURSOS_ACESSO,
  isPermissaoAcesso,
  permissaoCompativel,
  type AcessoAtual,
  type Perfil,
  type PermissaoAcesso,
} from '@ssc0536/common';
import { GradeColecao } from '@/components/grade-colecao';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { acessoService } from '@/services/acesso';
import { colunasPermissoes, colunasVisibilidades } from '../../colunas';
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
  const { permissoes, alterarPermissoes, alterarVisibilidade } = usePoliticas(
    acesso,
    perfil,
  );
  const colunasVisib = useMemo(
    () =>
      colunasVisibilidades({
        pendente: alterarVisibilidade.isPending,
        onAlternar: (indicadorId, permitido) =>
          alterarVisibilidade.mutate({ indicadorId, permitido }),
      }),
    // `mutate` é estável; só o estado pendente muda as colunas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alterarVisibilidade.isPending],
  );
  const [regraAberta, setRegraAberta] = useState(false);
  return (
    <section className="space-y-8" aria-label="Permissões e visibilidade">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Alterações encerram sessões do perfil afetado. Nenhum indicador é
          público.
        </p>
        <div
          role="group"
          aria-label="Perfil"
          className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1"
        >
          {PERFIS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={p === perfil ? 'default' : 'ghost'}
              aria-pressed={p === perfil}
              onClick={() => {
                setPerfil(p);
                alterarPermissoes.reset();
                alterarVisibilidade.reset();
              }}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      <section className="space-y-3" aria-label="Permissões do perfil">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Permissões de {perfil}</h2>
          <Button
            variant="outline"
            disabled={permissoes.isPending || permissoes.isError}
            onClick={() => {
              alterarPermissoes.reset();
              setRegraAberta(true);
            }}
          >
            <Plus aria-hidden="true" />
            Alterar permissão
          </Button>
        </div>
        <GradeColecao
          id="permissoes"
          rotulo="Permissões"
          esquema={ESQUEMA_PERMISSOES}
          colunas={colunasPermissoes}
          getRowId={(p) => `${p.recurso}:${p.acao}`}
          chave={[
            'permissoes',
            acesso.usuarioId,
            acesso.revisao,
            perfil,
            'grade',
          ]}
          buscar={(consulta, signal) =>
            acessoService.permissoes(perfil, consulta, signal)
          }
          mensagemVazia="Nenhuma permissão encontrada."
        />
        {permissoes.isError && (
          <p role="alert" className="text-sm text-destructive">
            {permissoes.error.message}
          </p>
        )}
      </section>

      <section className="space-y-3" aria-label="Visibilidade de indicadores">
        <h2 className="text-lg font-semibold">
          Indicadores visíveis para {perfil}
        </h2>
        <GradeColecao
          id="visibilidades"
          rotulo="Visibilidade"
          esquema={ESQUEMA_VISIBILIDADES}
          colunas={colunasVisib}
          getRowId={(i) => String(i.indicadorId)}
          chave={['visibilidades', acesso.usuarioId, acesso.revisao, perfil]}
          buscar={(consulta, signal) =>
            acessoService.visibilidades(perfil, consulta, signal)
          }
          colunasADireita={['acoes']}
          mensagemVazia="Nenhum indicador cadastrado para configurar."
        />
        {alterarVisibilidade.isError && (
          <p role="alert" className="text-sm text-destructive">
            {alterarVisibilidade.error.message}
          </p>
        )}
      </section>

      <Dialog open={regraAberta} onOpenChange={setRegraAberta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar permissão de {perfil}</DialogTitle>
            <DialogDescription>
              Define o escopo de uma combinação recurso/ação; as demais regras
              do perfil permanecem.
            </DialogDescription>
          </DialogHeader>
          {permissoes.data && (
            <RegraForm
              key={perfil}
              perfil={perfil}
              permissoes={permissoes.data}
              onSubmit={async (regras) => {
                await alterarPermissoes.mutateAsync(regras);
                setRegraAberta(false);
              }}
            />
          )}
          {alterarPermissoes.isError && (
            <p role="alert" className="text-sm text-destructive">
              {alterarPermissoes.error.message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
