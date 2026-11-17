import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import {
  CORES_COLETA,
  numeroDaCelula,
  rotuloTipoColeta,
  textoDaCelula,
  type PeriodoPainel,
  type PontoComparado,
  type TipoColetaPainel,
} from '@/utils/indicadores';

/** Valor de cada recorte (total, hotel, pousada, resort) para um tipo de coleta. */
export function GraficoRecortes({
  recortes,
  periodo,
  tipo,
  unidade,
}: {
  recortes: readonly (PontoComparado & { rotulo: string })[];
  periodo: PeriodoPainel;
  tipo: TipoColetaPainel;
  unidade: string;
}) {
  const dados = recortes.map((r) => ({
    rotulo: r.rotulo,
    valor: numeroDaCelula(r[tipo]),
    texto: textoDaCelula(r[tipo], unidade),
  }));
  const titulo = `Por recorte — ${rotuloTipoColeta(tipo)}, ${periodo.rotulo} (${unidade})`;
  return (
    <figure className="space-y-3 rounded-[14px] border bg-card p-4">
      <figcaption>
        <h2 className="text-lg font-bold">{titulo}</h2>
      </figcaption>
      <ChartContainer
        config={{ valor: CORES_COLETA[tipo] }}
        className="aspect-auto h-64 w-full"
        role="img"
        aria-label={`${titulo}: ${dados.map((d) => `${d.rotulo} ${d.texto}`).join('; ')}`}
      >
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ left: 4, right: 72, top: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            width={76}
          />
          <Bar
            dataKey="valor"
            fill="var(--color-valor)"
            radius={4}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="texto"
              position="right"
              className="fill-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
