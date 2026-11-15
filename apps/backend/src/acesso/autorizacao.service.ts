import { Injectable } from '@nestjs/common';
import {
  isPerfil,
  isPermissaoAcesso,
  permissaoCompativel,
  type RecursoAcesso,
  type AcaoAcesso,
  type PermissaoAcesso,
  type AcessoAtual,
} from '@ssc0536/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { hashToken } from '../autenticacao/segredos';
import { acessoNegado, sessaoInvalida } from './acesso.errors';
import type { ContextoAcesso } from './acesso.types';

@Injectable()
export class AutorizacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async identificar(
    token: string | undefined,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ContextoAcesso> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw sessaoInvalida();
    return this.identificarHash(hashToken(token), tx);
  }
  private async identificarHash(
    tokenHash: string,
    tx: Prisma.TransactionClient,
  ): Promise<ContextoAcesso> {
    const sessao = await tx.sessao.findUnique({
      where: { tokenHash },
      include: { usuario: true },
    });
    if (
      !sessao ||
      sessao.revogadaEm ||
      sessao.expiraEm <= new Date() ||
      !sessao.usuario.ativo
    )
      throw sessaoInvalida();
    const { id, nome, email, perfil } = sessao.usuario;
    if (!isPerfil(perfil)) throw acessoNegado();
    return { usuario: { id, nome, email, perfil }, tokenHash };
  }
  async exigir(
    contexto: ContextoAcesso,
    recurso: RecursoAcesso,
    acao: AcaoAcesso,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<'todos' | 'vinculados'> {
    const { perfil } = contexto.usuario;
    if (!isPerfil(perfil)) throw acessoNegado();
    const regra = await tx.permissaoPerfil.findUnique({
      where: { perfil_recurso_acao: { perfil, recurso, acao } },
    });
    if (
      !isPermissaoAcesso(regra) ||
      regra.escopo === 'nenhum' ||
      !permissaoCompativel(perfil, regra)
    )
      throw acessoNegado();
    return regra.escopo;
  }
  async filtroEmpreendimentos(
    contexto: ContextoAcesso,
    recurso: RecursoAcesso,
    acao: AcaoAcesso,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Prisma.EmpreendimentoWhereInput> {
    const escopo = await this.exigir(contexto, recurso, acao, tx);
    return escopo === 'todos'
      ? {}
      : {
          usuarios: {
            some: {
              usuarioId: contexto.usuario.id,
              ativo: true,
              usuario: { ativo: true },
            },
          },
        };
  }
  async atual(contexto: ContextoAcesso): Promise<AcessoAtual> {
    const perfil = contexto.usuario.perfil;
    if (!isPerfil(perfil)) throw acessoNegado();
    const [politica, regras, vinculos] = await this.prisma.$transaction(
      [
        this.prisma.politicaAcesso.findUniqueOrThrow({ where: { id: 1 } }),
        this.prisma.permissaoPerfil.findMany({
          where: { perfil },
          orderBy: [{ recurso: 'asc' }, { acao: 'asc' }],
        }),
        this.prisma.usuarioEmpreendimento.findMany({
          where: { usuarioId: contexto.usuario.id, ativo: true },
          include: {
            empreendimento: {
              select: { id: true, nomeFantasia: true, cnpj: true },
            },
          },
          orderBy: { empreendimentoId: 'asc' },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      usuarioId: contexto.usuario.id,
      perfil,
      revisao: politica.revisao,
      permissoes: regras
        .filter(
          (regra): regra is typeof regra & PermissaoAcesso =>
            isPermissaoAcesso(regra) && permissaoCompativel(perfil, regra),
        )
        .map(({ recurso, acao, escopo }) => ({ recurso, acao, escopo })),
      vinculos: vinculos.map((v) => ({
        empreendimentoId: v.empreendimento.id,
        nomeFantasia: v.empreendimento.nomeFantasia,
        cnpj: v.empreendimento.cnpj,
      })),
    };
  }
  /** Serializa mudanças administrativas e revalida sessão/permissão dentro da transação. */
  async alterar<T>(
    contexto: ContextoAcesso,
    recurso: RecursoAcesso,
    acao: AcaoAcesso,
    work: (tx: Prisma.TransactionClient, atual: ContextoAcesso) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(536003)`;
        await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${contexto.usuario.id} FOR UPDATE`;
        const atual = await this.identificarHash(contexto.tokenHash, tx);
        await this.exigir(atual, recurso, acao, tx);
        const resultado = await work(tx, atual);
        await tx.politicaAcesso.update({
          where: { id: 1 },
          data: { revisao: { increment: 1 } },
        });
        return resultado;
      },
      { timeout: 15000 },
    );
  }
}
