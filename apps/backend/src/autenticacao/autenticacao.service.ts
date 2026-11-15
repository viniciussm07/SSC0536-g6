import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import {
  Injectable,
  HttpException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { SessaoAtual } from '@ssc0536/common';
import { PrismaService } from '../prisma/prisma.service';
import { conferirSenha, hashSenha, hashToken, novoToken } from './segredos';

const negado = () =>
  new UnauthorizedException({
    error: {
      code: 'SESSAO_INVALIDA',
      message: 'Acesso inválido ou sessão expirada.',
    },
  });
const loginInvalido = () =>
  new UnauthorizedException({
    error: {
      code: 'CREDENCIAIS_INVALIDAS',
      message: 'E-mail ou senha inválidos.',
    },
  });
export const SESSAO_DURACAO_MS = 8 * 60 * 60 * 1000;

@Injectable()
export class AutenticacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async limitar(ip: string, email?: string) {
    const janela = Math.floor(Date.now() / 900000);
    for (const [identificador, maximo] of [
      [`ip:${ip}`, 30],
      ...(email ? [[`email:${email}`, 8] as const] : []),
    ] as const) {
      const contador = await this.prisma.limiteAutenticacao.upsert({
        where: { chave: hashToken(`${janela}:${identificador}`) },
        create: {
          chave: hashToken(`${janela}:${identificador}`),
          tentativas: 1,
          expiraEm: new Date((janela + 1) * 900000),
        },
        update: { tentativas: { increment: 1 } },
      });
      if (contador.tentativas > maximo)
        throw new HttpException(
          {
            error: {
              code: 'TENTATIVAS_EXCEDIDAS',
              message: 'Muitas tentativas. Aguarde até 15 minutos.',
            },
          },
          429,
        );
    }
  }

  async login(email: string, senha: string, ip: string) {
    await this.limitar(ip, email);
    const correspondencias = await this.prisma.usuario.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { credencial: true },
      take: 2,
    });
    const usuario =
      correspondencias.length === 1 ? correspondencias[0] : undefined;
    const confere = await conferirSenha(senha, usuario?.credencial?.senhaHash);
    if (!confere || !usuario?.ativo || !usuario.credencial)
      throw loginInvalido();
    const token = novoToken();
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + SESSAO_DURACAO_MS);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${usuario.id} FOR UPDATE`;
      const atual = await tx.usuario.findUnique({
        where: { id: usuario.id },
        include: { credencial: true },
      });
      if (
        !atual?.ativo ||
        atual.credencial?.senhaHash !== usuario.credencial?.senhaHash
      )
        throw loginInvalido();
      await tx.sessao.create({
        data: {
          tokenHash: hashToken(token),
          usuarioId: usuario.id,
          criadaEm: agora,
          expiraEm,
        },
      });
      await registrarAuditoria(tx, {
        usuarioId: usuario.id,
        entidade: 'conta',
        entidadeId: usuario.id,
        acao: 'alterar',
        depois: { evento: 'sessao_iniciada' },
      });
    });
    return { token, data: this.saida(usuario, expiraEm) };
  }

  async atual(token?: string): Promise<SessaoAtual> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw negado();
    const sessao = await this.prisma.sessao.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { usuario: true },
    });
    if (
      !sessao ||
      sessao.revogadaEm ||
      sessao.expiraEm <= new Date() ||
      !sessao.usuario.ativo
    )
      throw negado();
    return this.saida(sessao.usuario, sessao.expiraEm);
  }

  async logout(token?: string) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
    await this.prisma.$transaction(async (tx) => {
      const sessao = await tx.sessao.findUnique({
        where: { tokenHash: hashToken(token) },
      });
      if (!sessao) return;
      const alterada = await tx.sessao.updateMany({
        where: { tokenHash: sessao.tokenHash, revogadaEm: null },
        data: { revogadaEm: new Date() },
      });
      if (alterada.count)
        await registrarAuditoria(tx, {
          usuarioId: sessao.usuarioId,
          entidade: 'conta',
          entidadeId: sessao.usuarioId,
          acao: 'alterar',
          depois: { evento: 'sessao_encerrada' },
        });
    });
  }

  async ativar(token: string, senha: string, ip: string) {
    await this.limitar(ip);
    const tokenHash = hashToken(token);
    const ativacao = await this.prisma.ativacaoConta.findUnique({
      where: { tokenHash },
    });
    const invalido = () =>
      new BadRequestException({
        error: {
          code: 'ATIVACAO_INVALIDA',
          message:
            'Código inválido, expirado ou já utilizado. Solicite outro ao administrador.',
        },
      });
    if (!ativacao || ativacao.usadaEm || ativacao.expiraEm <= new Date())
      throw invalido();
    const senhaHash = await hashSenha(senha);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${ativacao.usuarioId} FOR UPDATE`;
      const usuario = await tx.usuario.findUnique({
        where: { id: ativacao.usuarioId },
      });
      if (!usuario?.ativo) throw invalido();
      const usada = await tx.ativacaoConta.updateMany({
        where: { tokenHash, usadaEm: null, expiraEm: { gt: new Date() } },
        data: { usadaEm: new Date() },
      });
      if (usada.count !== 1) throw invalido();
      await tx.credencialLocal.upsert({
        where: { usuarioId: usuario.id },
        create: { usuarioId: usuario.id, senhaHash },
        update: { senhaHash },
      });
      await tx.ativacaoConta.updateMany({
        where: { usuarioId: usuario.id, usadaEm: null },
        data: { usadaEm: new Date() },
      });
      await tx.sessao.updateMany({
        where: { usuarioId: usuario.id, revogadaEm: null },
        data: { revogadaEm: new Date() },
      });
      await registrarAuditoria(tx, {
        usuarioId: usuario.id,
        entidade: 'conta',
        entidadeId: usuario.id,
        acao: 'alterar',
        depois: { evento: 'senha_definida' },
      });
    });
  }

  private saida(
    usuario: { id: number; nome: string; email: string; perfil: string },
    expiraEm: Date,
  ): SessaoAtual {
    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
      expiraEm: expiraEm.toISOString(),
    };
  }
}
