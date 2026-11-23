import {
  INDICADORES_COMPLEMENTARES,
  INDICADORES_TABULACAO,
  calcularDiariaMedia,
  calcularLeitosMedia,
  calcularRevpar,
  calcularTabulacaoOcupacao,
  duracaoDias,
  type EntradaTabulacao,
  type MetodoResultado,
  type ValorIndicador,
} from '@ssc0536/common';
import { linhasDoResultado } from '../src/calculos/calculos.insumos';

/** Parâmetros lidos das planilhas (hipóteses pendentes de homologação; ver indicadores-referencia.json). */
export const PARAMETROS_APRESENTACAO = {
  minimoPorUh: '1',
  percentualDayUse: '15.15',
  fatorHospedadosDayUse: '1',
} as const;

/**
 * Feriados prolongados de 2026 (calendário para a sazonalidade). IDs fora da faixa dos
 * períodos mensais simulados; sem resultado associado.
 */
export const FERIADOS_APRESENTACAO = [
  ['Carnaval 2026', '2026-02-14', '2026-02-17'],
  ['Sexta-feira Santa 2026', '2026-04-03', '2026-04-05'],
  ['Tiradentes 2026', '2026-04-18', '2026-04-21'],
  ['Dia do Trabalho 2026', '2026-05-01', '2026-05-03'],
  ['Corpus Christi 2026', '2026-06-04', '2026-06-07'],
  ['Independência 2026', '2026-09-05', '2026-09-07'],
  ['Nossa Senhora Aparecida 2026', '2026-10-10', '2026-10-12'],
  ['Finados 2026', '2026-10-31', '2026-11-02'],
].map(([rotulo, inicio, fim], i) => ({
  id: 1_000_101 + i,
  tipo: 'feriado_prolongado',
  rotulo,
  dataInicio: new Date(`${inicio}T00:00:00.000Z`),
  dataFim: new Date(`${fim}T00:00:00.000Z`),
}));

/** Faixas de ocupação lidas de TABULAÇÃO!O5:R9 (hipótese pendente de homologação). */
export const FAIXAS_APRESENTACAO = [
  { codigo: 'excelente', minimo: '81', maximo: '100' },
  { codigo: 'otima', minimo: '61', maximo: '80.99' },
  { codigo: 'boa', minimo: '41', maximo: '60.99' },
  { codigo: 'regular', minimo: '21', maximo: '40.99' },
  { codigo: 'ruim', minimo: '0', maximo: '20.99' },
];

export const DEFINICOES_APRESENTACAO = [
  ...INDICADORES_TABULACAO,
  ...INDICADORES_COMPLEMENTARES,
];

interface DadosIndicadores {
  empreendimentos: {
    id: number;
    categoriaIndicador: string;
    situacao: string;
  }[];
  inventarios: {
    empreendimentoId: number;
    vigenciaInicio: string;
    vigenciaFim?: string | null;
    totalUh: number;
    leitos: number;
    maxLeitosPorUh: number;
  }[];
  periodos: { id: number; dataInicio: string; dataFim: string }[];
  pesquisas: { id: number; tipoColeta: string }[];
  perguntas: { id: number; pesquisaId: number; periodoId: number }[];
  respostas: { id: number; pesquisaId: number; empreendimentoId: number }[];
  coletasDiarias: {
    empreendimentoId: number;
    periodoId: number;
    valorDiaria: string;
  }[];
  respostaItens: {
    respostaId: number;
    perguntaId: number;
    valorNumerico?: string | null;
  }[];
}

export interface ResultadoApresentacao {
  periodoId: number;
  tipoColeta: string;
  codigo: string;
  recorte: string;
  metodo: MetodoResultado;
  valor: ValorIndicador;
}

const dia = (iso: string) => iso.slice(0, 10);

/**
 * RHC simulado por período (agregado, sem cadastro das casas): 14 a 16 residências com
 * 5 leitos cada, apenas para a apresentação. Determinístico pela ordem dos períodos.
 */
export function rhcApresentacao(periodos: { id: number }[]) {
  return periodos.map((p, i) => {
    const qtdRhc = 14 + (i % 3);
    return { periodoId: p.id, qtdRhc, leitos: qtdRhc * 5 };
  });
}

/**
 * Calcula os indicadores de cada edição da massa simulada com as fórmulas v1 do common, sobre
 * as respostas e os inventários já carregados. Nada é digitado: os números saem das fórmulas.
 * A capacidade de cada meio é a versão que cobre o período inteiro; sem ela o meio fica sem
 * capacidade e os totais ficam indisponíveis (nunca zero).
 */
export function calcularIndicadoresApresentacao(
  d: DadosIndicadores,
): ResultadoApresentacao[] {
  const periodos = new Map(d.periodos.map((p) => [p.id, p]));
  const pesquisas = new Map(d.pesquisas.map((p) => [p.id, p]));
  const ativos = d.empreendimentos.filter((e) => e.situacao === 'ativo');
  const rhc = new Map(rhcApresentacao(d.periodos).map((r) => [r.periodoId, r]));
  const saida: ResultadoApresentacao[] = [];

  for (const pergunta of d.perguntas) {
    const periodo = periodos.get(pergunta.periodoId);
    const pesquisa = pesquisas.get(pergunta.pesquisaId);
    if (!periodo || !pesquisa) continue;
    const inicio = dia(periodo.dataInicio);
    const fim = dia(periodo.dataFim);
    const taxas = new Map<number, string>();
    for (const item of d.respostaItens) {
      if (item.perguntaId !== pergunta.id || item.valorNumerico == null)
        continue;
      const resposta = d.respostas.find((r) => r.id === item.respostaId);
      if (resposta) taxas.set(resposta.empreendimentoId, item.valorNumerico);
    }
    const entrada: EntradaTabulacao = {
      diasPeriodo: duracaoDias(inicio, fim),
      meios: ativos.map((e) => {
        const versao = d.inventarios.find(
          (v) =>
            v.empreendimentoId === e.id &&
            dia(v.vigenciaInicio) <= inicio &&
            (v.vigenciaFim == null || dia(v.vigenciaFim) >= fim),
        );
        const media = versao
          ? calcularLeitosMedia({
              uhs: versao.totalUh,
              leitosMinimoPorUh: PARAMETROS_APRESENTACAO.minimoPorUh,
              leitosMaximoPorUh: versao.maxLeitosPorUh,
            })
          : null;
        return {
          id: String(e.id),
          tipo: e.categoriaIndicador,
          uhs: versao?.totalUh ?? null,
          leitos: versao?.leitos ?? null,
          leitosMedia: media?.estado === 'disponivel' ? media.valor : null,
          taxaOcupacao: taxas.get(e.id) ?? null,
        };
      }),
      rhc: {
        leitos: rhc.get(periodo.id)?.leitos ?? null,
        // Máximo por unidade digitado na planilha (MH!G88); aqui, 5 leitos simulados por casa.
        leitosMedia: String((rhc.get(periodo.id)?.qtdRhc ?? 0) * 3),
      },
      parametros: {
        percentualDayUse: PARAMETROS_APRESENTACAO.percentualDayUse,
        fatorHospedadosDayUse: PARAMETROS_APRESENTACAO.fatorHospedadosDayUse,
        faixasOcupacao: FAIXAS_APRESENTACAO,
      },
    };
    const resultado = calcularTabulacaoOcupacao(entrada);
    if (resultado.erros.length)
      throw new Error(
        `Entrada inválida em ${inicio}: ${resultado.erros.map((e) => e.field).join(', ')}`,
      );
    for (const linha of linhasDoResultado(resultado))
      saida.push({
        periodoId: periodo.id,
        tipoColeta: pesquisa.tipoColeta,
        ...linha,
      });
    // Faixas: uma linha por faixa (recorte = código da faixa) com o percentual de meios e de leitos.
    if (resultado.faixasOcupacao.estado === 'disponivel')
      for (const f of resultado.faixasOcupacao.faixas) {
        const base = {
          periodoId: periodo.id,
          tipoColeta: pesquisa.tipoColeta,
          recorte: f.codigo,
          metodo: 'nao_se_aplica' as const,
        };
        saida.push(
          {
            ...base,
            codigo: 'faixa_ocupacao_meios',
            valor: { estado: 'disponivel', valor: f.percentualMeios },
          },
          {
            ...base,
            codigo: 'faixa_ocupacao_leitos',
            valor: f.percentualLeitos,
          },
        );
      }
  }
  return [...saida, ...calcularDiariasApresentacao(d, saida)];
}

const arred = (valor: ValorIndicador) =>
  valor.estado === 'disponivel' ? valor.valor : null;

/**
 * Diária média (aritmética e ponderada por leitos) e RevPAR por período e recorte (total e
 * tipo de hospedagem), sobre as coletas de diária simuladas. Preço ofertado, não faturamento.
 * O RevPAR usa a diária ponderada e a taxa de ocupação do mesmo recorte e período; período
 * sem taxa (sem pesquisa de ocupação) fica com RevPAR indisponível, nunca zero.
 */
export function calcularDiariasApresentacao(
  d: DadosIndicadores,
  ocupacao: ResultadoApresentacao[],
): ResultadoApresentacao[] {
  const ativos = d.empreendimentos.filter((e) => e.situacao === 'ativo');
  const saida: ResultadoApresentacao[] = [];
  const periodos = [...new Set(d.coletasDiarias.map((c) => c.periodoId))].sort(
    (a, b) => a - b,
  );
  for (const periodoId of periodos) {
    const periodo = d.periodos.find((p) => p.id === periodoId);
    if (!periodo) continue;
    const inicio = dia(periodo.dataInicio);
    const fim = dia(periodo.dataFim);
    const meios = ativos.map((e) => {
      const versao = d.inventarios.find(
        (v) =>
          v.empreendimentoId === e.id &&
          dia(v.vigenciaInicio) <= inicio &&
          (v.vigenciaFim == null || dia(v.vigenciaFim) >= fim),
      );
      return {
        tipo: e.categoriaIndicador,
        item: {
          id: String(e.id),
          leitos: versao?.leitos ?? null,
          diarias: d.coletasDiarias
            .filter(
              (c) => c.empreendimentoId === e.id && c.periodoId === periodoId,
            )
            .map((c) => c.valorDiaria),
        },
      };
    });
    const tipos = [
      ...new Set(
        meios.filter((m) => m.item.diarias.length > 0).map((m) => m.tipo),
      ),
    ].sort();
    for (const recorte of ['total', ...tipos]) {
      const r = calcularDiariaMedia({
        empreendimentos: meios
          .filter((m) => recorte === 'total' || m.tipo === recorte)
          .map((m) => m.item),
      });
      const taxa = ocupacao.find(
        (o) =>
          o.periodoId === periodoId &&
          o.recorte === recorte &&
          o.codigo ===
            (recorte === 'total' ? 'taxa_ocupacao_uh' : 'taxa_ocupacao_tipo'),
      );
      const base = { periodoId, tipoColeta: 'consolidado', recorte };
      saida.push(
        {
          ...base,
          codigo: 'diaria_media_aritmetica',
          metodo: 'nao_se_aplica',
          valor: r.aritmetica,
        },
        {
          ...base,
          codigo: 'diaria_media_ponderada',
          metodo: 'ponderada',
          valor: r.ponderada,
        },
        {
          ...base,
          codigo: 'revpar',
          metodo: 'ponderada',
          valor: calcularRevpar({
            diariaMedia: arred(r.ponderada),
            taxaOcupacao: taxa ? arred(taxa.valor) : null,
          }),
        },
      );
    }
  }
  return saida;
}
