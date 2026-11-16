import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  CORES_COLETA,
  numeroDaCelula,
  rotuloEixoValor,
  textoDaCelula,
  type PeriodoPainel,
  type PontoComparado,
  type TipoColetaPainel,
} from '@/utils/indicadores';

/** Linha do tempo do recorte escolhido; ausência e conflito aparecem como lacuna. */
export function GraficoTendencia({
  serie,
  tipos,
  unidade,
  recorte,
}: {
  serie: readonly (PontoComparado & { periodo: PeriodoPainel })[];
  tipos: readonly TipoColetaPainel[];
  unidade: string;
  recorte: string;
}) {
  const dados = serie.map((p) => ({
    curto: p.periodo.curto,
    rotulo: p.periodo.rotulo,
    consolidado: numeroDaCelula(p.consolidado),
    expectativa: numeroDaCelula(p.expectativa),
    consolidadoTexto: textoDaCelula(p.consolidado, unidade),
    expectativaTexto: textoDaCelula(p.expectativa, unidade),
  }));
  const titulo = `Tendência — ${recorte} (${unidade})`;
  return (
    <figure className="space-y-3 rounded-[14px] border bg-card p-4">
      <figcaption className="space-y-1">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">
          {serie.length
            ? `${serie[0].periodo.rotulo} a ${serie.at(-1)?.periodo.rotulo}.`
            : 'Sem períodos nos filtros.'}{' '}
          Lacunas indicam período sem resultado.
        </p>
      </figcaption>
      <ChartContainer
        config={CORES_COLETA}
        className="aspect-auto h-72 w-full"
        role="img"
        aria-label={`${titulo}: ${dados
          .map(
            (d) =>
              `${d.rotulo}: ${tipos
                .map((t) => `${CORES_COLETA[t].label} ${d[`${t}Texto`]}`)
                .join(', ')}`,
          )
          .join('; ')}`}
      >
        <LineChart data={dados} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="curto" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => rotuloEixoValor(v, unidade)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  String(payload?.[0]?.payload?.rotulo ?? '')
                }
                formatter={(_, nome, item) =>
                  `${CORES_COLETA[nome as TipoColetaPainel]?.label ?? nome}: ${String(item.payload?.[`${String(nome)}Texto`] ?? '')}`
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {tipos.map((t) => (
            <Line
              key={t}
              dataKey={t}
              type="monotone"
              stroke={`var(--color-${t})`}
              strokeWidth={2.4}
              strokeDasharray={t === 'expectativa' ? '6 4' : undefined}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </figure>
  );
}
