import { useMemo } from 'react';
import type { SeriePainel } from '@ssc0536/common';
import { Grafico } from '@/components/grafico';
import {
  lerPaleta,
  semAnimacao,
  type ChartConfiguration,
} from '@/utils/graficos';
import { feriadosDoMes, serieOcupacaoTotal } from '@/utils/painel-series';

const fmt = (n: number) =>
  `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/**
 * Ocupação por mês, com os meses que têm feriado prolongado em destaque. Mostra o padrão de
 * sazonalidade (alta e baixa) sem inventar causa: só cruza o calendário com o resultado.
 */
export function GraficoSazonalidade({ serie }: { serie: SeriePainel }) {
  const ocupacao = serieOcupacaoTotal(serie);
  const meses = serie.periodos.flatMap((p, i) => {
    if (p.tipo !== 'mes') return [];
    const v = ocupacao?.pontos[i]?.valor ?? null;
    return [
      {
        periodo: p,
        valor: v === null ? null : Number(v),
        feriados: feriadosDoMes(p, serie.feriados),
      },
    ];
  });
  const config = useMemo<ChartConfiguration>(() => {
    const p = lerPaleta();
    return {
      type: 'bar',
      data: {
        labels: meses.map((m) => m.periodo.rotulo),
        datasets: [
          {
            label: 'Mês com feriado prolongado',
            data: meses.map((m) => (m.feriados.length > 0 ? m.valor : null)),
            backgroundColor: p.series[1],
            borderRadius: 4,
          },
          {
            label: 'Mês sem feriado prolongado',
            data: meses.map((m) => (m.feriados.length === 0 ? m.valor : null)),
            backgroundColor: p.series[0],
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: semAnimacao() ? false : undefined,
        font: { family: p.fonte },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { color: p.texto, callback: (v) => `${v}%` },
            grid: { color: p.grade },
          },
          x: {
            stacked: true,
            ticks: { color: p.texto, maxRotation: 45 },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: p.texto } },
          tooltip: {
            callbacks: {
              label: (c) => `Ocupação: ${fmt(Number(c.parsed.y))}`,
              afterLabel: (c) =>
                meses[c.dataIndex].feriados.map((f) => f.rotulo).join(', '),
            },
          },
        },
      },
    };
  }, [meses]);

  const comValor = meses.filter(
    (m): m is typeof m & { valor: number } => m.valor !== null,
  );
  if (comValor.length < 2) return null;
  const alta = comValor.reduce((a, b) => (b.valor > a.valor ? b : a));
  const baixa = comValor.reduce((a, b) => (b.valor < a.valor ? b : a));
  const media = (xs: number[]) =>
    xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
  const mediaCom = media(
    comValor.filter((m) => m.feriados.length > 0).map((m) => m.valor),
  );
  const mediaSem = media(
    comValor.filter((m) => m.feriados.length === 0).map((m) => m.valor),
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Maior ocupação: <strong>{alta.periodo.rotulo}</strong> (
        {fmt(alta.valor)}). Menor: <strong>{baixa.periodo.rotulo}</strong> (
        {fmt(baixa.valor)}).
        {mediaCom !== null &&
          mediaSem !== null &&
          ` Média dos meses com feriado prolongado: ${fmt(mediaCom)}; sem feriado: ${fmt(mediaSem)}.`}
      </p>
      <Grafico
        config={config}
        className="h-64"
        rotulo={`Taxa de ocupação por mês, de ${meses[0].periodo.rotulo} a ${meses.at(-1)!.periodo.rotulo}, com os meses de feriado prolongado destacados. Maior ocupação em ${alta.periodo.rotulo}, menor em ${baixa.periodo.rotulo}.`}
      />
      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-semibold">
          Sazonalidade em tabela
        </summary>
        <div
          className="mt-2 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Ocupação por mês e feriados prolongados"
        >
          <table className="w-full min-w-[24rem]">
            <caption className="sr-only">
              Ocupação por mês e feriados prolongados
            </caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Mês
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Ocupação
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Feriados prolongados
                </th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m.periodo.id} className="border-b last:border-0">
                  <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                    {m.periodo.rotulo}
                  </th>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {m.valor === null ? '—' : fmt(m.valor)}
                  </td>
                  <td className="py-1.5">
                    {m.feriados.length === 0
                      ? 'Nenhum'
                      : m.feriados.map((f) => f.rotulo).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
