import {
  useProtecaoFormulario,
  useBaseFormulario,
} from '@/hooks/use-protecao-formulario';
import {
  LIMITES_PESQUISAS,
  validarAlteracaoModelo,
  validarEntradaModelo,
  type AlteracaoModeloPesquisa,
  type CampoModelo,
  type EntradaModeloPesquisa,
  type ErroCampo,
  type ModeloPesquisaDetalhe,
  type OpcaoCampo,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { OPCOES_TIPO_VALOR_CAMPO } from '../../colunas';

/** Valores do formulário: textos como string, obrigatoriedade pelas caixas de seleção. */
interface OpcaoValores {
  chave: string;
  rotulo: string;
  ordem: string;
}
interface CampoValores {
  /** Identidade estável para a chave do React; vazia em campo novo. */
  id: string;
  chave: string;
  rotulo: string;
  tipoValor: string;
  obrigatorio: string[];
  ordem: string;
  opcoes: OpcaoValores[];
}
type Valores = {
  nome: string;
  publicoAlvo: string;
  campos: CampoValores[];
  motivo: string;
};

const numero = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : v);
const proximaOrdem = (itens: readonly { ordem: string }[]) =>
  Math.max(
    0,
    ...itens.map((i) => (/^\d+$/.test(i.ordem.trim()) ? Number(i.ordem) : 0)),
  ) + 10;
const opcaoVazia = (): OpcaoValores => ({ chave: '', rotulo: '', ordem: '0' });
const campoVazio = (ordem: number): CampoValores => ({
  id: '',
  chave: '',
  rotulo: '',
  tipoValor: 'texto',
  obrigatorio: [],
  ordem: String(ordem),
  opcoes: [],
});
const paraValores = (campo: CampoModelo & { id: number }): CampoValores => ({
  id: String(campo.id),
  chave: campo.chave,
  rotulo: campo.rotulo,
  tipoValor: campo.tipoValor,
  obrigatorio: campo.obrigatorio ? ['sim'] : [],
  ordem: String(campo.ordem),
  opcoes: campo.opcoes.map((o) => ({
    chave: o.chave,
    rotulo: o.rotulo,
    ordem: String(o.ordem),
  })),
});

function camposDoFormulario(campos: readonly CampoValores[]) {
  return campos.map((campo) => ({
    chave: campo.chave.trim(),
    rotulo: campo.rotulo.trim(),
    tipoValor: campo.tipoValor,
    obrigatorio: campo.obrigatorio.includes('sim'),
    ordem: numero(campo.ordem),
    opcoes:
      campo.tipoValor === 'escolha'
        ? campo.opcoes.map((o) => ({
            chave: o.chave.trim(),
            rotulo: o.rotulo.trim(),
            ordem: numero(o.ordem),
          }))
        : [],
  }));
}
/** Mesma forma dos campos enviados, para comparar sem se preocupar com `id` do servidor. */
function camposDoModelo(campos: readonly (CampoModelo & { id: number })[]) {
  return campos.map((campo) => ({
    chave: campo.chave,
    rotulo: campo.rotulo,
    tipoValor: campo.tipoValor,
    obrigatorio: campo.obrigatorio,
    ordem: campo.ordem,
    opcoes: campo.opcoes.map((o: OpcaoCampo) => ({
      chave: o.chave,
      rotulo: o.rotulo,
      ordem: o.ordem,
    })),
  }));
}
function corpoCriacao(v: Valores) {
  return {
    nome: v.nome.trim(),
    publicoAlvo: v.publicoAlvo.trim(),
    campos: camposDoFormulario(v.campos),
  };
}
/** Só envia o que mudou; o motivo acompanha mudanças nos campos, que geram nova versão. */
function corpoAlteracao(v: Valores, modelo: ModeloPesquisaDetalhe) {
  const corpo: Record<string, unknown> = {};
  if (v.nome.trim() !== modelo.nome) corpo.nome = v.nome.trim();
  if (v.publicoAlvo.trim() !== modelo.publicoAlvo)
    corpo.publicoAlvo = v.publicoAlvo.trim();
  const campos = camposDoFormulario(v.campos);
  if (JSON.stringify(campos) !== JSON.stringify(camposDoModelo(modelo.campos)))
    corpo.campos = campos;
  if (corpo.campos && v.motivo.trim()) corpo.motivo = v.motivo.trim();
  return corpo;
}
/** Erros do validador no formato do TanStack Form: campos com entrada própria e o resto no corpo. */
function errosDoValidador(erros: readonly ErroCampo[]) {
  const fields: Record<string, string> = {};
  const gerais: string[] = [];
  for (const { field, message } of erros) {
    const semEntrada =
      field === '' ||
      field === 'corpo' ||
      field === 'campos' ||
      /^campos\[\d+\]\.opcoes$/.test(field);
    if (semEntrada) gerais.push(message);
    else fields[field] ??= message;
  }
  return {
    ...(gerais.length ? { form: gerais.join(' ') } : {}),
    fields,
  };
}

/** Criação ou edição do modelo; mudanças nos campos geram uma nova versão com o motivo informado. */
export function ModeloForm({
  modelo,
  onCriar,
  onAlterar,
}: {
  modelo?: ModeloPesquisaDetalhe;
  onCriar: (entrada: EntradaModeloPesquisa) => Promise<unknown>;
  onAlterar: (alteracao: AlteracaoModeloPesquisa) => Promise<unknown>;
}) {
  const [baseFormulario, definirBaseFormulario] = useBaseFormulario({
    nome: modelo?.nome ?? '',
    publicoAlvo: modelo?.publicoAlvo ?? '',
    campos: modelo?.campos.map(paraValores) ?? [campoVazio(10)],
    motivo: '',
  });
  const form = useAppForm({
    defaultValues: baseFormulario,
    validators: {
      onSubmit: ({ value }) => {
        const corpo = modelo
          ? corpoAlteracao(value, modelo)
          : corpoCriacao(value);
        const resultado = modelo
          ? validarAlteracaoModelo(corpo)
          : validarEntradaModelo(corpo);
        if (!resultado.valido) return errosDoValidador(resultado.erros);
        if (modelo && Object.keys(resultado.data).length === 0)
          return {
            form: 'Informe ao menos um campo para alterar.',
            fields: {},
          };
        return undefined;
      },
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (modelo) await onAlterar(corpoAlteracao(value, modelo));
        else await onCriar(corpoCriacao(value) as EntradaModeloPesquisa);
        definirBaseFormulario(value);
        formApi.reset(value);
      } catch {
        /* Erro apresentado pela página. */
      }
    },
  });
  useProtecaoFormulario(form);
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
            <form.AppField name="nome">
              {(f) => <f.Input label="Nome" required maxLength={200} />}
            </form.AppField>
            <form.AppField name="publicoAlvo">
              {(f) => (
                <f.Input
                  label="Público-alvo"
                  required
                  maxLength={200}
                  description="A quem se destina o questionário (ex.: hóspedes de meios de hospedagem)."
                />
              )}
            </form.AppField>
            <form.Field name="campos" mode="array">
              {(campos) => (
                <div className="space-y-4">
                  {campos.state.value.map((campo, i) => (
                    <fieldset
                      key={`${i}-${campo.id}`}
                      className="space-y-3 rounded-md border p-4"
                      aria-label={`Campo ${i + 1}`}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <form.AppField name={`campos[${i}].chave`}>
                          {(f) => (
                            <f.Input
                              label="Chave"
                              required
                              maxLength={LIMITES_PESQUISAS.chaveCampo}
                              description="Minúsculas, dígitos e . - _ (ex.: satisfacao_geral)."
                            />
                          )}
                        </form.AppField>
                        <form.AppField name={`campos[${i}].rotulo`}>
                          {(f) => (
                            <f.Input
                              label="Rótulo"
                              required
                              maxLength={LIMITES_PESQUISAS.rotuloCampo}
                            />
                          )}
                        </form.AppField>
                        <form.AppField name={`campos[${i}].tipoValor`}>
                          {(f) => (
                            <f.Select
                              label="Tipo do valor"
                              options={OPCOES_TIPO_VALOR_CAMPO}
                            />
                          )}
                        </form.AppField>
                        <form.AppField name={`campos[${i}].ordem`}>
                          {(f) => (
                            <f.Input
                              label="Ordem"
                              inputMode="numeric"
                              required
                            />
                          )}
                        </form.AppField>
                      </div>
                      <form.AppField name={`campos[${i}].obrigatorio`}>
                        {(f) => (
                          <f.Checkboxes
                            label="Obrigatório"
                            options={[
                              { value: 'sim', label: 'Exigir resposta' },
                            ]}
                          />
                        )}
                      </form.AppField>
                      <form.Subscribe
                        selector={(s) => s.values.campos[i]?.tipoValor}
                      >
                        {(tipoValor) =>
                          tipoValor === 'escolha' && (
                            <form.Field
                              name={`campos[${i}].opcoes`}
                              mode="array"
                            >
                              {(opcoes) => (
                                <div className="space-y-3 rounded-md border p-3">
                                  <p className="text-sm font-medium">
                                    Opções da escolha
                                  </p>
                                  {opcoes.state.value.map((_, j) => (
                                    <fieldset
                                      key={j}
                                      className="space-y-3 rounded-md border p-3"
                                      aria-label={`Opção ${j + 1}`}
                                    >
                                      <div className="grid gap-3 sm:grid-cols-3">
                                        <form.AppField
                                          name={`campos[${i}].opcoes[${j}].chave`}
                                        >
                                          {(f) => (
                                            <f.Input
                                              label="Chave"
                                              required
                                              maxLength={
                                                LIMITES_PESQUISAS.chaveCampo
                                              }
                                            />
                                          )}
                                        </form.AppField>
                                        <form.AppField
                                          name={`campos[${i}].opcoes[${j}].rotulo`}
                                        >
                                          {(f) => (
                                            <f.Input
                                              label="Rótulo"
                                              required
                                              maxLength={
                                                LIMITES_PESQUISAS.rotuloOpcao
                                              }
                                            />
                                          )}
                                        </form.AppField>
                                        <form.AppField
                                          name={`campos[${i}].opcoes[${j}].ordem`}
                                        >
                                          {(f) => (
                                            <f.Input
                                              label="Ordem"
                                              inputMode="numeric"
                                              required
                                            />
                                          )}
                                        </form.AppField>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => opcoes.removeValue(j)}
                                      >
                                        Remover opção {j + 1}
                                      </Button>
                                    </fieldset>
                                  ))}
                                  {!opcoes.state.value.length && (
                                    <p className="text-sm text-muted-foreground">
                                      Nenhuma opção informada.
                                    </p>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                      opcoes.pushValue({
                                        ...opcaoVazia(),
                                        ordem: String(
                                          proximaOrdem(opcoes.state.value),
                                        ),
                                      })
                                    }
                                  >
                                    Adicionar opção
                                  </Button>
                                </div>
                              )}
                            </form.Field>
                          )
                        }
                      </form.Subscribe>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => campos.removeValue(i)}
                      >
                        Remover campo {i + 1}
                      </Button>
                    </fieldset>
                  ))}
                  {!campos.state.value.length && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum campo informado.
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      campos.pushValue(
                        campoVazio(proximaOrdem(campos.state.value)),
                      )
                    }
                  >
                    Adicionar campo
                  </Button>
                </div>
              )}
            </form.Field>
            {modelo && (
              <form.AppField name="motivo">
                {(f) => (
                  <f.Input
                    label="Motivo da alteração"
                    maxLength={300}
                    description="Registrado na nova versão quando os campos mudam."
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
              {pending
                ? 'Salvando…'
                : modelo
                  ? 'Salvar modelo'
                  : 'Criar modelo'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
