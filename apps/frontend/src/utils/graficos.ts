import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

/** Cores do tema OTO (tokens `--chart-*` e superfícies), lidas do CSS para seguir claro/escuro. */
export interface PaletaGraficos {
  series: string[];
  /** Rampa das faixas de ocupação, da mais alta à mais baixa. */
  faixas: string[];
  texto: string;
  grade: string;
  fundo: string;
  fonte: string;
}

const PADRAO: PaletaGraficos = {
  series: ['#007bb6', '#ff7a00', '#005578', '#7a8594'],
  faixas: ['#005578', '#007bb6', '#70b9dc', '#ffa14d', '#c25e00'],
  texto: '#5a6472',
  grade: '#e4e8ee',
  fundo: '#ffffff',
  fonte: 'Roboto, ui-sans-serif, system-ui, sans-serif',
};

export function lerPaleta(): PaletaGraficos {
  if (typeof document === 'undefined') return PADRAO;
  const css = getComputedStyle(document.documentElement);
  const v = (nome: string, padrao: string) =>
    css.getPropertyValue(nome).trim() || padrao;
  return {
    series: PADRAO.series.map((cor, i) => v(`--chart-${i + 1}`, cor)),
    faixas: PADRAO.faixas.map((cor, i) => v(`--faixa-${i + 1}`, cor)),
    texto: v('--muted-foreground', PADRAO.texto),
    grade: v('--border', PADRAO.grade),
    fundo: v('--card', PADRAO.fundo),
    fonte: v('--font-sans', PADRAO.fonte),
  };
}

/** Quem prefere menos movimento não recebe animação nos gráficos. */
export const semAnimacao = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export { Chart };
export type { ChartConfiguration } from 'chart.js';
