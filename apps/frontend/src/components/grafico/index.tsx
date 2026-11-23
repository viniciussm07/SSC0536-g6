import { useEffect, useRef } from 'react';
import { Chart, type ChartConfiguration } from '@/utils/graficos';
import { cn } from '@/utils/cn';

/**
 * Canvas do Chart.js. A configuração deve ser memoizada pelo chamador. O canvas é uma imagem
 * para tecnologias assistivas (`role="img"` com resumo): a mesma informação sempre existe em
 * uma tabela equivalente ao lado.
 */
export function Grafico({
  config,
  rotulo,
  className,
}: {
  config: ChartConfiguration;
  rotulo: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !canvas.getContext('2d')) return;
    const grafico = new Chart(canvas, config);
    return () => grafico.destroy();
  }, [config]);
  return (
    <div className={cn('relative h-64 w-full', className)}>
      <canvas ref={ref} role="img" aria-label={rotulo} />
    </div>
  );
}
