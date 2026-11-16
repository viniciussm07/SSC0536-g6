import { Injectable } from '@nestjs/common';
import {
  ESQUEMA_AUDITORIAS,
  diferencasAuditoria,
  type EventoAuditoriaResumo,
  type EventoAuditoriaDetalhe,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import {
  acessoNegado,
  naoEncontrado,
  entradaInvalida,
} from '../acesso/acesso.errors';
import type { ContextoAcesso } from '../acesso/acesso.types';
import type { ConsultaColecao } from '../odata/odata.decorators';
import { executarColecao } from '../odata/colecao-odata';
import { MAPA_AUDITORIAS } from './auditoria.odata';
import { snapshotSeguro } from './snapshots';

const resumoSelect = {
  id: true,
  entidade: true,
  entidadeId: true,
  acao: true,
  em: true,
  usuarioId: true,
  autorNome: true,
  origem: true,
  processo: true,
  correlacaoId: true,
} as const;
type Linha = Prisma.AuditoriaGetPayload<{ select: typeof resumoSelect }>;
const resumo = (l: Linha): EventoAuditoriaResumo => ({
  id: l.id,
  entidade: l.entidade,
  entidadeId: l.entidadeId,
  acao: l.acao,
  em: l.em.toISOString(),
  usuarioId: l.usuarioId,
  autor: l.autorNome ?? l.processo ?? 'Autor não registrado',
  origem: l.origem === 'automatica' ? 'automatica' : 'manual',
  processo: l.processo,
  correlacaoId: l.correlacaoId,
});

@Injectable()
export class AuditoriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acesso: AutorizacaoService,
  ) {}
  private async exigir(contexto: ContextoAcesso) {
    if (
      (await this.acesso.exigir(contexto, 'auditoria', 'consultar')) !== 'todos'
    )
      throw acessoNegado();
  }
  async listar(contexto: ContextoAcesso, consulta: ConsultaColecao) {
    await this.exigir(contexto);
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_AUDITORIAS,
      mapa: MAPA_AUDITORIAS,
      escopo: [],
      buscar: ({ where, orderBy, skip, take }) =>
        this.prisma.auditoria.findMany({
          where: where as Prisma.AuditoriaWhereInput,
          orderBy: orderBy as Prisma.AuditoriaOrderByWithRelationInput[],
          skip,
          take,
          select: resumoSelect,
        }),
      contar: (where) =>
        this.prisma.auditoria.count({
          where: where as Prisma.AuditoriaWhereInput,
        }),
      mapear: resumo,
    });
  }
  async detalhe(
    contexto: ContextoAcesso,
    id: number,
  ): Promise<EventoAuditoriaDetalhe> {
    await this.exigir(contexto);
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647)
      throw entradaInvalida('ID do evento inválido.');
    const evento = await this.prisma.auditoria.findUnique({ where: { id } });
    if (!evento) throw naoEncontrado();
    const antes = snapshotSeguro(evento.entidade, evento.antes),
      depois = snapshotSeguro(evento.entidade, evento.depois);
    return {
      ...resumo(evento),
      antes,
      depois,
      diferencas: diferencasAuditoria(antes, depois),
    };
  }
}
