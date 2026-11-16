import { Injectable } from '@nestjs/common';
import {
  ESQUEMA_PERIODOS,
  validarAlteracaoPeriodo,
  type EntradaPeriodo,
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
import { periodoDuplicado, periodoEmUso } from './periodos.errors';
import { dataCivil, paraDetalhe, paraLinha } from './periodos.leitura';
import { MAPA_PERIODOS } from './periodos.odata';

type Tx = Prisma.TransactionClient;

@Injectable()
export class PeriodosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  colecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_PERIODOS,
      mapa: MAPA_PERIODOS,
      escopo: [],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.periodo.findMany({ where, orderBy, skip, take }),
      contar: (where, db) => db.periodo.count({ where }),
      mapear: paraLinha,
    });
  }

  async detalhe(id: number) {
    const row = await this.prisma.periodo.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            perguntas: true,
            coletasDiarias: true,
            resultados: true,
            rhc: true,
          },
        },
      },
    });
    if (!row) throw naoEncontrado();
    return paraDetalhe(row);
  }

  private async duplicado(
    tx: Tx,
    tipo: string,
    dataInicio: Date,
    dataFim: Date,
    ignorarId?: number,
  ): Promise<boolean> {
    const existente = await tx.periodo.findFirst({
      where: {
        tipo,
        dataInicio,
        dataFim,
        ...(ignorarId === undefined ? {} : { id: { not: ignorarId } }),
      },
      select: { id: true },
    });
    return existente !== null;
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
      entidade: 'periodo',
      entidadeId,
      acao,
      antes,
      depois,
    });
  }

  async criar(contexto: ContextoAcesso, entrada: EntradaPeriodo) {
    return this.autorizacao.executar(
      contexto,
      'pesquisas',
      'criar',
      async (tx, atual) => {
        const dataInicio = new Date(`${entrada.dataInicio}T00:00:00Z`);
        const dataFim = new Date(`${entrada.dataFim}T00:00:00Z`);
        if (await this.duplicado(tx, entrada.tipo, dataInicio, dataFim))
          throw periodoDuplicado();
        const criado = await tx.periodo.create({
          data: {
            tipo: entrada.tipo,
            rotulo: entrada.rotulo,
            dataInicio,
            dataFim,
          },
        });
        const depois = {
          tipo: criado.tipo,
          rotulo: criado.rotulo,
          dataInicio: dataCivil(criado.dataInicio),
          dataFim: dataCivil(criado.dataFim),
        };
        await this.auditar(tx, atual, criado.id, 'criar', undefined, depois);
        return paraLinha(criado);
      },
    );
  }

  async alterar(contexto: ContextoAcesso, id: number, corpo: unknown) {
    return this.autorizacao.executar(
      contexto,
      'pesquisas',
      'alterar',
      async (tx, atual) => {
        await tx.$queryRaw`SELECT id FROM periodo WHERE id = ${id} FOR UPDATE`;
        const antes = await tx.periodo.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                perguntas: true,
                coletasDiarias: true,
                resultados: true,
                rhc: true,
              },
            },
          },
        });
        if (!antes) throw naoEncontrado();
        const entrada = validarAlteracaoPeriodo(corpo, {
          tipo: antes.tipo,
          dataInicio: dataCivil(antes.dataInicio),
          dataFim: dataCivil(antes.dataFim),
        });
        if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
        const alteracao = entrada.data;
        const emUso =
          antes._count.perguntas +
            antes._count.coletasDiarias +
            antes._count.resultados +
            antes._count.rhc >
          0;
        const mexeEmIdentidade =
          alteracao.tipo !== undefined ||
          alteracao.dataInicio !== undefined ||
          alteracao.dataFim !== undefined;
        if (emUso && mexeEmIdentidade) throw periodoEmUso();
        const dataInicio =
          alteracao.dataInicio === undefined
            ? antes.dataInicio
            : new Date(`${alteracao.dataInicio}T00:00:00Z`);
        const dataFim =
          alteracao.dataFim === undefined
            ? antes.dataFim
            : new Date(`${alteracao.dataFim}T00:00:00Z`);
        const tipo = alteracao.tipo ?? antes.tipo;
        const rotulo = alteracao.rotulo ?? antes.rotulo;
        const mudou =
          tipo !== antes.tipo ||
          rotulo !== antes.rotulo ||
          dataInicio.getTime() !== antes.dataInicio.getTime() ||
          dataFim.getTime() !== antes.dataFim.getTime();
        if (!mudou) return paraDetalhe(antes);
        if (
          mexeEmIdentidade &&
          (await this.duplicado(tx, tipo, dataInicio, dataFim, id))
        )
          throw periodoDuplicado();
        const atualizado = await tx.periodo.update({
          where: { id },
          data: { tipo, rotulo, dataInicio, dataFim },
          include: {
            _count: {
              select: {
                perguntas: true,
                coletasDiarias: true,
                resultados: true,
                rhc: true,
              },
            },
          },
        });
        await this.auditar(
          tx,
          atual,
          id,
          'alterar',
          {
            tipo: antes.tipo,
            rotulo: antes.rotulo,
            dataInicio: dataCivil(antes.dataInicio),
            dataFim: dataCivil(antes.dataFim),
          },
          {
            tipo,
            rotulo,
            dataInicio: dataCivil(dataInicio),
            dataFim: dataCivil(dataFim),
          },
        );
        return paraDetalhe(atualizado);
      },
    );
  }
}
