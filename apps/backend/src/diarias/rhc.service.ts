import { Injectable } from '@nestjs/common';
import {
  ESQUEMA_RHC_PERIODOS,
  type AlteracaoRhcPeriodo,
  type EntradaRhcPeriodo,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import { naoEncontrado } from '../acesso/acesso.errors';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import { rhcJaConferido } from './diarias.errors';
import { travarPorChave } from './diarias.locks';
import { MAPA_RHC_PERIODOS } from './diarias.odata';
import { incluirRhc, paraRhc, type RhcBanco } from './diarias.leitura';

type Tx = Prisma.TransactionClient;

@Injectable()
export class RhcService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  colecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_RHC_PERIODOS,
      mapa: MAPA_RHC_PERIODOS,
      escopo: [],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.rhcPeriodo.findMany({
          where,
          orderBy,
          skip,
          take,
          include: incluirRhc,
        }),
      contar: (where, db) => db.rhcPeriodo.count({ where }),
      mapear: (row) => paraRhc(row as RhcBanco),
    });
  }

  async detalhe(id: number) {
    const row = await this.prisma.rhcPeriodo.findUnique({
      where: { id },
      include: incluirRhc,
    });
    if (!row) throw naoEncontrado();
    return paraRhc(row);
  }

  private async conferirPeriodo(tx: Tx, periodoId: number) {
    const periodo = await tx.periodo.findUnique({
      where: { id: periodoId },
      select: { id: true },
    });
    if (!periodo)
      throw entradaInvalidaCampos([
        { field: 'periodoId', message: 'Período inexistente.' },
      ]);
  }

  private async conferirConferidoUnico(
    tx: Tx,
    periodoId: number,
    ignorarId?: number,
  ) {
    const outro = await tx.rhcPeriodo.findFirst({
      where: {
        periodoId,
        situacaoConferencia: 'conferida',
        ...(ignorarId === undefined ? {} : { id: { not: ignorarId } }),
      },
      select: { id: true },
    });
    if (outro) throw rhcJaConferido();
  }

  private auditar(
    tx: Tx,
    atual: ContextoAcesso,
    entidadeId: number,
    acao: 'criar' | 'alterar',
    antes: unknown,
    depois: unknown,
  ) {
    return registrarAuditoria(tx, {
      usuarioId: atual.usuario.id,
      entidade: 'rhc_periodo',
      entidadeId,
      acao,
      antes,
      depois,
    });
  }

  async criar(contexto: ContextoAcesso, entrada: EntradaRhcPeriodo) {
    return this.autorizacao.executar(
      contexto,
      'calculos',
      'criar',
      async (tx, atual) => {
        await this.conferirPeriodo(tx, entrada.periodoId);
        const criado = await tx.rhcPeriodo.create({
          data: {
            periodoId: entrada.periodoId,
            qtdRhc: entrada.qtdRhc,
            leitos: entrada.leitos,
            origem: 'manual',
            situacaoConferencia: 'pendente',
            revisao: 1,
            observacao: entrada.observacao ?? null,
          },
          include: incluirRhc,
        });
        const depois = paraRhc(criado);
        await this.auditar(tx, atual, criado.id, 'criar', undefined, depois);
        return depois;
      },
    );
  }

  async alterar(
    contexto: ContextoAcesso,
    id: number,
    alteracao: AlteracaoRhcPeriodo,
  ) {
    return this.autorizacao.executar(
      contexto,
      'calculos',
      'alterar',
      async (tx, atual) => {
        await tx.$queryRaw`SELECT id FROM rhc_periodo WHERE id = ${id} FOR UPDATE`;
        const antes = await tx.rhcPeriodo.findUnique({
          where: { id },
          include: incluirRhc,
        });
        if (!antes) throw naoEncontrado();

        const periodoId = alteracao.periodoId ?? antes.periodoId;
        if (periodoId !== antes.periodoId)
          await this.conferirPeriodo(tx, periodoId);
        const negocioMudou =
          periodoId !== antes.periodoId ||
          (alteracao.qtdRhc !== undefined &&
            alteracao.qtdRhc !== antes.qtdRhc) ||
          (alteracao.leitos !== undefined && alteracao.leitos !== antes.leitos);
        const observacaoMudou =
          alteracao.observacao !== undefined &&
          alteracao.observacao !== antes.observacao;
        const situacaoAnterior = antes.situacaoConferencia;
        const invalidouConferencia = negocioMudou || observacaoMudou;
        const situacao = invalidouConferencia
          ? 'pendente'
          : (alteracao.situacaoConferencia ?? situacaoAnterior);
        if (situacao === 'conferida') {
          await travarPorChave(tx, `rhc-periodo:${periodoId}`);
          await this.conferirConferidoUnico(tx, periodoId, id);
        }
        const conferida = situacao === 'conferida' || situacao === 'divergente';
        const mantemConferencia =
          conferida &&
          situacao === situacaoAnterior &&
          alteracao.situacaoConferencia === undefined;
        const conferidoEm = conferida
          ? mantemConferencia
            ? antes.conferidoEm
            : new Date()
          : null;
        const conferidoPorUsuarioId = conferida
          ? mantemConferencia
            ? antes.conferidoPorUsuarioId
            : atual.usuario.id
          : null;
        const semMudanca =
          !negocioMudou &&
          !observacaoMudou &&
          situacao === situacaoAnterior &&
          (alteracao.situacaoConferencia === undefined ||
            alteracao.situacaoConferencia === situacaoAnterior);
        if (!semMudanca) {
          await tx.rhcPeriodo.update({
            where: { id },
            data: {
              periodoId,
              qtdRhc: alteracao.qtdRhc ?? antes.qtdRhc,
              leitos: alteracao.leitos ?? antes.leitos,
              observacao:
                alteracao.observacao === undefined
                  ? antes.observacao
                  : alteracao.observacao,
              revisao: negocioMudou ? antes.revisao + 1 : antes.revisao,
              situacaoConferencia: situacao,
              conferidoEm,
              conferidoPorUsuarioId,
            },
          });
        }
        const depois = await tx.rhcPeriodo.findUniqueOrThrow({
          where: { id },
          include: incluirRhc,
        });
        if (!semMudanca)
          await this.auditar(
            tx,
            atual,
            id,
            'alterar',
            paraRhc(antes),
            paraRhc(depois),
          );
        return paraRhc(depois);
      },
    );
  }
}
