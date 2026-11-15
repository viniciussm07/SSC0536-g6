import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from './autorizacao.service';
import type { ContextoAcesso } from './acesso.types';
import { naoEncontrado } from './acesso.errors';
import { colecao, paginacao, type PaginaDto } from './acesso.dto';

const empreendimentoSelect = {
  id: true,
  nomeFantasia: true,
  situacao: true,
} as const;
@Injectable()
export class ConsultasAcessoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}
  async empreendimentos(
    contexto: ContextoAcesso,
    query: PaginaDto,
    exportar = false,
  ) {
    const consulta = await this.autorizacao.filtroEmpreendimentos(
      contexto,
      'empreendimentos',
      'consultar',
    );
    const where: Prisma.EmpreendimentoWhereInput = exportar
      ? {
          AND: [
            consulta,
            await this.autorizacao.filtroEmpreendimentos(
              contexto,
              'empreendimentos',
              'exportar',
            ),
          ],
        }
      : consulta;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.empreendimento.findMany({
        where,
        select: empreendimentoSelect,
        orderBy: { id: 'asc' },
        ...paginacao(query),
      }),
      this.prisma.empreendimento.count({ where }),
    ]);
    return colecao(data, total, query);
  }
  async empreendimento(contexto: ContextoAcesso, id: number) {
    const scope = await this.autorizacao.filtroEmpreendimentos(
      contexto,
      'empreendimentos',
      'consultar',
    );
    const data = await this.prisma.empreendimento.findFirst({
      where: { AND: [{ id }, scope] },
      select: empreendimentoSelect,
    });
    if (!data) throw naoEncontrado();
    return data;
  }
  private async autorizarEmpreendimento(
    contexto: ContextoAcesso,
    id: number,
    recurso: 'respostas' | 'inventarios',
  ) {
    const scope = await this.autorizacao.filtroEmpreendimentos(
      contexto,
      recurso,
      'consultar',
    );
    if (
      !(await this.prisma.empreendimento.findFirst({
        where: { AND: [{ id }, scope] },
        select: { id: true },
      }))
    )
      throw naoEncontrado();
    return scope;
  }
  async respostas(
    contexto: ContextoAcesso,
    empreendimentoId: number,
    query: PaginaDto,
  ) {
    const scope = await this.autorizarEmpreendimento(
      contexto,
      empreendimentoId,
      'respostas',
    );
    const where = { empreendimentoId, empreendimento: scope };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.resposta.findMany({
        where,
        include: { pesquisa: { select: { titulo: true } } },
        orderBy: { id: 'asc' },
        ...paginacao(query),
      }),
      this.prisma.resposta.count({ where }),
    ]);
    return colecao(
      rows.map((r) => ({
        id: r.id,
        pesquisaId: r.pesquisaId,
        titulo: r.pesquisa.titulo,
        respondidaEm: r.respondidaEm.toISOString(),
        canal: r.canal,
      })),
      total,
      query,
    );
  }
  async inventarios(
    contexto: ContextoAcesso,
    empreendimentoId: number,
    query: PaginaDto,
  ) {
    const scope = await this.autorizarEmpreendimento(
      contexto,
      empreendimentoId,
      'inventarios',
    );
    const where = { empreendimentoId, empreendimento: scope };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventarioVersao.findMany({
        where,
        select: {
          id: true,
          vigenciaInicio: true,
          vigenciaFim: true,
          totalUh: true,
          leitos: true,
          situacaoConferencia: true,
        },
        orderBy: [{ vigenciaInicio: 'desc' }, { id: 'desc' }],
        ...paginacao(query),
      }),
      this.prisma.inventarioVersao.count({ where }),
    ]);
    return colecao(
      rows.map((r) => ({
        ...r,
        vigenciaInicio: r.vigenciaInicio.toISOString().slice(0, 10),
        vigenciaFim: r.vigenciaFim?.toISOString().slice(0, 10) ?? null,
      })),
      total,
      query,
    );
  }
  async indicadores(
    contexto: ContextoAcesso,
    query: PaginaDto,
    exportar = false,
  ) {
    await this.autorizacao.exigir(contexto, 'indicadores', 'consultar');
    if (exportar)
      await this.autorizacao.exigir(contexto, 'indicadores', 'exportar');
    const where: Prisma.IndicadorResultadoWhereInput = {
      definicao: {
        visibilidades: {
          some: { perfil: contexto.usuario.perfil, permitido: true },
        },
      },
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.indicadorResultado.findMany({
        where,
        include: {
          definicao: { select: { nome: true, unidade: true } },
          periodo: { select: { rotulo: true } },
        },
        orderBy: { id: 'asc' },
        ...paginacao(query),
      }),
      this.prisma.indicadorResultado.count({ where }),
    ]);
    return colecao(
      rows.map((r) => ({
        id: r.id,
        indicadorId: r.definicaoId,
        nome: r.definicao.nome,
        unidade: r.definicao.unidade,
        periodo: r.periodo.rotulo,
        tipoColeta: r.tipoColeta,
        recorte: r.recorte,
        metodo: r.metodo,
        valor: r.valor.toString(),
      })),
      total,
      query,
    );
  }
}
