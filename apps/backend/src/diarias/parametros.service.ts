import { Injectable } from '@nestjs/common';
import {
  ESQUEMA_PARAMETROS_CALCULO,
  SITUACAO_PARAMETRO_PADRAO,
  UNIDADE_PARAMETRO_PADRAO,
  type AlteracaoParametroCalculo,
  type EntradaParametroCalculo,
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
  parametroDuplicado,
  parametroVigenciaSobreposta,
} from './diarias.errors';
import { travarPorChave } from './diarias.locks';
import { MAPA_PARAMETROS_CALCULO } from './diarias.odata';
import {
  normalizarDecimal,
  paraParametro,
  type ParametroBanco,
} from './diarias.leitura';

type Tx = Prisma.TransactionClient;

@Injectable()
export class ParametrosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  colecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_PARAMETROS_CALCULO,
      mapa: MAPA_PARAMETROS_CALCULO,
      escopo: [],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.parametroCalculo.findMany({ where, orderBy, skip, take }),
      contar: (where, db) => db.parametroCalculo.count({ where }),
      mapear: (row) => paraParametro(row as ParametroBanco),
    });
  }

  async detalhe(id: number) {
    const row = await this.prisma.parametroCalculo.findUnique({
      where: { id },
    });
    if (!row) throw naoEncontrado();
    return paraParametro(row);
  }

  private async conferirVigencia(
    tx: Tx,
    chave: string,
    vigenciaInicio: string,
    vigenciaFim: string | null,
    ignorarId?: number,
  ) {
    if (vigenciaFim !== null && vigenciaFim < vigenciaInicio)
      throw entradaInvalidaCampos([
        {
          field: 'vigenciaFim',
          message: 'O fim da vigência não pode ser anterior ao início.',
        },
      ]);
    await travarPorChave(tx, `parametro-calculo:${chave}`);
    const inicio = new Date(`${vigenciaInicio}T00:00:00Z`);
    const existentes = await tx.parametroCalculo.findMany({
      where: {
        chave,
        ...(ignorarId === undefined ? {} : { id: { not: ignorarId } }),
      },
      select: { id: true, vigenciaInicio: true, vigenciaFim: true },
    });
    if (
      existentes.some(
        (outro) => outro.vigenciaInicio.getTime() === inicio.getTime(),
      )
    )
      throw parametroDuplicado();
    const fim =
      vigenciaFim === null ? null : new Date(`${vigenciaFim}T00:00:00Z`);
    for (const outro of existentes) {
      const sobrepoe =
        (fim === null || outro.vigenciaInicio <= fim) &&
        (outro.vigenciaFim === null || inicio <= outro.vigenciaFim);
      if (sobrepoe) throw parametroVigenciaSobreposta();
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
      entidade: 'parametro_calculo',
      entidadeId,
      acao,
      antes,
      depois,
    });
  }

  async criar(contexto: ContextoAcesso, entrada: EntradaParametroCalculo) {
    return this.autorizacao.executar(
      contexto,
      'calculos',
      'criar',
      async (tx, atual) => {
        const vigenciaFim = entrada.vigenciaFim ?? null;
        await this.conferirVigencia(
          tx,
          entrada.chave,
          entrada.vigenciaInicio,
          vigenciaFim,
        );
        const criado = await tx.parametroCalculo.create({
          data: {
            chave: entrada.chave,
            valor: entrada.valor,
            unidade: entrada.unidade ?? UNIDADE_PARAMETRO_PADRAO,
            vigenciaInicio: new Date(`${entrada.vigenciaInicio}T00:00:00Z`),
            vigenciaFim:
              vigenciaFim === null
                ? null
                : new Date(`${vigenciaFim}T00:00:00Z`),
            fonte: entrada.fonte ?? null,
            situacao: entrada.situacao ?? SITUACAO_PARAMETRO_PADRAO,
            observacao: entrada.observacao ?? null,
          },
        });
        const depois = paraParametro(criado);
        await this.auditar(tx, atual, criado.id, 'criar', undefined, depois);
        return depois;
      },
    );
  }

  async alterar(
    contexto: ContextoAcesso,
    id: number,
    alteracao: AlteracaoParametroCalculo,
  ) {
    return this.autorizacao.executar(
      contexto,
      'calculos',
      'alterar',
      async (tx, atual) => {
        await tx.$queryRaw`SELECT id FROM parametro_calculo WHERE id = ${id} FOR UPDATE`;
        const antes = await tx.parametroCalculo.findUnique({ where: { id } });
        if (!antes) throw naoEncontrado();

        const chave = alteracao.chave ?? antes.chave;
        const vigenciaInicio =
          alteracao.vigenciaInicio ?? dataCivil(antes.vigenciaInicio);
        const vigenciaAnterior =
          antes.vigenciaFim === null ? null : dataCivil(antes.vigenciaFim);
        const vigenciaFim =
          alteracao.vigenciaFim === undefined
            ? vigenciaAnterior
            : alteracao.vigenciaFim;
        const vigenciaMudou =
          chave !== antes.chave ||
          vigenciaInicio !== dataCivil(antes.vigenciaInicio) ||
          vigenciaFim !== vigenciaAnterior;
        if (vigenciaMudou)
          await this.conferirVigencia(
            tx,
            chave,
            vigenciaInicio,
            vigenciaFim,
            id,
          );

        const mudou =
          chave !== antes.chave ||
          (alteracao.valor !== undefined &&
            normalizarDecimal(alteracao.valor) !==
              normalizarDecimal(antes.valor.toString())) ||
          (alteracao.unidade !== undefined &&
            alteracao.unidade !== antes.unidade) ||
          vigenciaInicio !== dataCivil(antes.vigenciaInicio) ||
          vigenciaFim !== vigenciaAnterior ||
          (alteracao.fonte !== undefined && alteracao.fonte !== antes.fonte) ||
          (alteracao.situacao !== undefined &&
            alteracao.situacao !== antes.situacao) ||
          (alteracao.observacao !== undefined &&
            alteracao.observacao !== antes.observacao);
        if (mudou) {
          await tx.parametroCalculo.update({
            where: { id },
            data: {
              chave,
              valor: alteracao.valor ?? antes.valor.toString(),
              unidade: alteracao.unidade ?? antes.unidade,
              vigenciaInicio: new Date(`${vigenciaInicio}T00:00:00Z`),
              vigenciaFim:
                vigenciaFim === null
                  ? null
                  : new Date(`${vigenciaFim}T00:00:00Z`),
              fonte:
                alteracao.fonte === undefined ? antes.fonte : alteracao.fonte,
              situacao: alteracao.situacao ?? antes.situacao,
              observacao:
                alteracao.observacao === undefined
                  ? antes.observacao
                  : alteracao.observacao,
            },
          });
        }
        const depois = await tx.parametroCalculo.findUniqueOrThrow({
          where: { id },
        });
        if (mudou)
          await this.auditar(
            tx,
            atual,
            id,
            'alterar',
            paraParametro(antes),
            paraParametro(depois),
          );
        return paraParametro(depois);
      },
    );
  }
}
