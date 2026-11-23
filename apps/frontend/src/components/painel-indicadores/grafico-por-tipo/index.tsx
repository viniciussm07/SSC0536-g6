import { useMemo } from 'react';
import type { ItemPainel } from '@ssc0536/common';
import { Grafico } from '@/components/grafico';
import {
  lerPaleta,
  semAnimacao,
  type ChartConfiguration,
} from '@/utils/graficos';
import { ehMoeda, formatarValor, rotuloCurto } from '@/utils/painel';
import { itensPorCodigo } from '@/utils/painel-series';

/** Barras horizontais de um indicador por tipo no período, com o período base lado a lado quando há. */
export function GraficoPorTipo({
  itens,
  codigos,
  metodo,
  titulo,
  periodo,
  periodoBase,
}: {
  itens: readonly ItemPainel[];
  codigos: readonly string[];
  metodo?: string;
  /** Descrição para tecnologias assistivas, ex.: "Taxa de ocupação". */
  titulo: string;
  periodo: string;
  periodoBase: string | null;
}) {
  const lista = itensPorCodigo(itens, codigos, metodo);
  const unidade = lista[0]?.unidade ?? '';
  const moeda = ehMoeda(unidade);
  const config = useMemo<ChartConfiguration>(() => {
    const p = lerPaleta();
    const nomes = lista.map((i) => rotuloCurto(i));
    const atual = lista.map((i) =>
      i.valor.estado === 'disponivel' ? Number(i.valor.valor) : null,
    );
    const base = lista.map((i) =>
      i.comparacao?.estado === 'disponivel' ? Number(i.comparacao.valor) : null,
    );
    return {
      type: 'bar',
      data: {
        labels: nomes,
        datasets: [
          {
            label: periodo,
            data: atual,
            backgroundColor: p.series[0],
            borderRadius: 4,
          },
          ...(periodoBase
            ? [
                {
                  label: periodoBase,
                  data: base,
                  backgroundColor: p.series[3],
                  borderRadius: 4,
                },
              ]
            : []),
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: semAnimacao() ? false : undefined,
        font: { family: p.fonte },
        scales: {
          x: {
            min: 0,
            ...(moeda ? {} : { max: 100 }),
            ticks: {
              color: p.texto,
              callback: (v) =>
                moeda ? formatarValor(String(v), unidade) : `${v}%`,
            },
            grid: { color: p.grade },
          },
          y: { ticks: { color: p.texto }, grid: { display: false } },
        },
        plugins: {
          legend: {
            display: periodoBase !== null,
            position: 'bottom',
            labels: { color: p.texto },
          },
          tooltip: {
            callbacks: {
              label: (c) =>
                `${c.dataset.label}: ${formatarValor(String(c.parsed.x), unidade)}`,
            },
          },
        },
      },
    };
  }, [lista, periodo, periodoBase, moeda, unidade]);
  if (lista.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem dados de {titulo.toLowerCase()} por tipo em {periodo}.
      </p>
    );
  return (
    <Grafico
      config={config}
      className="h-72"
      rotulo={`${titulo} em ${periodo} por tipo de hospedagem. Os valores estão na tabela de indicadores.`}
    />
  );
}
