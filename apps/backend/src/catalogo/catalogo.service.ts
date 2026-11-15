import { Injectable } from '@nestjs/common';
import {
  consistenciaItemFinal,
  ESQUEMA_CATALOGO_GRUPOS,
  ESQUEMA_CATALOGO_ITENS,
  ESQUEMA_CATALOGO_VERSOES,
  validarRespostasCatalogo,
  type AlteracaoGrupoCatalogo,
  type AlteracaoItemCatalogo,
  type EntradaGrupoCatalogo,
  type EntradaItemCatalogo,
  type FormularioCatalogo,
  type GrupoCatalogo,
  type ItemCatalogo,
  type SelecaoGrupo,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import { naoEncontrado } from '../acesso/acesso.errors';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import { chaveDuplicada } from './catalogo.errors';
import {
  MAPA_CATALOGO_GRUPOS,
  MAPA_CATALOGO_ITENS,
  MAPA_CATALOGO_VERSOES,
} from './catalogo.odata';

type Tx = Prisma.TransactionClient;
type ItemBanco = Prisma.CatalogoItemGetPayload<object>;
type GrupoBanco = Prisma.CatalogoGrupoGetPayload<{
  include: { itens: true };
}>;
const json = (valor: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(valor ?? null)) as Prisma.InputJsonValue;

const paraItem = (i: ItemBanco): ItemCatalogo => ({
  id: i.id,
  grupoId: i.grupoId,
  chave: i.chave,
  rotulo: i.rotulo,
  exclusivo: i.exclusivo,
  outro: i.outro,
  aceitaQuantidade: i.aceitaQuantidade,
  ordem: i.ordem,
  ativo: i.ativo,
  versao: i.versaoAtual,
});
const paraGrupo = (g: GrupoBanco): GrupoCatalogo => ({
  id: g.id,
  segmentoId: g.segmentoId,
  chave: g.chave,
  pergunta: g.pergunta,
  selecao: g.selecao as SelecaoGrupo,
  permiteOutro: g.permiteOutro,
  secao: g.secao,
  ordem: g.ordem,
  ativo: g.ativo,
  itens: [...g.itens]
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .map(paraItem),
});

@Injectable()
export class CatalogoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  private async grupos(
    segmentoId: number,
    incluirInativos: boolean,
  ): Promise<GrupoCatalogo[]> {
    const grupos = await this.prisma.catalogoGrupo.findMany({
      where: { segmentoId, ...(incluirInativos ? {} : { ativo: true }) },
      include: {
        itens: incluirInativos ? true : { where: { ativo: true } },
      },
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
    });
    return grupos.map(paraGrupo);
  }

  /** Definição do formulário; só quem consulta catálogos vê itens e grupos inativos. */
  async formulario(
    contexto: ContextoAcesso,
    segmentoId: number,
    incluirInativos: boolean,
  ): Promise<FormularioCatalogo> {
    if (!(await this.prisma.segmento.findUnique({ where: { id: segmentoId } })))
      throw naoEncontrado();
    if (incluirInativos)
      await this.autorizacao.exigir(contexto, 'catalogos', 'consultar');
    return {
      segmentoId,
      grupos: await this.grupos(segmentoId, incluirInativos),
    };
  }

  /** Valida respostas contra o catálogo ativo com as mesmas regras usadas por inventário e importação. */
  async validar(segmentoId: number, corpo: unknown) {
    if (!(await this.prisma.segmento.findUnique({ where: { id: segmentoId } })))
      throw naoEncontrado();
    const itens =
      typeof corpo === 'object' && corpo !== null && 'itens' in corpo
        ? (corpo as { itens: unknown }).itens
        : undefined;
    const resultado = validarRespostasCatalogo(
      // Carrega também os inativos para recusá-los com mensagem clara (não como "desconhecidos").
      await this.grupos(segmentoId, true),
      itens,
    );
    if (!resultado.valido) throw entradaInvalidaCampos(resultado.erros);
    return { itens: resultado.data };
  }

  grupoColecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_CATALOGO_GRUPOS,
      mapa: MAPA_CATALOGO_GRUPOS,
      escopo: [],
      buscar: ({ where, orderBy, skip, take }) =>
        this.prisma.catalogoGrupo.findMany({
          where: where as Prisma.CatalogoGrupoWhereInput,
          orderBy: orderBy as Prisma.CatalogoGrupoOrderByWithRelationInput[],
          skip,
          take,
        }),
      contar: (where) =>
        this.prisma.catalogoGrupo.count({
          where: where as Prisma.CatalogoGrupoWhereInput,
        }),
      mapear: (g) => ({
        id: g.id,
        segmentoId: g.segmentoId,
        chave: g.chave,
        pergunta: g.pergunta,
        secao: g.secao,
        selecao: g.selecao as SelecaoGrupo,
        permiteOutro: g.permiteOutro,
        ordem: g.ordem,
        ativo: g.ativo,
      }),
    });
  }

  itemColecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_CATALOGO_ITENS,
      mapa: MAPA_CATALOGO_ITENS,
      escopo: [],
      buscar: ({ where, orderBy, skip, take }) =>
        this.prisma.catalogoItem.findMany({
          where: where as Prisma.CatalogoItemWhereInput,
          orderBy: orderBy as Prisma.CatalogoItemOrderByWithRelationInput[],
          skip,
          take,
          include: { grupo: { select: { chave: true } } },
        }),
      contar: (where) =>
        this.prisma.catalogoItem.count({
          where: where as Prisma.CatalogoItemWhereInput,
        }),
      mapear: (i) => ({ ...paraItem(i), grupoChave: i.grupo.chave }),
    });
  }

  async versoes(itemId: number, consulta: ConsultaColecao) {
    if (!(await this.prisma.catalogoItem.findUnique({ where: { id: itemId } })))
      throw naoEncontrado();
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_CATALOGO_VERSOES,
      mapa: MAPA_CATALOGO_VERSOES,
      escopo: [{ itemId }],
      buscar: ({ where, orderBy, skip, take }) =>
        this.prisma.catalogoItemVersao.findMany({
          where: where as Prisma.CatalogoItemVersaoWhereInput,
          orderBy:
            orderBy as Prisma.CatalogoItemVersaoOrderByWithRelationInput[],
          skip,
          take,
        }),
      contar: (where) =>
        this.prisma.catalogoItemVersao.count({
          where: where as Prisma.CatalogoItemVersaoWhereInput,
        }),
      mapear: (v) => ({
        numero: v.numero,
        rotulo: v.rotulo,
        pergunta: v.pergunta,
        selecao: v.selecao as SelecaoGrupo,
        exclusivo: v.exclusivo,
        outro: v.outro,
        aceitaQuantidade: v.aceitaQuantidade,
        criadaEm: v.criadaEm.toISOString(),
        motivo: v.motivo,
      }),
    });
  }

  private snapshot(
    tx: Tx,
    item: Pick<
      ItemBanco,
      'id' | 'rotulo' | 'exclusivo' | 'outro' | 'aceitaQuantidade'
    >,
    grupo: { pergunta: string; selecao: string },
    numero: number,
    usuarioId: number,
    motivo?: string,
  ) {
    return tx.catalogoItemVersao.create({
      data: {
        itemId: item.id,
        numero,
        rotulo: item.rotulo,
        pergunta: grupo.pergunta,
        selecao: grupo.selecao,
        exclusivo: item.exclusivo,
        outro: item.outro,
        aceitaQuantidade: item.aceitaQuantidade,
        criadaEm: new Date(),
        criadaPor: usuarioId,
        motivo: motivo ?? null,
      },
    });
  }
  private auditar(
    tx: Tx,
    atual: ContextoAcesso,
    entidade: 'catalogo_grupo' | 'catalogo_item',
    entidadeId: number,
    acao: 'criar' | 'alterar',
    antes: unknown,
    depois: unknown,
  ) {
    return tx.auditoria.create({
      data: {
        usuarioId: atual.usuario.id,
        entidade,
        entidadeId,
        acao,
        antes: antes === undefined ? undefined : json(antes),
        depois: json(depois),
        em: new Date(),
      },
    });
  }

  async criarGrupo(contexto: ContextoAcesso, entrada: EntradaGrupoCatalogo) {
    return this.autorizacao.executar(
      contexto,
      'catalogos',
      'criar',
      async (tx, atual) => {
        if (
          !(await tx.segmento.findUnique({ where: { id: entrada.segmentoId } }))
        )
          throw entradaInvalidaCampos([
            { field: 'segmentoId', message: 'Segmento inexistente.' },
          ]);
        if (
          await tx.catalogoGrupo.findUnique({ where: { chave: entrada.chave } })
        )
          throw chaveDuplicada('chave');
        const criado = await tx.catalogoGrupo.create({
          data: {
            segmentoId: entrada.segmentoId,
            chave: entrada.chave,
            pergunta: entrada.pergunta,
            selecao: entrada.selecao,
            permiteOutro: entrada.permiteOutro,
            secao: entrada.secao ?? null,
            ordem: entrada.ordem,
          },
          include: { itens: true },
        });
        await this.auditar(
          tx,
          atual,
          'catalogo_grupo',
          criado.id,
          'criar',
          undefined,
          {
            ...entrada,
          },
        );
        return paraGrupo(criado);
      },
    );
  }

  async alterarGrupo(
    contexto: ContextoAcesso,
    id: number,
    alteracao: AlteracaoGrupoCatalogo,
  ) {
    return this.autorizacao.executar(
      contexto,
      'catalogos',
      'alterar',
      async (tx, atual) => {
        await tx.$queryRaw`SELECT id FROM catalogo_grupo WHERE id = ${id} FOR UPDATE`;
        const antes = await tx.catalogoGrupo.findUnique({
          where: { id },
          include: { itens: true },
        });
        if (!antes) throw naoEncontrado();
        const { motivo, ...campos } = alteracao;
        const mudou = (Object.keys(campos) as (keyof typeof campos)[]).filter(
          (c) => campos[c] !== antes[c],
        );
        if (!mudou.length) return paraGrupo(antes);
        await tx.catalogoGrupo.update({ where: { id }, data: campos });
        let versionados: number[] = [];
        // A pergunta compõe o significado de cada item: nova versão preserva a leitura histórica.
        if (
          campos.pergunta !== undefined &&
          campos.pergunta !== antes.pergunta
        ) {
          for (const item of antes.itens) {
            const numero = item.versaoAtual + 1;
            await tx.catalogoItem.update({
              where: { id: item.id },
              data: { versaoAtual: numero },
            });
            await this.snapshot(
              tx,
              item,
              { pergunta: campos.pergunta, selecao: antes.selecao },
              numero,
              atual.usuario.id,
              motivo,
            );
          }
          versionados = antes.itens.map((i) => i.id);
        }
        await this.auditar(
          tx,
          atual,
          'catalogo_grupo',
          id,
          'alterar',
          Object.fromEntries(mudou.map((c) => [c, antes[c]])),
          {
            ...Object.fromEntries(mudou.map((c) => [c, campos[c]])),
            ...(versionados.length ? { itensVersionados: versionados } : {}),
            ...(motivo ? { motivo } : {}),
          },
        );
        return paraGrupo(
          await tx.catalogoGrupo.findUniqueOrThrow({
            where: { id },
            include: { itens: true },
          }),
        );
      },
    );
  }

  async criarItem(contexto: ContextoAcesso, entrada: EntradaItemCatalogo) {
    return this.autorizacao.executar(
      contexto,
      'catalogos',
      'criar',
      async (tx, atual) => {
        const grupo = await tx.catalogoGrupo.findUnique({
          where: { id: entrada.grupoId },
        });
        if (!grupo)
          throw entradaInvalidaCampos([
            { field: 'grupoId', message: 'Grupo inexistente.' },
          ]);
        const erros = consistenciaItemFinal(entrada, grupo.permiteOutro);
        if (erros.length) throw entradaInvalidaCampos(erros);
        if (
          await tx.catalogoItem.findUnique({ where: { chave: entrada.chave } })
        )
          throw chaveDuplicada('chave');
        const criado = await tx.catalogoItem.create({
          data: {
            grupoId: entrada.grupoId,
            chave: entrada.chave,
            rotulo: entrada.rotulo,
            exclusivo: entrada.exclusivo,
            outro: entrada.outro,
            aceitaQuantidade: entrada.aceitaQuantidade,
            ordem: entrada.ordem,
          },
        });
        await this.snapshot(tx, criado, grupo, 1, atual.usuario.id);
        await this.auditar(
          tx,
          atual,
          'catalogo_item',
          criado.id,
          'criar',
          undefined,
          {
            ...entrada,
            versao: 1,
          },
        );
        return paraItem(criado);
      },
    );
  }

  async alterarItem(
    contexto: ContextoAcesso,
    id: number,
    alteracao: AlteracaoItemCatalogo,
  ) {
    return this.autorizacao.executar(
      contexto,
      'catalogos',
      'alterar',
      async (tx, atual) => {
        await tx.$queryRaw`SELECT id FROM catalogo_item WHERE id = ${id} FOR UPDATE`;
        const antes = await tx.catalogoItem.findUnique({
          where: { id },
          include: { grupo: true },
        });
        if (!antes) throw naoEncontrado();
        const { motivo, ...campos } = alteracao;
        const final = {
          exclusivo: campos.exclusivo ?? antes.exclusivo,
          outro: campos.outro ?? antes.outro,
          aceitaQuantidade: campos.aceitaQuantidade ?? antes.aceitaQuantidade,
        };
        const erros = consistenciaItemFinal(final, antes.grupo.permiteOutro);
        if (erros.length) throw entradaInvalidaCampos(erros);
        const mudou = (Object.keys(campos) as (keyof typeof campos)[]).filter(
          (c) => campos[c] !== antes[c],
        );
        if (!mudou.length) return paraItem(antes);
        // Rótulo e regras criam versão; ordem e situação são apresentação/disponibilidade.
        const versionar = mudou.some((c) =>
          ['rotulo', 'exclusivo', 'outro', 'aceitaQuantidade'].includes(c),
        );
        const numero = versionar ? antes.versaoAtual + 1 : antes.versaoAtual;
        const atualizado = await tx.catalogoItem.update({
          where: { id },
          data: { ...campos, versaoAtual: numero },
        });
        if (versionar)
          await this.snapshot(
            tx,
            atualizado,
            antes.grupo,
            numero,
            atual.usuario.id,
            motivo,
          );
        await this.auditar(
          tx,
          atual,
          'catalogo_item',
          id,
          'alterar',
          {
            ...Object.fromEntries(mudou.map((c) => [c, antes[c]])),
            versao: antes.versaoAtual,
          },
          {
            ...Object.fromEntries(mudou.map((c) => [c, campos[c]])),
            versao: numero,
            ...(motivo ? { motivo } : {}),
          },
        );
        return paraItem(atualizado);
      },
    );
  }
}
