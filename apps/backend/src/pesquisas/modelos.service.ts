import { Injectable } from '@nestjs/common';
import {
  ESQUEMA_MODELOS_PESQUISA,
  ESQUEMA_VERSOES_MODELO,
  type AlteracaoModeloPesquisa,
  type CampoModelo,
  type EntradaModeloPesquisa,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import { naoEncontrado } from '../acesso/acesso.errors';
import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import { paraDetalhe, paraLinha, paraVersaoLinha } from './pesquisas.leitura';
import { MAPA_MODELOS_PESQUISA, MAPA_VERSOES_MODELO } from './pesquisas.odata';
import { campoEmUso } from './pesquisas.errors';

type Tx = Prisma.TransactionClient;

type CampoBanco = {
  id: number;
  chave: string;
  rotulo: string;
  tipoValor: string;
  obrigatorio: boolean;
  ordem: number;
  opcoes: { chave: string; rotulo: string; ordem: number }[];
};

const CAMPOS_MODELO = {
  id: true,
  nome: true,
  publicoAlvo: true,
  versaoAtual: true,
  criadaEm: true,
} as const;

const ordenarCampos = (campos: CampoModelo[]): CampoModelo[] =>
  campos.slice().sort((a, b) => a.ordem - b.ordem);

/**
 * Comparação semântica da estrutura: rótulos, tipos, obrigatoriedade e opções
 * definem a interpretação; a `ordem` de exibição não gera nova versão.
 */
function estruturaSemOrdem(
  nome: string,
  publicoAlvo: string,
  campos: CampoModelo[],
) {
  return JSON.stringify({
    nome,
    publicoAlvo,
    campos: campos
      .slice()
      .sort((a, b) => a.chave.localeCompare(b.chave))
      .map((c) => ({
        chave: c.chave,
        rotulo: c.rotulo,
        tipoValor: c.tipoValor,
        obrigatorio: c.obrigatorio,
        opcoes: c.opcoes
          .slice()
          .sort((a, b) => a.chave.localeCompare(b.chave))
          .map((o) => ({ chave: o.chave, rotulo: o.rotulo })),
      })),
  });
}

/** Estrutura completa, com ordem de campos e opções: detecta qualquer mudança. */
function estruturaCompleta(
  nome: string,
  publicoAlvo: string,
  campos: CampoModelo[],
) {
  return JSON.stringify({
    nome,
    publicoAlvo,
    campos: campos.map((c) => ({
      chave: c.chave,
      rotulo: c.rotulo,
      tipoValor: c.tipoValor,
      obrigatorio: c.obrigatorio,
      ordem: c.ordem,
      opcoes: c.opcoes.map((o) => ({
        chave: o.chave,
        rotulo: o.rotulo,
        ordem: o.ordem,
      })),
    })),
  });
}

@Injectable()
export class ModelosPesquisaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  colecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_MODELOS_PESQUISA,
      mapa: MAPA_MODELOS_PESQUISA,
      escopo: [],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.pesquisaModelo.findMany({
          where,
          orderBy,
          skip,
          take,
          select: { ...CAMPOS_MODELO },
        }),
      contar: (where, db) => db.pesquisaModelo.count({ where }),
      mapear: paraLinha,
    });
  }

  versoes(modeloId: number, consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_VERSOES_MODELO,
      mapa: MAPA_VERSOES_MODELO,
      escopo: [{ modeloId }],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.pesquisaModeloVersao.findMany({ where, orderBy, skip, take }),
      contar: (where, db) => db.pesquisaModeloVersao.count({ where }),
      mapear: paraVersaoLinha,
    });
  }

  async detalhe(id: number) {
    const row = await this.prisma.pesquisaModelo.findUnique({
      where: { id },
      select: {
        ...CAMPOS_MODELO,
        campos: {
          orderBy: { ordem: 'asc' },
          include: { opcoes: true },
        },
      },
    });
    if (!row) throw naoEncontrado();
    return paraDetalhe(row);
  }

  private async gravarCampos(
    tx: Tx,
    modeloId: number,
    campos: CampoModelo[],
  ): Promise<CampoBanco[]> {
    const gravados: CampoBanco[] = [];
    for (const campo of ordenarCampos(campos)) {
      const criado = await tx.pesquisaCampo.create({
        data: {
          modeloId,
          chave: campo.chave,
          rotulo: campo.rotulo,
          tipoValor: campo.tipoValor,
          obrigatorio: campo.obrigatorio,
          ordem: campo.ordem,
        },
      });
      if (campo.opcoes.length) {
        await tx.pesquisaCampoOpcao.createMany({
          data: campo.opcoes.map((o) => ({
            campoId: criado.id,
            chave: o.chave,
            rotulo: o.rotulo,
            ordem: o.ordem,
          })),
        });
      }
      gravados.push({ ...criado, opcoes: campo.opcoes });
    }
    return gravados;
  }

  /** Snapshot imutável da estrutura; o histórico nunca é reescrito. */
  private async snapshot(
    tx: Tx,
    modeloId: number,
    numero: number,
    nome: string,
    publicoAlvo: string,
    campos: CampoBanco[],
    usuarioId: number,
    motivo?: string,
  ) {
    await tx.pesquisaModeloVersao.create({
      data: {
        modeloId,
        numero,
        nome,
        publicoAlvo,
        criadaEm: new Date(),
        criadaPor: usuarioId,
        motivo: motivo ?? null,
      },
    });
    for (const campo of campos) {
      await tx.pesquisaCampoVersao.create({
        data: {
          modeloId,
          numero,
          campoId: campo.id,
          chave: campo.chave,
          rotulo: campo.rotulo,
          tipoValor: campo.tipoValor,
          obrigatorio: campo.obrigatorio,
          ordem: campo.ordem,
          opcoes: campo.opcoes.length
            ? (campo.opcoes as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });
    }
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
      entidade: 'pesquisa_modelo',
      entidadeId,
      acao,
      antes,
      depois,
    });
  }

  async criar(contexto: ContextoAcesso, entrada: EntradaModeloPesquisa) {
    return this.autorizacao.executar(
      contexto,
      'pesquisas',
      'criar',
      async (tx, atual) => {
        const modelo = await tx.pesquisaModelo.create({
          data: {
            nome: entrada.nome,
            publicoAlvo: entrada.publicoAlvo,
            versaoAtual: 1,
          },
        });
        const campos = await this.gravarCampos(tx, modelo.id, entrada.campos);
        await this.snapshot(
          tx,
          modelo.id,
          1,
          modelo.nome,
          modelo.publicoAlvo,
          campos,
          atual.usuario.id,
        );
        await this.auditar(tx, atual, modelo.id, 'criar', undefined, {
          nome: modelo.nome,
          publicoAlvo: modelo.publicoAlvo,
          versao: 1,
          campos,
        });
        return paraDetalhe({ ...modelo, campos });
      },
    );
  }

  async alterar(
    contexto: ContextoAcesso,
    id: number,
    alteracao: AlteracaoModeloPesquisa,
  ) {
    return this.autorizacao.executar(
      contexto,
      'pesquisas',
      'alterar',
      async (tx, atual) => {
        await tx.$queryRaw`SELECT id FROM pesquisa_modelo WHERE id = ${id} FOR UPDATE`;
        const antes = await tx.pesquisaModelo.findUnique({
          where: { id },
          select: {
            ...CAMPOS_MODELO,
            campos: { include: { opcoes: true }, orderBy: { ordem: 'asc' } },
          },
        });
        if (!antes) throw naoEncontrado();
        const nome = alteracao.nome ?? antes.nome;
        const publicoAlvo = alteracao.publicoAlvo ?? antes.publicoAlvo;
        const camposAnteriores: CampoModelo[] = antes.campos.map((c) => ({
          chave: c.chave,
          rotulo: c.rotulo,
          tipoValor: c.tipoValor as CampoModelo['tipoValor'],
          obrigatorio: c.obrigatorio,
          ordem: c.ordem,
          opcoes: c.opcoes.map((o) => ({
            chave: o.chave,
            rotulo: o.rotulo,
            ordem: o.ordem,
          })),
        }));
        const camposNovos = alteracao.campos ?? camposAnteriores;

        const semanticaMudou =
          estruturaSemOrdem(nome, publicoAlvo, camposNovos) !==
          estruturaSemOrdem(antes.nome, antes.publicoAlvo, camposAnteriores);
        const algoMudou =
          estruturaCompleta(nome, publicoAlvo, camposNovos) !==
          estruturaCompleta(antes.nome, antes.publicoAlvo, camposAnteriores);

        if (!algoMudou) return paraDetalhe(antes);

        let campos = antes.campos as unknown as CampoBanco[];
        if (alteracao.campos !== undefined) {
          const porChave = new Map(antes.campos.map((c) => [c.chave, c]));
          const mantidos = new Set(alteracao.campos.map((c) => c.chave));
          const removidos = antes.campos.filter((c) => !mantidos.has(c.chave));
          // Perguntas de edições referenciam o campo vivo (FK Restrict): recusar com 409.
          const emUso = await tx.pesquisaPergunta.findMany({
            where: { campoId: { in: removidos.map((c) => c.id) } },
            distinct: ['campoId'],
            select: { campoId: true },
          });
          if (emUso.length) {
            const usados = new Set(emUso.map((p) => p.campoId));
            throw campoEmUso(
              removidos.filter((c) => usados.has(c.id)).map((c) => c.chave),
            );
          }
          await tx.pesquisaCampo.deleteMany({
            where: { modeloId: id, id: { in: removidos.map((c) => c.id) } },
          });
          campos = [];
          for (const campo of ordenarCampos(alteracao.campos)) {
            const existente = porChave.get(campo.chave);
            await tx.pesquisaCampoOpcao.deleteMany({
              where: { campoId: existente ? existente.id : -1 },
            });
            const gravado = existente
              ? await tx.pesquisaCampo.update({
                  where: { id: existente.id },
                  data: {
                    rotulo: campo.rotulo,
                    tipoValor: campo.tipoValor,
                    obrigatorio: campo.obrigatorio,
                    ordem: campo.ordem,
                  },
                })
              : await tx.pesquisaCampo.create({
                  data: {
                    modeloId: id,
                    chave: campo.chave,
                    rotulo: campo.rotulo,
                    tipoValor: campo.tipoValor,
                    obrigatorio: campo.obrigatorio,
                    ordem: campo.ordem,
                  },
                });
            if (campo.opcoes.length) {
              await tx.pesquisaCampoOpcao.createMany({
                data: campo.opcoes.map((o) => ({
                  campoId: gravado.id,
                  chave: o.chave,
                  rotulo: o.rotulo,
                  ordem: o.ordem,
                })),
              });
            }
            campos.push({ ...gravado, opcoes: campo.opcoes });
          }
        }

        let versao = antes.versaoAtual;
        if (semanticaMudou) {
          versao = antes.versaoAtual + 1;
          await tx.pesquisaModelo.update({
            where: { id },
            data: { versaoAtual: versao },
          });
          await this.snapshot(
            tx,
            id,
            versao,
            nome,
            publicoAlvo,
            campos,
            atual.usuario.id,
            alteracao.motivo,
          );
        }
        const atualizado = await tx.pesquisaModelo.update({
          where: { id },
          data: { nome, publicoAlvo },
          select: { ...CAMPOS_MODELO },
        });
        await this.auditar(
          tx,
          atual,
          id,
          'alterar',
          {
            nome: antes.nome,
            publicoAlvo: antes.publicoAlvo,
            versao: antes.versaoAtual,
            campos: camposAnteriores,
          },
          {
            nome,
            publicoAlvo,
            versao,
            campos: ordenarCampos(camposNovos),
            motivo: alteracao.motivo ?? null,
          },
        );
        return paraDetalhe({ ...atualizado, campos });
      },
    );
  }
}
