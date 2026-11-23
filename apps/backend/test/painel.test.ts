import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '../src/generated/prisma/client';
import type { AutorizacaoService } from '../src/acesso/autorizacao.service';
import type { ContextoAcesso } from '../src/acesso/acesso.types';
import { escopoIndicadoresConsumo } from '../src/acesso/indicadores.escopo';
import { unzipSync, strFromU8 } from 'fflate';
import {
  gerarPdf,
  gerarXlsx,
  montarTabela,
  nomeArquivo,
} from '../src/painel/painel.exportacao';
import { PainelService } from '../src/painel/painel.service';
import type { PrismaService } from '../src/prisma/prisma.service';

const contexto = { usuario: { perfil: 'visualizador' } } as ContextoAcesso;
const autorizacao = {
  exigir: async () => undefined,
} as unknown as AutorizacaoService;
const dia = (d: string) => new Date(`${d}T00:00:00Z`);

const periodos: Record<number, object> = {
  1: {
    id: 1,
    rotulo: 'Setembro/2026',
    tipo: 'mes',
    dataInicio: dia('2026-09-01'),
    dataFim: dia('2026-09-30'),
  },
  2: {
    id: 2,
    rotulo: 'Outubro/2026',
    tipo: 'mes',
    dataInicio: dia('2026-10-01'),
    dataFim: dia('2026-10-31'),
  },
  3: {
    id: 3,
    rotulo: 'Carnaval',
    tipo: 'feriado_prolongado',
    dataInicio: dia('2026-02-14'),
    dataFim: dia('2026-02-17'),
  },
};

function resultado(
  id: number,
  periodoId: number,
  codigo: string,
  valor: string | null,
  extra: Partial<{
    execucao: object | null;
    estado: string;
    recorte: string;
  }> = {},
) {
  return {
    id,
    definicaoId: codigo.length,
    periodoId,
    tipoColeta: 'consolidado',
    recorte: extra.recorte ?? 'total',
    metodo: 'ponderada',
    valor: valor === null ? null : new Prisma.Decimal(valor),
    estado: extra.estado ?? (valor === null ? 'indisponivel' : 'disponivel'),
    motivoIndisponibilidade: valor === null ? 'sem_respondentes' : null,
    detalheIndisponibilidade: null,
    execucaoId: 9,
    calculadoEm: new Date(`2026-11-0${id}T10:00:00Z`),
    definicao: {
      id: codigo.length,
      codigo,
      nome: codigo,
      unidade: 'percentual_0_100',
    },
    execucao:
      extra.execucao === undefined
        ? { id: 9, revisao: 2, publicadaEm: new Date('2026-11-10T12:00:00Z') }
        : extra.execucao,
  };
}

function servico(dados: ReturnType<typeof resultado>[], pendentes = 0) {
  const consultas: unknown[] = [];
  const prisma = {
    periodo: {
      findUnique: async ({ where }: { where: { id: number } }) =>
        periodos[where.id] ?? null,
    },
    indicadorResultado: {
      findMany: async (args: {
        where: { AND: [unknown, { periodoId: number }] };
      }) => {
        consultas.push(args);
        const periodoId = args.where.AND[1].periodoId;
        return dados.filter((d) => d.periodoId === periodoId);
      },
    },
    calculoExecucao: { count: async () => pendentes },
  } as unknown as PrismaService;
  return { servico: new PainelService(prisma, autorizacao), consultas };
}

describe('painel de indicadores (parte 18)', () => {
  it('lista o que foi publicado com fonte, revisão e cobertura separada', async () => {
    const { servico: s } = servico([
      resultado(1, 2, 'taxa_ocupacao_uh', '66.5'),
      resultado(2, 2, 'cobertura_meios', '80'),
    ]);
    const painel = await s.painel(contexto, {
      periodoId: 2,
      tipoColeta: 'consolidado',
    });
    assert.equal(painel.situacao, 'disponivel');
    assert.equal(painel.comparacao, null);
    assert.deepEqual(
      painel.itens.map((i) => i.grupo),
      ['indicador', 'cobertura'],
    );
    assert.equal(painel.itens[0].comparacao, null);
    assert.deepEqual(painel.itens[0].fonte, {
      origem: 'calculo',
      execucaoId: 9,
      revisao: 2,
      publicadaEm: '2026-11-10T12:00:00.000Z',
      calculadoEm: '2026-11-01T10:00:00.000Z',
    });
    assert.equal(painel.atualizadoEm, '2026-11-02T10:00:00.000Z');
  });

  it('zero é valor disponível; indisponível nunca vira zero', async () => {
    const { servico: s } = servico([
      resultado(1, 2, 'taxa_ocupacao_uh', '0'),
      resultado(2, 2, 'cobertura_meios', null),
    ]);
    const { itens } = await s.painel(contexto, {
      periodoId: 2,
      tipoColeta: 'consolidado',
    });
    assert.deepEqual(itens[0].valor, { estado: 'disponivel', valor: '0' });
    assert.deepEqual(itens[1].valor, {
      estado: 'indisponivel',
      motivo: 'sem_respondentes',
      detalhe: null,
    });
  });

  it('carga histórica é identificada como tal', async () => {
    const { servico: s } = servico([
      resultado(1, 2, 'taxa_ocupacao_uh', '50', { execucao: null }),
    ]);
    const { itens } = await s.painel(contexto, {
      periodoId: 2,
      tipoColeta: 'consolidado',
    });
    assert.equal(itens[0].fonte.origem, 'carga');
    assert.equal(itens[0].fonte.revisao, null);
  });

  it('compara com período do mesmo tipo em decimal exato e marca lacunas', async () => {
    const { servico: s } = servico([
      resultado(1, 2, 'taxa_ocupacao_uh', '66.7'),
      resultado(2, 1, 'taxa_ocupacao_uh', '66.9'),
      resultado(3, 2, 'cobertura_meios', '80'),
      resultado(4, 2, 'cobertura_uhs', '70'),
      resultado(5, 1, 'cobertura_uhs', null),
    ]);
    const painel = await s.painel(contexto, {
      periodoId: 2,
      tipoColeta: 'consolidado',
      comparacaoPeriodoId: 1,
    });
    assert.equal(painel.comparacao?.rotulo, 'Setembro/2026');
    const por = Object.fromEntries(
      painel.itens.map((i) => [i.codigo, i.comparacao]),
    );
    assert.equal(por.taxa_ocupacao_uh?.estado, 'disponivel');
    assert.equal(
      por.taxa_ocupacao_uh?.estado === 'disponivel' &&
        por.taxa_ocupacao_uh.variacao,
      '-0.2',
    );
    assert.deepEqual(por.cobertura_meios, { estado: 'ausente' });
    assert.deepEqual(por.cobertura_uhs, { estado: 'indisponivel' });
  });

  it('recusa comparar mês com feriado prolongado e período inexistente', async () => {
    const { servico: s } = servico([]);
    await assert.rejects(
      s.painel(contexto, {
        periodoId: 2,
        tipoColeta: 'consolidado',
        comparacaoPeriodoId: 3,
      }),
      (e: { getResponse: () => { error: { code: string } } }) =>
        e.getResponse().error.code === 'PERIODOS_INCOMPATIVEIS',
    );
    await assert.rejects(
      s.painel(contexto, { periodoId: 99, tipoColeta: 'consolidado' }),
      (e: { getResponse: () => { error: { code: string } } }) =>
        e.getResponse().error.code === 'PERIODO_NAO_ENCONTRADO',
    );
  });

  it('sem resultado publicado distingue cálculo pendente de sem dados', async () => {
    const pendente = await servico([], 1).servico.painel(contexto, {
      periodoId: 2,
      tipoColeta: 'consolidado',
    });
    assert.equal(pendente.situacao, 'calculo_pendente');
    assert.deepEqual(pendente.itens, []);
    assert.equal(pendente.atualizadoEm, null);
    const vazio = await servico([], 0).servico.painel(contexto, {
      periodoId: 2,
      tipoColeta: 'consolidado',
    });
    assert.equal(vazio.situacao, 'sem_dados');
  });

  it('a visibilidade é a mesma da grade e da exportação; só o painel mostra indisponíveis', () => {
    const grade = escopoIndicadoresConsumo('visualizador');
    const painel = escopoIndicadoresConsumo('visualizador', true);
    assert.deepEqual(grade.definicao, painel.definicao);
    assert.deepEqual(grade.OR, painel.OR);
    assert.deepEqual(grade.valor, { not: null });
    assert.equal('valor' in painel, false);
  });

  it('série lista os períodos do mais antigo ao mais recente, com nulo onde não há valor', async () => {
    const dados = [
      resultado(1, 2, 'taxa_ocupacao_uh', '66.5'),
      resultado(2, 1, 'taxa_ocupacao_uh', '0'),
      resultado(3, 2, 'cobertura_meios', null),
      resultado(4, 1, 'cobertura_meios', '80'),
    ].map((r) => ({ ...r, periodo: periodos[r.periodoId] }));
    const prisma = {
      indicadorResultado: { findMany: async () => dados },
      periodo: {
        findMany: async () => [
          {
            id: 3,
            rotulo: 'Carnaval',
            tipo: 'feriado_prolongado',
            dataInicio: dia('2026-02-14'),
            dataFim: dia('2026-02-17'),
          },
        ],
      },
    } as unknown as PrismaService;
    const s = new PainelService(prisma, autorizacao);
    const serie = await s.serie(contexto, 'consolidado');
    assert.deepEqual(
      serie.periodos.map((p) => p.rotulo),
      ['Setembro/2026', 'Outubro/2026'],
    );
    const por = Object.fromEntries(
      serie.series.map((x) => [x.codigo, x.pontos.map((p) => p.valor)]),
    );
    assert.deepEqual(por.taxa_ocupacao_uh, ['0', '66.5']);
    assert.deepEqual(por.cobertura_meios, ['80', null]);
    assert.deepEqual(
      serie.feriados.map((f) => f.rotulo),
      ['Carnaval'],
    );
  });

  it('exportação: PDF e XLSX trazem a mesma tabela, com decimal exato e indisponível distinto', async () => {
    const { servico: s } = servico([
      resultado(1, 2, 'taxa_ocupacao_uh', '66.666666666667'),
      resultado(2, 2, 'cobertura_meios', null),
      resultado(3, 2, 'indicador_zero', '0'),
      resultado(4, 1, 'taxa_ocupacao_uh', '60'),
    ]);
    const painel = await s.painel(contexto, {
      periodoId: 2,
      tipoColeta: 'consolidado',
      comparacaoPeriodoId: 1,
    });
    const tabela = montarTabela(painel);
    assert.equal(tabela.linhas.length, 3);
    const valores = tabela.linhas.map((l) => l[3]);
    assert.deepEqual(valores[0], { texto: '66,67', numero: '66.666666666667' });
    assert.equal(valores[1].numero, undefined);
    assert.match(valores[1].texto, /^Indisponível/);
    assert.deepEqual(valores[2], { texto: '0', numero: '0' });

    const xlsx = unzipSync(gerarXlsx(painel));
    const planilha = strFromU8(xlsx['xl/worksheets/sheet1.xml']);
    assert.match(planilha, /<v>66\.666666666667<\/v>/);
    assert.match(planilha, /<c r="D9"/);
    assert.ok(xlsx['xl/workbook.xml'] && xlsx['[Content_Types].xml']);

    const pdf = Buffer.from(gerarPdf(painel)).toString('latin1');
    assert.ok(pdf.startsWith('%PDF-1.4'));
    assert.ok(pdf.trimEnd().endsWith('%%EOF'));
    assert.match(pdf, /Outubro\/2026/);
    assert.equal(
      nomeArquivo(painel, 'pdf'),
      'indicadores-outubro-2026-consolidado.pdf',
    );
  });

  it('participação conta meios convidados e meios distintos que responderam', async () => {
    const prisma = {
      pesquisa: {
        findMany: async () => [
          {
            id: 2,
            _count: { destinatarios: 10 },
            perguntas: [{ periodo: periodos[2] }],
            respostas: [
              { empreendimentoId: 1 },
              { empreendimentoId: 1 },
              { empreendimentoId: 2 },
            ],
          },
          {
            id: 1,
            _count: { destinatarios: 8 },
            perguntas: [{ periodo: periodos[1] }],
            respostas: [],
          },
          { id: 9, _count: { destinatarios: 3 }, perguntas: [], respostas: [] },
        ],
      },
    } as unknown as PrismaService;
    const r = await new PainelService(prisma, autorizacao).participacao(
      contexto,
      'consolidado',
    );
    // Ordenado por início do período; edição sem pergunta/período fica de fora.
    assert.deepEqual(
      r.edicoes.map((e) => [e.periodo, e.destinatarios, e.respondentes]),
      [
        ['Setembro/2026', 8, 0],
        ['Outubro/2026', 10, 2],
      ],
    );
  });
});
