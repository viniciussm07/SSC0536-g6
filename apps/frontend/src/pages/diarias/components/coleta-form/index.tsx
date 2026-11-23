import {
  useBaseFormulario,
  useProtecaoFormulario,
} from '@/hooks/use-protecao-formulario';
import {
  SITUACOES_CONFERENCIA_FONTE,
  TIPOS_DIA,
  UNIDADES_PRECO,
  validarAlteracaoColetaDiaria,
  validarEntradaColetaDiaria,
  type AlteracaoColetaDiaria,
  type ColetaDiariaLinha,
  type EntradaColetaDiaria,
  type SituacaoConferenciaFonte,
  type TipoDia,
  type UnidadePreco,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { errosDoValidador } from '../../form-utils';

type Opcao = { value: string; label: string };
type Valores = {
  empreendimentoId: string;
  periodoId: string;
  fonte: string;
  dataColeta: string;
  dataEstadia: string;
  tipoDia: string;
  valorDiaria: string;
  moeda: string;
  unidadePreco: string;
  referenciaOrigem: string;
  observacao: string;
  situacaoConferencia: string;
};

const ROTULOS_TIPO_DIA: Record<TipoDia, string> = {
  semana: 'Semana',
  fim_de_semana: 'Fim de semana',
};
const ROTULOS_CONFERENCIA: Record<SituacaoConferenciaFonte, string> = {
  pendente: 'Pendente',
  conferida: 'Conferida',
  divergente: 'Divergente',
};

const textoOuNulo = (valor: string): string | null => {
  const limpo = valor.trim();
  return limpo ? limpo : null;
};

function corpoCriacao(v: Valores): EntradaColetaDiaria {
  const referenciaOrigem = v.referenciaOrigem.trim();
  const observacao = v.observacao.trim();
  return {
    empreendimentoId: Number(v.empreendimentoId),
    periodoId: Number(v.periodoId),
    fonte: v.fonte.trim(),
    dataColeta: v.dataColeta,
    dataEstadia: v.dataEstadia,
    tipoDia: v.tipoDia as TipoDia,
    valorDiaria: v.valorDiaria,
    moeda: v.moeda,
    unidadePreco: v.unidadePreco as UnidadePreco,
    ...(referenciaOrigem ? { referenciaOrigem } : {}),
    ...(observacao ? { observacao } : {}),
  };
}

function corpoAlteracao(
  v: Valores,
  coleta: ColetaDiariaLinha,
): AlteracaoColetaDiaria {
  const corpo: AlteracaoColetaDiaria = {};
  if (Number(v.empreendimentoId) !== coleta.empreendimentoId)
    corpo.empreendimentoId = Number(v.empreendimentoId);
  if (Number(v.periodoId) !== coleta.periodoId)
    corpo.periodoId = Number(v.periodoId);
  if (v.fonte.trim() !== coleta.fonte) corpo.fonte = v.fonte.trim();
  if (v.dataColeta !== coleta.dataColeta) corpo.dataColeta = v.dataColeta;
  if (v.dataEstadia !== coleta.dataEstadia) corpo.dataEstadia = v.dataEstadia;
  if (v.tipoDia !== coleta.tipoDia) corpo.tipoDia = v.tipoDia as TipoDia;
  if (v.valorDiaria !== coleta.valorDiaria) corpo.valorDiaria = v.valorDiaria;
  if (v.moeda !== coleta.moeda) corpo.moeda = v.moeda;
  if (v.unidadePreco !== coleta.unidadePreco)
    corpo.unidadePreco = v.unidadePreco as UnidadePreco;
  const referencia = textoOuNulo(v.referenciaOrigem);
  if (referencia !== coleta.referenciaOrigem)
    corpo.referenciaOrigem = referencia;
  const observacao = textoOuNulo(v.observacao);
  if (observacao !== coleta.observacao) corpo.observacao = observacao;
  if (v.situacaoConferencia !== coleta.situacaoConferencia)
    corpo.situacaoConferencia =
      v.situacaoConferencia as SituacaoConferenciaFonte;
  return corpo;
}

/** Coleta manual de diária; em edição, mudanças de negócio voltam para pendente. */
export function ColetaForm({
  coleta,
  empreendimentos,
  periodos,
  onCriar,
  onAlterar,
}: {
  coleta?: ColetaDiariaLinha;
  empreendimentos: Opcao[];
  periodos: Opcao[];
  onCriar: (entrada: EntradaColetaDiaria) => Promise<unknown>;
  onAlterar: (alteracao: AlteracaoColetaDiaria) => Promise<unknown>;
}) {
  const [baseFormulario, definirBaseFormulario] = useBaseFormulario<Valores>({
    empreendimentoId: coleta ? String(coleta.empreendimentoId) : '',
    periodoId: coleta ? String(coleta.periodoId) : '',
    fonte: coleta?.fonte ?? 'booking',
    dataColeta: coleta?.dataColeta ?? '',
    dataEstadia: coleta?.dataEstadia ?? '',
    tipoDia: coleta?.tipoDia ?? 'semana',
    valorDiaria: coleta?.valorDiaria ?? '',
    moeda: coleta?.moeda ?? 'BRL',
    unidadePreco: coleta?.unidadePreco ?? 'por_uh_diaria',
    referenciaOrigem: coleta?.referenciaOrigem ?? '',
    observacao: coleta?.observacao ?? '',
    situacaoConferencia: coleta?.situacaoConferencia ?? 'pendente',
  });
  const form = useAppForm({
    defaultValues: baseFormulario,
    validators: {
      onSubmit: ({ value }) => {
        const resultado = coleta
          ? validarAlteracaoColetaDiaria(corpoAlteracao(value, coleta))
          : validarEntradaColetaDiaria(corpoCriacao(value));
        if (!resultado.valido) return errosDoValidador(resultado.erros);
        if (coleta && Object.keys(resultado.data).length === 0)
          return 'Informe ao menos um campo para alterar.';
        return undefined;
      },
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (coleta) await onAlterar(corpoAlteracao(value, coleta));
        else await onCriar(corpoCriacao(value));
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
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="empreendimentoId">
                {(f) => (
                  <f.Select
                    label="Empreendimento"
                    required
                    options={empreendimentos}
                  />
                )}
              </form.AppField>
              <form.AppField name="periodoId">
                {(f) => (
                  <f.Select label="Período" required options={periodos} />
                )}
              </form.AppField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="fonte">
                {(f) => (
                  <f.Input
                    label="Fonte"
                    required
                    description="Ex.: booking, empresario ou site próprio."
                  />
                )}
              </form.AppField>
              <form.AppField name="tipoDia">
                {(f) => (
                  <f.Select
                    label="Tipo de dia"
                    options={TIPOS_DIA.map((tipo) => ({
                      value: tipo,
                      label: ROTULOS_TIPO_DIA[tipo],
                    }))}
                  />
                )}
              </form.AppField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="dataColeta">
                {(f) => <f.Input label="Data da coleta" type="date" required />}
              </form.AppField>
              <form.AppField name="dataEstadia">
                {(f) => (
                  <f.Input
                    label="Data da estadia"
                    type="date"
                    required
                    description="Precisa pertencer ao período selecionado."
                  />
                )}
              </form.AppField>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <form.AppField name="valorDiaria">
                {(f) => (
                  <f.Input
                    label="Valor da diária"
                    required
                    inputMode="decimal"
                    description="Preço ofertado, não receita realizada."
                  />
                )}
              </form.AppField>
              <form.AppField name="moeda">
                {(f) => <f.Input label="Moeda" required maxLength={3} />}
              </form.AppField>
              <form.AppField name="unidadePreco">
                {(f) => (
                  <f.Select
                    label="Unidade"
                    options={UNIDADES_PRECO.map((unidade) => ({
                      value: unidade,
                      label: 'Por UH/diária',
                    }))}
                  />
                )}
              </form.AppField>
            </div>
            <form.AppField name="referenciaOrigem">
              {(f) => (
                <f.Input
                  label="Referência de origem"
                  description="URL, aba/célula ou outra evidência da coleta."
                />
              )}
            </form.AppField>
            <form.AppField name="observacao">
              {(f) => <f.Input label="Observação" />}
            </form.AppField>
            {coleta && (
              <form.AppField name="situacaoConferencia">
                {(f) => (
                  <f.Select
                    label="Conferência"
                    options={SITUACOES_CONFERENCIA_FONTE.map((situacao) => ({
                      value: situacao,
                      label: ROTULOS_CONFERENCIA[situacao],
                    }))}
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
                : coleta
                  ? 'Salvar coleta'
                  : 'Criar coleta'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}
