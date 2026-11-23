import { Injectable, Logger } from '@nestjs/common';
import {
  ESQUEMA_CALCULOS,
  INDICADORES_COMPLEMENTARES,
  INDICADORES_TABULACAO,
  LIMITES_CALCULO,
  type EntradaExecucaoCalculo,
  type EntradaPublicacaoCalculo,
  type ExecucaoCalculoDetalhe,
  type InsumosCalculo,
  type SolicitacaoCalculo,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import {
  FalhaCalculo,
  calculoEmAndamento,
  calculoJaPublicado,
  calculoNaoConcluido,
  calculoNaoRetomavel,
  execucaoNaoEncontrada,
  motivoSubstituicaoObrigatorio,
} from './calculos.errors';
import { calcularDoRetrato, hashInsumos } from './calculos.insumos';
import {
  INCLUIR_LINHA,
  lerInsumos,
  paraDetalhe,
  paraLinha,
} from './calculos.leitura';
import { MAPA_CALCULOS } from './calculos.odata';

type Tx = Prisma.TransactionClient;

const ENTIDADE = 'calculo_execucao';
const DEFINICOES = [...INDICADORES_TABULACAO, ...INDICADORES_COMPLEMENTARES];

/** Conflitos de unicidade e de serialização viram 409: outra execução da mesma série venceu. */
const conflito = (erro: unknown) =>
  typeof erro === 'object' &&
  erro !== null &&
  'code' in erro &&
  ((erro as { code: unknown }).code === 'P2002' ||
    (erro as { code: unknown }).code === 'P2034');

/** Execução ativa sem progresso além do limite foi interrompida (processo caiu no meio). */
export const interrompida = (
  e: { situacao: string; solicitadaEm: Date; iniciadaEm: Date | null },
  agora: Date,
) =>
  (e.situacao === 'pendente' || e.situacao === 'executando') &&
  agora.getTime() - (e.iniciadaEm ?? e.solicitadaEm).getTime() >
    LIMITES_CALCULO.minutosExecucaoInterrompida * 60_000;

const INTERROMPIDA =
  'Execução interrompida antes da conclusão; nenhum resultado foi gravado.';

const INCLUIR_DETALHE = {
  ...INCLUIR_LINHA,
  resultados: {
    select: {
      id: true,
      definicaoId: true,
      recorte: true,
      metodo: true,
      valor: true,
      estado: true,
      motivoIndisponibilidade: true,
      detalheIndisponibilidade: true,
      definicao: { select: { codigo: true, nome: true, unidade: true } },
    },
  },
} as const;

/**
 * Cálculo, recálculo e publicação de indicadores (parte 16). Cada execução congela os
 * insumos de uma pergunta de taxa de ocupação; o cálculo usa só esse retrato e grava todos os
 * resultados de uma vez. Recálculo gera nova revisão; publicar substitui a versão de consumo
 * sem apagar a anterior.
 */
@Injectable()
export class CalculosService {
  private readonly log = new Logger(CalculosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  colecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_CALCULOS,
      mapa: MAPA_CALCULOS,
      escopo: [],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.calculoExecucao.findMany({
          where: where as Prisma.CalculoExecucaoWhereInput,
          orderBy: orderBy as Prisma.CalculoExecucaoOrderByWithRelationInput[],
          skip,
          take,
          include: INCLUIR_LINHA,
        }),
      contar: (where, db) =>
        db.calculoExecucao.count({
          where: where as Prisma.CalculoExecucaoWhereInput,
        }),
      mapear: paraLinha,
    });
  }

  /** Detalhe com resultados, linhagem congelada e comparação com os insumos atuais. */
  async detalhe(id: number): Promise<ExecucaoCalculoDetalhe> {
    const e = await this.prisma.calculoExecucao.findUnique({
      where: { id },
      include: INCLUIR_DETALHE,
    });
    if (!e) throw execucaoNaoEncontrada();
    let atuais: ExecucaoCalculoDetalhe['insumosAtuais'] = null;
    try {
      const lidos = await this.prisma.$transaction(
        (tx) => lerInsumos(tx, e.perguntaId),
        { isolationLevel: 'RepeatableRead' },
      );
      atuais =
        hashInsumos(lidos.insumos) === e.insumosHash ? 'iguais' : 'alterados';
    } catch (erro) {
      this.log.warn(
        `Insumos atuais da execução ${id} indisponíveis: ${String(erro)}`,
      );
    }
    return paraDetalhe(e, atuais);
  }

  /**
   * Congela os insumos (REPEATABLE READ) e processa. Insumos iguais aos da última revisão
   * concluída não criam nova execução: a revisão existente é devolvida.
   */
  async executar(
    contexto: ContextoAcesso,
    entrada: EntradaExecucaoCalculo,
  ): Promise<SolicitacaoCalculo> {
    let preparo: { id: number; usuarioId: number; reaproveitada: boolean };
    try {
      preparo = await this.autorizacao.executar(
        contexto,
        'calculos',
        'criar',
        async (tx, atual) => {
          const lidos = await lerInsumos(tx, entrada.perguntaId);
          const hash = hashInsumos(lidos.insumos);
          const ultima = await tx.calculoExecucao.findFirst({
            where: { perguntaId: entrada.perguntaId, situacao: 'concluido' },
            orderBy: { revisao: 'desc' },
            select: { id: true, insumosHash: true },
          });
          if (ultima?.insumosHash === hash)
            return {
              id: ultima.id,
              usuarioId: atual.usuario.id,
              reaproveitada: true,
            };
          await this.liberarInterrompida(tx, entrada.perguntaId, atual);
          const criada = await tx.calculoExecucao.create({
            data: {
              periodoId: lidos.insumos.periodo.id,
              tipoColeta: lidos.insumos.pesquisa.tipoColeta,
              pesquisaId: lidos.insumos.pesquisa.id,
              perguntaId: entrada.perguntaId,
              versaoFormula: lidos.insumos.versaoFormula,
              situacao: 'pendente',
              insumos: lidos.insumos as unknown as Prisma.InputJsonValue,
              insumosHash: hash,
              motivo: entrada.motivo ?? null,
              solicitadaPorId: atual.usuario.id,
              respostas: {
                create: lidos.respostaIds.map((respostaId) => ({ respostaId })),
              },
            },
            select: { id: true },
          });
          await registrarAuditoria(tx, {
            usuarioId: atual.usuario.id,
            entidade: ENTIDADE,
            entidadeId: criada.id,
            acao: 'criar',
            depois: {
              perguntaId: entrada.perguntaId,
              situacao: 'pendente',
              insumosHash: hash,
              motivo: entrada.motivo ?? null,
            },
          });
          return {
            id: criada.id,
            usuarioId: atual.usuario.id,
            reaproveitada: false,
          };
        },
        'RepeatableRead',
      );
    } catch (erro) {
      if (conflito(erro)) throw calculoEmAndamento();
      throw erro;
    }
    if (!preparo.reaproveitada)
      await this.processar(preparo.id, preparo.usuarioId);
    return {
      execucao: await this.detalhe(preparo.id),
      reaproveitada: preparo.reaproveitada,
    };
  }

  /** Retoma, a partir do mesmo retrato, uma execução que falhou ou foi interrompida. */
  async retomar(
    contexto: ContextoAcesso,
    id: number,
  ): Promise<ExecucaoCalculoDetalhe> {
    const usuarioId = await this.autorizacao.executar(
      contexto,
      'calculos',
      'criar',
      async (tx, atual) => {
        const [e] = await tx.$queryRaw<
          { situacao: string; solicitada_em: Date; iniciada_em: Date | null }[]
        >`SELECT situacao, solicitada_em, iniciada_em FROM calculo_execucao WHERE id = ${id} FOR UPDATE`;
        if (!e) throw execucaoNaoEncontrada();
        const parada = interrompida(
          {
            situacao: e.situacao,
            solicitadaEm: e.solicitada_em,
            iniciadaEm: e.iniciada_em,
          },
          new Date(),
        );
        if (e.situacao !== 'falhou' && !parada) throw calculoNaoRetomavel();
        if (parada)
          await this.marcarFalha(tx, id, INTERROMPIDA, atual.usuario.id);
        return atual.usuario.id;
      },
    );
    await this.processar(id, usuarioId);
    return this.detalhe(id);
  }

  /** Publica a execução como versão de consumo; a publicação anterior vira substituída. */
  async publicar(
    contexto: ContextoAcesso,
    id: number,
    entrada: EntradaPublicacaoCalculo,
  ): Promise<ExecucaoCalculoDetalhe> {
    await this.autorizacao.executar(
      contexto,
      'publicacoes',
      'publicar',
      async (tx, atual) => {
        const alvo = await tx.calculoExecucao.findUnique({
          where: { id },
          select: { perguntaId: true },
        });
        if (!alvo) throw execucaoNaoEncontrada();
        await this.travarSerie(tx, alvo.perguntaId);
        const e = await tx.calculoExecucao.findUniqueOrThrow({
          where: { id },
          select: { situacao: true, publicacao: true, revisao: true },
        });
        if (e.situacao !== 'concluido') throw calculoNaoConcluido();
        if (e.publicacao !== 'calculado') throw calculoJaPublicado();
        const vigente = await tx.calculoExecucao.findFirst({
          where: { perguntaId: alvo.perguntaId, publicacao: 'publicado' },
          select: { id: true, revisao: true },
        });
        if (vigente && entrada.motivo === undefined)
          throw motivoSubstituicaoObrigatorio();
        const agora = new Date();
        if (vigente) {
          await tx.calculoExecucao.update({
            where: { id: vigente.id },
            data: { publicacao: 'substituido', substituidaPorId: id },
          });
          await registrarAuditoria(tx, {
            usuarioId: atual.usuario.id,
            entidade: ENTIDADE,
            entidadeId: vigente.id,
            acao: 'alterar',
            antes: { publicacao: 'publicado' },
            depois: {
              publicacao: 'substituido',
              substituidaPorId: id,
              motivoPublicacao: entrada.motivo,
            },
          });
        }
        await tx.calculoExecucao.update({
          where: { id },
          data: {
            publicacao: 'publicado',
            publicadaEm: agora,
            publicadaPorId: atual.usuario.id,
            motivoPublicacao: entrada.motivo ?? null,
          },
        });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: ENTIDADE,
          entidadeId: id,
          acao: 'alterar',
          antes: { publicacao: 'calculado' },
          depois: {
            publicacao: 'publicado',
            revisao: e.revisao,
            substitui: vigente?.id ?? null,
            motivoPublicacao: entrada.motivo ?? null,
          },
        });
      },
    );
    return this.detalhe(id);
  }

  /** Serializa numeração de revisão e publicação da mesma série (pergunta). */
  private travarSerie(tx: Tx, perguntaId: number) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`calculo_execucao:${perguntaId}`}))`;
  }

  /** Execução ativa e parada há muito tempo é encerrada como falha antes de abrir outra. */
  private async liberarInterrompida(
    tx: Tx,
    perguntaId: number,
    atual: ContextoAcesso,
  ) {
    const ativa = await tx.calculoExecucao.findFirst({
      where: { perguntaId, situacao: { in: ['pendente', 'executando'] } },
      select: {
        id: true,
        situacao: true,
        solicitadaEm: true,
        iniciadaEm: true,
      },
    });
    if (!ativa) return;
    if (!interrompida(ativa, new Date())) throw calculoEmAndamento();
    await this.marcarFalha(tx, ativa.id, INTERROMPIDA, atual.usuario.id);
  }

  private async marcarFalha(
    tx: Tx,
    id: number,
    erro: string,
    usuarioId: number,
  ) {
    const antes = await tx.calculoExecucao.findUniqueOrThrow({
      where: { id },
      select: { situacao: true },
    });
    await tx.calculoExecucao.update({
      where: { id },
      data: { situacao: 'falhou', erro },
    });
    await registrarAuditoria(tx, {
      usuarioId,
      entidade: ENTIDADE,
      entidadeId: id,
      acao: 'alterar',
      antes: { situacao: antes.situacao },
      depois: { situacao: 'falhou', erro },
    });
  }

  /**
   * pendente/falhou → executando → concluido, ou falhou sem resultado algum. Resultados,
   * linhagem, revisão e conclusão são gravados na mesma transação.
   */
  async processar(id: number, usuarioId: number): Promise<void> {
    try {
      await this.prisma.calculoExecucao.update({
        where: { id },
        data: { situacao: 'executando', iniciadaEm: new Date(), erro: null },
      });
    } catch (erro) {
      // Outra execução da mesma pergunta ficou ativa entre a falha e a retomada.
      if (conflito(erro)) throw calculoEmAndamento();
      throw erro;
    }
    try {
      await this.prisma.$transaction((tx) => this.concluir(tx, id, usuarioId), {
        timeout: 30000,
      });
    } catch (erro) {
      const mensagem =
        erro instanceof FalhaCalculo
          ? erro.message
          : 'Falha inesperada no processamento; nenhum resultado foi gravado.';
      if (!(erro instanceof FalhaCalculo))
        this.log.error(`Execução ${id} falhou: ${String(erro)}`);
      await this.prisma.$transaction((tx) =>
        this.marcarFalha(tx, id, mensagem, usuarioId),
      );
    }
  }

  private async concluir(tx: Tx, id: number, usuarioId: number) {
    const e = await tx.calculoExecucao.findUniqueOrThrow({
      where: { id },
      select: {
        perguntaId: true,
        periodoId: true,
        tipoColeta: true,
        insumos: true,
      },
    });
    await this.travarSerie(tx, e.perguntaId);
    const insumos = e.insumos as unknown as InsumosCalculo;
    const calculo = calcularDoRetrato(insumos);
    if (!calculo.ok) throw new FalhaCalculo(calculo.erro);

    const definicoes = new Map<string, number>();
    for (const codigo of new Set(calculo.linhas.map((l) => l.codigo))) {
      definicoes.set(codigo, await this.definicao(tx, codigo, usuarioId));
    }
    const versoes = [
      ...new Set(insumos.meios.flatMap((m) => m.inventarioVersaoIds)),
    ].sort((a, b) => a - b);
    const parametros = [
      ...new Set(insumos.parametros.flatMap((p) => p.parametroIds)),
    ].sort((a, b) => a - b);
    const agora = new Date();
    for (const linha of calculo.linhas) {
      await tx.indicadorResultado.create({
        data: {
          definicaoId: definicoes.get(linha.codigo)!,
          periodoId: e.periodoId,
          tipoColeta: e.tipoColeta,
          recorte: linha.recorte,
          metodo: linha.metodo,
          valor: linha.valor.estado === 'disponivel' ? linha.valor.valor : null,
          estado: linha.valor.estado,
          motivoIndisponibilidade:
            linha.valor.estado === 'indisponivel' ? linha.valor.motivo : null,
          detalheIndisponibilidade:
            linha.valor.estado === 'indisponivel' ? linha.valor.detalhe : null,
          execucaoId: id,
          calculadoEm: agora,
          // Linhagem completa do retrato, inclusive quando o valor ficou indisponível.
          versoes: { create: versoes.map((versaoId) => ({ versaoId })) },
          parametros: {
            create: parametros.map((parametroId) => ({ parametroId })),
          },
        },
        select: { id: true },
      });
    }
    const ultima = await tx.calculoExecucao.aggregate({
      where: { perguntaId: e.perguntaId },
      _max: { revisao: true },
    });
    const revisao = (ultima._max.revisao ?? 0) + 1;
    await tx.calculoExecucao.update({
      where: { id },
      data: { situacao: 'concluido', revisao, concluidaEm: agora },
    });
    // Parte 09 sinaliza lotes cujas respostas mudaram; o recálculo concluído consome o sinal.
    await tx.importacaoLote.updateMany({
      where: { perguntaId: e.perguntaId, recalculoPendente: true },
      data: { recalculoPendente: false },
    });
    await registrarAuditoria(tx, {
      usuarioId,
      entidade: ENTIDADE,
      entidadeId: id,
      acao: 'alterar',
      antes: { situacao: 'executando' },
      depois: {
        situacao: 'concluido',
        revisao,
        resultados: calculo.linhas.length,
        disponiveis: calculo.linhas.filter(
          (l) => l.valor.estado === 'disponivel',
        ).length,
      },
    });
  }

  /** Definição do indicador pelo código da ficha v1; criada na primeira execução que a usa. */
  private async definicao(tx: Tx, codigo: string, usuarioId: number) {
    const existente = await tx.indicadorDefinicao.findUnique({
      where: { codigo },
      select: { id: true },
    });
    if (existente) return existente.id;
    // Duas séries podem criar a mesma definição ao mesmo tempo: serializa e confere de novo.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('indicador_definicao'))`;
    const criadaAntes = await tx.indicadorDefinicao.findUnique({
      where: { codigo },
      select: { id: true },
    });
    if (criadaAntes) return criadaAntes.id;
    const ficha = DEFINICOES.find((d) => d.codigo === codigo)!;
    const criada = await tx.indicadorDefinicao.create({
      data: {
        codigo,
        nome: ficha.nome,
        unidade: ficha.unidade,
        formulaDescricao: `Fórmula v${ficha.versaoFormula} transcrita de ${ficha.origem}; pendente de homologação do OTO.`,
        versaoFormula: ficha.versaoFormula,
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, {
      usuarioId,
      entidade: 'indicador_definicao',
      entidadeId: criada.id,
      acao: 'criar',
      depois: {
        codigo,
        nome: ficha.nome,
        unidade: ficha.unidade,
        versaoFormula: ficha.versaoFormula,
      },
    });
    return criada.id;
  }
}
