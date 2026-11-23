import { useMemo } from 'react';
import type { SeriePainel } from '@ssc0536/common';
import { Grafico } from '@/components/grafico';
import {
  lerPaleta,
  semAnimacao,
  type ChartConfiguration,
} from '@/utils/graficos';
import { formatarValor } from '@/utils/painel';
import { seriesDiaria } from '@/utils/painel-series';

const ROTULOS: Record<string, string> = {
  diaria_media_ponderada: 'Diária média',
  revpar: 'RevPAR',
};

/** Diária média e RevPAR (preço ofertado) por período; o período selecionado ganha destaque. */
export function GraficoDiarias({
  serie,
  periodoId,
}: {
  serie: SeriePainel;
  periodoId: number;
}) {
  const series = seriesDiaria(serie);
  const config = useMemo<ChartConfiguration>(() => {
    const p = lerPaleta();
    const destaque = serie.periodos.findIndex((x) => x.id === periodoId);
    return {
      type: 'line',
      data: {
        labels: serie.periodos.map((x) => x.rotulo),
        datasets: series.map((s, i) => ({
          label: ROTULOS[s.codigo] ?? s.nome,
          data: s.pontos.map((x) =>
            x.valor === null ? null : Number(x.valor),
          ),
          borderColor: p.series[i],
          backgroundColor: p.series[i],
          borderWidth: 3,
          borderDash: i === 0 ? [] : [6, 4],
          pointStyle: i === 0 ? 'circle' : 'rect',
          pointRadius: serie.periodos.map((_, k) => (k === destaque ? 7 : 3.5)),
          tension: 0.25,
          spanGaps: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: semAnimacao() ? false : undefined,
        font: { family: p.fonte },
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: p.texto,
              callback: (v) => formatarValor(String(v), 'reais_por_diaria'),
            },
            grid: { color: p.grade },
          },
          x: {
            ticks: { color: p.texto, maxRotation: 45 },
            grid: { display: false },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: p.texto, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: (c) =>
                `${c.dataset.label}: ${formatarValor(String(c.parsed.y), 'reais_por_diaria')}`,
            },
          },
        },
      },
    };
  }, [serie, series, periodoId]);
  if (series.length === 0) return null;
  return (
    <Grafico
      config={config}
      className="h-72"
      rotulo={`Diária média e RevPAR por período, de ${serie.periodos[0]?.rotulo} a ${serie.periodos.at(-1)?.rotulo}. Preço ofertado, não faturamento. Os valores estão na tabela de evolução.`}
    />
  );
}
