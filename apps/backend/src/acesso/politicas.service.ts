import { Injectable } from '@nestjs/common';
import {
  isPerfil,
  isPermissaoAcesso,
  permissaoCompativel,
  PERMISSOES_INICIAIS,
  type Perfil,
  type PermissaoAcesso,
} from '@ssc0536/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from './autorizacao.service';
import type { ContextoAcesso } from './acesso.types';
import {
  conflitoAcesso,
  entradaInvalida,
  naoEncontrado,
} from './acesso.errors';
import { colecao, paginacao, type PaginaDto } from './acesso.dto';

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
  async permissoes(perfil: string) {
    const regras = await this.prisma.permissaoPerfil.findMany({
      where: { perfil: this.perfil(perfil) },
      orderBy: [{ recurso: 'asc' }, { acao: 'asc' }],
    });
    return regras
      .filter(isPermissaoAcesso)
      .map(({ recurso, acao, escopo }) => ({ recurso, acao, escopo }));
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
        await tx.auditoria.create({
          data: {
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
            em: new Date(),
          },
        });
        return { perfil, permissoes };
      },
    );
  }
  async visibilidades(valorPerfil: string, query: PaginaDto) {
    const perfil = this.perfil(valorPerfil);
    const [indicadores, total] = await this.prisma.$transaction([
      this.prisma.indicadorDefinicao.findMany({
        include: { visibilidades: { where: { perfil } } },
        orderBy: { id: 'asc' },
        ...paginacao(query),
      }),
      this.prisma.indicadorDefinicao.count(),
    ]);
    return colecao(
      indicadores.map((i) => ({
        indicadorId: i.id,
        nome: i.nome,
        permitido: i.visibilidades[0]?.permitido ?? false,
      })),
      total,
      query,
    );
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
        await tx.auditoria.create({
          data: {
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
            em: new Date(),
          },
        });
        return { perfil, indicadorId, permitido };
      },
    );
  }
}
