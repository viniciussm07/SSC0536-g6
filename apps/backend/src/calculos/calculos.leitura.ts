import {
  INDICADORES_VERSAO_FORMULA,
  duracaoDias,
  type ExecucaoCalculoDetalhe,
  type ExecucaoCalculoLinha,
  type InsumosCalculo,
  type MeioInsumo,
  type MotivoIndisponibilidade,
  type ResultadoCalculo,
  type SituacaoExecucao,
  type SituacaoPublicacao,
  type TipoColeta,
  type ValorIndicador,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { filtroElegiveis } from '../pesquisas/edicoes.service';
import { dataCivil } from '../periodos/periodos.leitura';
import {
  CHAVES_PARAMETROS_CALCULO,
  capacidadeNoPeriodo,
  parametroNoPeriodo,
  rhcNoPeriodo,
} from './calculos.insumos';
import {
  perguntaNaoCalculavel,
  perguntaNaoEncontrada,
} from './calculos.errors';

type Db = Prisma.TransactionClient | PrismaService;
const paraData = (d: string) => new Date(`${d}T00:00:00Z`);
const instante = (d: Date | null) => (d === null ? null : d.toISOString());

/** Inventário conferido: completo ou parcial; versão pendente de conferência não entra no cálculo. */
export const SITUACOES_INVENTARIO_CALCULO = ['completo', 'parcial'] as const;

export interface InsumosLidos {
  insumos: InsumosCalculo;
  respostaIds: number[];
}

/**
 * Lê os insumos de uma pergunta. Chamado numa transação REPEATABLE READ: todas as consultas
 * veem o mesmo instante do banco, sem misturar revisões das fontes.
 */
export async function lerInsumos(
  db: Db,
  perguntaId: number,
): Promise<InsumosLidos> {
  const pergunta = await db.pesquisaPergunta.findUnique({
    where: { id: perguntaId },
    select: {
      id: true,
      rotulo: true,
      campo: { select: { tipoValor: true } },
      periodo: {
        select: { id: true, rotulo: true, dataInicio: true, dataFim: true },
      },
      pesquisa: {
        select: {
          id: true,
          titulo: true,
          tipoColeta: true,
          segmentoIds: true,
          destinatariosRegistradosEm: true,
        },
      },
    },
  });
  if (!pergunta) throw perguntaNaoEncontrada();
  if (pergunta.campo.tipoValor !== 'percentual') throw perguntaNaoCalculavel();

  const periodo = {
    id: pergunta.periodo.id,
    rotulo: pergunta.periodo.rotulo,
    dataInicio: dataCivil(pergunta.periodo.dataInicio),
    dataFim: dataCivil(pergunta.periodo.dataFim),
  };
  const { pesquisa } = pergunta;
  const registrada = pesquisa.destinatariosRegistradosEm !== null;
  const selecionar = {
    id: true,
    nomeFantasia: true,
    categoriaIndicador: true,
  } as const;
  const populacao = registrada
    ? (
        await db.pesquisaDestinatario.findMany({
          where: { pesquisaId: pesquisa.id },
          select: { empreendimento: { select: selecionar } },
        })
      ).map((d) => d.empreendimento)
    : await db.empreendimento.findMany({
        where: filtroElegiveis(pesquisa.segmentoIds),
        select: selecionar,
      });
  const ids = populacao.map((e) => e.id);
  const inicio = paraData(periodo.dataInicio);
  const fim = paraData(periodo.dataFim);

  const [respostas, versoes, rhc, parametros] = await Promise.all([
    db.resposta.findMany({
      where: { pesquisaId: pesquisa.id, empreendimentoId: { in: ids } },
      select: {
        id: true,
        empreendimentoId: true,
        itens: {
          where: { perguntaId },
          select: { valorNumerico: true },
        },
      },
    }),
    db.inventarioVersao.findMany({
      where: {
        empreendimentoId: { in: ids },
        substituidaPorId: null,
        situacaoConferencia: { in: [...SITUACOES_INVENTARIO_CALCULO] },
        vigenciaInicio: { lte: fim },
        OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: inicio } }],
      },
      select: {
        id: true,
        empreendimentoId: true,
        vigenciaInicio: true,
        vigenciaFim: true,
        totalUh: true,
        leitos: true,
        maxLeitosPorUh: true,
      },
    }),
    db.rhcPeriodo.findMany({
      // A parte 17 registra conferência; o cálculo consome somente o agregado conferido.
      where: { periodoId: periodo.id, situacaoConferencia: 'conferida' },
      select: { id: true, qtdRhc: true, leitos: true },
    }),
    db.parametroCalculo.findMany({
      where: {
        chave: { in: [...CHAVES_PARAMETROS_CALCULO] },
        vigenciaInicio: { lte: fim },
        OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: inicio } }],
      },
      select: {
        id: true,
        chave: true,
        valor: true,
        unidade: true,
        situacao: true,
        vigenciaInicio: true,
        vigenciaFim: true,
      },
    }),
  ]);

  const respostaPor = new Map(respostas.map((r) => [r.empreendimentoId, r]));
  const meios: MeioInsumo[] = [...populacao]
    .sort((a, b) => a.id - b.id)
    .map((e) => {
      const resposta = respostaPor.get(e.id);
      const valor = resposta?.itens[0]?.valorNumerico ?? null;
      return {
        empreendimentoId: e.id,
        nomeFantasia: e.nomeFantasia,
        tipo: e.categoriaIndicador,
        ...capacidadeNoPeriodo(
          versoes
            .filter((v) => v.empreendimentoId === e.id)
            .map((v) => ({
              id: v.id,
              vigenciaInicio: dataCivil(v.vigenciaInicio),
              vigenciaFim:
                v.vigenciaFim === null ? null : dataCivil(v.vigenciaFim),
              totalUh: v.totalUh,
              leitos: v.leitos,
              maxLeitosPorUh: v.maxLeitosPorUh,
            })),
          periodo,
        ),
        // Resposta sem item desta pergunta não é respondente da taxa (não vira zero).
        respostaId: valor === null ? null : resposta!.id,
        taxaOcupacao: valor === null ? null : valor.toFixed(),
      };
    });

  const vigencias = parametros.map((p) => ({
    id: p.id,
    chave: p.chave,
    valor: p.valor.toFixed(),
    vigenciaInicio: dataCivil(p.vigenciaInicio),
    vigenciaFim: p.vigenciaFim === null ? null : dataCivil(p.vigenciaFim),
    situacaoHomologacao: p.situacao,
    unidade: p.unidade,
  }));

  return {
    insumos: {
      versaoFormula: INDICADORES_VERSAO_FORMULA,
      periodo: {
        ...periodo,
        diasPeriodo: duracaoDias(periodo.dataInicio, periodo.dataFim),
      },
      pesquisa: {
        id: pesquisa.id,
        titulo: pesquisa.titulo,
        tipoColeta: pesquisa.tipoColeta as TipoColeta,
      },
      pergunta: { id: pergunta.id, rotulo: pergunta.rotulo },
      populacao: registrada ? 'destinatarios' : 'elegiveis_no_calculo',
      meios,
      rhc: rhcNoPeriodo(rhc),
      parametros: CHAVES_PARAMETROS_CALCULO.map((chave) =>
        parametroNoPeriodo(chave, vigencias, periodo),
      ),
    },
    respostaIds: meios
      .flatMap((m) => (m.respostaId === null ? [] : [m.respostaId]))
      .sort((a, b) => a - b),
  };
}

export const INCLUIR_LINHA = {
  periodo: { select: { rotulo: true } },
  pesquisa: { select: { titulo: true } },
  solicitadaPor: { select: { nome: true } },
} as const;

type ExecucaoBanco = {
  id: number;
  periodoId: number;
  tipoColeta: string;
  pesquisaId: number;
  perguntaId: number;
  revisao: number | null;
  versaoFormula: number;
  situacao: string;
  publicacao: string;
  motivo: string | null;
  erro: string | null;
  solicitadaEm: Date;
  concluidaEm: Date | null;
  publicadaEm: Date | null;
  publicadaPorId: number | null;
  periodo: { rotulo: string };
  pesquisa: { titulo: string };
  solicitadaPor: { nome: string };
};

export const paraLinha = (e: ExecucaoBanco): ExecucaoCalculoLinha => ({
  id: e.id,
  periodoId: e.periodoId,
  periodo: e.periodo.rotulo,
  tipoColeta: e.tipoColeta as TipoColeta,
  pesquisaId: e.pesquisaId,
  pesquisa: e.pesquisa.titulo,
  perguntaId: e.perguntaId,
  revisao: e.revisao,
  versaoFormula: e.versaoFormula,
  situacao: e.situacao as SituacaoExecucao,
  publicacao: e.publicacao as SituacaoPublicacao,
  motivo: e.motivo,
  erro: e.erro,
  solicitadaEm: e.solicitadaEm.toISOString(),
  solicitadaPor: e.solicitadaPor.nome,
  concluidaEm: instante(e.concluidaEm),
  publicadaEm: instante(e.publicadaEm),
  publicadaPorId: e.publicadaPorId,
});

type ResultadoBanco = {
  id: number;
  definicaoId: number;
  recorte: string;
  metodo: string;
  valor: Prisma.Decimal | null;
  estado: string;
  motivoIndisponibilidade: string | null;
  detalheIndisponibilidade: string | null;
  definicao: { codigo: string; nome: string; unidade: string };
};

export const valorDoResultado = (r: ResultadoBanco): ValorIndicador =>
  r.estado === 'disponivel' && r.valor !== null
    ? { estado: 'disponivel', valor: r.valor.toFixed() }
    : {
        estado: 'indisponivel',
        motivo: (r.motivoIndisponibilidade ??
          'dado_ausente') as MotivoIndisponibilidade,
        detalhe: r.detalheIndisponibilidade ?? '',
      };

export const paraResultado = (r: ResultadoBanco): ResultadoCalculo => ({
  id: r.id,
  indicadorId: r.definicaoId,
  codigo: r.definicao.codigo,
  nome: r.definicao.nome,
  unidade: r.definicao.unidade,
  recorte: r.recorte,
  metodo: r.metodo,
  valor: valorDoResultado(r),
});

export const paraDetalhe = (
  e: ExecucaoBanco & {
    insumos: Prisma.JsonValue;
    motivoPublicacao: string | null;
    substituidaPorId: number | null;
    resultados: ResultadoBanco[];
  },
  insumosAtuais: ExecucaoCalculoDetalhe['insumosAtuais'],
): ExecucaoCalculoDetalhe => ({
  ...paraLinha(e),
  motivoPublicacao: e.motivoPublicacao,
  substituidaPorId: e.substituidaPorId,
  insumos: e.insumos as unknown as InsumosCalculo,
  insumosAtuais,
  resultados: [...e.resultados]
    .sort(
      (a, b) =>
        a.definicao.codigo.localeCompare(b.definicao.codigo) ||
        a.recorte.localeCompare(b.recorte) ||
        a.id - b.id,
    )
    .map(paraResultado),
});
