import { Injectable } from '@nestjs/common';
import {
  LIMITE_PERIODOS_SERIE,
  PAINEL_AVISO_METODOLOGIA,
  PREFIXO_COBERTURA,
  type ComparacaoPainel,
  type ConsultaPainel,
  type FontePainel,
  type ItemPainel,
  type MotivoIndisponibilidade,
  type OpcaoPainel,
  type ParticipacaoPainel,
  type SerieIndicador,
  type SeriePainel,
  type Painel,
  type PeriodoPainel,
  type TipoColeta,
  type ValorPainel,
} from '@ssc0536/common';
import { Prisma } from '../generated/prisma/client';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import { escopoIndicadoresConsumo } from '../acesso/indicadores.escopo';
import { PrismaService } from '../prisma/prisma.service';
import { dataCivil } from '../periodos/periodos.leitura';
import {
  periodoPainelNaoEncontrado,
  periodosIncompativeis,
} from './painel.errors';

const incluir = {
  definicao: { select: { id: true, codigo: true, nome: true, unidade: true } },
  execucao: { select: { id: true, revisao: true, publicadaEm: true } },
} satisfies Prisma.IndicadorResultadoInclude;
type ResultadoLido = Prisma.IndicadorResultadoGetPayload<{
  include: typeof incluir;
}>;

const chave = (r: ResultadoLido) => `${r.definicaoId}|${r.recorte}|${r.metodo}`;

function fonteDe(r: ResultadoLido): FontePainel {
  return {
    origem: r.execucao === null ? 'carga' : 'calculo',
    execucaoId: r.execucao?.id ?? null,
    revisao: r.execucao?.revisao ?? null,
    publicadaEm: r.execucao?.publicadaEm?.toISOString() ?? null,
    calculadoEm: r.calculadoEm.toISOString(),
  };
}

function valorDe(r: ResultadoLido): ValorPainel {
  if (r.valor === null || r.estado !== 'disponivel')
    return {
      estado: 'indisponivel',
      motivo: (r.motivoIndisponibilidade ??
        'dado_ausente') as MotivoIndisponibilidade,
      detalhe: r.detalheIndisponibilidade,
    };
  return { estado: 'disponivel', valor: r.valor.toString() };
}

function paraPeriodo(p: {
  id: number;
  rotulo: string;
  tipo: string;
  dataInicio: Date;
  dataFim: Date;
}): PeriodoPainel {
  return {
    id: p.id,
    rotulo: p.rotulo,
    tipo: p.tipo,
    dataInicio: dataCivil(p.dataInicio),
    dataFim: dataCivil(p.dataFim),
  };
}

/**
 * Camada de consumo dos indicadores (parte 18). Só lê resultados já calculados e publicados
 * (ou de carga); nenhuma fórmula é recalculada aqui. A única conta é a variação entre
 * períodos, em decimal exato.
 */
@Injectable()
export class PainelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  /** Seleções (período + coleta) que têm resultado visível ao perfil, do mais recente ao mais antigo. */
  async opcoes(contexto: ContextoAcesso): Promise<OpcaoPainel[]> {
    await this.autorizacao.exigir(contexto, 'indicadores', 'consultar');
    const linhas = await this.prisma.indicadorResultado.findMany({
      where: escopoIndicadoresConsumo(contexto.usuario.perfil, true),
      distinct: ['periodoId', 'tipoColeta'],
      select: {
        periodoId: true,
        tipoColeta: true,
        periodo: { select: { rotulo: true, tipo: true, dataInicio: true } },
      },
    });
    return linhas
      .sort(
        (a, b) =>
          b.periodo.dataInicio.getTime() - a.periodo.dataInicio.getTime() ||
          a.tipoColeta.localeCompare(b.tipoColeta),
      )
      .map((l) => ({
        periodoId: l.periodoId,
        periodo: l.periodo.rotulo,
        periodoTipo: l.periodo.tipo,
        tipoColeta: l.tipoColeta as TipoColeta,
      }));
  }

  /**
   * Evolução dos indicadores visíveis ao perfil nos períodos mais recentes da coleta.
   * Ponto sem resultado publicado ou indisponível vem como `null`, nunca como zero.
   */
  async serie(
    contexto: ContextoAcesso,
    tipoColeta: TipoColeta,
  ): Promise<SeriePainel> {
    await this.autorizacao.exigir(contexto, 'indicadores', 'consultar');
    const linhas = await this.prisma.indicadorResultado.findMany({
      where: {
        AND: [
          escopoIndicadoresConsumo(contexto.usuario.perfil, true),
          { tipoColeta },
        ],
      },
      include: {
        ...incluir,
        periodo: true,
      },
      orderBy: [{ definicaoId: 'asc' }, { recorte: 'asc' }, { id: 'asc' }],
    });
    const periodos = new Map<number, PeriodoPainel & { _t: number }>();
    for (const l of linhas)
      periodos.set(l.periodoId, {
        ...paraPeriodo(l.periodo),
        _t: l.periodo.dataInicio.getTime(),
      });
    const recentes = [...periodos.values()]
      .sort((a, b) => a._t - b._t)
      .slice(-LIMITE_PERIODOS_SERIE)
      .map((p) => ({
        id: p.id,
        rotulo: p.rotulo,
        tipo: p.tipo,
        dataInicio: p.dataInicio,
        dataFim: p.dataFim,
      }));
    const ids = new Set(recentes.map((p) => p.id));
    const grupos = new Map<
      string,
      { base: ResultadoLido; valores: Map<number, string | null> }
    >();
    for (const l of linhas) {
      if (!ids.has(l.periodoId)) continue;
      const g = grupos.get(chave(l)) ?? { base: l, valores: new Map() };
      // Último resultado por período (maior id) vence, como no painel.
      g.valores.set(
        l.periodoId,
        l.valor !== null && l.estado === 'disponivel'
          ? l.valor.toString()
          : null,
      );
      grupos.set(chave(l), g);
    }
    const series: SerieIndicador[] = [...grupos.values()].map(
      ({ base, valores }) => ({
        indicadorId: base.definicaoId,
        codigo: base.definicao.codigo,
        nome: base.definicao.nome,
        unidade: base.definicao.unidade,
        recorte: base.recorte,
        metodo: base.metodo,
        pontos: recentes.map((p) => ({
          periodoId: p.id,
          valor: valores.get(p.id) ?? null,
        })),
      }),
    );
    // Feriados prolongados no intervalo dos períodos: calendário, sem resultado associado.
    const feriados =
      recentes.length === 0
        ? []
        : (
            await this.prisma.periodo.findMany({
              where: {
                tipo: 'feriado_prolongado',
                dataFim: {
                  gte: new Date(`${recentes[0].dataInicio}T00:00:00Z`),
                },
                dataInicio: {
                  lte: new Date(`${recentes.at(-1)!.dataFim}T00:00:00Z`),
                },
              },
              orderBy: { dataInicio: 'asc' },
            })
          ).map(paraPeriodo);
    return { tipoColeta, periodos: recentes, series, feriados };
  }

  /**
   * Participação por edição: meios convidados (público congelado na abertura) e meios que
   * responderam. Só contagens; sem nomes nem respostas.
   */
  async participacao(
    contexto: ContextoAcesso,
    tipoColeta: TipoColeta,
  ): Promise<ParticipacaoPainel> {
    await this.autorizacao.exigir(contexto, 'pesquisas', 'consultar');
    const pesquisas = await this.prisma.pesquisa.findMany({
      where: { tipoColeta, status: { not: 'rascunho' } },
      select: {
        id: true,
        _count: { select: { destinatarios: true } },
        perguntas: {
          select: {
            periodo: { select: { id: true, rotulo: true, dataInicio: true } },
          },
          take: 1,
        },
        respostas: { select: { empreendimentoId: true } },
      },
    });
    const edicoes = pesquisas
      .flatMap((p) => {
        const periodo = p.perguntas[0]?.periodo;
        if (!periodo) return [];
        return [
          {
            pesquisaId: p.id,
            periodoId: periodo.id,
            periodo: periodo.rotulo,
            dataInicio: dataCivil(periodo.dataInicio),
            destinatarios: p._count.destinatarios,
            respondentes: new Set(p.respostas.map((r) => r.empreendimentoId))
              .size,
          },
        ];
      })
      .sort(
        (a, b) =>
          a.dataInicio.localeCompare(b.dataInicio) ||
          a.pesquisaId - b.pesquisaId,
      )
      .slice(-LIMITE_PERIODOS_SERIE);
    return { tipoColeta, edicoes };
  }

  async painel(
    contexto: ContextoAcesso,
    consulta: ConsultaPainel,
  ): Promise<Painel> {
    await this.autorizacao.exigir(contexto, 'indicadores', 'consultar');
    const perfil = contexto.usuario.perfil;
    const periodo = await this.periodo(consulta.periodoId, 'periodoId');
    let comparacao: PeriodoPainel | null = null;
    if (consulta.comparacaoPeriodoId !== undefined) {
      comparacao = await this.periodo(
        consulta.comparacaoPeriodoId,
        'comparacaoPeriodoId',
      );
      if (comparacao.tipo !== periodo.tipo) throw periodosIncompativeis();
    }
    const atuais = await this.resultados(
      perfil,
      periodo.id,
      consulta.tipoColeta,
    );
    const base =
      comparacao === null
        ? null
        : new Map(
            (
              await this.resultados(perfil, comparacao.id, consulta.tipoColeta)
            ).map((r) => [chave(r), r]),
          );

    const itens: ItemPainel[] = atuais.map((r) => ({
      indicadorId: r.definicaoId,
      codigo: r.definicao.codigo,
      nome: r.definicao.nome,
      unidade: r.definicao.unidade,
      grupo: r.definicao.codigo.startsWith(PREFIXO_COBERTURA)
        ? 'cobertura'
        : 'indicador',
      recorte: r.recorte,
      metodo: r.metodo,
      valor: valorDe(r),
      fonte: fonteDe(r),
      comparacao: base === null ? null : comparar(r, base.get(chave(r))),
    }));

    const atualizadoEm = atuais.reduce<string | null>((maior, r) => {
      const t = r.calculadoEm.toISOString();
      return maior === null || t > maior ? t : maior;
    }, null);
    return {
      periodo,
      tipoColeta: consulta.tipoColeta,
      comparacao,
      situacao:
        itens.length > 0
          ? 'disponivel'
          : (await this.haCalculoPendente(periodo.id, consulta.tipoColeta))
            ? 'calculo_pendente'
            : 'sem_dados',
      itens,
      atualizadoEm,
      aviso: PAINEL_AVISO_METODOLOGIA,
    };
  }

  private async periodo(id: number, campo: string): Promise<PeriodoPainel> {
    const p = await this.prisma.periodo.findUnique({ where: { id } });
    if (p === null) throw periodoPainelNaoEncontrado(campo);
    return paraPeriodo(p);
  }

  /** Um resultado por indicador/recorte/método: a execução publicada mais recente vence a carga. */
  private async resultados(
    perfil: string,
    periodoId: number,
    tipoColeta: string,
  ): Promise<ResultadoLido[]> {
    const linhas = await this.prisma.indicadorResultado.findMany({
      where: {
        AND: [
          escopoIndicadoresConsumo(perfil, true),
          { periodoId, tipoColeta },
        ],
      },
      include: incluir,
      orderBy: [{ definicaoId: 'asc' }, { recorte: 'asc' }, { id: 'asc' }],
    });
    const unicos = new Map<string, ResultadoLido>();
    for (const r of linhas) unicos.set(chave(r), r);
    return [...unicos.values()];
  }

  private async haCalculoPendente(periodoId: number, tipoColeta: string) {
    const n = await this.prisma.calculoExecucao.count({
      where: {
        periodoId,
        tipoColeta,
        publicacao: 'calculado',
        situacao: { in: ['pendente', 'executando', 'concluido'] },
      },
    });
    return n > 0;
  }
}

function comparar(
  atual: ResultadoLido,
  base: ResultadoLido | undefined,
): ComparacaoPainel {
  if (base === undefined) return { estado: 'ausente' };
  if (
    atual.valor === null ||
    base.valor === null ||
    atual.estado !== 'disponivel' ||
    base.estado !== 'disponivel'
  )
    return { estado: 'indisponivel' };
  return {
    estado: 'disponivel',
    valor: base.valor.toString(),
    variacao: atual.valor.minus(base.valor).toString(),
    fonte: fonteDe(base),
  };
}
