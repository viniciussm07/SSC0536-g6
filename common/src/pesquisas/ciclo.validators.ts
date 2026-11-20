import { FUSO_OPERACIONAL } from '../coleta/valor-coletado.constants.js';
import {
  type SituacaoPesquisa,
  type StatusPesquisa,
  type TipoColeta,
} from './edicao.constants.js';
import type { ErroCampo } from '../cadastro/cadastro.types.js';

/** Data civil (`YYYY-MM-DD`) de um instante no fuso indicado (padrão: operacional). */
export function dataNoFuso(
  instante: Date | string,
  fuso: string = FUSO_OPERACIONAL,
): string {
  const data = typeof instante === 'string' ? new Date(instante) : instante;
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

export interface EstadoCiclo {
  /** `StatusPesquisa`; valor desconhecido é tratado como encerrada (não recebe). */
  status: StatusPesquisa | (string & {});
  abertura: Date | string;
  prazo: Date | string;
}

const instante = (v: Date | string) =>
  typeof v === 'string' ? Date.parse(v) : v.getTime();

/**
 * Situação efetiva no relógio informado. O prazo é exclusivo: no instante do prazo a
 * edição já não recebe. Não depende de job agendado para expirar.
 */
export function situacaoPesquisa(
  estado: EstadoCiclo,
  agora: Date,
): SituacaoPesquisa {
  if (estado.status === 'rascunho') return 'rascunho';
  if (estado.status !== 'aberta') return 'encerrada';
  const t = agora.getTime();
  if (t < instante(estado.abertura)) return 'agendada';
  if (t >= instante(estado.prazo)) return 'expirada';
  return 'recebendo';
}

/** Só a situação `recebendo` aceita novos envios ou correções de respostas. */
export const recebeRespostas = (estado: EstadoCiclo, agora: Date): boolean =>
  situacaoPesquisa(estado, agora) === 'recebendo';

export interface PeriodoCiclo {
  id: number;
  rotulo?: string;
  dataInicio: string;
  dataFim: string;
}

/**
 * Compatibilidade proposta (pendente de confirmação do OTO), com datas no fuso operacional:
 * - expectativa: a coleta termina antes de o período acabar (`data(prazo) <= dataFim`);
 * - consolidado: o período já terminou na data do prazo (`dataFim < data(prazo)`).
 */
export function conferirPeriodosCompativeis(
  tipoColeta: TipoColeta,
  periodos: readonly PeriodoCiclo[],
  prazo: Date | string,
): ErroCampo[] {
  const diaPrazo = dataNoFuso(prazo);
  const erros: ErroCampo[] = [];
  for (const p of periodos) {
    const nome = p.rotulo ?? `#${p.id}`;
    if (tipoColeta === 'expectativa' && diaPrazo > p.dataFim)
      erros.push({
        field: 'periodoIds',
        message: `Expectativa exige prazo até o fim do período (${nome}).`,
      });
    if (tipoColeta === 'consolidado' && p.dataFim >= diaPrazo)
      erros.push({
        field: 'periodoIds',
        message: `Consolidado exige período encerrado antes da data do prazo (${nome}).`,
      });
  }
  return erros;
}
