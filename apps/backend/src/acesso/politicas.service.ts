import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import { Injectable } from '@nestjs/common';
import {
  ACOES_ACESSO,
  ESCOPOS_ACESSO,
  RECURSOS_ACESSO,
  ESQUEMA_PERMISSOES,
  ESQUEMA_VISIBILIDADES,
  isPerfil,
  permissaoCompativel,
  PERMISSOES_INICIAIS,
  type Perfil,
  type PermissaoAcesso,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from './autorizacao.service';
import type { ContextoAcesso } from './acesso.types';
import {
  conflitoAcesso,
  entradaInvalida,
  naoEncontrado,
} from './acesso.errors';
import { MAPA_PERMISSOES, mapaVisibilidades } from './acesso.odata';

@Injectable()
export class PoliticasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}
  perfil(value: string): Perfil {
    if (!isPerfil(value)) throw naoEncontrado();
    return value;
  }
  async permissoes(valorPerfil: string, consulta: ConsultaColecao) {
    const perfil = this.perfil(valorPerfil);
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_PERMISSOES,
      mapa: MAPA_PERMISSOES,
      // Só linhas que o contrato público (e o guard do front) reconhece; valor inválido
      // gravado no banco nunca chega ao cliente.
      escopo: [
        { perfil },
        {
          recurso: { in: [...RECURSOS_ACESSO] },
          acao: { in: [...ACOES_ACESSO] },
          escopo: { in: [...ESCOPOS_ACESSO] },
        },
      ],
      buscar: ({ where, orderBy, skip, take }) =>
        this.prisma.permissaoPerfil.findMany({
          where: where as Prisma.PermissaoPerfilWhereInput,
          orderBy: orderBy as Prisma.PermissaoPerfilOrderByWithRelationInput[],
          skip,
          take,
        }),
      contar: (where) =>
        this.prisma.permissaoPerfil.count({
          where: where as Prisma.PermissaoPerfilWhereInput,
        }),
      mapear: ({ recurso, acao, escopo }) => ({ recurso, acao, escopo }),
    });
  }
  async alterarPermissoes(
    contexto: ContextoAcesso,
    valorPerfil: string,
    permissoes: PermissaoAcesso[],
  ) {
    const perfil = this.perfil(valorPerfil);
    const chaves = permissoes.map((p) => `${p.recurso}:${p.acao}`);
    if (
      new Set(chaves).size !== chaves.length ||
      permissoes.some((p) => !permissaoCompativel(perfil, p))
    )
      throw entradaInvalida(
        'Permissões duplicadas ou incompatíveis com os limites do perfil.',
      );
    if (
      perfil === 'administrador' &&
      PERMISSOES_INICIAIS.filter(
        (p) =>
          p.perfil === perfil &&
          ['contas', 'vinculos', 'permissoes', 'visibilidade'].includes(
            p.recurso,
          ),
      ).some(
        (p) =>
          !permissoes.some(
            (regra) =>
              regra.recurso === p.recurso &&
              regra.acao === p.acao &&
              regra.escopo === p.escopo,
          ),
      )
    )
      throw conflitoAcesso(
        'As permissões de administração de acesso devem ser preservadas.',
      );
    return this.autorizacao.alterar(
      contexto,
      'permissoes',
      'alterar',
      async (tx, atual) => {
        const antes = await tx.permissaoPerfil.findMany({ where: { perfil } });
        await tx.permissaoPerfil.deleteMany({ where: { perfil } });
        if (permissoes.length)
          await tx.permissaoPerfil.createMany({
            data: permissoes.map((p) => ({ perfil, ...p })),
          });
        await tx.sessao.updateMany({
          where: { usuario: { perfil }, revogadaEm: null },
          data: { revogadaEm: new Date() },
        });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'permissao_perfil',
          entidadeId: 1,
          acao: 'alterar',
          antes: {
            perfil,
            permissoes: antes.map(({ recurso, acao, escopo }) => ({
              recurso,
              acao,
              escopo,
            })),
          },
          depois: { perfil, permissoes: permissoes.map((p) => ({ ...p })) },
        });
        return { perfil, permissoes };
      },
    );
  }
  async visibilidades(valorPerfil: string, consulta: ConsultaColecao) {
    const perfil = this.perfil(valorPerfil);
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_VISIBILIDADES,
      mapa: mapaVisibilidades(perfil),
      escopo: [],
      buscar: ({ where, orderBy, skip, take }) =>
        this.prisma.indicadorDefinicao.findMany({
          where: where as Prisma.IndicadorDefinicaoWhereInput,
          orderBy:
            orderBy as Prisma.IndicadorDefinicaoOrderByWithRelationInput[],
          skip,
          take,
          include: { visibilidades: { where: { perfil } } },
        }),
      contar: (where) =>
        this.prisma.indicadorDefinicao.count({
          where: where as Prisma.IndicadorDefinicaoWhereInput,
        }),
      mapear: (i) => ({
        indicadorId: i.id,
        nome: i.nome,
        permitido: i.visibilidades[0]?.permitido ?? false,
      }),
    });
  }
  async alterarVisibilidade(
    contexto: ContextoAcesso,
    valorPerfil: string,
    indicadorId: number,
    permitido: boolean,
  ) {
    const perfil = this.perfil(valorPerfil);
    return this.autorizacao.alterar(
      contexto,
      'visibilidade',
      'alterar',
      async (tx, atual) => {
        if (
          !(await tx.indicadorDefinicao.findUnique({
            where: { id: indicadorId },
          }))
        )
          throw naoEncontrado();
        const where = { perfil_indicadorId: { perfil, indicadorId } };
        const antes = await tx.visibilidadeIndicadorPerfil.findUnique({
          where,
        });
        const depois = await tx.visibilidadeIndicadorPerfil.upsert({
          where,
          create: { perfil, indicadorId, permitido },
          update: { permitido },
        });
        await tx.sessao.updateMany({
          where: { usuario: { perfil }, revogadaEm: null },
          data: { revogadaEm: new Date() },
        });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'visibilidade_indicador_perfil',
          entidadeId: indicadorId,
          acao: 'alterar',
          antes: {
            perfil,
            indicadorId,
            permitido: antes?.permitido ?? false,
          },
          depois,
        });
        return { perfil, indicadorId, permitido };
      },
    );
  }
}
