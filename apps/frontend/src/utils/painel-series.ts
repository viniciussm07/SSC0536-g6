import type { ItemPainel, SeriePainel } from '@ssc0536/common';

export const temFaixas = (itens: readonly ItemPainel[]) =>
  itens.some((i) => i.codigo === 'faixa_ocupacao_meios');

export const CODIGOS_EVOLUCAO = ['taxa_ocupacao_uh', 'taxa_ocupacao_tipo'];

/** Séries da evolução: a taxa total e a taxa por tipo de hospedagem. */
export const seriesEvolucao = (serie: SeriePainel) =>
  serie.series.filter(
    (s) =>
      CODIGOS_EVOLUCAO.includes(s.codigo) && s.unidade === 'percentual_0_100',
  );

/** Itens disponíveis do período para os códigos dados (total e por tipo). */
export const itensPorCodigo = (
  itens: readonly ItemPainel[],
  codigos: readonly string[],
  metodo?: string,
) =>
  itens.filter(
    (i) =>
      i.grupo === 'indicador' &&
      i.valor.estado === 'disponivel' &&
      codigos.includes(i.codigo) &&
      (metodo === undefined || i.metodo === metodo),
  );

export const CODIGOS_OCUPACAO = ['taxa_ocupacao_uh', 'taxa_ocupacao_tipo'];
export const CODIGOS_DIARIA = ['diaria_media_ponderada'];

/** Diária média e RevPAR ponderados do recorte total, por período. */
export const seriesDiaria = (serie: SeriePainel) =>
  serie.series.filter(
    (s) =>
      ['diaria_media_ponderada', 'revpar'].includes(s.codigo) &&
      s.recorte === 'total' &&
      s.metodo === 'ponderada',
  );

export const serieTuristas = (serie: SeriePainel) =>
  serie.series.find(
    (s) => s.codigo === 'turistas_total' && s.recorte === 'total',
  );

/** Faixas de ocupação, da mais alta à mais baixa, com o intervalo da hipótese das planilhas. */
export const FAIXAS_OCUPACAO = [
  ['excelente', 'Excelente (81–100%)'],
  ['otima', 'Ótima (61–80,99%)'],
  ['boa', 'Boa (41–60,99%)'],
  ['regular', 'Regular (21–40,99%)'],
  ['ruim', 'Baixa (até 20,99%)'],
] as const;

/** Mês cujo intervalo contém algum dia de feriado prolongado. */
export const feriadosDoMes = (
  periodo: { dataInicio: string; dataFim: string },
  feriados: SeriePainel['feriados'],
) =>
  feriados.filter(
    (f) => f.dataInicio <= periodo.dataFim && f.dataFim >= periodo.dataInicio,
  );

export const serieOcupacaoTotal = (serie: SeriePainel) =>
  serie.series.find(
    (s) => s.codigo === 'taxa_ocupacao_uh' && s.recorte === 'total',
  );
