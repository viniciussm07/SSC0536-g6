import { useMemo } from 'react';
import type { FormularioCatalogo } from '@ssc0536/common';
import { withForm } from '@/hooks/use-app-form';
import {
  OPCOES_ESTADO_ITEM,
  ROTULOS_SELECAO,
  agruparPorSecao,
  chaveDetalhe,
  chaveEstado,
  chaveQuantidade,
} from '@/utils/catalogo';

/**
 * Perguntas do catálogo por seção, ligadas aos campos planos do formulário (`e<id>`, `d<id>`,
 * `q<id>`). Detalhe e quantidade só aparecem quando a resposta é "sim" e o item os admite.
 */
export const SecoesCatalogo = withForm({
  defaultValues: {} as Record<string, string>,
  props: {} as {
    formulario: FormularioCatalogo;
    errosItem: Record<number, string[]>;
    errosGrupo: Record<string, string>;
  },
  render: function Render({ form, formulario, errosItem, errosGrupo }) {
    const secoes = useMemo(
      () => agruparPorSecao(formulario.grupos),
      [formulario.grupos],
    );
    return (
      <>
        {secoes.map(([secao, grupos]) => (
          <section key={secao} aria-label={secao} className="space-y-4">
            <h2 className="text-lg font-semibold">{secao}</h2>
            {grupos.map((grupo) => (
              <fieldset
                key={grupo.id}
                className="space-y-3 rounded-lg border p-4"
                aria-describedby={
                  errosGrupo[grupo.chave] ? `erro-${grupo.id}` : undefined
                }
              >
                <legend className="px-1 font-medium">
                  {grupo.pergunta}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({ROTULOS_SELECAO[grupo.selecao]})
                  </span>
                </legend>
                <div className="grid gap-3 md:grid-cols-2">
                  {grupo.itens.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <form.AppField name={chaveEstado(item.id)}>
                        {(f) => (
                          <f.Select
                            label={item.rotulo}
                            options={OPCOES_ESTADO_ITEM}
                          />
                        )}
                      </form.AppField>
                      {(item.outro || item.aceitaQuantidade) && (
                        <form.Subscribe
                          selector={(s) => s.values[chaveEstado(item.id)]}
                        >
                          {(estado) =>
                            estado === 'sim' && (
                              <div className="space-y-2 pl-3">
                                {item.outro && (
                                  <form.AppField name={chaveDetalhe(item.id)}>
                                    {(f) => (
                                      <f.Input
                                        label={`Detalhe de “${item.rotulo}”`}
                                        maxLength={300}
                                      />
                                    )}
                                  </form.AppField>
                                )}
                                {item.aceitaQuantidade && (
                                  <form.AppField
                                    name={chaveQuantidade(item.id)}
                                  >
                                    {(f) => (
                                      <f.Input
                                        label={`Quantidade de “${item.rotulo}”`}
                                        inputMode="numeric"
                                      />
                                    )}
                                  </form.AppField>
                                )}
                              </div>
                            )
                          }
                        </form.Subscribe>
                      )}
                      {errosItem[item.id]?.map((mensagem) => (
                        <p
                          key={mensagem}
                          role="alert"
                          className="text-sm text-destructive"
                        >
                          {mensagem}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                {errosGrupo[grupo.chave] && (
                  <p
                    id={`erro-${grupo.id}`}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errosGrupo[grupo.chave]}
                  </p>
                )}
              </fieldset>
            ))}
          </section>
        ))}
      </>
    );
  },
});
