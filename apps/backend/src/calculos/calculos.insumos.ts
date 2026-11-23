import { createHash } from 'node:crypto';
import {
  INDICADORES_TABULACAO,
  RECORTE_TOTAL,
  calcularLeitosMedia,
  calcularTabulacaoOcupacao,
  type EntradaTabulacao,
  type InsumosCalculo,
  type MeioInsumo,
  type MetodoResultado,
  type ParametroInsumo,
  type ResultadoTabulacao,
  type RhcInsumo,
  type ValorIndicador,
} from '@ssc0536/common';

/**
 * Parâmetros escalares lidos de `ParametroCalculo`. As faixas de ocupação são uma lista e
 * não cabem no valor decimal do modelo atual: ficam fora e o indicador de faixas não é gravado.
 */
export const CHAVES_PARAMETROS_CALCULO = [
  'day_use.fator_hospedados',
  'day_use.percentual',
  'leitos_media.minimo_por_uh',
] as const;

/** Versão de inventário já filtrada (não substituída e conferida), em datas civis. */
export interface VersaoCapacidade {
  id: number;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  totalUh: number | null;
  leitos: number | null;
  maxLeitosPorUh: number | null;
}

export interface Intervalo {
  dataInicio: string;
  dataFim: string;
}

const cruza = (
  inicio: string,
  fim: string | null,
  periodo: Intervalo,
): boolean =>
  inicio <= periodo.dataFim && (fim === null || fim >= periodo.dataInicio);

const cobre = (
  inicio: string,
  fim: string | null,
  periodo: Intervalo,
): boolean =>
  inicio <= periodo.dataInicio && (fim === null || fim >= periodo.dataFim);

/**
 * Capacidade do meio no período. Vale só uma versão que cubra o período inteiro; capacidade
 * que muda dentro dele (troca de versão, entrada ou saída no meio do período) fica
 * indisponível até a regra de segmentação temporal ser homologada. Nunca escolhe a mais recente.
 */
export function capacidadeNoPeriodo(
  versoes: readonly VersaoCapacidade[],
  periodo: Intervalo,
): Pick<
  MeioInsumo,
  'capacidade' | 'inventarioVersaoIds' | 'uhs' | 'leitos' | 'maxLeitosPorUh'
> {
  const cruzam = versoes
    .filter((v) => cruza(v.vigenciaInicio, v.vigenciaFim, periodo))
    .sort((a, b) => a.id - b.id);
  const vazio = { uhs: null, leitos: null, maxLeitosPorUh: null };
  if (cruzam.length === 0)
    return { capacidade: 'ausente', inventarioVersaoIds: [], ...vazio };
  const [unica] = cruzam;
  if (
    cruzam.length === 1 &&
    cobre(unica.vigenciaInicio, unica.vigenciaFim, periodo)
  )
    return {
      capacidade: 'vigente',
      inventarioVersaoIds: [unica.id],
      uhs: unica.totalUh,
      leitos: unica.leitos,
      maxLeitosPorUh: unica.maxLeitosPorUh,
    };
  return {
    capacidade: 'varia_no_periodo',
    inventarioVersaoIds: cruzam.map((v) => v.id),
    ...vazio,
  };
}

export interface ParametroVigencia {
  id: number;
  chave: string;
  valor: string;
  vigenciaInicio: string;
  vigenciaFim: string | null;
}

/** Um único registro que cubra o período inteiro; valor que muda no período é ambíguo. */
export function parametroNoPeriodo(
  chave: string,
  parametros: readonly ParametroVigencia[],
  periodo: Intervalo,
): ParametroInsumo {
  const cruzam = parametros
    .filter(
      (p) =>
        p.chave === chave && cruza(p.vigenciaInicio, p.vigenciaFim, periodo),
    )
    .sort((a, b) => a.id - b.id);
  if (cruzam.length === 0)
    return { chave, situacao: 'ausente', parametroIds: [], valor: null };
  const [unico] = cruzam;
  if (
    cruzam.length === 1 &&
    cobre(unico.vigenciaInicio, unico.vigenciaFim, periodo)
  )
    return {
      chave,
      situacao: 'vigente',
      parametroIds: [unico.id],
      valor: unico.valor,
    };
  return {
    chave,
    situacao: 'ambiguo',
    parametroIds: cruzam.map((p) => p.id),
    valor: null,
  };
}

/**
 * RHC agregado do período. Mais de um registro é ambíguo: a regra de revisão/soma pertence à
 * parte 17 e não é decidida aqui.
 */
export function rhcNoPeriodo(
  linhas: readonly { id: number; qtdRhc: number; leitos: number }[],
): RhcInsumo {
  const ordenadas = [...linhas].sort((a, b) => a.id - b.id);
  if (ordenadas.length === 0)
    return {
      situacao: 'ausente',
      rhcPeriodoIds: [],
      qtdRhc: null,
      leitos: null,
    };
  if (ordenadas.length > 1)
    return {
      situacao: 'ambiguo',
      rhcPeriodoIds: ordenadas.map((r) => r.id),
      qtdRhc: null,
      leitos: null,
    };
  return {
    situacao: 'vigente',
    rhcPeriodoIds: [ordenadas[0].id],
    qtdRhc: ordenadas[0].qtdRhc,
    leitos: ordenadas[0].leitos,
  };
}

const valorParametro = (insumos: InsumosCalculo, chave: string) =>
  insumos.parametros.find((p) => p.chave === chave)?.valor ?? null;

const disponivel = (v: ValorIndicador) =>
  v.estado === 'disponivel' ? v.valor : null;

/**
 * Entrada da fórmula v1 (parte 15) a partir do retrato. Leitos média dos meios usam o máximo
 * por UH do inventário. Os do RHC ficam ausentes: `RhcPeriodo` não registra o máximo por
 * unidade, que na planilha é digitado (`MH!G88`).
 */
export function montarEntradaTabulacao(
  insumos: InsumosCalculo,
): EntradaTabulacao {
  const minimo = valorParametro(insumos, 'leitos_media.minimo_por_uh');
  return {
    diasPeriodo: insumos.periodo.diasPeriodo,
    meios: insumos.meios.map((m) => ({
      id: String(m.empreendimentoId),
      tipo: m.tipo,
      uhs: m.uhs,
      leitos: m.leitos,
      leitosMedia: disponivel(
        calcularLeitosMedia({
          uhs: m.uhs,
          leitosMinimoPorUh: minimo,
          leitosMaximoPorUh: m.maxLeitosPorUh,
        }),
      ),
      taxaOcupacao: m.taxaOcupacao,
    })),
    rhc:
      insumos.rhc.situacao === 'vigente'
        ? { leitos: insumos.rhc.leitos, leitosMedia: null }
        : null,
    parametros: {
      percentualDayUse: valorParametro(insumos, 'day_use.percentual'),
      fatorHospedadosDayUse: valorParametro(
        insumos,
        'day_use.fator_hospedados',
      ),
      faixasOcupacao: null,
    },
  };
}

export interface LinhaResultado {
  codigo: string;
  recorte: string;
  metodo: MetodoResultado;
  valor: ValorIndicador;
}

/** Indicadores gravados: os da tabulação (recorte total) e a ocupação por tipo. */
export function linhasDoResultado(r: ResultadoTabulacao): LinhaResultado[] {
  return [
    ...INDICADORES_TABULACAO.map(({ codigo }) => ({
      codigo,
      recorte: RECORTE_TOTAL,
      metodo: (codigo === 'taxa_ocupacao_uh'
        ? 'ponderada'
        : 'nao_se_aplica') as MetodoResultado,
      valor: r.indicadores[codigo],
    })),
    ...[...r.ocupacaoPorTipo]
      .sort((a, b) => a.tipo.localeCompare(b.tipo))
      .map((t) => ({
        codigo: 'taxa_ocupacao_tipo',
        recorte: t.tipo,
        metodo: 'ponderada' as MetodoResultado,
        valor: t.taxaOcupacao,
      })),
  ];
}

/** Calcula a partir do retrato; entrada inválida é falha, não resultado indisponível. */
export function calcularDoRetrato(
  insumos: InsumosCalculo,
): { ok: true; linhas: LinhaResultado[] } | { ok: false; erro: string } {
  const resultado = calcularTabulacaoOcupacao(montarEntradaTabulacao(insumos));
  if (resultado.erros.length)
    return {
      ok: false,
      erro: `Entrada inválida para a fórmula v${resultado.versaoFormula}: ${resultado.erros
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ')}`.slice(0, 2000),
    };
  return { ok: true, linhas: linhasDoResultado(resultado) };
}

/** JSON com chaves ordenadas: o mesmo retrato sempre gera o mesmo texto e o mesmo hash. */
export function serializarCanonico(valor: unknown): string {
  if (Array.isArray(valor))
    return `[${valor.map(serializarCanonico).join(',')}]`;
  if (valor !== null && typeof valor === 'object')
    return `{${Object.keys(valor)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${serializarCanonico((valor as Record<string, unknown>)[k])}`,
      )
      .join(',')}}`;
  return JSON.stringify(valor ?? null);
}

/**
 * Núcleo que define o resultado: sem rótulos (nome do empreendimento, título, rótulo do
 * período), que podem mudar sem alterar o cálculo e não devem marcar o resultado como alterado.
 */
export function nucleoCalculo(insumos: InsumosCalculo) {
  return {
    versaoFormula: insumos.versaoFormula,
    periodo: {
      id: insumos.periodo.id,
      dataInicio: insumos.periodo.dataInicio,
      dataFim: insumos.periodo.dataFim,
      diasPeriodo: insumos.periodo.diasPeriodo,
    },
    pesquisa: {
      id: insumos.pesquisa.id,
      tipoColeta: insumos.pesquisa.tipoColeta,
    },
    pergunta: { id: insumos.pergunta.id },
    populacao: insumos.populacao,
    meios: insumos.meios.map((m) => ({
      empreendimentoId: m.empreendimentoId,
      tipo: m.tipo,
      capacidade: m.capacidade,
      inventarioVersaoIds: m.inventarioVersaoIds,
      uhs: m.uhs,
      leitos: m.leitos,
      maxLeitosPorUh: m.maxLeitosPorUh,
      respostaId: m.respostaId,
      taxaOcupacao: m.taxaOcupacao,
    })),
    rhc: insumos.rhc,
    parametros: insumos.parametros,
  };
}

export const hashInsumos = (insumos: InsumosCalculo): string =>
  createHash('sha256')
    .update(serializarCanonico(nucleoCalculo(insumos)))
    .digest('hex');
