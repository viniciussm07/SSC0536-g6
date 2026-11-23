import { Injectable } from '@nestjs/common';
import {
  CANAL_RESPOSTA_IMPORTACAO,
  duracaoDias,
  situacaoPesquisa,
  validarEntradaConfirmacao,
  validarEntradaConflito,
  validarEntradaDecisao,
  validarEntradaDestino,
  type CandidatoEmpreendimento,
  type ConfirmacaoLote,
  type DestinoImportacao,
  type EntradaConfirmacao,
  type ItemPlano,
  type PlanoImportacao,
  type ResultadoConfirmacao,
  type SituacaoPesquisa,
} from '@ssc0536/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import { naoEncontrado } from '../acesso/acesso.errors';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import { celulaCsv } from '../colecoes/csv';
import { dataCivil } from '../periodos/periodos.leitura';
import {
  destinoIncompativel,
  destinoTravado,
  linhaAplicada,
  loteNaoLido,
  loteSemDestino,
  nadaAConfirmar,
  planoDesatualizado,
  semConflito,
  semVinculo,
} from './importacoes.errors';
import {
  chaveNome,
  planejar,
  type DecisaoPlano,
  type LinhaPlano,
} from './plano';

type Db = Prisma.TransactionClient | PrismaService;
type Tx = Prisma.TransactionClient;

/** Situações em que uma edição aceita carga retroativa; rascunho e agendada ainda não existem para o público. */
const SITUACOES_COM_CARGA: readonly SituacaoPesquisa[] = [
  'recebendo',
  'expirada',
  'encerrada',
];
/** Serializa confirmações na mesma edição (par de chaves de advisory lock, distinto do de respostas). */
const CHAVE_CONFIRMACAO = 536009;

interface DestinoCarregado extends DestinoImportacao {
  situacao: SituacaoPesquisa;
  publicoRegistrado: boolean;
  duracao: number;
}

@Injectable()
export class ConciliacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async carregarDestino(
    db: Db,
    pesquisaId: number | null,
    perguntaId: number | null,
    agora = new Date(),
  ): Promise<DestinoCarregado | null> {
    if (pesquisaId === null || perguntaId === null) return null;
    const pergunta = await db.pesquisaPergunta.findUnique({
      where: { id: perguntaId },
      include: { pesquisa: true, periodo: true },
    });
    if (!pergunta || pergunta.pesquisaId !== pesquisaId) return null;
    const p = pergunta.pesquisa;
    return {
      pesquisaId,
      perguntaId,
      tituloPesquisa: p.titulo,
      rotuloPeriodo: pergunta.periodo.rotulo,
      dataInicio: dataCivil(pergunta.periodo.dataInicio),
      dataFim: dataCivil(pergunta.periodo.dataFim),
      situacao: situacaoPesquisa(
        {
          status: p.status as 'rascunho' | 'aberta' | 'encerrada',
          abertura: p.abertura.toISOString(),
          prazo: p.prazo.toISOString(),
        },
        agora,
      ),
      publicoRegistrado: p.destinatariosRegistradosEm !== null,
      duracao: duracaoDias(
        dataCivil(pergunta.periodo.dataInicio),
        dataCivil(pergunta.periodo.dataFim),
      ),
    };
  }

  /** Edição consolidada recebendo carga e pergunta cujo campo é percentual na versão da edição. */
  private async validarDestino(tx: Tx, pesquisaId: number, perguntaId: number) {
    const pergunta = await tx.pesquisaPergunta.findUnique({
      where: { id: perguntaId },
      include: { pesquisa: true },
    });
    if (!pergunta || pergunta.pesquisaId !== pesquisaId) throw naoEncontrado();
    if (pergunta.pesquisa.tipoColeta !== 'consolidado')
      throw destinoIncompativel(
        'A planilha de tabulação consolidada só alimenta edições do tipo consolidado.',
      );
    const versao = await tx.pesquisaCampoVersao.findFirst({
      where: {
        modeloId: pergunta.pesquisa.modeloId,
        numero: pergunta.pesquisa.modeloVersao,
        campoId: pergunta.campoId,
      },
    });
    if (!versao || versao.tipoValor !== 'percentual')
      throw destinoIncompativel(
        'A pergunta escolhida não é um percentual de ocupação.',
      );
    const destino = await this.carregarDestino(tx, pesquisaId, perguntaId);
    if (!destino || !SITUACOES_COM_CARGA.includes(destino.situacao))
      throw destinoIncompativel(
        'A edição ainda não foi aberta; a carga retroativa só vale para edições abertas, expiradas ou encerradas.',
      );
    return destino;
  }

  private async lerLote(tx: Tx, id: number) {
    await tx.$queryRaw`SELECT id FROM importacao_lote WHERE id = ${id} FOR UPDATE`;
    const lote = await tx.importacaoLote.findUnique({ where: { id } });
    if (!lote) throw naoEncontrado();
    return lote;
  }

  async definirDestino(contexto: ContextoAcesso, id: number, corpo: unknown) {
    const entrada = validarEntradaDestino(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    await this.autorizacao.executar(
      contexto,
      'importacoes',
      'alterar',
      async (tx, atual) => {
        const lote = await this.lerLote(tx, id);
        if (lote.estado !== 'lido') throw loteNaoLido();
        if (await tx.importacaoAplicacao.count({ where: { loteId: id } }))
          throw destinoTravado();
        const destino = await this.validarDestino(
          tx,
          entrada.data.pesquisaId,
          entrada.data.perguntaId,
        );
        await tx.importacaoLote.update({
          where: { id },
          data: {
            pesquisaId: destino.pesquisaId,
            perguntaId: destino.perguntaId,
          },
        });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'importacao_lote',
          entidadeId: id,
          acao: 'alterar',
          depois: {
            destino: {
              pesquisaId: destino.pesquisaId,
              perguntaId: destino.perguntaId,
            },
          },
        });
      },
    );
    return this.plano(id);
  }

  /** Linhas de entrada válidas para planejamento: as de cabeçalho não são respostas. */
  private async linhasDoLote(db: Db, loteId: number): Promise<LinhaPlano[]> {
    const linhas = await db.importacaoLinha.findMany({
      where: { loteId, tipo: 'entrada' },
      orderBy: [{ aba: 'asc' }, { linha: 'asc' }],
    });
    return linhas.map((l) => {
      const canonico = (l.canonico ?? null) as {
        nomeInformado?: string | null;
        ocupacaoPercentual?: string | null;
      } | null;
      const celulaNome =
        (l.celulas as Record<string, { bruto: string | null }>).C?.bruto ??
        null;
      return {
        id: l.id,
        linha: l.linha,
        situacaoLeitura: l.situacao as LinhaPlano['situacaoLeitura'],
        nomeInformado: canonico?.nomeInformado ?? (celulaNome?.trim() || null),
        ocupacao: canonico?.ocupacaoPercentual ?? null,
      };
    });
  }

  private candidatosDe(
    todos: {
      id: number;
      nomeFantasia: string;
      razaoSocial: string | null;
      situacao: string;
    }[],
    salvas: Map<string, number>,
  ) {
    return (nome: string): CandidatoEmpreendimento[] => {
      const chave = chaveNome(nome);
      if (chave === '') return [];
      const saida: CandidatoEmpreendimento[] = [];
      for (const e of todos) {
        const nomes = [e.nomeFantasia, e.razaoSocial ?? '']
          .map(chaveNome)
          .filter(Boolean);
        const motivo =
          salvas.get(chave) === e.id
            ? 'correspondencia_salva'
            : nomes.includes(chave)
              ? 'nome_igual'
              : nomes.some(
                    (n) =>
                      chave.length >= 4 &&
                      (n.includes(chave) || chave.includes(n)) &&
                      n.length >= 4,
                  )
                ? 'nome_parecido'
                : null;
        if (motivo)
          saida.push({
            id: e.id,
            nomeFantasia: e.nomeFantasia,
            situacao: e.situacao,
            motivo,
          });
      }
      const ordem = {
        correspondencia_salva: 0,
        nome_igual: 1,
        nome_parecido: 2,
      } as const;
      return saida
        .sort((a, b) => ordem[a.motivo] - ordem[b.motivo] || a.id - b.id)
        .slice(0, 5);
    };
  }

  /** Monta o plano com o estado atual do banco; é a única fonte de verdade da conferência e da confirmação. */
  async montarPlano(
    db: Db,
    id: number,
  ): Promise<{
    plano: PlanoImportacao;
    respostas: Map<number, { respostaId: number; valor: string | null }>;
    linhaOrigem: Map<number, string>;
  }> {
    const lote = await db.importacaoLote.findUnique({ where: { id } });
    if (!lote) throw naoEncontrado();
    const destino = await this.carregarDestino(
      db,
      lote.pesquisaId,
      lote.perguntaId,
    );
    const linhas = await this.linhasDoLote(db, id);
    const decisoesDb = await db.importacaoDecisao.findMany({
      where: { loteId: id },
    });
    const decisoes = new Map<number, DecisaoPlano>(
      decisoesDb.map((d) => [
        d.linhaId,
        {
          tipo: d.tipo as DecisaoPlano['tipo'],
          empreendimentoId: d.empreendimentoId,
          conflito: d.conflito as DecisaoPlano['conflito'],
        },
      ]),
    );
    const salvasDb = await db.importacaoCorrespondencia.findMany({
      where: { fonte: lote.fonte },
    });
    const salvas = new Map(
      salvasDb.map((s) => [s.chaveNome, s.empreendimentoId]),
    );
    const todos = await db.empreendimento.findMany({
      select: {
        id: true,
        nomeFantasia: true,
        razaoSocial: true,
        situacao: true,
      },
    });
    const respostas = new Map<
      number,
      { respostaId: number; valor: string | null }
    >();
    if (destino) {
      const existentes = await db.resposta.findMany({
        where: { pesquisaId: destino.pesquisaId },
        select: {
          id: true,
          empreendimentoId: true,
          itens: {
            where: { perguntaId: destino.perguntaId },
            select: { valorNumerico: true },
          },
        },
      });
      for (const r of existentes)
        respostas.set(r.empreendimentoId, {
          respostaId: r.id,
          valor: r.itens[0]?.valorNumerico?.toFixed() ?? null,
        });
    }
    const aplicacoes = await db.importacaoAplicacao.findMany({
      where: { loteId: id },
    });
    let publico: Set<number> | null = null;
    if (destino?.publicoRegistrado) {
      const d = await db.pesquisaDestinatario.findMany({
        where: { pesquisaId: destino.pesquisaId },
        select: { empreendimentoId: true },
      });
      publico = new Set(d.map((x) => x.empreendimentoId));
    }
    const { itens, totais } = planejar({
      linhas,
      decisoes,
      salvas,
      empreendimentos: new Map(
        todos.map((e) => [e.id, { id: e.id, nomeFantasia: e.nomeFantasia }]),
      ),
      publico,
      existentes: new Map([...respostas].map(([k, v]) => [k, v.valor])),
      aplicadas: new Map(
        aplicacoes.map((a) => [
          a.linhaId,
          a.acao as 'criar' | 'atualizar' | 'sem_mudanca',
        ]),
      ),
      temDestino: destino !== null,
      candidatos: this.candidatosDe(todos, salvas),
    });
    const resumo = lote.resumo as {
      diarias?: number | null;
      rotuloPeriodo?: string | null;
    } | null;
    const avisos: string[] = [];
    if (
      destino &&
      resumo?.diarias != null &&
      resumo.diarias !== destino.duracao
    )
      avisos.push(
        `A planilha informa ${resumo.diarias} diárias, mas o período "${destino.rotuloPeriodo}" tem ${destino.duracao} dias. Confira se a edição de destino está correta.`,
      );
    if (destino && resumo?.rotuloPeriodo)
      avisos.push(
        `Período no arquivo: "${resumo.rotuloPeriodo}". Período da edição de destino: "${destino.rotuloPeriodo}" (${destino.dataInicio} a ${destino.dataFim}).`,
      );
    if (destino && !SITUACOES_COM_CARGA.includes(destino.situacao))
      avisos.push('A edição de destino não aceita carga na situação atual.');
    const aplicaveis = totais.novos + totais.atualizados + totais.semMudanca;
    return {
      plano: {
        loteId: id,
        destino: destino && {
          pesquisaId: destino.pesquisaId,
          perguntaId: destino.perguntaId,
          tituloPesquisa: destino.tituloPesquisa,
          rotuloPeriodo: destino.rotuloPeriodo,
          dataInicio: destino.dataInicio,
          dataFim: destino.dataFim,
        },
        confirmacao: lote.confirmacao as ConfirmacaoLote,
        avisos,
        podeConfirmar:
          lote.estado === 'lido' && destino !== null && aplicaveis > 0,
        totais,
        itens,
      },
      respostas,
      linhaOrigem: new Map(),
    };
  }

  async plano(id: number): Promise<PlanoImportacao> {
    return (await this.montarPlano(this.prisma, id)).plano;
  }

  private async linhaDoLote(tx: Tx, loteId: number, linhaId: number) {
    const linha = await tx.importacaoLinha.findFirst({
      where: { id: linhaId, loteId, tipo: 'entrada' },
    });
    if (!linha) throw naoEncontrado();
    if (await tx.importacaoAplicacao.findUnique({ where: { linhaId } }))
      throw linhaAplicada();
    return linha;
  }

  async decidir(
    contexto: ContextoAcesso,
    loteId: number,
    linhaId: number,
    corpo: unknown,
  ) {
    const entrada = validarEntradaDecisao(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    const decisao = entrada.data;
    await this.autorizacao.executar(
      contexto,
      'importacoes',
      'alterar',
      async (tx, atual) => {
        const lote = await this.lerLote(tx, loteId);
        if (lote.estado !== 'lido') throw loteNaoLido();
        const linha = await this.linhaDoLote(tx, loteId, linhaId);
        const nome =
          ((linha.canonico ?? null) as { nomeInformado?: string | null } | null)
            ?.nomeInformado ?? null;
        let empreendimentoId: number | null = null;
        if (decisao.tipo === 'vincular') {
          const emp = await tx.empreendimento.findUnique({
            where: { id: decisao.empreendimentoId },
            select: { id: true },
          });
          if (!emp) throw naoEncontrado();
          empreendimentoId = emp.id;
        }
        const antes = await tx.importacaoDecisao.findUnique({
          where: { linhaId },
        });
        const dados = {
          loteId,
          tipo: decisao.tipo,
          empreendimentoId,
          motivo: decisao.tipo === 'rejeitar' ? (decisao.motivo ?? null) : null,
          // Mudar o vínculo invalida a escolha anterior sobre conflito.
          conflito:
            antes && antes.empreendimentoId === empreendimentoId
              ? antes.conflito
              : null,
          decididoPor: atual.usuario.id,
          decididoEm: new Date(),
        };
        await tx.importacaoDecisao.upsert({
          where: { linhaId },
          create: { linhaId, ...dados },
          update: dados,
        });
        if (decisao.tipo === 'vincular' && nome && empreendimentoId !== null) {
          const chave = chaveNome(nome);
          await tx.importacaoCorrespondencia.upsert({
            where: { fonte_chaveNome: { fonte: lote.fonte, chaveNome: chave } },
            create: {
              fonte: lote.fonte,
              chaveNome: chave,
              empreendimentoId,
              criadoPor: atual.usuario.id,
            },
            update: {
              empreendimentoId,
              criadoPor: atual.usuario.id,
              criadoEm: new Date(),
            },
          });
        }
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'importacao_decisao',
          entidadeId: linhaId,
          acao: antes ? 'alterar' : 'criar',
          antes: antes && {
            loteId,
            linhaId,
            tipo: antes.tipo,
            empreendimentoId: antes.empreendimentoId,
            motivo: antes.motivo,
            conflito: antes.conflito,
          },
          depois: {
            loteId,
            linhaId,
            tipo: dados.tipo,
            empreendimentoId,
            motivo: dados.motivo,
            conflito: dados.conflito,
            origem: 'manual',
          },
        });
      },
    );
    return this.plano(loteId);
  }

  async removerDecisao(
    contexto: ContextoAcesso,
    loteId: number,
    linhaId: number,
  ) {
    await this.autorizacao.executar(
      contexto,
      'importacoes',
      'alterar',
      async (tx, atual) => {
        const lote = await this.lerLote(tx, loteId);
        if (lote.estado !== 'lido') throw loteNaoLido();
        await this.linhaDoLote(tx, loteId, linhaId);
        const antes = await tx.importacaoDecisao.findUnique({
          where: { linhaId },
        });
        if (!antes) throw naoEncontrado();
        await tx.importacaoDecisao.delete({ where: { linhaId } });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'importacao_decisao',
          entidadeId: linhaId,
          acao: 'excluir',
          antes: {
            loteId,
            linhaId,
            tipo: antes.tipo,
            empreendimentoId: antes.empreendimentoId,
            motivo: antes.motivo,
            conflito: antes.conflito,
          },
        });
      },
    );
  }

  async resolverConflito(
    contexto: ContextoAcesso,
    loteId: number,
    linhaId: number,
    corpo: unknown,
  ) {
    const entrada = validarEntradaConflito(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    await this.autorizacao.executar(
      contexto,
      'importacoes',
      'alterar',
      async (tx, atual) => {
        const lote = await this.lerLote(tx, loteId);
        if (lote.estado !== 'lido') throw loteNaoLido();
        await this.linhaDoLote(tx, loteId, linhaId);
        const { plano } = await this.montarPlano(tx, loteId);
        const item = plano.itens.find((i) => i.linhaId === linhaId);
        if (!item) throw naoEncontrado();
        if (!item.empreendimento) throw semVinculo();
        if (
          item.valorAtual === null ||
          item.situacao === 'sem_mudanca' ||
          item.situacao === 'aplicado'
        )
          throw semConflito();
        const antes = await tx.importacaoDecisao.findUnique({
          where: { linhaId },
        });
        const dados = {
          loteId,
          tipo: 'vincular',
          empreendimentoId: item.empreendimento.id,
          motivo: null,
          conflito: entrada.data.resolucao,
          decididoPor: atual.usuario.id,
          decididoEm: new Date(),
        };
        await tx.importacaoDecisao.upsert({
          where: { linhaId },
          create: { linhaId, ...dados },
          update: dados,
        });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'importacao_decisao',
          entidadeId: linhaId,
          acao: antes ? 'alterar' : 'criar',
          antes: antes && {
            loteId,
            linhaId,
            tipo: antes.tipo,
            empreendimentoId: antes.empreendimentoId,
            motivo: antes.motivo,
            conflito: antes.conflito,
          },
          depois: {
            loteId,
            linhaId,
            tipo: 'vincular',
            empreendimentoId: item.empreendimento.id,
            motivo: null,
            conflito: entrada.data.resolucao,
            origem: item.origemDecisao ?? 'manual',
          },
        });
      },
    );
    return this.plano(loteId);
  }

  /**
   * Persiste as linhas aprovadas em uma única transação. O plano é recalculado com a edição
   * bloqueada: a gravação segue o estado real, e a tela só confirma totais que ainda valem.
   * Falha em qualquer linha desfaz tudo; o lote nunca fica marcado como confirmado sem gravar.
   */
  async confirmar(
    contexto: ContextoAcesso,
    loteId: number,
    corpo: unknown,
  ): Promise<ResultadoConfirmacao> {
    const entrada = validarEntradaConfirmacao(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return this.autorizacao.executar(
      contexto,
      'importacoes',
      'alterar',
      async (tx, atual) => {
        // Gravar respostas de todos os empreendimentos exige escopo global nos dois recursos.
        for (const acao of ['criar', 'alterar'] as const)
          if (
            (await this.autorizacao.exigir(atual, 'respostas', acao, tx)) !==
            'todos'
          )
            throw naoEncontrado();
        const lote = await this.lerLote(tx, loteId);
        if (lote.estado !== 'lido') throw loteNaoLido();
        if (lote.pesquisaId === null || lote.perguntaId === null)
          throw loteSemDestino();
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHAVE_CONFIRMACAO}::int, ${lote.pesquisaId}::int)`;
        const agora = new Date();
        const destino = await this.validarDestino(
          tx,
          lote.pesquisaId,
          lote.perguntaId,
        );
        const { plano, respostas } = await this.montarPlano(tx, loteId);
        return this.aplicar(
          tx,
          atual,
          lote.versaoParser,
          lote.confirmacao as ConfirmacaoLote,
          destino,
          plano,
          respostas,
          entrada.data,
          agora,
          lote.recalculoPendente,
        );
      },
    );
  }

  private async aplicar(
    tx: Tx,
    atual: ContextoAcesso,
    versaoParser: string,
    confirmacaoAtual: ConfirmacaoLote,
    destino: DestinoCarregado,
    plano: PlanoImportacao,
    respostas: Map<number, { respostaId: number; valor: string | null }>,
    esperado: EntradaConfirmacao,
    agora: Date,
    recalculoJa: boolean,
  ): Promise<ResultadoConfirmacao> {
    const t = plano.totais;
    const aplicaveis = plano.itens.filter((i) =>
      ['novo', 'atualizar', 'sem_mudanca'].includes(i.situacao),
    );
    if (aplicaveis.length === 0 && confirmacaoAtual === 'nao_confirmado')
      throw nadaAConfirmar();
    if (t.novos !== esperado.novos || t.atualizados !== esperado.atualizados)
      throw planoDesatualizado();
    let criadas = 0;
    let atualizadas = 0;
    let semMudanca = 0;
    for (const item of aplicaveis) {
      const emp = item.empreendimento!;
      const valorNovo = item.ocupacaoPercentual!;
      const existente = respostas.get(emp.id);
      const regra = `${versaoParser}:${item.origemDecisao === 'correspondencia_salva' ? 'correspondencia-salva' : 'decisao-manual'}`;
      let respostaId: number;
      let acao: 'criar' | 'atualizar' | 'sem_mudanca';
      if (item.situacao === 'novo') {
        const r = await tx.resposta.create({
          data: {
            pesquisaId: destino.pesquisaId,
            empreendimentoId: emp.id,
            usuarioId: atual.usuario.id,
            respondidaEm: agora,
            canal: CANAL_RESPOSTA_IMPORTACAO,
          },
        });
        await tx.respostaItem.create({
          data: {
            respostaId: r.id,
            perguntaId: destino.perguntaId,
            valorNumerico: new Prisma.Decimal(valorNovo),
          },
        });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'resposta',
          entidadeId: r.id,
          acao: 'criar',
          depois: {
            pesquisaId: destino.pesquisaId,
            empreendimentoId: emp.id,
            canal: CANAL_RESPOSTA_IMPORTACAO,
            itens: [{ perguntaId: destino.perguntaId, valor: valorNovo }],
          },
        });
        respostaId = r.id;
        acao = 'criar';
        criadas += 1;
      } else if (item.situacao === 'atualizar') {
        respostaId = existente!.respostaId;
        await tx.respostaItem.upsert({
          where: {
            respostaId_perguntaId: {
              respostaId,
              perguntaId: destino.perguntaId,
            },
          },
          create: {
            respostaId,
            perguntaId: destino.perguntaId,
            valorNumerico: new Prisma.Decimal(valorNovo),
          },
          update: { valorNumerico: new Prisma.Decimal(valorNovo) },
        });
        await tx.resposta.update({
          where: { id: respostaId },
          data: { atualizadaEm: agora },
        });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'resposta',
          entidadeId: respostaId,
          acao: 'alterar',
          antes: {
            pesquisaId: destino.pesquisaId,
            empreendimentoId: emp.id,
            itens: [
              { perguntaId: destino.perguntaId, valor: existente!.valor ?? '' },
            ],
          },
          depois: {
            pesquisaId: destino.pesquisaId,
            empreendimentoId: emp.id,
            itens: [{ perguntaId: destino.perguntaId, valor: valorNovo }],
          },
        });
        acao = 'atualizar';
        atualizadas += 1;
      } else {
        respostaId = existente!.respostaId;
        acao = 'sem_mudanca';
        semMudanca += 1;
      }
      await tx.importacaoAplicacao.create({
        data: {
          linhaId: item.linhaId,
          loteId: plano.loteId,
          respostaId,
          perguntaId: destino.perguntaId,
          acao,
          regra,
          valorAnterior:
            existente?.valor != null
              ? new Prisma.Decimal(existente.valor)
              : null,
          valorNovo: new Prisma.Decimal(valorNovo),
          confirmadoPor: atual.usuario.id,
          confirmadoEm: agora,
        },
      });
    }
    // Sobra pendente ou conflito: confirmação parcial, nunca "concluído" enganoso.
    const restantes = t.pendentes + t.conflitos;
    const confirmacao: ConfirmacaoLote =
      restantes === 0 ? 'concluido' : 'parcial';
    const mudou = criadas + atualizadas > 0;
    if (aplicaveis.length > 0 || confirmacaoAtual !== confirmacao) {
      await tx.importacaoLote.update({
        where: { id: plano.loteId },
        data: {
          confirmacao,
          confirmadoPor: atual.usuario.id,
          confirmadoEm: agora,
          recalculoPendente: recalculoJa || mudou,
        },
      });
      await registrarAuditoria(tx, {
        usuarioId: atual.usuario.id,
        entidade: 'importacao_lote',
        entidadeId: plano.loteId,
        acao: 'alterar',
        depois: {
          confirmacao,
          criadas,
          atualizadas,
          semMudanca,
          pendentes: t.pendentes,
          conflitos: t.conflitos,
          rejeitadas: t.rejeitados,
        },
      });
    }
    return {
      confirmacao,
      criadas,
      atualizadas,
      semMudanca,
      pendentes: t.pendentes,
      conflitos: t.conflitos,
      rejeitadas: t.rejeitados,
      recalculoPendente: recalculoJa || mudou,
    };
  }

  /** CSV (UTF-8 com BOM, separador `;`) das linhas que não foram aceitas, para correção na origem. */
  async rejeicoesCsv(id: number): Promise<string> {
    const { plano } = await this.montarPlano(this.prisma, id);
    const motivos: Record<string, string> = {
      ERRO_DE_LEITURA: 'Erro na leitura da planilha',
      SEM_OCUPACAO: 'Sem taxa de ocupação informada',
      REJEITADO_MANUALMENTE: 'Rejeitada manualmente',
      FORA_DO_PUBLICO: 'Empreendimento fora do público da edição',
      MANTIDA_EXISTENTE: 'Resposta existente mantida',
      SEM_CORRESPONDENCIA: 'Sem empreendimento vinculado',
      EMPREENDIMENTO_DUPLICADO_NO_LOTE: 'Empreendimento repetido no lote',
      SEM_DESTINO: 'Sem edição de destino',
      DIVERGE_DA_EXISTENTE: 'Conflito com resposta existente',
    };
    const cab = [
      'Linha',
      'Nome informado',
      'Ocupação (%)',
      'Situação',
      'Motivo',
      'Empreendimento',
      'Valor atual (%)',
    ];
    const linhas = plano.itens
      .filter((i: ItemPlano) =>
        ['rejeitado', 'pendente', 'conflito'].includes(i.situacao),
      )
      .map((i) =>
        [
          i.linha,
          i.nomeInformado,
          i.ocupacaoPercentual,
          i.situacao,
          i.motivo ? (motivos[i.motivo] ?? i.motivo) : '',
          i.empreendimento?.nomeFantasia ?? '',
          i.valorAtual,
        ]
          .map((v, n) => celulaCsv(v, n === 0 || n === 2 || n === 6))
          .join(';'),
      );
    return (
      '﻿' +
      [cab.map((c) => celulaCsv(c)).join(';'), ...linhas].join('\r\n') +
      '\r\n'
    );
  }
}
