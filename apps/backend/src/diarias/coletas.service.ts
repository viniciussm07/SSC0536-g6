import { Injectable } from '@nestjs/common';
import {
  ESQUEMA_COLETAS_DIARIAS,
  type AlteracaoColetaDiaria,
  type EntradaColetaDiaria,
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
import { coletaDiariaConflito, coletaDiariaDuplicada } from './diarias.errors';
import { MAPA_COLETAS_DIARIAS } from './diarias.odata';
import { travarPorChave } from './diarias.locks';
import {
  incluirColeta,
  normalizarDecimal,
  paraColeta,
  type ColetaBanco,
} from './diarias.leitura';

type Tx = Prisma.TransactionClient;
type ColetaCarregada = Prisma.ColetaDiariaGetPayload<{
  include: typeof incluirColeta;
}>;

@Injectable()
export class ColetasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  colecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_COLETAS_DIARIAS,
      mapa: MAPA_COLETAS_DIARIAS,
      escopo: [],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.coletaDiaria.findMany({
          where,
          orderBy,
          skip,
          take,
          include: incluirColeta,
        }),
      contar: (where, db) => db.coletaDiaria.count({ where }),
      mapear: (row) => paraColeta(row as ColetaBanco),
    });
  }

  async detalhe(id: number) {
    const row = await this.prisma.coletaDiaria.findUnique({
      where: { id },
      include: incluirColeta,
    });
    if (!row) throw naoEncontrado();
    return paraColeta(row);
  }

  private async conferirPeriodo(
    tx: Tx,
    periodoId: number,
    dataEstadia: string,
  ) {
    const periodo = await tx.periodo.findUnique({
      where: { id: periodoId },
      select: { dataInicio: true, dataFim: true },
    });
    if (!periodo)
      throw entradaInvalidaCampos([
        { field: 'periodoId', message: 'Período inexistente.' },
      ]);
    const data = new Date(`${dataEstadia}T00:00:00Z`);
    if (data < periodo.dataInicio || data > periodo.dataFim)
      throw entradaInvalidaCampos([
        {
          field: 'dataEstadia',
          message: 'A data de estadia deve pertencer ao período selecionado.',
        },
      ]);
  }

  private async conferirEmpreendimento(tx: Tx, empreendimentoId: number) {
    const existe = await tx.empreendimento.findUnique({
      where: { id: empreendimentoId },
      select: { id: true },
    });
    if (!existe)
      throw entradaInvalidaCampos([
        { field: 'empreendimentoId', message: 'Empreendimento inexistente.' },
      ]);
  }

  private identidade(entrada: {
    empreendimentoId: number;
    periodoId: number;
    fonte: string;
    dataEstadia: string;
    tipoDia: string;
  }) {
    return {
      empreendimentoId: entrada.empreendimentoId,
      periodoId: entrada.periodoId,
      fonte: entrada.fonte,
      dataEstadia: new Date(`${entrada.dataEstadia}T00:00:00Z`),
      tipoDia: entrada.tipoDia,
    };
  }

  private chaveIdentidade(entrada: {
    empreendimentoId: number;
    periodoId: number;
    fonte: string;
    dataEstadia: string;
    tipoDia: string;
  }) {
    return [
      'coleta-diaria',
      entrada.empreendimentoId,
      entrada.periodoId,
      entrada.fonte,
      entrada.dataEstadia,
      entrada.tipoDia,
    ].join(':');
  }

  private async conferirIdentidade(
    tx: Tx,
    entrada: {
      empreendimentoId: number;
      periodoId: number;
      fonte: string;
      dataEstadia: string;
      tipoDia: string;
      valorDiaria: string;
    },
    ignorarId?: number,
  ) {
    const existente = await tx.coletaDiaria.findFirst({
      where: {
        ...this.identidade(entrada),
        ...(ignorarId === undefined ? {} : { id: { not: ignorarId } }),
      },
      select: { valorDiaria: true },
    });
    if (!existente) return;
    if (
      normalizarDecimal(existente.valorDiaria.toString()) ===
      normalizarDecimal(entrada.valorDiaria)
    )
      throw coletaDiariaDuplicada();
    throw coletaDiariaConflito();
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
      entidade: 'coleta_diaria',
      entidadeId,
      acao,
      antes,
      depois,
    });
  }

  private equal(alteracao: AlteracaoColetaDiaria, antes: ColetaCarregada) {
    const igual = (valor: unknown, atual: unknown): boolean =>
      valor === undefined || valor === atual;
    return (
      igual(alteracao.empreendimentoId, antes.empreendimentoId) &&
      igual(alteracao.periodoId, antes.periodoId) &&
      igual(alteracao.fonte, antes.fonte) &&
      (alteracao.dataColeta === undefined ||
        alteracao.dataColeta === dataCivil(antes.dataColeta)) &&
      (alteracao.dataEstadia === undefined ||
        alteracao.dataEstadia === dataCivil(antes.dataEstadia)) &&
      igual(alteracao.tipoDia, antes.tipoDia) &&
      (alteracao.valorDiaria === undefined ||
        normalizarDecimal(alteracao.valorDiaria) ===
          normalizarDecimal(antes.valorDiaria.toString())) &&
      igual(alteracao.moeda, antes.moeda) &&
      igual(alteracao.unidadePreco, antes.unidadePreco) &&
      igual(alteracao.referenciaOrigem, antes.referenciaOrigem) &&
      igual(alteracao.observacao, antes.observacao)
    );
  }

  async criar(contexto: ContextoAcesso, entrada: EntradaColetaDiaria) {
    return this.autorizacao.executar(
      contexto,
      'calculos',
      'criar',
      async (tx, atual) => {
        await this.conferirEmpreendimento(tx, entrada.empreendimentoId);
        await this.conferirPeriodo(tx, entrada.periodoId, entrada.dataEstadia);
        await travarPorChave(tx, this.chaveIdentidade(entrada));
        await this.conferirIdentidade(tx, entrada);
        const criada = await tx.coletaDiaria.create({
          data: {
            empreendimentoId: entrada.empreendimentoId,
            periodoId: entrada.periodoId,
            fonte: entrada.fonte,
            dataColeta: new Date(`${entrada.dataColeta}T00:00:00Z`),
            dataEstadia: new Date(`${entrada.dataEstadia}T00:00:00Z`),
            tipoDia: entrada.tipoDia,
            valorDiaria: entrada.valorDiaria,
            moeda: entrada.moeda ?? 'BRL',
            unidadePreco: entrada.unidadePreco ?? 'por_uh_diaria',
            origem: 'manual',
            situacaoConferencia: 'pendente',
            referenciaOrigem: entrada.referenciaOrigem ?? null,
            observacao: entrada.observacao ?? null,
          },
          include: incluirColeta,
        });
        const depois = paraColeta(criada);
        await this.auditar(tx, atual, criada.id, 'criar', undefined, depois);
        return depois;
      },
    );
  }

  async alterar(
    contexto: ContextoAcesso,
    id: number,
    alteracao: AlteracaoColetaDiaria,
  ) {
    return this.autorizacao.executar(
      contexto,
      'calculos',
      'alterar',
      async (tx, atual) => {
        await tx.$queryRaw`SELECT id FROM coleta_diaria WHERE id = ${id} FOR UPDATE`;
        const antes = await tx.coletaDiaria.findUnique({
          where: { id },
          include: incluirColeta,
        });
        if (!antes) throw naoEncontrado();

        const empreendimentoId =
          alteracao.empreendimentoId ?? antes.empreendimentoId;
        const periodoId = alteracao.periodoId ?? antes.periodoId;
        const dataEstadia =
          alteracao.dataEstadia ?? dataCivil(antes.dataEstadia);
        const fonte = alteracao.fonte ?? antes.fonte;
        const tipoDia = alteracao.tipoDia ?? antes.tipoDia;
        const identidadeMudou =
          empreendimentoId !== antes.empreendimentoId ||
          periodoId !== antes.periodoId ||
          (alteracao.fonte !== undefined && alteracao.fonte !== antes.fonte) ||
          dataEstadia !== dataCivil(antes.dataEstadia) ||
          (alteracao.tipoDia !== undefined &&
            alteracao.tipoDia !== antes.tipoDia);
        if (empreendimentoId !== antes.empreendimentoId)
          await this.conferirEmpreendimento(tx, empreendimentoId);
        if (
          periodoId !== antes.periodoId ||
          dataEstadia !== dataCivil(antes.dataEstadia)
        )
          await this.conferirPeriodo(tx, periodoId, dataEstadia);

        const negocioMudou = !this.equal(alteracao, antes);
        if (
          negocioMudou &&
          (identidadeMudou || alteracao.valorDiaria !== undefined)
        ) {
          const identidade = {
            empreendimentoId,
            periodoId,
            fonte,
            dataEstadia,
            tipoDia,
          };
          await travarPorChave(tx, this.chaveIdentidade(identidade));
          await this.conferirIdentidade(
            tx,
            {
              ...identidade,
              valorDiaria:
                alteracao.valorDiaria ?? antes.valorDiaria.toString(),
            },
            id,
          );
        }

        const situacaoAnterior = antes.situacaoConferencia;
        const situacao = negocioMudou
          ? 'pendente'
          : (alteracao.situacaoConferencia ?? situacaoAnterior);
        const conferida = situacao === 'conferida' || situacao === 'divergente';
        const conferidoEm = conferida ? new Date() : null;
        const conferidoPorUsuarioId = conferida ? atual.usuario.id : null;

        const semMudanca =
          !negocioMudou &&
          situacao === situacaoAnterior &&
          (alteracao.situacaoConferencia === undefined ||
            alteracao.situacaoConferencia === situacaoAnterior);
        if (!semMudanca) {
          await tx.coletaDiaria.update({
            where: { id },
            data: {
              empreendimentoId,
              periodoId,
              fonte,
              dataColeta:
                alteracao.dataColeta === undefined
                  ? antes.dataColeta
                  : new Date(`${alteracao.dataColeta}T00:00:00Z`),
              dataEstadia: new Date(`${dataEstadia}T00:00:00Z`),
              tipoDia,
              valorDiaria:
                alteracao.valorDiaria ?? antes.valorDiaria.toString(),
              moeda: alteracao.moeda ?? antes.moeda,
              unidadePreco: alteracao.unidadePreco ?? antes.unidadePreco,
              referenciaOrigem:
                alteracao.referenciaOrigem === undefined
                  ? antes.referenciaOrigem
                  : alteracao.referenciaOrigem,
              observacao:
                alteracao.observacao === undefined
                  ? antes.observacao
                  : alteracao.observacao,
              situacaoConferencia: situacao,
              conferidoEm,
              conferidoPorUsuarioId,
            },
          });
        }

        const depois = await tx.coletaDiaria.findUniqueOrThrow({
          where: { id },
          include: incluirColeta,
        });
        if (!semMudanca)
          await this.auditar(
            tx,
            atual,
            id,
            'alterar',
            paraColeta(antes),
            paraColeta(depois),
          );
        return paraColeta(depois);
      },
    );
  }
}
