import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import { Injectable } from '@nestjs/common';
import {
  CAMPOS_CAPACIDADE,
  ehRetroativa,
  localizarVigente,
  planejarCorrecao,
  planejarMudancaReal,
  podeSerCompleta,
  validarRespostasCatalogo,
  type CampoCapacidade,
  type EntradaConferenciaInventario,
  type EntradaVersaoInventario,
  type ErroCampo,
  type EstadoCampoInventario,
  type RespostaItemInventario,
  type VersaoInventarioDetalhe,
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
import { paraGrupo } from '../catalogo/catalogo.leitura';
import {
  alteracaoRetroativaRestrita,
  conferenciaRestrita,
  versaoSubstituida,
  vigenciaConflitante,
} from './inventario.errors';
import {
  horaParaBanco,
  incluirVersao,
  lerVersao,
  paraCapacidade,
  paraDetalhe,
  type VersaoBanco,
} from './inventario.leitura';

type Tx = Prisma.TransactionClient;
const json = (valor: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(valor ?? null)) as Prisma.InputJsonValue;
const data = (texto: string) => new Date(`${texto}T00:00:00.000Z`);
const dia = (d: Date) => d.toISOString().slice(0, 10);
/** Data civil de hoje no fuso operacional (a API trafega em UTC; a regra de negócio, não). */
const hojeOperacional = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );

@Injectable()
export class InventarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  /** Vínculo e escopo primeiro (404 sem confirmar existência); só depois o contexto. */
  private async autorizar(
    db: Tx | PrismaService,
    contexto: ContextoAcesso,
    id: number,
    acao: 'consultar' | 'criar' | 'alterar',
    contextoEntidade: number | null,
  ) {
    if (contextoEntidade === null) throw contextoObrigatorio();
    const filtro = await this.autorizacao.filtroEmpreendimentos(
      contexto,
      'inventarios',
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
  }

  /** Capacidade e itens válidos na data (padrão: hoje); `null` quando nenhuma versão cobre a data. */
  async vigente(
    contexto: ContextoAcesso,
    id: number,
    dataConsulta: string | undefined,
    contextoEntidade: number | null,
  ): Promise<VersaoInventarioDetalhe | null> {
    await this.autorizar(
      this.prisma,
      contexto,
      id,
      'consultar',
      contextoEntidade,
    );
    const alvo = dataConsulta ?? hojeOperacional();
    const row = await this.prisma.inventarioVersao.findFirst({
      where: {
        empreendimentoId: id,
        substituidaPorId: null,
        vigenciaInicio: { lte: data(alvo) },
        OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: data(alvo) } }],
      },
      include: incluirVersao,
    });
    return row ? paraDetalhe(row) : null;
  }

  async detalhe(
    contexto: ContextoAcesso,
    id: number,
    versaoId: number,
    contextoEntidade: number | null,
  ) {
    await this.autorizar(
      this.prisma,
      contexto,
      id,
      'consultar',
      contextoEntidade,
    );
    const row = await lerVersao(this.prisma, id, versaoId);
    if (!row) throw naoEncontrado();
    return paraDetalhe(row);
  }

  /** Catálogo (ativo e inativo) dos segmentos do empreendimento, para validar as respostas. */
  private async catalogo(tx: Tx, empreendimentoId: number) {
    const grupos = await tx.catalogoGrupo.findMany({
      where: { segmento: { empreendimentos: { some: { empreendimentoId } } } },
      include: { itens: true },
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
    });
    return grupos.map(paraGrupo);
  }

  async criarVersao(
    contexto: ContextoAcesso,
    id: number,
    entrada: EntradaVersaoInventario,
    contextoEntidade: number | null,
  ): Promise<VersaoInventarioDetalhe> {
    try {
      return await this.autorizacao.executar(
        contexto,
        'inventarios',
        'criar',
        async (tx, atual, escopo) => {
          await this.autorizar(tx, atual, id, 'criar', contextoEntidade);
          // Serializa atualizações do mesmo empreendimento; a constraint de exclusão é a rede de segurança.
          await tx.$queryRaw`SELECT id FROM empreendimento WHERE id = ${id} FOR UPDATE`;
          const existentes = (
            await tx.inventarioVersao.findMany({
              where: { empreendimentoId: id, substituidaPorId: null },
              select: { id: true, vigenciaInicio: true, vigenciaFim: true },
              orderBy: { vigenciaInicio: 'asc' },
            })
          ).map((v) => ({
            id: v.id,
            inicio: dia(v.vigenciaInicio),
            fim: v.vigenciaFim ? dia(v.vigenciaFim) : null,
          }));

          let inicio: string;
          let fim: string | null;
          let fechar: { id: number; fim: string }[] = [];
          let baseId: number | null;
          if (entrada.tipoAlteracao === 'correcao') {
            const plano = planejarCorrecao(existentes, entrada.corrigeId!);
            if (!plano.valido) throw entradaInvalidaCampos(plano.erros);
            ({ inicio, fim } = plano.alvo);
            baseId = plano.alvo.id;
          } else {
            inicio = entrada.vigenciaInicio!;
            if (escopo !== 'todos' && ehRetroativa(inicio, hojeOperacional()))
              throw alteracaoRetroativaRestrita();
            const plano = planejarMudancaReal(
              existentes,
              inicio,
              entrada.vigenciaFim ?? null,
            );
            if (!plano.valido) throw entradaInvalidaCampos(plano.erros);
            fechar = plano.fechar;
            fim = plano.fim;
            // Herança: a versão que cobre a data; sem ela, a imediatamente anterior.
            baseId =
              (
                localizarVigente(existentes, inicio) ??
                [...existentes].reverse().find((v) => v.inicio < inicio)
              )?.id ?? null;
          }
          const base: VersaoBanco | null = baseId
            ? await lerVersao(tx, id, baseId)
            : null;

          const { campos, estados } = this.resolverCapacidade(entrada, base);
          const itens = await this.resolverItens(tx, id, entrada.itens, base);

          const criada = await tx.inventarioVersao.create({
            data: {
              empreendimentoId: id,
              criadaPor: atual.usuario.id,
              vigenciaInicio: data(inicio),
              vigenciaFim: fim ? data(fim) : null,
              tipoAlteracao: entrada.tipoAlteracao,
              situacaoConferencia: 'pendente',
              motivo: entrada.motivo ?? null,
              estados: json(estados),
              ...campos,
              itens: { create: itens },
            },
            include: incluirVersao,
          });
          for (const f of fechar) {
            await tx.inventarioVersao.update({
              where: { id: f.id },
              data: { vigenciaFim: data(f.fim) },
            });
            await this.auditar(
              tx,
              atual,
              f.id,
              'alterar',
              { vigenciaFim: existentes.find((e) => e.id === f.id)!.fim },
              {
                vigenciaFim: f.fim,
                motivo: 'Nova versão iniciada',
                versaoNova: criada.id,
              },
            );
          }
          if (entrada.tipoAlteracao === 'correcao') {
            await tx.inventarioVersao.update({
              where: { id: baseId! },
              data: { substituidaPorId: criada.id },
            });
            await this.auditar(
              tx,
              atual,
              baseId!,
              'alterar',
              { substituidaPorId: null },
              { substituidaPorId: criada.id, motivo: entrada.motivo },
            );
          }
          await this.auditar(tx, atual, criada.id, 'criar', undefined, {
            empreendimentoId: id,
            tipoAlteracao: entrada.tipoAlteracao,
            vigenciaInicio: inicio,
            vigenciaFim: fim,
            corrige: entrada.tipoAlteracao === 'correcao' ? baseId : undefined,
            motivo: entrada.motivo,
            capacidade: paraCapacidade(criada),
            itens: criada.itens.map(
              ({ itemId, itemVersao, estado, detalhe, quantidade }) => ({
                itemId,
                itemVersao,
                estado,
                detalhe,
                quantidade,
              }),
            ),
          });
          return paraDetalhe(criada);
        },
      );
    } catch (erro) {
      // Exclusão adiada: duas atualizações concorrentes só colidem no commit.
      if (
        erro instanceof Error &&
        /inventario_versao_vigencia_excl|23P01/.test(
          `${erro.message} ${JSON.stringify((erro as { meta?: unknown }).meta ?? '')}`,
        )
      )
        throw vigenciaConflitante();
      throw erro;
    }
  }

  /**
   * Capacidade efetiva: campo informado/desconhecido/não se aplica/vazio vem da entrada; campo
   * omitido herda da base (ou fica desconhecido, sem base). Zero é sempre valor informado.
   */
  private resolverCapacidade(
    entrada: EntradaVersaoInventario,
    base: VersaoBanco | null,
  ) {
    const baseCapacidade = base ? paraCapacidade(base) : null;
    const campos: Record<string, number | boolean | Date | null> = {};
    const estados: Partial<Record<CampoCapacidade, EstadoCampoInventario>> = {};
    for (const campo of CAMPOS_CAPACIDADE) {
      const recebido = entrada.capacidade[campo];
      let estado: EstadoCampoInventario;
      let valor: number | boolean | string | null = null;
      if (recebido.estado === 'ausente') {
        const anterior = baseCapacidade?.[campo];
        estado = anterior?.estado ?? 'desconhecido';
        valor = anterior?.valor ?? null;
      } else if (recebido.estado === 'informado') {
        estado = 'informado';
        valor = recebido.valor;
      } else estado = recebido.estado;
      campos[campo] =
        valor !== null && (campo === 'checkin' || campo === 'checkout')
          ? horaParaBanco(valor as string)
          : (valor as number | boolean | null);
      if (estado !== 'informado') estados[campo] = estado;
    }
    return { campos, estados };
  }

  /**
   * Respostas do catálogo: as enviadas valem para itens ativos; as não enviadas herdam da base.
   * As regras do grupo (exclusivo, seleção única) valem para o conjunto final.
   */
  private async resolverItens(
    tx: Tx,
    empreendimentoId: number,
    enviados: RespostaItemInventario[],
    base: VersaoBanco | null,
  ) {
    const grupos = await this.catalogo(tx, empreendimentoId);
    if (enviados.length && !grupos.length)
      throw entradaInvalidaCampos([
        {
          field: 'itens',
          message:
            'O empreendimento não tem segmento com catálogo de inventário.',
        },
      ]);
    const itensCatalogo = new Map(
      grupos.flatMap((g) => g.itens.map((i) => [i.id, i] as const)),
    );
    const validados = validarRespostasCatalogo(grupos, enviados);
    if (!validados.valido) throw entradaInvalidaCampos(validados.erros);

    const herdados = (base?.itens ?? []).filter(
      (i) => !validados.data.some((e) => e.itemId === i.itemId),
    );
    const efetivos: RespostaItemInventario[] = [
      ...herdados.map((i) => ({
        itemId: i.itemId,
        estado: i.estado as RespostaItemInventario['estado'],
        detalhe: i.detalhe,
        quantidade: i.quantidade,
      })),
      ...validados.data,
    ];
    const conjunto = validarRespostasCatalogo(grupos, efetivos, {
      somenteAtivos: false,
    });
    if (!conjunto.valido)
      throw entradaInvalidaCampos(
        conjunto.erros.map((e: ErroCampo) => ({ ...e })),
      );
    return [
      ...herdados.map((i) => ({
        itemId: i.itemId,
        itemVersao: i.itemVersao,
        estado: i.estado,
        detalhe: i.detalhe,
        quantidade: i.quantidade,
      })),
      ...validados.data.map((r) => ({
        itemId: r.itemId,
        itemVersao: itensCatalogo.get(r.itemId)!.versao,
        estado: r.estado,
        detalhe: r.detalhe ?? null,
        quantidade: r.quantidade ?? null,
      })),
    ];
  }

  /** Conferência (completo/parcial/pendente) é decisão da equipe e não altera o conteúdo da versão. */
  async conferir(
    contexto: ContextoAcesso,
    id: number,
    versaoId: number,
    entrada: EntradaConferenciaInventario,
    contextoEntidade: number | null,
  ): Promise<VersaoInventarioDetalhe> {
    return this.autorizacao.executar(
      contexto,
      'inventarios',
      'alterar',
      async (tx, atual, escopo) => {
        await this.autorizar(tx, atual, id, 'alterar', contextoEntidade);
        if (escopo !== 'todos') throw conferenciaRestrita();
        await tx.$queryRaw`SELECT id FROM inventario_versao WHERE id = ${versaoId} FOR UPDATE`;
        const antes = await lerVersao(tx, id, versaoId);
        if (!antes) throw naoEncontrado();
        if (antes.substituidaPorId !== null) throw versaoSubstituida();
        if (
          entrada.situacaoConferencia === 'completo' &&
          !podeSerCompleta(paraCapacidade(antes))
        )
          throw entradaInvalidaCampos([
            {
              field: 'situacaoConferencia',
              message:
                'Para marcar como completo, UH e leitos precisam estar informados.',
            },
          ]);
        if (antes.situacaoConferencia === entrada.situacaoConferencia)
          return paraDetalhe(antes);
        await tx.inventarioVersao.update({
          where: { id: versaoId },
          data: { situacaoConferencia: entrada.situacaoConferencia },
        });
        await this.auditar(
          tx,
          atual,
          versaoId,
          'alterar',
          { situacaoConferencia: antes.situacaoConferencia },
          {
            situacaoConferencia: entrada.situacaoConferencia,
            ...(entrada.motivo ? { motivo: entrada.motivo } : {}),
          },
        );
        return paraDetalhe((await lerVersao(tx, id, versaoId))!);
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
      entidade: 'inventario_versao',
      entidadeId,
      acao,
      antes,
      depois,
    });
  }
}
