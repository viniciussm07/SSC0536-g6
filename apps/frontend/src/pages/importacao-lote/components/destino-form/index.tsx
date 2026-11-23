import { useStore } from '@tanstack/react-form';
import type { EntradaDestino } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { useEdicaoPerguntas, useEdicoesDoTipo } from '../../hooks';

/** Escolha da edição consolidada e da pergunta de ocupação que receberão as respostas. */
export function DestinoForm({
  tipoColeta,
  onDefinir,
  salvando,
}: {
  tipoColeta: string;
  onDefinir: (entrada: EntradaDestino) => Promise<unknown>;
  salvando: boolean;
}) {
  const edicoes = useEdicoesDoTipo(tipoColeta, true);
  const form = useAppForm({
    defaultValues: { pesquisaId: '', perguntaId: '' },
    validators: {
      onSubmit: ({ value }) =>
        value.pesquisaId && value.perguntaId
          ? undefined
          : 'Escolha a edição e a pergunta de ocupação.',
    },
    onSubmit: async ({ value }) => {
      await onDefinir({
        pesquisaId: Number(value.pesquisaId),
        perguntaId: Number(value.perguntaId),
      });
    },
  });
  const pesquisaId = useStore(form.store, (e) => e.values.pesquisaId);
  const perguntaId = useStore(form.store, (e) => e.values.perguntaId);
  const edicao = useEdicaoPerguntas(
    pesquisaId ? Number(pesquisaId) : undefined,
  );
  const periodos = new Map((edicao.data?.periodos ?? []).map((p) => [p.id, p]));
  const perguntas = (edicao.data?.perguntas ?? [])
    .filter((p) => p.tipoValor === 'percentual')
    .map((p) => {
      const periodo = periodos.get(p.periodoId);
      return {
        value: String(p.id),
        label: `${p.rotulo}${periodo ? ` — ${periodo.rotulo} (${periodo.dataInicio} a ${periodo.dataFim})` : ''}`,
      };
    });
  return (
    <form
      noValidate
      aria-label="Escolher destino"
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(evento) => {
        evento.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField
        name="pesquisaId"
        listeners={{ onChange: () => form.setFieldValue('perguntaId', '') }}
      >
        {(campo) => (
          <campo.Select
            label={`Edição de pesquisa (${tipoColeta})`}
            disabled={edicoes.isPending}
            options={[
              {
                value: '',
                label: edicoes.isPending ? 'Carregando…' : 'Escolha a edição',
              },
              ...(edicoes.data?.data ?? []).map((p) => ({
                value: String(p.id),
                label: p.titulo,
              })),
            ]}
          />
        )}
      </form.AppField>
      <form.AppField name="perguntaId">
        {(campo) => (
          <campo.Select
            label="Pergunta de ocupação e período"
            disabled={!pesquisaId || edicao.isPending}
            options={[
              {
                value: '',
                label: pesquisaId
                  ? 'Escolha a pergunta'
                  : 'Escolha antes a edição',
              },
              ...perguntas,
            ]}
          />
        )}
      </form.AppField>
      <Button type="submit" disabled={salvando || !pesquisaId || !perguntaId}>
        {salvando ? 'Salvando…' : 'Definir destino'}
      </Button>
    </form>
  );
}
