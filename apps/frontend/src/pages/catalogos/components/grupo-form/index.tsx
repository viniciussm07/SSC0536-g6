import {
  SELECOES_GRUPO,
  validarAlteracaoGrupoCatalogo,
  validarEntradaGrupoCatalogo,
  type AlteracaoGrupoCatalogo,
  type EntradaGrupoCatalogo,
  type GrupoCatalogoLinha,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import {
  OPCOES_SIM_NAO,
  ROTULOS_SELECAO,
  errosParaFormulario,
} from '@/utils/catalogo';

/** Criação (chave, seleção e "outro" ficam definidos) ou edição de pergunta, seção e ordem. */
export function GrupoForm({
  grupo,
  segmentoId,
  onCriar,
  onAlterar,
}: {
  grupo?: GrupoCatalogoLinha;
  segmentoId: number;
  onCriar: (entrada: EntradaGrupoCatalogo) => Promise<unknown>;
  onAlterar: (alteracao: AlteracaoGrupoCatalogo) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: {
      chave: grupo?.chave ?? '',
      pergunta: grupo?.pergunta ?? '',
      secao: grupo?.secao ?? '',
      selecao: grupo?.selecao ?? 'multipla',
      permiteOutro: grupo?.permiteOutro ? 'sim' : 'nao',
      ordem: String(grupo?.ordem ?? 10),
      motivo: '',
    },
    validators: {
      onSubmit: ({ value }) => {
        const resultado = grupo
          ? validarAlteracaoGrupoCatalogo(corpoAlteracao(value, grupo))
          : validarEntradaGrupoCatalogo(corpoCriacao(value, segmentoId));
        return resultado.valido
          ? undefined
          : errosParaFormulario(resultado.erros);
      },
    },
    onSubmit: async ({ value }) => {
      try {
        if (grupo) await onAlterar(corpoAlteracao(value, grupo));
        else
          await onCriar(
            corpoCriacao(value, segmentoId) as EntradaGrupoCatalogo,
          );
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
            {!grupo && (
              <>
                <form.AppField name="chave">
                  {(f) => (
                    <f.Input
                      label="Chave estável"
                      required
                      description="Minúsculas, dígitos e . - _ (ex.: hospedagem.recepcao). Não muda depois."
                    />
                  )}
                </form.AppField>
                <form.AppField name="selecao">
                  {(f) => (
                    <f.Select
                      label="Tipo de seleção"
                      options={SELECOES_GRUPO.map((v) => ({
                        value: v,
                        label: ROTULOS_SELECAO[v],
                      }))}
                    />
                  )}
                </form.AppField>
                <form.AppField name="permiteOutro">
                  {(f) => (
                    <f.Select
                      label="Permite opção “outro”"
                      options={OPCOES_SIM_NAO}
                    />
                  )}
                </form.AppField>
              </>
            )}
            <form.AppField name="pergunta">
              {(f) => <f.Input label="Pergunta" required maxLength={300} />}
            </form.AppField>
            <form.AppField name="secao">
              {(f) => (
                <f.Input
                  label="Seção do formulário"
                  maxLength={100}
                  description="Opcional; agrupa perguntas na tela."
                />
              )}
            </form.AppField>
            <form.AppField name="ordem">
              {(f) => <f.Input label="Ordem" inputMode="numeric" required />}
            </form.AppField>
            {grupo && (
              <form.AppField name="motivo">
                {(f) => (
                  <f.Input
                    label="Motivo da alteração"
                    maxLength={300}
                    description="Registrado nas versões dos itens quando a pergunta muda."
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
              {pending ? 'Salvando…' : grupo ? 'Salvar grupo' : 'Criar grupo'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}

type Valores = {
  chave: string;
  pergunta: string;
  secao: string;
  selecao: string;
  permiteOutro: string;
  ordem: string;
  motivo: string;
};
const numero = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : v);
function corpoCriacao(v: Valores, segmentoId: number) {
  return {
    segmentoId,
    chave: v.chave.trim(),
    pergunta: v.pergunta.trim(),
    selecao: v.selecao,
    permiteOutro: v.permiteOutro === 'sim',
    secao: v.secao.trim() || null,
    ordem: numero(v.ordem),
  };
}
/** Só envia o que mudou: o servidor só versiona e audita diferenças reais. */
function corpoAlteracao(v: Valores, grupo: GrupoCatalogoLinha) {
  const corpo: Record<string, unknown> = {};
  if (v.pergunta.trim() !== grupo.pergunta) corpo.pergunta = v.pergunta.trim();
  if ((v.secao.trim() || null) !== grupo.secao)
    corpo.secao = v.secao.trim() || null;
  const ordem = numero(v.ordem);
  if (ordem !== grupo.ordem) corpo.ordem = ordem;
  if (v.motivo.trim() && Object.keys(corpo).length)
    corpo.motivo = v.motivo.trim();
  return corpo;
}
