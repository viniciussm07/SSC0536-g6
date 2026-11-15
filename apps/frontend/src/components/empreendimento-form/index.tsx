import {
  useProtecaoFormulario,
  useBaseFormulario,
} from '@/hooks/use-protecao-formulario';
import { useState } from 'react';
import {
  FINALIDADES_CONTATO,
  SITUACOES_CADASTUR,
  SITUACOES_EMPREENDIMENTO,
  TIPOS_CONTATO,
  ZONAS,
  validarEntradaEmpreendimento,
  type AlteracaoEmpreendimento,
  type CandidatoDuplicidade,
  type EmpreendimentoDetalhe,
  type EntradaEmpreendimento,
  type SegmentoResumo,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { candidatosDeDuplicidade, errosDeCampo } from '@/services/cadastro';
import { HttpError } from '@/services/http';
import {
  ROTULOS_FINALIDADE,
  ROTULOS_MOTIVO_DUPLICIDADE,
  ROTULOS_SITUACAO,
  ROTULOS_SITUACAO_CADASTUR,
  ROTULOS_TIPO_CONTATO,
  contatoVazio,
  errosPorCampo,
  paraEntrada,
  valoresIniciais,
} from '@/utils/cadastro';
import { rotuloIdentificacao } from '@/utils/documento';

type Entrada = EntradaEmpreendimento | AlteracaoEmpreendimento;

/**
 * Formulário de cadastro/edição de empreendimento (TanStack Form). A validação aqui orienta a
 * pessoa e reutiliza o validador do common; o servidor valida de novo e é a autoridade.
 * Campos reservados à equipe ficam desabilitados e não são enviados quando `restrito`.
 */
export function EmpreendimentoForm({
  modo,
  detalhe,
  segmentos,
  restrito = false,
  rotuloEnvio,
  onSubmit,
  onSalvo,
}: {
  modo: 'criar' | 'alterar';
  detalhe?: EmpreendimentoDetalhe;
  segmentos: readonly SegmentoResumo[];
  restrito?: boolean;
  rotuloEnvio: string;
  onSubmit: (entrada: Entrada) => Promise<unknown>;
  onSalvo?: (resultado: unknown) => Promise<void>;
}) {
  const [candidatos, setCandidatos] = useState<CandidatoDuplicidade[]>([]);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [errosServidor, setErrosServidor] = useState<
    { field: string; message: string }[]
  >([]);

  const montar = (value: ReturnType<typeof valoresIniciais>) =>
    modo === 'criar'
      ? paraEntrada(value, 'criar')
      : paraEntrada(value, 'alterar', detalhe!, restrito);

  const [baseFormulario, definirBaseFormulario] = useBaseFormulario(
    valoresIniciais(detalhe),
  );
  const form = useAppForm({
    defaultValues: baseFormulario,
    onSubmitMeta: { confirmar: false },
    validators: {
      onSubmit: ({ value }) => {
        const resultado =
          modo === 'criar'
            ? validarEntradaEmpreendimento(montar(value), 'criar')
            : validarEntradaEmpreendimento(montar(value), 'alterar');
        return resultado.valido
          ? undefined
          : { fields: errosPorCampo(resultado.erros) };
      },
    },
    onSubmit: async ({ value, meta, formApi }) => {
      setCandidatos([]);
      setErroGeral(null);
      setErrosServidor([]);
      try {
        // Envia a entrada já normalizada pelo validador (texto aparado, CNPJ só com dígitos).
        const normalizada =
          modo === 'criar'
            ? validarEntradaEmpreendimento(montar(value), 'criar')
            : validarEntradaEmpreendimento(montar(value), 'alterar');
        if (!normalizada.valido) return;
        const resultado = await onSubmit({
          ...normalizada.data,
          ...(meta.confirmar ? { confirmarSemDuplicidade: true } : {}),
        });
        definirBaseFormulario(value);
        formApi.reset(value);
        await onSalvo?.(resultado);
      } catch (erro) {
        if (erro instanceof HttpError && erro.code === 'DUPLICIDADE_POTENCIAL')
          setCandidatos(candidatosDeDuplicidade(erro.details));
        else if (erro instanceof HttpError && erro.code === 'ENTRADA_INVALIDA')
          setErrosServidor(errosDeCampo(erro.details));
        else if (erro instanceof HttpError && erro.code === 'CAMPO_RESTRITO')
          setErroGeral(
            'Alguns campos só podem ser alterados pela equipe do OTO.',
          );
        else
          setErroGeral(
            erro instanceof Error ? erro.message : 'Não foi possível salvar.',
          );
      }
    },
  });
  useProtecaoFormulario(form);

  const reservado = restrito;
  return (
    <form
      className="space-y-8"
      noValidate
      aria-label={modo === 'criar' ? 'Novo empreendimento' : 'Editar cadastro'}
      onSubmit={(evento) => {
        evento.preventDefault();
        void form.handleSubmit({ confirmar: false });
      }}
    >
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(enviando) => (
          <fieldset disabled={enviando} className="space-y-8">
            <section
              className="grid gap-5 rounded-xl border bg-card p-5 shadow-card sm:grid-cols-2 sm:p-6 [&>h2]:col-span-full"
              aria-label="Identificação"
            >
              <h2 className="text-lg font-semibold">Identificação</h2>
              <form.AppField name="nomeFantasia">
                {(f) => (
                  <f.Input
                    label="Nome fantasia"
                    required
                    maxLength={200}
                    disabled={reservado}
                  />
                )}
              </form.AppField>
              <form.AppField name="razaoSocial">
                {(f) => <f.Input label="Razão social" maxLength={200} />}
              </form.AppField>
              <form.AppField name="cnpj">
                {(f) => (
                  <f.Input
                    label="CNPJ"
                    inputMode="numeric"
                    description="Opcional; 14 dígitos (a máscara é aceita). Sem CNPJ, o ID do sistema identifica o cadastro."
                    disabled={reservado}
                  />
                )}
              </form.AppField>
              <form.AppField name="idOrigem">
                {(f) => (
                  <f.Input
                    label="ID de origem"
                    maxLength={100}
                    description="Identificador na fonte de origem, quando houver."
                    disabled={reservado}
                  />
                )}
              </form.AppField>
              <form.AppField name="tipoHospedagem">
                {(f) => (
                  <f.Input
                    label="Tipo de hospedagem"
                    maxLength={60}
                    description="Rótulo da fonte (por exemplo, HOTEL). Não define a categoria do indicador."
                    disabled={reservado}
                  />
                )}
              </form.AppField>
              <form.AppField name="categoriaIndicador">
                {(f) => (
                  <f.Input
                    label="Categoria do indicador"
                    maxLength={60}
                    description="Definida pela equipe; não é inferida do tipo."
                    disabled={reservado}
                  />
                )}
              </form.AppField>
              <form.AppField name="segmentoIds">
                {(f) => (
                  <f.Checkboxes
                    label="Segmentos"
                    description="Ao menos um."
                    disabled={reservado}
                    options={segmentos.map((s) => ({
                      value: String(s.id),
                      label: s.nome,
                    }))}
                  />
                )}
              </form.AppField>
            </section>

            <section
              className="grid gap-5 rounded-xl border bg-card p-5 shadow-card sm:grid-cols-2 sm:p-6 [&>h2]:col-span-full"
              aria-label="Situação"
            >
              <h2 className="text-lg font-semibold">Situação</h2>
              <form.AppField name="situacao">
                {(f) => (
                  <f.Select
                    label="Situação cadastral"
                    disabled={reservado}
                    options={SITUACOES_EMPREENDIMENTO.map((s) => ({
                      value: s,
                      label: ROTULOS_SITUACAO[s],
                    }))}
                  />
                )}
              </form.AppField>
              <form.Subscribe selector={(s) => s.values.situacao}>
                {(situacao) =>
                  situacao === 'encerrado' && (
                    <form.AppField name="dataEncerramento">
                      {(f) => (
                        <f.Input
                          label="Data de encerramento"
                          type="date"
                          required
                          disabled={reservado}
                          description="Encerrar não apaga inventários nem respostas anteriores."
                        />
                      )}
                    </form.AppField>
                  )
                }
              </form.Subscribe>
              <form.AppField name="dataInicioAtividades">
                {(f) => <f.Input label="Início das atividades" type="date" />}
              </form.AppField>
            </section>

            <section
              className="space-y-5 rounded-xl border bg-card p-5 shadow-card sm:p-6"
              aria-label="Endereço e localização"
            >
              <h2 className="text-lg font-semibold">Endereço e localização</h2>
              <form.AppField name="endereco">
                {(f) => <f.Input label="Endereço" maxLength={300} />}
              </form.AppField>
              <form.AppField name="zona">
                {(f) => (
                  <f.Select
                    label="Zona"
                    options={[
                      { value: '', label: 'Não informada' },
                      ...ZONAS.map((z) => ({
                        value: z,
                        label: z === 'urbana' ? 'Urbana' : 'Rural',
                      })),
                    ]}
                  />
                )}
              </form.AppField>
              <div className="grid gap-3 sm:grid-cols-2">
                <form.AppField name="longitude">
                  {(f) => (
                    <f.Input
                      label="Longitude"
                      inputMode="decimal"
                      description="Graus decimais WGS84, de -180 a 180."
                    />
                  )}
                </form.AppField>
                <form.AppField name="latitude">
                  {(f) => (
                    <f.Input
                      label="Latitude"
                      inputMode="decimal"
                      description="Graus decimais WGS84, de -90 a 90."
                    />
                  )}
                </form.AppField>
              </div>
            </section>

            <section
              className="space-y-5 rounded-xl border bg-card p-5 shadow-card sm:p-6"
              aria-label="Contatos"
            >
              <h2 className="text-lg font-semibold">Contatos</h2>
              <form.Field name="contatos" mode="array">
                {(contatos) => (
                  <div className="space-y-4">
                    {contatos.state.value.map((contato, i) => (
                      <fieldset
                        key={`${i}-${contato.id}`}
                        className="space-y-3 rounded-md border p-4"
                        aria-label={`Contato ${i + 1}`}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <form.AppField name={`contatos[${i}].tipo`}>
                            {(f) => (
                              <f.Select
                                label="Tipo de contato"
                                options={TIPOS_CONTATO.map((t) => ({
                                  value: t,
                                  label: ROTULOS_TIPO_CONTATO[t],
                                }))}
                              />
                            )}
                          </form.AppField>
                          <form.AppField name={`contatos[${i}].finalidade`}>
                            {(f) => (
                              <f.Select
                                label="Finalidade"
                                options={FINALIDADES_CONTATO.map((t) => ({
                                  value: t,
                                  label: ROTULOS_FINALIDADE[t],
                                }))}
                              />
                            )}
                          </form.AppField>
                        </div>
                        <form.AppField name={`contatos[${i}].valor`}>
                          {(f) => <f.Input label="Contato" maxLength={300} />}
                        </form.AppField>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <form.AppField
                            name={`contatos[${i}].responsavelNome`}
                          >
                            {(f) => (
                              <f.Input
                                label="Nome do responsável"
                                maxLength={200}
                              />
                            )}
                          </form.AppField>
                          <form.AppField
                            name={`contatos[${i}].responsavelCargo`}
                          >
                            {(f) => (
                              <f.Input
                                label="Cargo do responsável"
                                maxLength={100}
                              />
                            )}
                          </form.AppField>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => contatos.removeValue(i)}
                        >
                          Remover contato {i + 1}
                        </Button>
                      </fieldset>
                    ))}
                    {!contatos.state.value.length && (
                      <p className="text-sm text-muted-foreground">
                        Nenhum contato informado.
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => contatos.pushValue(contatoVazio())}
                    >
                      Adicionar contato
                    </Button>
                  </div>
                )}
              </form.Field>
            </section>

            <section
              className="space-y-5 rounded-xl border bg-card p-5 shadow-card sm:p-6"
              aria-label="Cadastur"
            >
              <h2 className="text-lg font-semibold">Cadastur</h2>
              <p className="text-sm text-muted-foreground">
                Possuir Cadastur não equivale a estar regular nem a estar ativo.
              </p>
              <form.AppField name="cadasturSituacao">
                {(f) => (
                  <f.Select
                    label="Situação no Cadastur"
                    options={[
                      { value: '', label: 'Não informada' },
                      ...SITUACOES_CADASTUR.map((s) => ({
                        value: s,
                        label: ROTULOS_SITUACAO_CADASTUR[s],
                      })),
                    ]}
                  />
                )}
              </form.AppField>
              <form.Subscribe selector={(s) => s.values.cadasturSituacao}>
                {(situacao) =>
                  situacao === 'numero_proprio' && (
                    <form.AppField name="cadasturNumero">
                      {(f) => (
                        <f.Input
                          label="Número do Cadastur"
                          maxLength={40}
                          description="Mantido como texto, com zeros à esquerda."
                        />
                      )}
                    </form.AppField>
                  )
                }
              </form.Subscribe>
              <form.Subscribe selector={(s) => s.values.cadasturSituacao}>
                {(situacao) =>
                  situacao !== '' &&
                  situacao !== 'nao_possui' && (
                    <form.AppField name="cadasturVencimento">
                      {(f) => (
                        <f.Input label="Vencimento do Cadastur" type="date" />
                      )}
                    </form.AppField>
                  )
                }
              </form.Subscribe>
            </section>

            {errosServidor.length > 0 && (
              <div role="alert" className="space-y-1 text-sm text-destructive">
                <p>Confira os campos indicados para salvar:</p>
                <ul className="list-disc pl-5">
                  {errosServidor.map((e) => (
                    <li key={`${e.field}:${e.message}`}>{e.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {erroGeral && (
              <p role="alert" className="text-sm text-destructive">
                {erroGeral}
              </p>
            )}
            {candidatos.length > 0 && (
              <section
                aria-label="Possíveis duplicidades"
                className="space-y-3 rounded-md border border-destructive/40 p-4"
              >
                <h2 className="font-semibold">Possível duplicidade</h2>
                <p className="text-sm">
                  Estes cadastros já existem e podem ser o mesmo empreendimento.
                  Nada é fundido automaticamente; confirme só se este for outro.
                </p>
                <ul className="space-y-1 text-sm">
                  {candidatos.map((c) => (
                    <li key={c.id}>
                      <strong>{c.nomeFantasia}</strong> —{' '}
                      {rotuloIdentificacao(c.cnpj, c.id)} ({c.situacao}):{' '}
                      {c.motivos
                        .map((m) => ROTULOS_MOTIVO_DUPLICIDADE[m])
                        .join(', ')}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void form.handleSubmit({ confirmar: true })}
                >
                  Confirmar que é outro empreendimento
                </Button>
              </section>
            )}
            <Button type="submit">
              {enviando ? 'Salvando…' : rotuloEnvio}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
