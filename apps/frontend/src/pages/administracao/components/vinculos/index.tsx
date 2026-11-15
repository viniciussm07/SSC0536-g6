import { useState } from 'react';
import type { AcessoAtual } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { useVinculos } from '../../hooks';

export function VinculosConta({
  acesso,
  usuarioId,
}: {
  acesso: AcessoAtual;
  usuarioId: number;
}) {
  const [page, setPage] = useState(1);
  const { vinculos, alterar } = useVinculos(acesso, usuarioId, page);
  const form = useAppForm({
    defaultValues: { empreendimentoId: '', situacao: 'ativo' },
    onSubmit: async ({ value }) => {
      try {
        await alterar.mutateAsync({
          empreendimentoId: Number(value.empreendimentoId),
          ativo: value.situacao === 'ativo',
        });
      } catch {
        /* Erro exibido abaixo. */
      }
    },
  });
  return (
    <section className="space-y-3" aria-label="Vínculos da conta">
      <h3 className="font-semibold">Vínculos da conta</h3>
      {vinculos.isPending ? (
        <p role="status">Carregando vínculos…</p>
      ) : vinculos.isError ? (
        <p role="alert">{vinculos.error.message}</p>
      ) : (
        <>
          <ul>
            {vinculos.data.data.map((v) => (
              <li key={v.empreendimentoId}>
                {v.nomeFantasia} (ID {v.empreendimentoId}):{' '}
                {v.ativo ? 'ativo' : 'inativo'}
              </li>
            ))}
          </ul>
          {!vinculos.data.data.length && <p>Nenhum vínculo cadastrado.</p>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Vínculos anteriores
            </Button>
            <Button
              variant="outline"
              disabled={page >= vinculos.data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Mais vínculos
            </Button>
          </div>
        </>
      )}
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
              <form.AppField
                name="empreendimentoId"
                validators={{
                  onChange: ({ value }) =>
                    /^\d+$/.test(value) &&
                    Number.isSafeInteger(Number(value)) &&
                    Number(value) > 0
                      ? undefined
                      : 'Informe o ID positivo do empreendimento.',
                }}
              >
                {(f) => (
                  <f.Input
                    label="ID do empreendimento"
                    type="text"
                    inputMode="numeric"
                    required
                    description="Consulte o ID na lista de empreendimentos autorizados."
                  />
                )}
              </form.AppField>
              <form.AppField name="situacao">
                {(f) => (
                  <f.Select
                    label="Situação do vínculo"
                    options={[
                      { value: 'ativo', label: 'Ativo' },
                      { value: 'inativo', label: 'Inativo' },
                    ]}
                  />
                )}
              </form.AppField>
              <Button type="submit" disabled={pending}>
                Salvar vínculo
              </Button>
            </fieldset>
          )}
        </form.Subscribe>
      </form>
      {alterar.isError && <p role="alert">{alterar.error.message}</p>}
    </section>
  );
}
