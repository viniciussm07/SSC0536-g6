import { Injectable } from '@nestjs/common';
import {
  CANAL_RESPOSTA_SISTEMA,
  ESQUEMA_PESQUISAS_RESPONDENTE,
  conferirItensResposta,
  situacaoPesquisa,
  type EnvioResposta,
  type FormularioResposta,
  type ItemNormalizado,
  type OpcaoPergunta,
  type PerguntaResposta,
  type StatusPesquisa,
  type TipoColeta,
  type TipoPeriodo,
  type TipoValorCampo,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import {
  contextoDivergente,
  contextoObrigatorio,
  naoEncontrado,
} from '../acesso/acesso.errors';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import { dataCivil } from '../periodos/periodos.leitura';
import { exigirRecebimento } from './recebimento';
import { mapaPesquisasRespondente } from './pesquisas.odata';

type Tx = Prisma.TransactionClient;
type Db = Tx | PrismaService;

/** Valor canônico de um item gravado, comparável ao normalizado pelo common. */
const valorGravado = (item: {
  valorNumerico: Prisma.Decimal | null;
  valorTexto: string | null;
}) =>
  item.valorNumerico !== null
    ? item.valorNumerico.toFixed()
    : (item.valorTexto ?? '');

const opcoesDe = (valor: Prisma.JsonValue | null): OpcaoPergunta[] | null => {
  if (!Array.isArray(valor)) return null;
  return valor
    .filter(
      (o): o is { chave: string; rotulo: string; ordem?: number } =>
        typeof o === 'object' &&
        o !== null &&
        !Array.isArray(o) &&
        typeof o.chave === 'string' &&
        typeof o.rotulo === 'string',
    )
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((o) => ({ chave: o.chave, rotulo: o.rotulo }));
};

/** Estado auditado: itens como pares pergunta/valor, sem metadados de sessão. */
const estadoAuditado = (
  pesquisaId: number,
  empreendimentoId: number,
  itens: { perguntaId: number; valor: string }[],
) => ({
  pesquisaId,
  empreendimentoId,
  canal: CANAL_RESPOSTA_SISTEMA,
  itens: [...itens].sort((a, b) => a.perguntaId - b.perguntaId),
});

const paraItens = (itens: ItemNormalizado[]) =>
  itens.map((i) => ({
    perguntaId: i.perguntaId,
    valor: i.valorNumerico ?? i.valorTexto ?? '',
  }));

const mesmosItens = (
  a: { perguntaId: number; valor: string }[],
  b: { perguntaId: number; valor: string }[],
) => {
  if (a.length !== b.length) return false;
  const mapa = new Map(a.map((i) => [i.perguntaId, i.valor]));
  return b.every((i) => mapa.get(i.perguntaId) === i.valor);
};

/**
 * Resposta do empreendimento às edições destinadas a ele (parte 13). A autoria vem da
 * sessão; o empreendimento, do vínculo ativo e do contexto selecionado.
 */
@Injectable()
export class RespostasPesquisaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  /** Vínculo e escopo primeiro (404 sem confirmar existência); só depois o contexto. */
  private async autorizar(
    db: Db,
    contexto: ContextoAcesso,
    id: number,
    acao: 'consultar' | 'criar' | 'alterar',
    contextoEntidade: number | null,
  ) {
    if (contextoEntidade === null) throw contextoObrigatorio();
    const filtro = await this.autorizacao.filtroEmpreendimentos(
      contexto,
      'respostas',
      acao,
      db as Tx,
    );
    if (
      !(await db.empreendimento.findFirst({
        where: { AND: [{ id }, filtro] },
        select: { id: true },
      }))
    )
      throw naoEncontrado();
    if (contextoEntidade !== id) throw contextoDivergente();
    return filtro;
  }

  /** Painel: edições publicadas cujo público congelado inclui o empreendimento. */
  async painel(
    contexto: ContextoAcesso,
    id: number,
    consulta: ConsultaColecao,
    contextoEntidade: number | null,
  ) {
    const filtro = await this.autorizar(
      this.prisma,
      contexto,
      id,
      'consultar',
      contextoEntidade,
    );
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_PESQUISAS_RESPONDENTE,
      mapa: mapaPesquisasRespondente(id),
      escopo: [
        { empreendimentoId: id },
        { empreendimento: filtro },
        { pesquisa: { status: { not: 'rascunho' } } },
      ],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.pesquisaDestinatario.findMany({
          where: where as Prisma.PesquisaDestinatarioWhereInput,
          orderBy:
            orderBy as Prisma.PesquisaDestinatarioOrderByWithRelationInput[],
          skip,
          take,
          include: {
            pesquisa: {
              include: {
                respostas: {
                  where: { empreendimentoId: id },
                  select: { respondidaEm: true },
                },
              },
            },
          },
        }),
      contar: (where, db) =>
        db.pesquisaDestinatario.count({
          where: where as Prisma.PesquisaDestinatarioWhereInput,
        }),
      mapear: (row) => {
        const resposta = row.pesquisa.respostas[0];
        return {
          pesquisaId: row.pesquisaId,
          titulo: row.pesquisa.titulo,
          tipoColeta: row.pesquisa.tipoColeta as TipoColeta,
          status: row.pesquisa.status as StatusPesquisa,
          abertura: row.pesquisa.abertura.toISOString(),
          prazo: row.pesquisa.prazo.toISOString(),
          situacaoResposta: resposta ? 'respondeu' : 'pendente',
          respondidaEm: resposta ? resposta.respondidaEm.toISOString() : null,
        };
      },
    });
  }

  async formulario(
    contexto: ContextoAcesso,
    id: number,
    pesquisaId: number,
    contextoEntidade: number | null,
    agora = new Date(),
  ): Promise<FormularioResposta> {
    await this.autorizar(
      this.prisma,
      contexto,
      id,
      'consultar',
      contextoEntidade,
    );
    return this.montar(this.prisma, id, pesquisaId, agora);
  }

  /**
   * Formulário da edição para o empreendimento: só edições publicadas das quais ele é
   * destinatário (ou já respondeu). Tipo, obrigatoriedade e opções vêm da versão congelada.
   */
  private async montar(
    db: Db,
    id: number,
    pesquisaId: number,
    agora: Date,
  ): Promise<FormularioResposta> {
    const row = await db.pesquisa.findFirst({
      where: {
        id: pesquisaId,
        status: { not: 'rascunho' },
        OR: [
          { destinatarios: { some: { empreendimentoId: id } } },
          { respostas: { some: { empreendimentoId: id } } },
        ],
      },
      include: {
        versao: { select: { campos: true } },
        perguntas: { include: { periodo: true } },
        respostas: {
          where: { empreendimentoId: id },
          include: { itens: true },
        },
      },
    });
    if (!row) throw naoEncontrado();
    const campos = new Map(row.versao.campos.map((c) => [c.campoId, c]));
    const periodos = new Map(
      row.perguntas.map((p) => [p.periodoId, p.periodo]),
    );
    const ordenadas = [...row.perguntas].sort(
      (a, b) =>
        a.periodo.dataInicio.getTime() - b.periodo.dataInicio.getTime() ||
        a.periodoId - b.periodoId ||
        (campos.get(a.campoId)?.ordem ?? 0) -
          (campos.get(b.campoId)?.ordem ?? 0) ||
        a.id - b.id,
    );
    const perguntas: PerguntaResposta[] = ordenadas.map((p) => {
      const campo = campos.get(p.campoId);
      const tipoValor = (campo?.tipoValor ?? 'texto') as TipoValorCampo;
      return {
        id: p.id,
        periodoId: p.periodoId,
        chave: campo?.chave ?? '',
        rotulo: p.rotulo,
        tipoValor,
        obrigatorio: campo?.obrigatorio ?? false,
        opcoes:
          tipoValor === 'escolha'
            ? (opcoesDe(campo?.opcoes ?? null) ?? [])
            : null,
      };
    });
    const resposta = row.respostas[0];
    return {
      pesquisaId: row.id,
      titulo: row.titulo,
      tipoColeta: row.tipoColeta as TipoColeta,
      abertura: row.abertura.toISOString(),
      prazo: row.prazo.toISOString(),
      situacao: situacaoPesquisa(row, agora),
      periodos: [...periodos.values()]
        .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime())
        .map((p) => ({
          id: p.id,
          tipo: p.tipo as TipoPeriodo,
          rotulo: p.rotulo,
          dataInicio: dataCivil(p.dataInicio),
          dataFim: dataCivil(p.dataFim),
        })),
      perguntas,
      resposta: resposta
        ? {
            id: resposta.id,
            respondidaEm: resposta.respondidaEm.toISOString(),
            atualizadaEm: resposta.atualizadaEm?.toISOString() ?? null,
            canal: resposta.canal,
            itens: resposta.itens
              .map((i) => ({
                perguntaId: i.perguntaId,
                valor: valorGravado(i),
              }))
              .sort((a, b) => a.perguntaId - b.perguntaId),
          }
        : null,
    };
  }

  /**
   * Envio idempotente: cria a resposta ou substitui o conjunto de itens enquanto a edição
   * recebe respostas. O mesmo conteúdo reenviado (duplo clique, nova tentativa após falha
   * de rede) não grava nem audita de novo. Envios do mesmo empreendimento à mesma edição
   * são serializados; `exigirRecebimento` serializa com o encerramento.
   */
  async enviar(
    contexto: ContextoAcesso,
    id: number,
    pesquisaId: number,
    entrada: EnvioResposta,
    contextoEntidade: number | null,
  ): Promise<{ criada: boolean; formulario: FormularioResposta }> {
    return this.autorizacao.executar(
      contexto,
      'respostas',
      'criar',
      async (tx, atual) => {
        await this.autorizar(tx, atual, id, 'criar', contextoEntidade);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${pesquisaId}::int, ${id}::int)`;
        // Relógio lido depois dos bloqueios: o prazo vale no instante da gravação.
        const agora = new Date();
        await exigirRecebimento(tx, pesquisaId, id, agora);
        const atualForm = await this.montar(tx, id, pesquisaId, agora);
        const conferido = conferirItensResposta(
          atualForm.perguntas,
          entrada.itens,
        );
        if (!conferido.valido) throw entradaInvalidaCampos(conferido.erros);
        const novos = paraItens(conferido.data);
        const existente = atualForm.resposta;
        if (existente) {
          await this.autorizar(tx, atual, id, 'alterar', contextoEntidade);
          if (mesmosItens(existente.itens, novos))
            return { criada: false, formulario: atualForm };
          await tx.respostaItem.deleteMany({
            where: { respostaId: existente.id },
          });
          await tx.respostaItem.createMany({
            data: conferido.data.map((i) => ({
              respostaId: existente.id,
              ...i,
            })),
          });
          await tx.resposta.update({
            where: { id: existente.id },
            data: { atualizadaEm: agora },
          });
          await this.auditar(
            tx,
            atual,
            existente.id,
            'alterar',
            estadoAuditado(pesquisaId, id, existente.itens),
            estadoAuditado(pesquisaId, id, novos),
          );
        } else {
          const criada = await tx.resposta.create({
            data: {
              pesquisaId,
              empreendimentoId: id,
              usuarioId: atual.usuario.id,
              respondidaEm: agora,
              canal: CANAL_RESPOSTA_SISTEMA,
            },
          });
          await tx.respostaItem.createMany({
            data: conferido.data.map((i) => ({ respostaId: criada.id, ...i })),
          });
          await this.auditar(
            tx,
            atual,
            criada.id,
            'criar',
            null,
            estadoAuditado(pesquisaId, id, novos),
          );
        }
        return {
          criada: !existente,
          formulario: await this.montar(tx, id, pesquisaId, agora),
        };
      },
    );
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
      entidade: 'resposta',
      entidadeId,
      acao,
      antes,
      depois,
    });
  }
}
