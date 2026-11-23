import type { SeriePainel } from '@ssc0536/common';
import { formatarValor, nomeSerie } from '@/utils/painel';
import {
  serieTuristas,
  seriesDiaria,
  seriesEvolucao,
} from '@/utils/painel-series';

/** Tabela equivalente aos gráficos de evolução: um período por linha, uma série por coluna. */
export function TabelaSerie({ serie }: { serie: SeriePainel }) {
  const turistas = serieTuristas(serie);
  const colunas = [
    ...seriesEvolucao(serie),
    ...seriesDiaria(serie),
    ...(turistas ? [turistas] : []),
  ];
  if (colunas.length === 0) return null;
  return (
    <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Evolução em tabela
      </summary>
      <div
        className="mt-3 overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Evolução dos indicadores por período"
      >
        <table className="w-full min-w-[32rem] text-sm">
          <caption className="sr-only">
            Evolução dos indicadores por período
          </caption>
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Período
              </th>
              {colunas.map((c) => (
                <th
                  key={`${c.codigo}|${c.recorte}`}
                  scope="col"
                  className="py-2 pr-3 text-right font-semibold"
                >
                  {nomeSerie(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {serie.periodos.map((p, i) => (
              <tr key={p.id} className="border-b last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {p.rotulo}
                </th>
                {colunas.map((c) => {
                  const valor = c.pontos[i]?.valor ?? null;
                  return (
                    <td
                      key={`${c.codigo}|${c.recorte}`}
                      className="py-2 pr-3 text-right tabular-nums"
                    >
                      {valor === null ? '—' : formatarValor(valor, c.unidade)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
