import { useMemo } from 'react';
import type { ItemPainel } from '@ssc0536/common';
import { Grafico } from '@/components/grafico';
import {
  lerPaleta,
  semAnimacao,
  type ChartConfiguration,
} from '@/utils/graficos';
import { FAIXAS_OCUPACAO } from '@/utils/painel-series';

const valorDe = (
  itens: readonly ItemPainel[],
  codigo: string,
  faixa: string,
) => {
  const i = itens.find((x) => x.codigo === codigo && x.recorte === faixa);
  return i?.valor.estado === 'disponivel' ? Number(i.valor.valor) : null;
};

/** Barras empilhadas: proporção de meios e de leitos respondentes em cada faixa de ocupação. */
export function GraficoFaixas({
  itens,
  periodo,
}: {
  itens: readonly ItemPainel[];
  periodo: string;
}) {
  const config = useMemo<ChartConfiguration>(() => {
    const p = lerPaleta();
    return {
      type: 'bar',
      data: {
        labels: ['Meios', 'Leitos'],
        datasets: FAIXAS_OCUPACAO.map(([codigo, rotulo], i) => ({
          label: rotulo,
          data: [
            valorDe(itens, 'faixa_ocupacao_meios', codigo),
            valorDe(itens, 'faixa_ocupacao_leitos', codigo),
          ],
          backgroundColor: p.faixas[i],
          borderColor: p.fundo,
          borderWidth: 1,
        })),
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: semAnimacao() ? false : undefined,
        font: { family: p.fonte },
        scales: {
          x: {
            stacked: true,
            min: 0,
            max: 100,
            ticks: { color: p.texto, callback: (v) => `${v}%` },
            grid: { color: p.grade },
          },
          y: {
            stacked: true,
            ticks: { color: p.texto },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: p.texto } },
          tooltip: {
            callbacks: {
              label: (c) =>
                `${c.dataset.label}: ${Number(c.parsed.x).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
            },
          },
        },
      },
    };
  }, [itens]);
  return (
    <Grafico
      config={config}
      className="h-56"
      rotulo={`Distribuição dos meios e dos leitos respondentes por faixa de ocupação em ${periodo}. Os valores estão na tabela de indicadores.`}
    />
  );
}
