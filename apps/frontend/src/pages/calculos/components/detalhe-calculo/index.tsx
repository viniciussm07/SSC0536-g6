import {
  LIMITES_CALCULO,
  validarEntradaPublicacaoCalculo,
  type EntradaPublicacaoCalculo,
  type ExecucaoCalculoDetalhe,
  type ValorIndicador,
} from '@ssc0536/common';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui/button';
import { useAppForm } from '@/hooks/use-app-form';
import { useProtecaoFormulario } from '@/hooks/use-protecao-formulario';
import { BadgePublicacao, BadgeSituacao } from '../situacao-calculo';

const ROTULOS_MOTIVO: Record<string, string> = {
  sem_respondentes: 'Sem respondentes',
  capacidade_zero: 'Capacidade zero',
  base_zero: 'Base zero',
  dado_ausente: 'Dado ausente',
  parametro_ausente: 'Parâmetro ausente',
  entrada_invalida: 'Entrada inválida',
};
const ROTULOS_CAPACIDADE: Record<string, string> = {
  vigente: 'Vigente',
  ausente: 'Sem inventário conferido',
  varia_no_periodo: 'Varia no período',
};
const ROTULOS_INSUMO: Record<string, string> = {
  vigente: 'Vigente',
  ausente: 'Ausente',
  ambiguo: 'Ambíguo',
};

/** Indisponível nunca aparece como zero: mostra o motivo registrado. */
function Valor({ valor }: { valor: ValorIndicador }) {
  if (valor.estado === 'disponivel')
    return <span className="font-mono tabular-nums">{valor.valor}</span>;
  return (
    <span className="text-muted-foreground" title={valor.detalhe}>
      Indisponível · {ROTULOS_MOTIVO[valor.motivo] ?? valor.motivo}
    </span>
  );
}

function PublicacaoForm({
  substitui,
  onPublicar,
}: {
  substitui: boolean;
  onPublicar: (entrada: EntradaPublicacaoCalculo) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: { motivo: '' },
    validators: {
      onSubmit: ({ value }) => {
        const motivo = value.motivo.trim();
        if (substitui && !motivo)
          return {
            fields: {
              motivo: 'Informe o motivo para substituir a publicação vigente.',
            },
          };
        const r = validarEntradaPublicacaoCalculo(motivo ? { motivo } : {});
        return r.valido
          ? undefined
          : {
              fields: Object.fromEntries(
                r.erros.map((e) => [e.field, e.message]),
              ),
            };
      },
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        const motivo = value.motivo.trim();
        await onPublicar(motivo ? { motivo } : {});
        formApi.reset();
      } catch {
        /* Erro apresentado pela página. */
      }
    },
  });
  useProtecaoFormulario(form);
  return (
    <form
      className="space-y-3 rounded-[9px] border p-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(pending) => (
          <fieldset disabled={pending} className="space-y-3">
            <form.AppField name="motivo">
              {(f) => (
                <f.Input
                  label={
                    substitui ? 'Motivo da substituição' : 'Motivo (opcional)'
                  }
                  required={substitui}
                  maxLength={LIMITES_CALCULO.motivo}
                  description={
                    substitui
                      ? 'A publicação vigente desta pergunta passa a substituída e continua consultável.'
                      : 'Primeira publicação desta pergunta.'
                  }
                />
              )}
            </form.AppField>
            <Button type="submit" disabled={pending}>
              {pending ? 'Publicando…' : 'Publicar resultados'}
            </Button>
          </fieldset>
        )}
      </form.Subscribe>
    </form>
  );
}

/** Resultados, linhagem dos insumos e ações da execução selecionada. */
export function DetalheCalculo({
  execucao,
  podePublicar,
  podeRetomar,
  existePublicada,
  retomando,
  onRetomar,
  onPublicar,
}: {
  execucao: ExecucaoCalculoDetalhe;
  podePublicar: boolean;
  podeRetomar: boolean;
  /** Outra execução da mesma pergunta está publicada: publicar exige motivo. */
  existePublicada: boolean;
  retomando: boolean;
  onRetomar: () => void;
  onPublicar: (entrada: EntradaPublicacaoCalculo) => Promise<unknown>;
}) {
  const { insumos } = execucao;
  const publicavel =
    execucao.situacao === 'concluido' && execucao.publicacao === 'calculado';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <BadgeSituacao situacao={execucao.situacao} />
        <BadgePublicacao publicacao={execucao.publicacao} />
        <Badge cor="cinza">Fórmula v{execucao.versaoFormula}</Badge>
        {execucao.revisao !== null && (
          <Badge cor="cinza">Revisão {execucao.revisao}</Badge>
        )}
      </div>
      {execucao.insumosAtuais === 'alterados' && (
        <p
          role="status"
          className="rounded-[9px] bg-warning p-3 text-sm text-warning-foreground"
        >
          Os insumos mudaram desde este cálculo (respostas, inventário,
          parâmetros ou RHC). Recalcule para gerar nova revisão.
        </p>
      )}
      {execucao.motivo && (
        <p className="text-sm">
          <span className="font-medium">Motivo do cálculo:</span>{' '}
          {execucao.motivo}
        </p>
      )}
      {execucao.motivoPublicacao && (
        <p className="text-sm">
          <span className="font-medium">Motivo da publicação:</span>{' '}
          {execucao.motivoPublicacao}
        </p>
      )}
      {execucao.substituidaPorId !== null && (
        <p className="text-sm text-muted-foreground">
          Substituída pela execução {execucao.substituidaPorId}.
        </p>
      )}
      {execucao.erro && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive">
            {execucao.erro}
          </p>
          {podeRetomar && execucao.situacao === 'falhou' && (
            <Button variant="outline" onClick={onRetomar} disabled={retomando}>
              {retomando ? 'Retomando…' : 'Retomar cálculo'}
            </Button>
          )}
        </div>
      )}

      {execucao.resultados.length > 0 && (
        <section aria-label="Resultados" className="space-y-2">
          <h3 className="font-semibold">Resultados</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Indicador</th>
                <th className="py-1 pr-2 font-medium">Recorte</th>
                <th className="py-1 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {execucao.resultados.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-1 pr-2">{r.nome}</td>
                  <td className="py-1 pr-2">
                    {r.recorte === 'total' ? 'Total' : r.recorte}
                  </td>
                  <td className="py-1">
                    <Valor valor={r.valor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section aria-label="Insumos" className="space-y-2">
        <h3 className="font-semibold">Insumos congelados</h3>
        <p className="text-sm text-muted-foreground">
          {insumos.periodo.rotulo} ({insumos.periodo.dataInicio} a{' '}
          {insumos.periodo.dataFim}, {insumos.periodo.diasPeriodo} dias) ·{' '}
          {insumos.pergunta.rotulo} · público{' '}
          {insumos.populacao === 'destinatarios'
            ? 'congelado na abertura'
            : 'elegível no momento do cálculo'}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 pr-2 font-medium">Meio</th>
              <th className="py-1 pr-2 font-medium">Capacidade</th>
              <th className="py-1 pr-2 font-medium">UH</th>
              <th className="py-1 font-medium">Taxa (%)</th>
            </tr>
          </thead>
          <tbody>
            {insumos.meios.map((m) => (
              <tr key={m.empreendimentoId} className="border-t">
                <td className="py-1 pr-2">{m.nomeFantasia}</td>
                <td className="py-1 pr-2">
                  {ROTULOS_CAPACIDADE[m.capacidade] ?? m.capacidade}
                </td>
                <td className="py-1 pr-2">{m.uhs ?? '—'}</td>
                <td className="py-1">{m.taxaOcupacao ?? 'Sem resposta'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="space-y-1 text-sm">
          <li>
            RHC: {ROTULOS_INSUMO[insumos.rhc.situacao]}
            {insumos.rhc.situacao === 'vigente' &&
              ` · ${insumos.rhc.qtdRhc} casas, ${insumos.rhc.leitos} leitos`}
          </li>
          {insumos.parametros.map((p) => (
            <li key={p.chave}>
              <span className="font-mono">{p.chave}</span>:{' '}
              {p.situacao === 'vigente' ? p.valor : ROTULOS_INSUMO[p.situacao]}
            </li>
          ))}
        </ul>
      </section>

      {podePublicar && publicavel && (
        <PublicacaoForm substitui={existePublicada} onPublicar={onPublicar} />
      )}
    </div>
  );
}
