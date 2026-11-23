import { useMemo } from 'react';
import type { SeriePainel } from '@ssc0536/common';
import { Grafico } from '@/components/grafico';
import { serieTuristas } from '@/utils/painel-series';
import {
  lerPaleta,
  semAnimacao,
  type ChartConfiguration,
} from '@/utils/graficos';

/** Colunas do total de turistas por período; o período selecionado usa a cor de destaque. */
export function GraficoTuristas({
  serie,
  periodoId,
}: {
  serie: SeriePainel;
  periodoId: number;
}) {
  const s = serieTuristas(serie);
  const config = useMemo<ChartConfiguration>(() => {
    const p = lerPaleta();
    return {
      type: 'bar',
      data: {
        labels: serie.periodos.map((x) => x.rotulo),
        datasets: [
          {
            label: 'Turistas',
            data: (s?.pontos ?? []).map((x) =>
              x.valor === null ? null : Number(x.valor),
            ),
            backgroundColor: serie.periodos.map((x) =>
              x.id === periodoId ? p.series[1] : p.series[0],
            ),
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
            beginAtZero: true,
            ticks: {
              color: p.texto,
              callback: (v) => Number(v).toLocaleString('pt-BR'),
            },
            grid: { color: p.grade },
          },
          x: {
            ticks: { color: p.texto, maxRotation: 45 },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) =>
                `Turistas: ${Number(c.parsed.y).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
            },
          },
        },
      },
    };
  }, [serie, s, periodoId]);
  if (!s) return null;
  return (
    <Grafico
      config={config}
      className="h-72"
      rotulo={`Total de turistas por período, de ${serie.periodos[0]?.rotulo} a ${serie.periodos.at(-1)?.rotulo}. Os valores estão na tabela de evolução.`}
    />
  );
}
