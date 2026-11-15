import { Injectable } from '@nestjs/common';
import { ESQUEMA_CONTAS, ESQUEMA_VINCULOS_CONTA } from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import { MAPA_CONTAS } from './contas.odata';
import { MAPA_VINCULOS } from './acesso.odata';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from './autorizacao.service';
import { administrarContaNaTransacao } from '../autenticacao/administrar-conta';
import type { ContextoAcesso } from './acesso.types';
import { type CriarContaDto, type AlterarContaDto } from './acesso.dto';
import {
  conflitoAcesso,
  entradaInvalida,
  naoEncontrado,
} from './acesso.errors';

const contaSelect = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
} as const;
@Injectable()
export class ContasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}
  async listar(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_CONTAS,
      mapa: MAPA_CONTAS,
      escopo: [],
      buscar: ({ where, orderBy, skip, take }) =>
        this.prisma.usuario.findMany({
          where: where as Prisma.UsuarioWhereInput,
          orderBy: orderBy as Prisma.UsuarioOrderByWithRelationInput[],
          skip,
          take,
          select: contaSelect,
        }),
      contar: (where) =>
        this.prisma.usuario.count({ where: where as Prisma.UsuarioWhereInput }),
      mapear: (linha) => linha,
    });
  }
  async criar(contexto: ContextoAcesso, body: CriarContaDto) {
    return this.autorizacao.alterar(
      contexto,
      'contas',
      'criar',
      async (tx, atual) => {
        try {
          const resultado = await administrarContaNaTransacao(tx, {
            acao: 'criar',
            ...body,
            administradorId: atual.usuario.id,
          });
          return {
            usuarioId: resultado.usuarioId,
            token: resultado.token!,
            expiraEm: resultado.expiraEm!,
          };
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'Conta já existente; use recuperação.'
          )
            throw conflitoAcesso('Já existe uma conta com esse e-mail.');
          throw error;
        }
      },
    );
  }
  async alterar(contexto: ContextoAcesso, id: number, body: AlterarContaDto) {
    return this.autorizacao.alterar(
      contexto,
      'contas',
      'alterar',
      async (tx, atual) => {
        const antes = await tx.usuario.findUnique({
          where: { id },
          select: contaSelect,
        });
        if (!antes) throw naoEncontrado();
        if (
          id === atual.usuario.id &&
          (!body.ativo || body.perfil !== antes.perfil)
        )
          throw conflitoAcesso(
            'Não é permitido desativar ou mudar o próprio perfil.',
          );
        if (
          antes.ativo &&
          antes.perfil === 'administrador' &&
          (!body.ativo || body.perfil !== 'administrador') &&
          (await tx.usuario.count({
            where: { ativo: true, perfil: 'administrador' },
          })) <= 1
        )
          throw conflitoAcesso('Mantenha ao menos um administrador ativo.');
        const depois = await tx.usuario.update({
          where: { id },
          data: body,
          select: contaSelect,
        });
        if (antes.ativo !== depois.ativo || antes.perfil !== depois.perfil) {
          await tx.sessao.updateMany({
            where: { usuarioId: id, revogadaEm: null },
            data: { revogadaEm: new Date() },
          });
          await tx.ativacaoConta.updateMany({
            where: { usuarioId: id, usadaEm: null },
            data: { usadaEm: new Date() },
          });
        }
        await tx.auditoria.create({
          data: {
            usuarioId: atual.usuario.id,
            entidade: 'conta',
            entidadeId: id,
            acao: 'alterar',
            antes,
            depois,
            em: new Date(),
          },
        });
        return depois;
      },
    );
  }
  async recuperar(contexto: ContextoAcesso, id: number) {
    return this.autorizacao.alterar(
      contexto,
      'contas',
      'alterar',
      async (tx, atual) => {
        const usuario = await tx.usuario.findUnique({
          where: { id },
          select: contaSelect,
        });
        if (!usuario) throw naoEncontrado();
        if (!usuario.ativo)
          throw entradaInvalida('Reative a conta antes de recuperar o acesso.');
        if (id === atual.usuario.id)
          throw conflitoAcesso(
            'Solicite a recuperação da sua conta a outro administrador.',
          );
        const resultado = await administrarContaNaTransacao(tx, {
          acao: 'recuperar',
          email: usuario.email,
          administradorId: atual.usuario.id,
        });
        return {
          usuarioId: resultado.usuarioId,
          token: resultado.token!,
          expiraEm: resultado.expiraEm!,
        };
      },
    );
  }
  async vinculos(id: number, consulta: ConsultaColecao) {
    if (!(await this.prisma.usuario.findUnique({ where: { id } })))
      throw naoEncontrado();
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_VINCULOS_CONTA,
      mapa: MAPA_VINCULOS,
      escopo: [{ usuarioId: id }],
      buscar: ({ where, orderBy, skip, take }) =>
        this.prisma.usuarioEmpreendimento.findMany({
          where: where as Prisma.UsuarioEmpreendimentoWhereInput,
          orderBy:
            orderBy as Prisma.UsuarioEmpreendimentoOrderByWithRelationInput[],
          skip,
          take,
          include: { empreendimento: { select: { nomeFantasia: true } } },
        }),
      contar: (where) =>
        this.prisma.usuarioEmpreendimento.count({
          where: where as Prisma.UsuarioEmpreendimentoWhereInput,
        }),
      mapear: (v) => ({
        empreendimentoId: v.empreendimentoId,
        nomeFantasia: v.empreendimento.nomeFantasia,
        ativo: v.ativo,
      }),
    });
  }
  async vincular(
    contexto: ContextoAcesso,
    usuarioId: number,
    empreendimentoId: number,
    ativo: boolean,
  ) {
    return this.autorizacao.alterar(
      contexto,
      'vinculos',
      'alterar',
      async (tx, atual) => {
        if (
          !(await tx.usuario.findUnique({ where: { id: usuarioId } })) ||
          !(await tx.empreendimento.findUnique({
            where: { id: empreendimentoId },
          }))
        )
          throw naoEncontrado();
        const chave = {
          usuarioId_empreendimentoId: { usuarioId, empreendimentoId },
        };
        const antes = await tx.usuarioEmpreendimento.findUnique({
          where: chave,
        });
        const depois = await tx.usuarioEmpreendimento.upsert({
          where: chave,
          create: { usuarioId, empreendimentoId, ativo },
          update: { ativo },
        });
        await tx.sessao.updateMany({
          where: { usuarioId, revogadaEm: null },
          data: { revogadaEm: new Date() },
        });
        await tx.auditoria.create({
          data: {
            usuarioId: atual.usuario.id,
            entidade: 'usuario_empreendimento',
            entidadeId: usuarioId,
            acao: antes ? 'alterar' : 'criar',
            ...(antes ? { antes } : {}),
            depois,
            em: new Date(),
          },
        });
        return { empreendimentoId, ativo };
      },
    );
  }
}
