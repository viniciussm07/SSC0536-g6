import { Injectable } from '@nestjs/common';
import {
  ESQUEMA_DESTINATARIOS,
  ESQUEMA_PESQUISAS,
  conferirPeriodosCompativeis,
  situacaoPesquisa,
  type AlteracaoPesquisa,
  type EntradaPesquisa,
  type ErroCampo,
  type PesquisaDetalhe,
  type TipoColeta,
  type TipoPeriodo,
  type TipoValorCampo,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import { naoEncontrado } from '../acesso/acesso.errors';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import { dataCivil } from '../periodos/periodos.leitura';
import {
  campoBloqueadoPesquisa,
  estadoPesquisaInvalido,
  prazoNoPassado,
  reaberturaPendente,
  semDestinatarios,
} from './pesquisas.errors';
import {
  estadoAuditado,
  paraLinhaDestinatario,
  paraLinhaPesquisa,
  type PesquisaBanco,
} from './edicoes.leitura';
import { MAPA_PESQUISAS, mapaDestinatarios } from './pesquisas.odata';

type Tx = Prisma.TransactionClient;
type PesquisaCompleta = PesquisaBanco & {
  segmentoIds: number[];
  criadaEm: Date;
  abertaEm: Date | null;
  encerradaEm: Date | null;
  destinatariosRegistradosEm: Date | null;
};
type PeriodoBanco = {
  id: number;
  tipo: string;
  rotulo: string;
  dataInicio: Date;
  dataFim: Date;
};

/** Campos que só mudam em rascunho. */
const CAMPOS_DE_RASCUNHO = [
  'tipoColeta',
  'modeloId',
  'periodoIds',
  'segmentoIds',
] as const;

const mesmosIds = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const periodoCiclo = (p: PeriodoBanco) => ({
  id: p.id,
  rotulo: p.rotulo,
  dataInicio: dataCivil(p.dataInicio),
  dataFim: dataCivil(p.dataFim),
});

/** Público elegível: empreendimentos ativos, opcionalmente restritos a segmentos. */
export const filtroElegiveis = (
  segmentoIds: readonly number[],
): Prisma.EmpreendimentoWhereInput => ({
  situacao: 'ativo',
  ...(segmentoIds.length
    ? { segmentos: { some: { segmentoId: { in: [...segmentoIds] } } } }
    : {}),
});

@Injectable()
export class EdicoesPesquisaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  colecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_PESQUISAS,
      mapa: MAPA_PESQUISAS,
      escopo: [],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.pesquisa.findMany({ where, orderBy, skip, take }),
      contar: (where, db) => db.pesquisa.count({ where }),
      mapear: paraLinhaPesquisa,
    });
  }

  async destinatarios(pesquisaId: number, consulta: ConsultaColecao) {
    const existe = await this.prisma.pesquisa.findUnique({
      where: { id: pesquisaId },
      select: { id: true },
    });
    if (!existe) throw naoEncontrado();
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_DESTINATARIOS,
      mapa: mapaDestinatarios(pesquisaId),
      escopo: [{ pesquisaId }],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.pesquisaDestinatario.findMany({
          where,
          orderBy,
          skip,
          take,
          select: {
            empreendimentoId: true,
            empreendimento: {
              select: {
                nomeFantasia: true,
                respostas: {
                  where: { pesquisaId },
                  select: { respondidaEm: true },
                },
              },
            },
          },
        }),
      contar: (where, db) => db.pesquisaDestinatario.count({ where }),
      mapear: paraLinhaDestinatario,
    });
  }

  async detalhe(id: number, agora = new Date()): Promise<PesquisaDetalhe> {
    return this.montarDetalhe(this.prisma, id, agora);
  }

  private async montarDetalhe(
    db: Tx,
    id: number,
    agora: Date,
  ): Promise<PesquisaDetalhe> {
    const row = await db.pesquisa.findUnique({
      where: { id },
      include: {
        versao: { select: { nome: true, campos: true } },
        perguntas: {
          include: { periodo: true },
          orderBy: [{ periodoId: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!row) throw naoEncontrado();
    const camposVersao = new Map(row.versao.campos.map((c) => [c.campoId, c]));
    const periodos = new Map<number, PeriodoBanco>();
    for (const p of row.perguntas) periodos.set(p.periodoId, p.periodo);
    const registrados = row.destinatariosRegistradosEm !== null;
    const [elegiveis, destinatarios, respondentes] = await Promise.all([
      row.status === 'rascunho'
        ? db.empreendimento.count({ where: filtroElegiveis(row.segmentoIds) })
        : Promise.resolve(null),
      registrados
        ? db.pesquisaDestinatario.count({ where: { pesquisaId: id } })
        : Promise.resolve(null),
      registrados
        ? db.pesquisaDestinatario.count({
            where: {
              pesquisaId: id,
              empreendimento: { respostas: { some: { pesquisaId: id } } },
            },
          })
        : db.resposta.count({ where: { pesquisaId: id } }),
    ]);
    return {
      ...paraLinhaPesquisa(row),
      situacao: situacaoPesquisa(row, agora),
      modeloNome: row.versao.nome,
      segmentoIds: row.segmentoIds,
      criadaEm: row.criadaEm.toISOString(),
      abertaEm: row.abertaEm?.toISOString() ?? null,
      encerradaEm: row.encerradaEm?.toISOString() ?? null,
      periodos: [...periodos.values()]
        .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime())
        .map((p) => ({
          ...periodoCiclo(p),
          tipo: p.tipo as TipoPeriodo,
        })),
      perguntas: row.perguntas.map((p) => {
        const campo = camposVersao.get(p.campoId);
        return {
          id: p.id,
          periodoId: p.periodoId,
          campoId: p.campoId,
          chave: campo?.chave ?? '',
          rotulo: p.rotulo,
          tipoValor: (campo?.tipoValor ?? 'texto') as TipoValorCampo,
          obrigatorio: campo?.obrigatorio ?? false,
        };
      }),
      participacao: {
        elegiveis: registrados ? destinatarios : elegiveis,
        destinatarios,
        respondentes,
        pendentes: destinatarios === null ? null : destinatarios - respondentes,
      },
    };
  }

  private async carregarPeriodos(
    tx: Tx,
    ids: readonly number[],
  ): Promise<PeriodoBanco[]> {
    const periodos = await tx.periodo.findMany({
      where: { id: { in: [...ids] } },
      orderBy: { dataInicio: 'asc' },
    });
    if (periodos.length !== ids.length)
      throw entradaInvalidaCampos([
        { field: 'periodoIds', message: 'Período inexistente.' },
      ]);
    return periodos;
  }

  /** Versão vigente do modelo: a edição congela essa estrutura. */
  private async versaoVigente(tx: Tx, modeloId: number) {
    const modelo = await tx.pesquisaModelo.findUnique({
      where: { id: modeloId },
      select: { versaoAtual: true },
    });
    if (!modelo)
      throw entradaInvalidaCampos([
        { field: 'modeloId', message: 'Modelo inexistente.' },
      ]);
    const versao = await tx.pesquisaModeloVersao.findUnique({
      where: {
        modeloId_numero: { modeloId, numero: modelo.versaoAtual },
      },
      include: { campos: { orderBy: { ordem: 'asc' } } },
    });
    if (!versao)
      throw entradaInvalidaCampos([
        { field: 'modeloId', message: 'Modelo sem versão registrada.' },
      ]);
    return versao;
  }

  private async conferirSegmentos(tx: Tx, ids: readonly number[]) {
    if (!ids.length) return;
    const total = await tx.segmento.count({ where: { id: { in: [...ids] } } });
    if (total !== ids.length)
      throw entradaInvalidaCampos([
        { field: 'segmentoIds', message: 'Segmento inexistente.' },
      ]);
  }

  private conferirCompatibilidade(
    tipoColeta: TipoColeta,
    periodos: PeriodoBanco[],
    prazo: Date,
  ) {
    const erros: ErroCampo[] = conferirPeriodosCompativeis(
      tipoColeta,
      periodos.map(periodoCiclo),
      prazo,
    );
    if (erros.length) throw entradaInvalidaCampos(erros);
  }

  /** Uma pergunta por campo da versão e período, com o rótulo da versão. */
  private async gerarPerguntas(
    tx: Tx,
    pesquisaId: number,
    campos: { campoId: number; rotulo: string }[],
    periodos: PeriodoBanco[],
  ) {
    await tx.pesquisaPergunta.deleteMany({ where: { pesquisaId } });
    await tx.pesquisaPergunta.createMany({
      data: periodos.flatMap((p) =>
        campos.map((c) => ({
          pesquisaId,
          campoId: c.campoId,
          periodoId: p.id,
          rotulo: c.rotulo,
        })),
      ),
    });
  }

  private async travar(tx: Tx, id: number): Promise<PesquisaCompleta> {
    await tx.$queryRaw`SELECT id FROM pesquisa WHERE id = ${id} FOR UPDATE`;
    const row = await tx.pesquisa.findUnique({ where: { id } });
    if (!row) throw naoEncontrado();
    return row;
  }

  private async periodoIdsDe(tx: Tx, pesquisaId: number) {
    const linhas = await tx.pesquisaPergunta.findMany({
      where: { pesquisaId },
      distinct: ['periodoId'],
      select: { periodoId: true },
      orderBy: { periodoId: 'asc' },
    });
    return linhas.map((l) => l.periodoId);
  }

  private auditar(
    tx: Tx,
    atual: ContextoAcesso,
    entidadeId: number,
    acao: 'criar' | 'alterar' | 'excluir',
    antes: unknown,
    depois: unknown,
  ) {
    return registrarAuditoria(tx, {
      usuarioId: atual.usuario.id,
      entidade: 'pesquisa',
      entidadeId,
      acao,
      antes,
      depois,
    });
  }

  async criar(contexto: ContextoAcesso, entrada: EntradaPesquisa) {
    return this.autorizacao.executar(
      contexto,
      'pesquisas',
      'criar',
      async (tx, atual) => {
        const versao = await this.versaoVigente(tx, entrada.modeloId);
        const periodos = await this.carregarPeriodos(tx, entrada.periodoIds);
        await this.conferirSegmentos(tx, entrada.segmentoIds);
        const prazo = new Date(entrada.prazo);
        this.conferirCompatibilidade(entrada.tipoColeta, periodos, prazo);
        const criada = await tx.pesquisa.create({
          data: {
            titulo: entrada.titulo,
            tipoColeta: entrada.tipoColeta,
            modeloId: entrada.modeloId,
            modeloVersao: versao.numero,
            abertura: new Date(entrada.abertura),
            prazo,
            status: 'rascunho',
            segmentoIds: entrada.segmentoIds,
          },
        });
        await this.gerarPerguntas(tx, criada.id, versao.campos, periodos);
        await this.auditar(
          tx,
          atual,
          criada.id,
          'criar',
          undefined,
          estadoAuditado(criada, entrada.periodoIds),
        );
        return this.montarDetalhe(tx, criada.id, new Date());
      },
    );
  }

  async alterar(
    contexto: ContextoAcesso,
    id: number,
    alteracao: AlteracaoPesquisa,
  ) {
    return this.autorizacao.executar(
      contexto,
      'pesquisas',
      'alterar',
      async (tx, atual) => {
        const antes = await this.travar(tx, id);
        // Relógio lido após a trava: envios concorrentes já confirmados ficam antes.
        const agora = new Date();
        const situacao = situacaoPesquisa(antes, agora);
        if (situacao === 'encerrada')
          throw estadoPesquisaInvalido(situacao, 'alterar');
        const periodoIdsAntes = await this.periodoIdsDe(tx, id);
        const rascunho = situacao === 'rascunho';

        if (!rascunho) {
          const atuais = {
            tipoColeta: antes.tipoColeta,
            modeloId: antes.modeloId,
            periodoIds: periodoIdsAntes,
            segmentoIds: antes.segmentoIds,
          };
          const bloqueados: string[] = CAMPOS_DE_RASCUNHO.filter((c) => {
            const novo = alteracao[c];
            if (novo === undefined) return false;
            const velho = atuais[c];
            return Array.isArray(novo)
              ? !mesmosIds(novo, velho as number[])
              : novo !== velho;
          });
          if (
            alteracao.abertura !== undefined &&
            alteracao.abertura !== antes.abertura.toISOString() &&
            situacao !== 'agendada'
          )
            bloqueados.push('abertura');
          if (bloqueados.length) throw campoBloqueadoPesquisa(bloqueados);
        }

        const prazoMudou =
          alteracao.prazo !== undefined &&
          alteracao.prazo !== antes.prazo.toISOString();
        if (prazoMudou && situacao === 'expirada') throw reaberturaPendente();

        const tipoColeta =
          alteracao.tipoColeta ?? (antes.tipoColeta as TipoColeta);
        const abertura = alteracao.abertura
          ? new Date(alteracao.abertura)
          : antes.abertura;
        const prazo = alteracao.prazo ? new Date(alteracao.prazo) : antes.prazo;
        if (prazo <= abertura)
          throw entradaInvalidaCampos([
            {
              field: 'prazo',
              message: 'O prazo deve ser posterior à abertura.',
            },
          ]);
        if (!rascunho) {
          if (prazoMudou && prazo <= agora) throw prazoNoPassado();
          if (
            abertura.getTime() !== antes.abertura.getTime() &&
            abertura <= agora
          )
            throw entradaInvalidaCampos([
              {
                field: 'abertura',
                message: 'A nova abertura precisa estar no futuro.',
              },
            ]);
        }

        const trocarModelo = rascunho && alteracao.modeloId !== undefined;
        const versao = trocarModelo
          ? await this.versaoVigente(tx, alteracao.modeloId!)
          : null;
        const periodoIds = alteracao.periodoIds ?? periodoIdsAntes;
        const periodos = await this.carregarPeriodos(tx, periodoIds);
        const segmentoIds = alteracao.segmentoIds ?? antes.segmentoIds;
        await this.conferirSegmentos(tx, segmentoIds);
        this.conferirCompatibilidade(tipoColeta, periodos, prazo);

        const regenerar =
          (versao !== null &&
            (versao.modeloId !== antes.modeloId ||
              versao.numero !== antes.modeloVersao)) ||
          !mesmosIds(periodoIds, periodoIdsAntes);
        const depois = await tx.pesquisa.update({
          where: { id },
          data: {
            titulo: alteracao.titulo ?? antes.titulo,
            tipoColeta,
            abertura,
            prazo,
            segmentoIds,
            ...(versao
              ? { modeloId: versao.modeloId, modeloVersao: versao.numero }
              : {}),
          },
        });
        if (regenerar) {
          const campos =
            versao?.campos ??
            (
              await tx.pesquisaModeloVersao.findUniqueOrThrow({
                where: {
                  modeloId_numero: {
                    modeloId: antes.modeloId,
                    numero: antes.modeloVersao,
                  },
                },
                include: { campos: { orderBy: { ordem: 'asc' } } },
              })
            ).campos;
          await this.gerarPerguntas(tx, id, campos, periodos);
        }
        await this.auditar(
          tx,
          atual,
          id,
          'alterar',
          estadoAuditado(antes, periodoIdsAntes),
          {
            ...estadoAuditado(depois, periodoIds),
            motivo: alteracao.motivo ?? null,
          },
        );
        return this.montarDetalhe(tx, id, agora);
      },
    );
  }

  /**
   * Abre a edição: congela o público elegível, grava o evento para notificações (parte 14)
   * e audita, tudo na mesma transação. Abertura no passado passa a valer agora.
   */
  async abrir(contexto: ContextoAcesso, id: number) {
    return this.autorizacao.executar(
      contexto,
      'pesquisas',
      'alterar',
      async (tx, atual) => {
        const antes = await this.travar(tx, id);
        // Relógio lido após a trava: envios concorrentes já confirmados ficam antes.
        const agora = new Date();
        const situacao = situacaoPesquisa(antes, agora);
        if (situacao !== 'rascunho')
          throw estadoPesquisaInvalido(situacao, 'abrir');
        if (antes.prazo <= agora) throw prazoNoPassado();
        const periodoIds = await this.periodoIdsDe(tx, id);
        const periodos = await this.carregarPeriodos(tx, periodoIds);
        this.conferirCompatibilidade(
          antes.tipoColeta as TipoColeta,
          periodos,
          antes.prazo,
        );
        const elegiveis = await tx.empreendimento.findMany({
          where: filtroElegiveis(antes.segmentoIds),
          select: { id: true },
          orderBy: { id: 'asc' },
        });
        if (!elegiveis.length) throw semDestinatarios();
        await tx.pesquisaDestinatario.createMany({
          data: elegiveis.map((e) => ({
            pesquisaId: id,
            empreendimentoId: e.id,
            incluidoEm: agora,
          })),
        });
        const abertura = antes.abertura < agora ? agora : antes.abertura;
        const depois = await tx.pesquisa.update({
          where: { id },
          data: {
            status: 'aberta',
            abertura,
            abertaEm: agora,
            destinatariosRegistradosEm: agora,
          },
        });
        await tx.pesquisaEvento.create({
          data: { pesquisaId: id, tipo: 'aberta', criadoEm: agora },
        });
        await this.auditar(
          tx,
          atual,
          id,
          'alterar',
          estadoAuditado(antes, periodoIds),
          {
            ...estadoAuditado(depois, periodoIds),
            destinatarios: elegiveis.length,
          },
        );
        return this.montarDetalhe(tx, id, agora);
      },
    );
  }

  /** Encerramento manual; a expiração pelo prazo já bloqueia envios sem job agendado. */
  async encerrar(contexto: ContextoAcesso, id: number) {
    return this.autorizacao.executar(
      contexto,
      'pesquisas',
      'alterar',
      async (tx, atual) => {
        const antes = await this.travar(tx, id);
        // Relógio lido após a trava: envios concorrentes já confirmados ficam antes.
        const agora = new Date();
        if (antes.status !== 'aberta')
          throw estadoPesquisaInvalido(
            situacaoPesquisa(antes, agora),
            'encerrar',
          );
        const periodoIds = await this.periodoIdsDe(tx, id);
        const depois = await tx.pesquisa.update({
          where: { id },
          data: { status: 'encerrada', encerradaEm: agora },
        });
        await this.auditar(
          tx,
          atual,
          id,
          'alterar',
          estadoAuditado(antes, periodoIds),
          estadoAuditado(depois, periodoIds),
        );
        return this.montarDetalhe(tx, id, agora);
      },
    );
  }

  /** Só rascunhos são excluídos; edições abertas preservam histórico. */
  async excluir(contexto: ContextoAcesso, id: number) {
    return this.autorizacao.executar(
      contexto,
      'pesquisas',
      'alterar',
      async (tx, atual) => {
        const antes = await this.travar(tx, id);
        if (antes.status !== 'rascunho')
          throw estadoPesquisaInvalido(
            situacaoPesquisa(antes, new Date()),
            'excluir',
          );
        const periodoIds = await this.periodoIdsDe(tx, id);
        await tx.pesquisaPergunta.deleteMany({ where: { pesquisaId: id } });
        await tx.pesquisa.delete({ where: { id } });
        await this.auditar(
          tx,
          atual,
          id,
          'excluir',
          estadoAuditado(antes, periodoIds),
          undefined,
        );
      },
    );
  }
}
