import { FUSO_OPERACIONAL, lerInstante } from '@ssc0536/common';

/**
 * America/Sao_Paulo não tem horário de verão desde 2019: o deslocamento operacional
 * é fixo em -03:00. Se isso mudar, a conversão passa a depender de tabela de fuso.
 */
const DESLOCAMENTO_OPERACIONAL = '-03:00';

/** Valor de `<input type="datetime-local">` interpretado no fuso operacional → ISO UTC. */
export function deEntradaLocal(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  return lerInstante(`${valor}:00${DESLOCAMENTO_OPERACIONAL}`);
}

/** ISO UTC → valor de `datetime-local` no fuso operacional (minutos). */
export function paraEntradaLocal(iso: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_OPERACIONAL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? '';
  return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`;
}

/** Instante para leitura humana, sempre no fuso operacional. */
export function formatarInstante(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_OPERACIONAL,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}
