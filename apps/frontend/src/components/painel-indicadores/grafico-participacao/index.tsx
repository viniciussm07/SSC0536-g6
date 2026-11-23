import { useMemo } from 'react';
import type { ParticipacaoPainel } from '@ssc0536/common';
import { Grafico } from '@/components/grafico';
import {
  lerPaleta,
  semAnimacao,
  type ChartConfiguration,
} from '@/utils/graficos';

const percentual = (resp: number, dest: number) =>
  dest === 0 ? null : (resp / dest) * 100;
const pct = (v: number | null) =>
  v === null
    ? '—'
    : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Meios convidados × meios que responderam, por edição. Só contagens agregadas. */
export function GraficoParticipacao({
  participacao,
}: {
  participacao: ParticipacaoPainel;
}) {
  const { edicoes } = participacao;
  const config = useMemo<ChartConfiguration>(() => {
    const p = lerPaleta();
    return {
      type: 'bar',
      data: {
        labels: edicoes.map((e) => e.periodo),
        datasets: [
          {
            label: 'Convidados',
            data: edicoes.map((e) => e.destinatarios),
            backgroundColor: p.series[3],
            borderRadius: 4,
          },
          {
            label: 'Responderam',
            data: edicoes.map((e) => e.respondentes),
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
            beginAtZero: true,
            ticks: { color: p.texto, precision: 0 },
            grid: { color: p.grade },
          },
          x: {
            ticks: { color: p.texto, maxRotation: 45 },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: p.texto } },
          tooltip: {
            callbacks: {
              afterBody: (itens) => {
                const e = edicoes[itens[0].dataIndex];
                return `Participação: ${pct(percentual(e.respondentes, e.destinatarios))}`;
              },
            },
          },
        },
      },
    };
  }, [edicoes]);
  if (edicoes.length === 0) return null;
  return (
    <div className="space-y-3">
      <Grafico
        config={config}
        className="h-56"
        rotulo={`Meios convidados e meios que responderam em ${edicoes.length} edições, de ${edicoes[0].periodo} a ${edicoes.at(-1)!.periodo}. Os valores estão na tabela de participação.`}
      />
      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-semibold">
          Participação em tabela
        </summary>
        <div
          className="mt-2 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Participação da pesquisa por edição"
        >
          <table className="w-full min-w-[24rem]">
            <caption className="sr-only">
              Participação da pesquisa por edição
            </caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Período
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Convidados
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Responderam
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Participação
                </th>
              </tr>
            </thead>
            <tbody>
              {edicoes.map((e) => (
                <tr key={e.pesquisaId} className="border-b last:border-0">
                  <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                    {e.periodo}
                  </th>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {e.destinatarios}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {e.respondentes}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {pct(percentual(e.respondentes, e.destinatarios))}
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
