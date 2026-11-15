import {
  validarAlteracaoItemCatalogo,
  validarEntradaItemCatalogo,
  type AlteracaoItemCatalogo,
  type EntradaItemCatalogo,
  type GrupoCatalogoLinha,
  type ItemCatalogoLinha,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { OPCOES_SIM_NAO, errosParaFormulario } from '@/utils/catalogo';

type Valores = {
  grupoId: string;
  chave: string;
  rotulo: string;
  exclusivo: string;
  outro: string;
  aceitaQuantidade: string;
  ordem: string;
  motivo: string;
};
const sim = (v: string) => v === 'sim';
const numero = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : v);

function corpoCriacao(v: Valores) {
  return {
    grupoId: numero(v.grupoId),
    chave: v.chave.trim(),
    rotulo: v.rotulo.trim(),
    exclusivo: sim(v.exclusivo),
    outro: sim(v.outro),
    aceitaQuantidade: sim(v.aceitaQuantidade),
    ordem: numero(v.ordem),
  };
}
/** Só envia o que mudou: o servidor só cria versão quando rótulo ou regra mudam de fato. */
function corpoAlteracao(v: Valores, item: ItemCatalogoLinha) {
  const corpo: Record<string, unknown> = {};
  if (v.rotulo.trim() !== item.rotulo) corpo.rotulo = v.rotulo.trim();
  for (const campo of ['exclusivo', 'outro', 'aceitaQuantidade'] as const)
    if (sim(v[campo]) !== item[campo]) corpo[campo] = sim(v[campo]);
  const ordem = numero(v.ordem);
  if (ordem !== item.ordem) corpo.ordem = ordem;
  if (v.motivo.trim() && Object.keys(corpo).length)
    corpo.motivo = v.motivo.trim();
  return corpo;
}

export function ItemForm({
  item,
  grupos,
  onCriar,
  onAlterar,
}: {
  item?: ItemCatalogoLinha;
  grupos: readonly GrupoCatalogoLinha[];
  onCriar: (entrada: EntradaItemCatalogo) => Promise<unknown>;
  onAlterar: (alteracao: AlteracaoItemCatalogo) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: {
      grupoId: String(item?.grupoId ?? grupos[0]?.id ?? ''),
      chave: item?.chave ?? '',
      rotulo: item?.rotulo ?? '',
      exclusivo: item?.exclusivo ? 'sim' : 'nao',
      outro: item?.outro ? 'sim' : 'nao',
      aceitaQuantidade: item?.aceitaQuantidade ? 'sim' : 'nao',
      ordem: String(item?.ordem ?? 10),
      motivo: '',
    },
    validators: {
      onSubmit: ({ value }) => {
        const resultado = item
          ? validarAlteracaoItemCatalogo(corpoAlteracao(value, item))
          : validarEntradaItemCatalogo(corpoCriacao(value));
        return resultado.valido
          ? undefined
          : errosParaFormulario(resultado.erros);
      },
    },
    onSubmit: async ({ value }) => {
      try {
        if (item) await onAlterar(corpoAlteracao(value, item));
        else await onCriar(corpoCriacao(value) as EntradaItemCatalogo);
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
            {!item && (
              <>
                <form.AppField name="grupoId">
                  {(f) => (
                    <f.Select
                      label="Grupo"
                      options={grupos.map((g) => ({
                        value: String(g.id),
                        label: `${g.pergunta} (${g.chave})`,
                      }))}
                    />
                  )}
                </form.AppField>
                <form.AppField name="chave">
                  {(f) => (
                    <f.Input
                      label="Chave estável"
                      required
                      description="Minúsculas, dígitos e . - _ (ex.: hospedagem.recepcao.sanitario). Não muda depois."
                    />
                  )}
                </form.AppField>
              </>
            )}
            <form.AppField name="rotulo">
              {(f) => <f.Input label="Rótulo" required maxLength={200} />}
            </form.AppField>
            <form.AppField name="exclusivo">
              {(f) => (
                <f.Select
                  label="Exclusivo (não combina com outra opção)"
                  options={OPCOES_SIM_NAO}
                />
              )}
            </form.AppField>
            <form.AppField name="outro">
              {(f) => (
                <f.Select
                  label="Opção “outro” (exige detalhe)"
                  options={OPCOES_SIM_NAO}
                />
              )}
            </form.AppField>
            <form.AppField name="aceitaQuantidade">
              {(f) => (
                <f.Select label="Aceita quantidade" options={OPCOES_SIM_NAO} />
              )}
            </form.AppField>
            <form.AppField name="ordem">
              {(f) => <f.Input label="Ordem" inputMode="numeric" required />}
            </form.AppField>
            {item && (
              <form.AppField name="motivo">
                {(f) => (
                  <f.Input
                    label="Motivo da alteração"
                    maxLength={300}
                    description="Registrado na nova versão quando rótulo ou regra mudam."
                  />
                )}
              </form.AppField>
            )}
            <form.Subscribe selector={(s) => s.errors}>
              {(erros) =>
                erros.some((e) => typeof e === 'string') && (
                  <p role="alert" className="text-sm text-destructive">
                    {erros.filter((e) => typeof e === 'string').join(' ')}
                  </p>
                )
              }
            </form.Subscribe>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando…' : item ? 'Salvar item' : 'Criar item'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
