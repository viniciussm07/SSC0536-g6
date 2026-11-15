import type { PrismaClient } from '../generated/prisma/client';
import { hashToken, novoToken } from './segredos';

export interface OperacaoConta {
  acao: 'bootstrap' | 'criar' | 'recuperar' | 'desativar' | 'reativar';
  email: string;
  nome?: string;
  perfil?: string;
  administradorId?: number;
}
/** Procedimento operacional com acesso direto ao banco; não é uma API pública. */
export async function administrarConta(
  prisma: PrismaClient,
  entrada: OperacaoConta,
) {
  const email = entrada.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error('E-mail inválido.');
  if (
    !['bootstrap', 'criar', 'recuperar', 'desativar', 'reativar'].includes(
      entrada.acao,
    )
  )
    throw new Error('Ação inválida.');
  const token = novoToken();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(536002)`;
    let autor = entrada.administradorId;
    if (entrada.acao === 'bootstrap') {
      if (
        (await tx.credencialLocal.count()) ||
        (await tx.ativacaoConta.count())
      )
        throw new Error('Bootstrap já realizado.');
    } else {
      const admin = autor
        ? await tx.usuario.findUnique({ where: { id: autor } })
        : null;
      if (!admin?.ativo || admin.perfil !== 'administrador')
        throw new Error('Administrador ativo obrigatório.');
    }
    const correspondencias = await tx.usuario.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      take: 2,
    });
    if (correspondencias.length > 1)
      throw new Error(
        'E-mail legado ambíguo; concilie as contas antes de provisionar.',
      );
    let usuario = correspondencias[0];
    if (entrada.acao === 'criar' || entrada.acao === 'bootstrap') {
      if (usuario) throw new Error('Conta já existente; use recuperação.');
      const perfil =
        entrada.acao === 'bootstrap' ? 'administrador' : entrada.perfil;
      if (
        !entrada.nome?.trim() ||
        entrada.nome.length > 200 ||
        ![
          'administrador',
          'gestor',
          'estagiario',
          'visualizador',
          'empresario',
        ].includes(perfil ?? '')
      )
        throw new Error('Nome e perfil válidos obrigatórios.');
      usuario = await tx.usuario.create({
        data: { email, nome: entrada.nome.trim(), perfil: perfil! },
      });
      if (entrada.acao === 'bootstrap') autor = usuario.id;
    }
    if (!usuario) throw new Error('Conta não encontrada.');
    await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${usuario.id} FOR UPDATE`;
    if (entrada.acao === 'desativar' && usuario.id === autor)
      throw new Error(
        'Não é permitido desativar a própria conta neste procedimento.',
      );
    const agora = new Date();
    await tx.sessao.updateMany({
      where: { usuarioId: usuario.id, revogadaEm: null },
      data: { revogadaEm: agora },
    });
    await tx.ativacaoConta.updateMany({
      where: { usuarioId: usuario.id, usadaEm: null },
      data: { usadaEm: agora },
    });
    if (entrada.acao === 'desativar' || entrada.acao === 'reativar') {
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { ativo: entrada.acao === 'reativar' },
      });
    }
    if (entrada.acao === 'recuperar' && !usuario.ativo)
      throw new Error('Reative a conta antes de recuperar.');
    const emitir = ['bootstrap', 'criar', 'recuperar'].includes(entrada.acao);
    if (emitir) {
      await tx.credencialLocal.deleteMany({ where: { usuarioId: usuario.id } });
      await tx.ativacaoConta.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          expiraEm: new Date(agora.getTime() + 3600000),
        },
      });
    }
    await tx.auditoria.create({
      data: {
        usuarioId: autor!,
        entidade: 'conta',
        entidadeId: usuario.id,
        acao:
          entrada.acao === 'criar' || entrada.acao === 'bootstrap'
            ? 'criar'
            : 'alterar',
        depois: { evento: entrada.acao },
        em: agora,
      },
    });
    return { usuarioId: usuario.id, ...(emitir ? { token } : {}) };
  });
}
