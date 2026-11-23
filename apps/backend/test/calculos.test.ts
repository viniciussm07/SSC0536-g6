import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { InsumosCalculo, MeioInsumo } from '@ssc0536/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { AutorizacaoService } from '../src/acesso/autorizacao.service';
import type { ContextoAcesso } from '../src/acesso/acesso.types';
import {
  calcularDoRetrato,
  capacidadeNoPeriodo,
  hashInsumos,
  linhasDoResultado,
  montarEntradaTabulacao,
  parametroNoPeriodo,
  rhcNoPeriodo,
  serializarCanonico,
} from '../src/calculos/calculos.insumos';
import {
  CalculosService,
  interrompida,
} from '../src/calculos/calculos.service';
import { MAPA_CALCULOS } from '../src/calculos/calculos.odata';
import { ESQUEMAS_ODATA, calcularTabulacaoOcupacao } from '@ssc0536/common';

const OUTUBRO = { dataInicio: '2026-10-01', dataFim: '2026-10-31' };

const versao = (
  id: number,
  vigenciaInicio: string,
  vigenciaFim: string | null,
  totalUh = 10,
) => ({
  id,
  vigenciaInicio,
  vigenciaFim,
  totalUh,
  leitos: 20,
  maxLeitosPorUh: 2,
});

describe('capacidade vigente no período', () => {
  it('uma versão que cobre o período inteiro é a capacidade usada', () => {
    const c = capacidadeNoPeriodo(
      [versao(1, '2026-10-01', '2026-10-31')],
      OUTUBRO,
    );
    assert.deepEqual(c, {
      capacidade: 'vigente',
      inventarioVersaoIds: [1],
      uhs: 10,
      leitos: 20,
      maxLeitosPorUh: 2,
    });
    // Vigência aberta também cobre.
    assert.equal(
      capacidadeNoPeriodo([versao(2, '2026-01-01', null)], OUTUBRO).capacidade,
      'vigente',
    );
  });

  it('sem versão no período é ausente, não zero', () => {
    const c = capacidadeNoPeriodo([versao(3, '2026-11-01', null)], OUTUBRO);
    assert.equal(c.capacidade, 'ausente');
    assert.equal(c.uhs, null);
    assert.deepEqual(c.inventarioVersaoIds, []);
  });

  it('troca de capacidade ou entrada no meio do período fica indisponível, sem escolher a mais recente', () => {
    const troca = capacidadeNoPeriodo(
      [
        versao(5, '2026-10-16', null, 15),
        versao(4, '2026-01-01', '2026-10-15'),
      ],
      OUTUBRO,
    );
    assert.equal(troca.capacidade, 'varia_no_periodo');
    assert.deepEqual(troca.inventarioVersaoIds, [4, 5]);
    assert.equal(troca.uhs, null);
    const entrada = capacidadeNoPeriodo(
      [versao(6, '2026-10-10', null)],
      OUTUBRO,
    );
    assert.equal(entrada.capacidade, 'varia_no_periodo');
  });
});

describe('parâmetros e RHC no período', () => {
  const p = (
    id: number,
    valor: string,
    inicio: string,
    fim: string | null,
  ) => ({
    id,
    chave: 'day_use.percentual',
    valor,
    vigenciaInicio: inicio,
    vigenciaFim: fim,
  });

  it('parâmetro vigente, ausente ou que muda no período (ambíguo)', () => {
    assert.deepEqual(
      parametroNoPeriodo(
        'day_use.percentual',
        [p(1, '15.15', '2026-01-01', null)],
        OUTUBRO,
      ),
      {
        chave: 'day_use.percentual',
        situacao: 'vigente',
        parametroIds: [1],
        valor: '15.15',
      },
    );
    assert.equal(
      parametroNoPeriodo(
        'day_use.fator_hospedados',
        [p(1, '1', '2026-01-01', null)],
        OUTUBRO,
      ).situacao,
      'ausente',
    );
    const muda = parametroNoPeriodo(
      'day_use.percentual',
      [p(1, '15', '2026-01-01', '2026-10-10'), p(2, '16', '2026-10-11', null)],
      OUTUBRO,
    );
    assert.equal(muda.situacao, 'ambiguo');
    assert.equal(muda.valor, null);
    assert.deepEqual(muda.parametroIds, [1, 2]);
  });

  it('RHC: um registro é usado; nenhum é ausente; vários são ambíguos (regra da parte 17)', () => {
    assert.equal(rhcNoPeriodo([]).situacao, 'ausente');
    assert.deepEqual(rhcNoPeriodo([{ id: 9, qtdRhc: 2, leitos: 8 }]), {
      situacao: 'vigente',
      rhcPeriodoIds: [9],
      qtdRhc: 2,
      leitos: 8,
    });
    const dois = rhcNoPeriodo([
      { id: 9, qtdRhc: 2, leitos: 8 },
      { id: 3, qtdRhc: 3, leitos: 9 },
    ]);
    assert.equal(dois.situacao, 'ambiguo');
    assert.deepEqual(dois.rhcPeriodoIds, [3, 9]);
  });
});

const meio = (
  empreendimentoId: number,
  extra: Partial<MeioInsumo> = {},
): MeioInsumo => ({
  empreendimentoId,
  nomeFantasia: `Meio fictício ${empreendimentoId}`,
  tipo: 'hotel',
  capacidade: 'vigente',
  inventarioVersaoIds: [empreendimentoId * 10],
  uhs: 10,
  leitos: 20,
  maxLeitosPorUh: 2,
  respostaId: empreendimentoId * 100,
  taxaOcupacao: '50',
  ...extra,
});

/** Espelho do seed: Alfa 75% (10 UH), Beta 50% (5 UH, sem máximo por UH), Alfa II sem inventário. */
const RETRATO: InsumosCalculo = {
  versaoFormula: 1,
  periodo: { id: 1, rotulo: 'Outubro fictício', ...OUTUBRO, diasPeriodo: 31 },
  pesquisa: {
    id: 1,
    titulo: 'Consolidado fictício',
    tipoColeta: 'consolidado',
  },
  pergunta: { id: 1, rotulo: 'Ocupação do período (%)' },
  populacao: 'elegiveis_no_calculo',
  meios: [
    meio(1, { taxaOcupacao: '75' }),
    meio(2, { tipo: 'pousada', uhs: 5, leitos: 10, maxLeitosPorUh: null }),
    meio(4, {
      capacidade: 'ausente',
      inventarioVersaoIds: [],
      uhs: null,
      leitos: null,
      maxLeitosPorUh: null,
      respostaId: null,
      taxaOcupacao: null,
      tipo: null,
    }),
  ],
  rhc: { situacao: 'vigente', rhcPeriodoIds: [1], qtdRhc: 2, leitos: 8 },
  parametros: [
    {
      chave: 'day_use.fator_hospedados',
      situacao: 'vigente',
      parametroIds: [2],
      valor: '1',
    },
    {
      chave: 'day_use.percentual',
      situacao: 'ausente',
      parametroIds: [],
      valor: null,
    },
    {
      chave: 'leitos_media.minimo_por_uh',
      situacao: 'vigente',
      parametroIds: [3],
      valor: '1',
    },
  ],
};

const valorDe = (
  linhas: ReturnType<typeof linhasDoResultado>,
  codigo: string,
  recorte = 'total',
) => linhas.find((l) => l.codigo === codigo && l.recorte === recorte)!.valor;

describe('cálculo a partir do retrato', () => {
  it('reproduz a taxa ponderada por UH só com respondentes e marca o que falta como indisponível', () => {
    const r = calcularDoRetrato(RETRATO);
    assert.ok(r.ok);
    // (75 × 10 + 50 × 5) ÷ 15
    assert.deepEqual(valorDe(r.linhas, 'taxa_ocupacao_uh'), {
      estado: 'disponivel',
      valor: '66.666666666667',
    });
    assert.deepEqual(valorDe(r.linhas, 'cobertura_meios'), {
      estado: 'disponivel',
      valor: '66.666666666667',
    });
    // Alfa II sem capacidade conferida: soma de UH indisponível, nunca zero.
    assert.equal(valorDe(r.linhas, 'cobertura_uhs').estado, 'indisponivel');
    // Leitos média do RHC não são registrados: turistas em RHC ficam indisponíveis.
    const rhc = valorDe(r.linhas, 'turistas_rhc');
    assert.equal(rhc.estado, 'indisponivel');
    assert.equal(rhc.estado === 'indisponivel' && rhc.motivo, 'dado_ausente');
    // Por tipo, ordenado e ponderado.
    assert.deepEqual(
      r.linhas
        .filter((l) => l.codigo === 'taxa_ocupacao_tipo')
        .map((l) => [l.recorte, l.metodo]),
      [
        ['hotel', 'ponderada'],
        ['pousada', 'ponderada'],
      ],
    );
    assert.equal(valorDe(r.linhas, 'cobertura_meios').estado, 'disponivel');
    assert.equal(
      r.linhas.find((l) => l.codigo === 'cobertura_meios')!.metodo,
      'nao_se_aplica',
    );
  });

  it('a entrada montada é exatamente a da fórmula v1: leitos média vêm do inventário', () => {
    const entrada = montarEntradaTabulacao(RETRATO);
    assert.equal(entrada.diasPeriodo, 31);
    assert.deepEqual(
      entrada.meios.map((m) => m.leitosMedia),
      ['15', null, null], // 10 × (1 + 2) ÷ 2; Beta sem máximo; Alfa II sem UH
    );
    assert.deepEqual(entrada.rhc, { leitos: 8, leitosMedia: null });
    assert.equal(entrada.parametros.percentualDayUse, null);
    assert.equal(entrada.parametros.faixasOcupacao, null);
    assert.deepEqual(
      linhasDoResultado(calcularTabulacaoOcupacao(entrada)).length,
      calcularDoRetrato(RETRATO).ok ? 20 : -1,
    );
  });

  it('taxa inválida é falha da execução, com o campo, e não resultado parcial', () => {
    const r = calcularDoRetrato({
      ...RETRATO,
      meios: [meio(1, { taxaOcupacao: '101' })],
    });
    assert.equal(r.ok, false);
    assert.match(
      !r.ok ? r.erro : '',
      /Entrada inválida para a fórmula v1: meios/,
    );
  });
});

describe('hash do retrato', () => {
  it('é estável à ordem das chaves e ignora rótulos; muda quando um insumo muda', () => {
    const base = hashInsumos(RETRATO);
    assert.match(base, /^[0-9a-f]{64}$/);
    assert.equal(
      serializarCanonico({ b: 1, a: [2, { d: null, c: 'x' }] }),
      '{"a":[2,{"c":"x","d":null}],"b":1}',
    );
    const rotulos = {
      ...RETRATO,
      periodo: { ...RETRATO.periodo, rotulo: 'Outro rótulo' },
      pesquisa: { ...RETRATO.pesquisa, titulo: 'Outro título' },
      meios: RETRATO.meios.map((m) => ({ ...m, nomeFantasia: 'Renomeado' })),
    };
    assert.equal(hashInsumos(rotulos), base);
    const corrigida = {
      ...RETRATO,
      meios: RETRATO.meios.map((m) =>
        m.empreendimentoId === 1 ? { ...m, taxaOcupacao: '76' } : m,
      ),
    };
    assert.notEqual(hashInsumos(corrigida), base);
    const parametro = {
      ...RETRATO,
      parametros: RETRATO.parametros.map((p) =>
        p.chave === 'day_use.percentual'
          ? {
              ...p,
              situacao: 'vigente' as const,
              parametroIds: [7],
              valor: '15.15',
            }
          : p,
      ),
    };
    assert.notEqual(hashInsumos(parametro), base);
  });

  it('execução parada além do limite é interrompida; recente não', () => {
    const agora = new Date('2026-11-22T12:00:00Z');
    const ha = (min: number) => new Date(agora.getTime() - min * 60_000);
    assert.equal(
      interrompida(
        { situacao: 'executando', solicitadaEm: ha(30), iniciadaEm: ha(11) },
        agora,
      ),
      true,
    );
    assert.equal(
      interrompida(
        { situacao: 'executando', solicitadaEm: ha(30), iniciadaEm: ha(2) },
        agora,
      ),
      false,
    );
    assert.equal(
      interrompida(
        { situacao: 'concluido', solicitadaEm: ha(90), iniciadaEm: ha(90) },
        agora,
      ),
      false,
    );
  });
});

type Execucao = {
  id: number;
  perguntaId: number;
  periodoId: number;
  tipoColeta: string;
  situacao: string;
  publicacao: string;
  revisao: number | null;
  insumos: unknown;
  erro: string | null;
  concluidaEm: Date | null;
  publicadaEm: Date | null;
  publicadaPorId: number | null;
  motivoPublicacao: string | null;
  substituidaPorId: number | null;
  iniciadaEm: Date | null;
};

/**
 * Banco em memória com transação que desfaz tudo em caso de erro, como o PostgreSQL:
 * o que importa é o estado observável depois de uma falha no meio do processamento.
 */
function banco(execucoes: Partial<Execucao>[], falharNoResultado?: number) {
  const estado = {
    execucoes: execucoes.map((e, i): Execucao => ({
      id: i + 1,
      perguntaId: 1,
      periodoId: 1,
      tipoColeta: 'consolidado',
      situacao: 'concluido',
      publicacao: 'calculado',
      revisao: null,
      insumos: RETRATO,
      erro: null,
      concluidaEm: null,
      publicadaEm: null,
      publicadaPorId: null,
      motivoPublicacao: null,
      substituidaPorId: null,
      iniciadaEm: null,
      ...e,
    })),
    resultados: [] as Record<string, unknown>[],
    definicoes: [] as { id: number; codigo: string }[],
    auditorias: [] as Record<string, unknown>[],
  };
  const achar = (id: number) => {
    const e = estado.execucoes.find((x) => x.id === id);
    if (!e) throw new Error('não encontrada');
    return e;
  };
  const db = {
    calculoExecucao: {
      findUnique: async ({ where }: { where: { id: number } }) =>
        estado.execucoes.find((x) => x.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }: { where: { id: number } }) =>
        achar(where.id),
      findFirst: async ({
        where,
      }: {
        where: { perguntaId: number; publicacao?: string };
      }) =>
        estado.execucoes.find(
          (x) =>
            x.perguntaId === where.perguntaId &&
            x.publicacao === where.publicacao,
        ) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: number };
        data: Partial<Execucao>;
      }) => Object.assign(achar(where.id), data),
      aggregate: async ({ where }: { where: { perguntaId: number } }) => ({
        _max: {
          revisao:
            Math.max(
              0,
              ...estado.execucoes
                .filter(
                  (x) =>
                    x.perguntaId === where.perguntaId && x.revisao !== null,
                )
                .map((x) => x.revisao!),
            ) || null,
        },
      }),
    },
    indicadorDefinicao: {
      findUnique: async ({ where }: { where: { codigo: string } }) =>
        estado.definicoes.find((d) => d.codigo === where.codigo) ?? null,
      create: async ({ data }: { data: { codigo: string } }) => {
        const d = { id: estado.definicoes.length + 1, codigo: data.codigo };
        estado.definicoes.push(d);
        return d;
      },
    },
    indicadorResultado: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (
          falharNoResultado !== undefined &&
          estado.resultados.length === falharNoResultado
        )
          throw new Error('conexão perdida (simulada)');
        estado.resultados.push(data);
        return { id: estado.resultados.length };
      },
    },
    usuario: { findUniqueOrThrow: async () => ({ nome: 'Gestora fictícia' }) },
    auditoria: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        estado.auditorias.push(data);
        return data;
      },
    },
    $executeRaw: async () => 1,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const copia = structuredClone({
        execucoes: estado.execucoes,
        resultados: estado.resultados,
        definicoes: estado.definicoes,
        auditorias: estado.auditorias,
      });
      try {
        return await fn(db);
      } catch (erro) {
        Object.assign(estado, copia);
        throw erro;
      }
    },
  };
  const autorizacao = {
    executar: (
      contexto: ContextoAcesso,
      _r: string,
      _a: string,
      work: (
        tx: unknown,
        atual: ContextoAcesso,
        escopo: string,
      ) => Promise<unknown>,
    ) => db.$transaction((tx) => work(tx, contexto, 'todos')),
  };
  const servico = new CalculosService(
    db as unknown as PrismaService,
    autorizacao as unknown as AutorizacaoService,
  );
  // O detalhe relê insumos no banco real; aqui basta confirmar o estado gravado.
  (
    servico as unknown as { detalhe: (id: number) => Promise<unknown> }
  ).detalhe = async (id) => achar(id);
  return { estado, servico };
}

const contexto = {
  usuario: { id: 7, perfil: 'gestor' },
} as unknown as ContextoAcesso;

describe('processamento da execução', () => {
  it('conclui gravando todos os resultados, a linhagem e a próxima revisão da série', async () => {
    const { estado, servico } = banco([
      { revisao: 1, situacao: 'concluido', concluidaEm: new Date() },
      { situacao: 'pendente' },
    ]);
    await servico.processar(2, 7);
    const e = estado.execucoes[1];
    assert.equal(e.situacao, 'concluido');
    assert.equal(e.revisao, 2);
    assert.equal(estado.resultados.length, 20);
    for (const r of estado.resultados) {
      assert.equal(r.execucaoId, 2);
      // Disponível tem valor; indisponível tem motivo e nunca zero.
      if (r.estado === 'disponivel') assert.equal(typeof r.valor, 'string');
      else {
        assert.equal(r.valor, null);
        assert.ok(r.motivoIndisponibilidade);
      }
    }
    const linhagem = estado.resultados[0] as {
      versoes: { create: { versaoId: number }[] };
      parametros: { create: { parametroId: number }[] };
    };
    assert.deepEqual(
      linhagem.versoes.create.map((v) => v.versaoId),
      [10, 20],
    );
    assert.deepEqual(
      linhagem.parametros.create.map((p) => p.parametroId),
      [2, 3],
    );
    assert.ok(
      estado.auditorias.some(
        (a) => (a.depois as { situacao?: string }).situacao === 'concluido',
      ),
    );
  });

  it('falha no meio da gravação não deixa resultado parcial e registra a falha', async () => {
    const { estado, servico } = banco([{ situacao: 'pendente' }], 5);
    await servico.processar(1, 7);
    const e = estado.execucoes[0];
    assert.equal(e.situacao, 'falhou');
    assert.equal(e.revisao, null);
    assert.match(e.erro!, /nenhum resultado foi gravado/);
    assert.equal(estado.resultados.length, 0);
    assert.equal(estado.definicoes.length, 0);
  });

  it('retrato inválido falha com a mensagem de domínio', async () => {
    const { estado, servico } = banco([
      {
        situacao: 'pendente',
        insumos: { ...RETRATO, meios: [meio(1, { taxaOcupacao: '101' })] },
      },
    ]);
    await servico.processar(1, 7);
    assert.equal(estado.execucoes[0].situacao, 'falhou');
    assert.match(estado.execucoes[0].erro!, /Entrada inválida/);
    assert.equal(estado.resultados.length, 0);
  });
});

describe('publicação', () => {
  it('primeira publicação dispensa motivo', async () => {
    const { estado, servico } = banco([
      { revisao: 1, concluidaEm: new Date() },
    ]);
    await servico.publicar(contexto, 1, {});
    assert.equal(estado.execucoes[0].publicacao, 'publicado');
    assert.equal(estado.execucoes[0].publicadaPorId, 7);
  });

  it('substituir a publicação vigente exige motivo e preserva a anterior', async () => {
    const { estado, servico } = banco([
      {
        revisao: 1,
        publicacao: 'publicado',
        publicadaEm: new Date(),
        publicadaPorId: 3,
      },
      { revisao: 2, concluidaEm: new Date() },
    ]);
    await assert.rejects(
      servico.publicar(contexto, 2, {}),
      (e: { status?: number }) => e.status === 400,
    );
    assert.equal(estado.execucoes[0].publicacao, 'publicado');
    await servico.publicar(contexto, 2, {
      motivo: 'Correção de resposta fictícia',
    });
    assert.equal(estado.execucoes[0].publicacao, 'substituido');
    assert.equal(estado.execucoes[0].substituidaPorId, 2);
    assert.equal(estado.execucoes[1].publicacao, 'publicado');
    assert.equal(
      estado.execucoes[1].motivoPublicacao,
      'Correção de resposta fictícia',
    );
  });

  it('não publica execução não concluída nem republica uma publicada', async () => {
    const { servico } = banco([
      { situacao: 'falhou', erro: 'x' },
      {
        revisao: 1,
        publicacao: 'publicado',
        publicadaEm: new Date(),
        publicadaPorId: 3,
        perguntaId: 2,
      },
    ]);
    await assert.rejects(
      servico.publicar(contexto, 1, {}),
      (e: { status?: number }) => e.status === 409,
    );
    await assert.rejects(
      servico.publicar(contexto, 2, {}),
      (e: { status?: number }) => e.status === 409,
    );
    await assert.rejects(
      servico.publicar(contexto, 99, {}),
      (e: { status?: number }) => e.status === 404,
    );
  });
});

describe('OData de /calculos', () => {
  it('todo campo do esquema tem caminho no mapa', () => {
    for (const campo of ESQUEMAS_ODATA.calculos.campos)
      assert.ok(MAPA_CALCULOS[campo.nome]?.caminho, campo.nome);
  });
});
