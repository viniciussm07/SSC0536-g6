import {
  TIPOS_COLETA_PAINEL,
  formatarDataCivil,
  textoDaCelula,
  type PeriodoPainel,
  type PontoComparado,
} from '@/utils/indicadores';

/** Destaques do período de referência no recorte escolhido, como no protótipo do painel. */
export function ResumoReferencia({
  ponto,
  periodo,
  recorte,
  unidade,
}: {
  ponto: PontoComparado | undefined;
  periodo: PeriodoPainel;
  recorte: string;
  unidade: string;
}) {
  return (
    <dl
      aria-label={`Destaques de ${periodo.rotulo}`}
      className="grid gap-4 sm:grid-cols-2"
    >
      {TIPOS_COLETA_PAINEL.map((t, i) => (
        <div
          key={t.valor}
          className={
            i === 0
              ? 'rounded-[14px] bg-primary p-4 text-primary-foreground'
              : 'rounded-[14px] border bg-card p-4'
          }
        >
          <dt className="text-sm font-semibold">
            {t.rotulo} — {recorte}
          </dt>
          <dd className="font-heading text-3xl font-extrabold">
            {ponto ? textoDaCelula(ponto[t.valor], unidade) : 'sem dado'}
          </dd>
          <dd className="text-sm opacity-90">
            {periodo.rotulo} · {formatarDataCivil(periodo.inicio)} a{' '}
            {formatarDataCivil(periodo.fim)} · unidade {unidade}
          </dd>
        </div>
      ))}
    </dl>
  );
}
