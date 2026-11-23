import { Injectable, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  lerDetalhe,
  paraListado,
  selectListado,
  dataInventarioGrade,
} from '../cadastro/cadastro.leitura';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from './autorizacao.service';
import type { ContextoAcesso } from './acesso.types';
import {
  contextoDivergente,
  contextoObrigatorio,
  naoEncontrado,
} from './acesso.errors';
import {
  ESQUEMA_CADASTUR,
  ESQUEMA_CONTATOS,
  ESQUEMA_EMPREENDIMENTOS,
  ESQUEMA_INDICADORES,
  ESQUEMA_INVENTARIOS,
  ESQUEMA_RESPOSTAS,
} from '@ssc0536/common';
import {
  MAPA_CADASTUR,
  MAPA_CONTATOS,
  mapaEmpreendimentos,
} from '../cadastro/empreendimentos.odata';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import {
  MAPA_INDICADORES,
  MAPA_INVENTARIOS,
  MAPA_RESPOSTAS,
} from './consultas.odata';

@Injectable()
export class ConsultasAcessoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}
  /**
   * Catálogo de seleção: não é filtrado pelo contexto (é o que permite escolher/trocar a entidade)
   * e só expõe id, nome e situação dentro do escopo autorizado. A exportação, por outro lado,
   * respeita o contexto: com contexto só a entidade; sem contexto exige escopo global.
   */
  async empreendimentos(
    contexto: ContextoAcesso,
    consulta: ConsultaColecao,
    exportar = false,
    contextoEntidade: number | null = null,
  ) {
    const escopo: Prisma.EmpreendimentoWhereInput[] = [
      await this.autorizacao.filtroEmpreendimentos(
        contexto,
        'empreendimentos',
        'consultar',
      ),
    ];
    if (exportar) {
      const alcance = await this.autorizacao.exigir(
        contexto,
        'empreendimentos',
        'exportar',
      );
      escopo.push(
        await this.autorizacao.filtroEmpreendimentos(
          contexto,
          'empreendimentos',
          'exportar',
        ),
      );
      if (contextoEntidade !== null) escopo.push({ id: contextoEntidade });
      else if (alcance !== 'todos') throw contextoObrigatorio();
    }
    const data = dataInventarioGrade();
    let inventarios: Prisma.InventarioVersaoWhereInput;
    try {
      const vinculo = await this.autorizacao.filtroEmpreendimentos(
        contexto,
        'inventarios',
        'consultar',
      );
      inventarios = { empreendimento: vinculo };
    } catch (erro) {
      if (!(erro instanceof ForbiddenException)) throw erro;
      inventarios = { id: { in: [] } };
    }
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_EMPREENDIMENTOS,
      mapa: mapaEmpreendimentos(data, inventarios as Record<string, unknown>),
      escopo,
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.empreendimento.findMany({
          where: where as Prisma.EmpreendimentoWhereInput,
          orderBy: orderBy as Prisma.EmpreendimentoOrderByWithRelationInput[],
          skip,
          take,
          select: selectListado(data, inventarios),
        }),
      contar: (where, db) =>
        db.empreendimento.count({
          where: where as Prisma.EmpreendimentoWhereInput,
        }),
      mapear: paraListado,
    });
  }
  /** Dados de uma entidade exigem contexto igual ao ID pedido (a autorização vem primeiro). */
  private conferirContexto(contextoEntidade: number | null, id: number) {
    if (contextoEntidade !== id) throw contextoDivergente();
  }
  async empreendimento(
    contexto: ContextoAcesso,
    id: number,
    contextoEntidade: number | null,
  ) {
    if (contextoEntidade === null) throw contextoObrigatorio();
    const scope = await this.autorizacao.filtroEmpreendimentos(
      contexto,
      'empreendimentos',
      'consultar',
    );
    const visivel = await this.prisma.empreendimento.findFirst({
      where: { AND: [{ id }, scope] },
      select: { id: true },
    });
    if (!visivel) throw naoEncontrado();
    this.conferirContexto(contextoEntidade, id);
    return (await lerDetalhe(this.prisma, id))!;
  }
  private async autorizarEmpreendimento(
    contexto: ContextoAcesso,
    id: number,
    recurso: 'empreendimentos' | 'respostas' | 'inventarios',
    contextoEntidade: number | null,
  ) {
    if (contextoEntidade === null) throw contextoObrigatorio();
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
    this.conferirContexto(contextoEntidade, id);
    return scope;
  }
  async respostas(
    contexto: ContextoAcesso,
    empreendimentoId: number,
    consulta: ConsultaColecao,
    contextoEntidade: number | null,
  ) {
    const scope = await this.autorizarEmpreendimento(
      contexto,
      empreendimentoId,
      'respostas',
      contextoEntidade,
    );
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_RESPOSTAS,
      mapa: MAPA_RESPOSTAS,
      escopo: [{ empreendimentoId }, { empreendimento: scope }],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.resposta.findMany({
          where: where as Prisma.RespostaWhereInput,
          orderBy: orderBy as Prisma.RespostaOrderByWithRelationInput[],
          skip,
          take,
          include: { pesquisa: { select: { titulo: true } } },
        }),
      contar: (where, db) =>
        db.resposta.count({
          where: where as Prisma.RespostaWhereInput,
        }),
      mapear: (r) => ({
        id: r.id,
        pesquisaId: r.pesquisaId,
        titulo: r.pesquisa.titulo,
        respondidaEm: r.respondidaEm.toISOString(),
        canal: r.canal,
      }),
    });
  }
  async inventarios(
    contexto: ContextoAcesso,
    empreendimentoId: number,
    consulta: ConsultaColecao,
    contextoEntidade: number | null,
  ) {
    const scope = await this.autorizarEmpreendimento(
      contexto,
      empreendimentoId,
      'inventarios',
      contextoEntidade,
    );
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_INVENTARIOS,
      mapa: MAPA_INVENTARIOS,
      escopo: [{ empreendimentoId }, { empreendimento: scope }],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.inventarioVersao.findMany({
          where: where as Prisma.InventarioVersaoWhereInput,
          orderBy: orderBy as Prisma.InventarioVersaoOrderByWithRelationInput[],
          skip,
          take,
          select: {
            id: true,
            vigenciaInicio: true,
            vigenciaFim: true,
            totalUh: true,
            leitos: true,
            situacaoConferencia: true,
            tipoAlteracao: true,
            criadaEm: true,
            substituidaPorId: true,
            criador: { select: { nome: true } },
          },
        }),
      contar: (where, db) =>
        db.inventarioVersao.count({
          where: where as Prisma.InventarioVersaoWhereInput,
        }),
      mapear: ({ criador, criadaEm, ...r }) => ({
        ...r,
        vigenciaInicio: r.vigenciaInicio.toISOString().slice(0, 10),
        vigenciaFim: r.vigenciaFim?.toISOString().slice(0, 10) ?? null,
        criadaEm: criadaEm.toISOString(),
        autor: criador.nome,
      }),
    });
  }
  async contatos(
    contexto: ContextoAcesso,
    empreendimentoId: number,
    consulta: ConsultaColecao,
    contextoEntidade: number | null,
  ) {
    const scope = await this.autorizarEmpreendimento(
      contexto,
      empreendimentoId,
      'empreendimentos',
      contextoEntidade,
    );
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_CONTATOS,
      mapa: MAPA_CONTATOS,
      escopo: [{ empreendimentoId }, { empreendimento: scope }],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.contato.findMany({
          where: where as Prisma.ContatoWhereInput,
          orderBy: orderBy as Prisma.ContatoOrderByWithRelationInput[],
          skip,
          take,
          select: {
            id: true,
            tipo: true,
            valor: true,
            finalidade: true,
            responsavelNome: true,
            responsavelCargo: true,
          },
        }),
      contar: (where, db) =>
        db.contato.count({
          where: where as Prisma.ContatoWhereInput,
        }),
      mapear: (r) => r,
    });
  }
  async cadastur(
    contexto: ContextoAcesso,
    empreendimentoId: number,
    consulta: ConsultaColecao,
    contextoEntidade: number | null,
  ) {
    const scope = await this.autorizarEmpreendimento(
      contexto,
      empreendimentoId,
      'empreendimentos',
      contextoEntidade,
    );
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_CADASTUR,
      mapa: MAPA_CADASTUR,
      escopo: [{ empreendimentoId }, { empreendimento: scope }],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.cadastur.findMany({
          where: where as Prisma.CadasturWhereInput,
          orderBy: orderBy as Prisma.CadasturOrderByWithRelationInput[],
          skip,
          take,
          select: {
            id: true,
            situacao: true,
            numero: true,
            vencimento: true,
          },
        }),
      contar: (where, db) =>
        db.cadastur.count({
          where: where as Prisma.CadasturWhereInput,
        }),
      mapear: (r) => ({
        ...r,
        vencimento: r.vencimento?.toISOString().slice(0, 10) ?? null,
      }),
    });
  }
  async indicadores(
    contexto: ContextoAcesso,
    consulta: ConsultaColecao,
    exportar = false,
  ) {
    await this.autorizacao.exigir(contexto, 'indicadores', 'consultar');
    if (exportar)
      await this.autorizacao.exigir(contexto, 'indicadores', 'exportar');
    const escopo: Prisma.IndicadorResultadoWhereInput = {
      definicao: {
        visibilidades: {
          some: { perfil: contexto.usuario.perfil, permitido: true },
        },
      },
      // Consumo (parte 16): resultados de carga e os da execução publicada; calculado,
      // substituído e indisponível ficam no detalhe do cálculo, nunca como valor zero.
      valor: { not: null },
      OR: [{ execucaoId: null }, { execucao: { publicacao: 'publicado' } }],
    };
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_INDICADORES,
      mapa: MAPA_INDICADORES,
      escopo: [escopo],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.indicadorResultado.findMany({
          where: where as Prisma.IndicadorResultadoWhereInput,
          orderBy:
            orderBy as Prisma.IndicadorResultadoOrderByWithRelationInput[],
          skip,
          take,
          include: {
            definicao: { select: { nome: true, unidade: true } },
            periodo: { select: { rotulo: true } },
          },
        }),
      contar: (where, db) =>
        db.indicadorResultado.count({
          where: where as Prisma.IndicadorResultadoWhereInput,
        }),
      mapear: (r) => ({
        id: r.id,
        indicadorId: r.definicaoId,
        nome: r.definicao.nome,
        unidade: r.definicao.unidade,
        periodo: r.periodo.rotulo,
        tipoColeta: r.tipoColeta,
        recorte: r.recorte,
        metodo: r.metodo,
        valor: r.valor!.toString(),
      }),
    });
  }
}
