import { FONTES_IMPORTACAO, LIMITES_IMPORTACAO } from '@ssc0536/common';
import type { FonteImportacao } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { ROTULOS_FONTE } from '@/utils/importacao';

const MB = LIMITES_IMPORTACAO.tamanhoMaximoBytes / 1024 / 1024;

/** Validação orienta a pessoa; o servidor repete todas as conferências. */
function validarArquivo(arquivo: File | null): string | undefined {
  if (!arquivo) return 'Escolha a planilha .xlsx.';
  if (!/\.xlsx$/i.test(arquivo.name))
    return 'Formato não homologado: envie a planilha em .xlsx.';
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  if (arquivo.size > LIMITES_IMPORTACAO.tamanhoMaximoBytes)
    return `O arquivo excede ${MB} MB.`;
  return undefined;
}

export function FormularioEnvio({
  onEnviar,
  enviando,
}: {
  onEnviar: (entrada: {
    fonte: FonteImportacao;
    arquivo: File;
  }) => Promise<unknown>;
  enviando: boolean;
}) {
  const form = useAppForm({
    defaultValues: {
      fonte: FONTES_IMPORTACAO[0] as string,
      arquivo: null as File | null,
    },
    onSubmit: async ({ value, formApi }) => {
      await onEnviar({
        fonte: value.fonte as FonteImportacao,
        arquivo: value.arquivo as File,
      });
      formApi.reset();
    },
  });
  return (
    <form
      noValidate
      aria-label="Enviar planilha"
      className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
      onSubmit={(evento) => {
        evento.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="fonte">
        {(campo) => (
          <campo.Select
            label="Tipo de planilha"
            options={FONTES_IMPORTACAO.map((f) => ({
              value: f,
              label: ROTULOS_FONTE[f],
            }))}
          />
        )}
      </form.AppField>
      <form.AppField
        name="arquivo"
        validators={{ onChange: ({ value }) => validarArquivo(value) }}
      >
        {(campo) => (
          <campo.Arquivo
            label="Arquivo da planilha"
            accept=".xlsx"
            description={`Somente .xlsx, até ${MB} MB. Macros e vínculos externos são recusados.`}
          />
        )}
      </form.AppField>
      <form.Subscribe selector={(estado) => estado.values.arquivo}>
        {(arquivo) => (
          <Button
            type="submit"
            className="sm:mt-[26px]"
            disabled={enviando || validarArquivo(arquivo) !== undefined}
          >
            {enviando ? 'Enviando…' : 'Enviar e ler'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
