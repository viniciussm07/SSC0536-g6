import { useMemo } from 'react';
import type { SeriePainel } from '@ssc0536/common';
import { Grafico } from '@/components/grafico';
import {
  lerPaleta,
  semAnimacao,
  type ChartConfiguration,
} from '@/utils/graficos';
import { rotuloCurto } from '@/utils/painel';
import { seriesEvolucao } from '@/utils/painel-series';

const PONTOS = ['circle', 'rect', 'triangle', 'rectRot'] as const;
const TRACOS = [[], [6, 4], [2, 3], [10, 3, 2, 3]];

/** Linhas da taxa de ocupação por período; o período selecionado ganha um ponto maior. */
export function GraficoEvolucao({
  serie,
  periodoId,
}: {
  serie: SeriePainel;
  periodoId: number;
}) {
  const series = seriesEvolucao(serie);
  const config = useMemo<ChartConfiguration>(() => {
    const p = lerPaleta();
    const destaque = serie.periodos.findIndex((x) => x.id === periodoId);
    return {
      type: 'line',
      data: {
        labels: serie.periodos.map((x) => x.rotulo),
        datasets: series.map((s, i) => ({
          label: rotuloCurto(s),
          data: s.pontos.map((x) =>
            x.valor === null ? null : Number(x.valor),
          ),
          borderColor: p.series[i % p.series.length],
          backgroundColor: p.series[i % p.series.length],
          borderWidth: s.recorte === 'total' ? 3 : 2,
          borderDash: TRACOS[i % TRACOS.length],
          pointStyle: PONTOS[i % PONTOS.length],
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
            min: 0,
            max: 100,
            ticks: { color: p.texto, callback: (v) => `${v}%` },
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
                `${c.dataset.label}: ${c.parsed.y.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`,
            },
          },
        },
      },
    };
  }, [serie, series, periodoId]);
  if (series.length === 0) return null;
  const resumo = `Evolução da taxa de ocupação em ${serie.periodos.length} períodos, de ${serie.periodos[0]?.rotulo} a ${serie.periodos.at(-1)?.rotulo}. Os valores estão na tabela de evolução.`;
  return <Grafico config={config} rotulo={resumo} className="h-72" />;
}
