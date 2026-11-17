import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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

/** Expectativa e consolidado lado a lado, por recorte, no mesmo período de referência. */
export function GraficoComparativo({
  recortes,
  periodo,
  unidade,
}: {
  recortes: readonly (PontoComparado & { rotulo: string })[];
  periodo: PeriodoPainel;
  unidade: string;
}) {
  const dados = recortes.map((r) => ({
    rotulo: r.rotulo,
    consolidado: numeroDaCelula(r.consolidado),
    expectativa: numeroDaCelula(r.expectativa),
    consolidadoTexto: textoDaCelula(r.consolidado, unidade),
    expectativaTexto: textoDaCelula(r.expectativa, unidade),
  }));
  const titulo = `Expectativa × Consolidado — ${periodo.rotulo} (${unidade})`;
  return (
    <figure className="space-y-3 rounded-[14px] border bg-card p-4">
      <figcaption className="space-y-1">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">
          Valores publicados de cada coleta; o painel não calcula a diferença.
        </p>
      </figcaption>
      <ChartContainer
        config={CORES_COLETA}
        className="aspect-auto h-64 w-full"
        role="img"
        aria-label={`${titulo}: ${dados
          .map(
            (d) =>
              `${d.rotulo}: expectativa ${d.expectativaTexto}, consolidado ${d.consolidadoTexto}`,
          )
          .join('; ')}`}
      >
        <BarChart data={dados} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => rotuloEixoValor(v, unidade)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(_, nome, item) =>
                  `${CORES_COLETA[nome as TipoColetaPainel]?.label ?? nome}: ${String(item.payload?.[`${String(nome)}Texto`] ?? '')}`
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {(['expectativa', 'consolidado'] as const).map((t) => (
            <Bar
              key={t}
              dataKey={t}
              fill={`var(--color-${t})`}
              radius={4}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
