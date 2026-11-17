import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { AutorizacaoService } from '../src/acesso/autorizacao.service';
import type { ContextoAcesso } from '../src/acesso/acesso.types';
import { PeriodosService } from '../src/periodos/periodos.service';
import { paraDetalhe, paraLinha } from '../src/periodos/periodos.leitura';

const contexto = { usuario: { id: 7 } } as unknown as ContextoAcesso;

type EstadoPeriodos = {
  proximoId: number;
  periodos: {
    id: number;
    tipo: string;
    rotulo: string;
    dataInicio: Date;
    dataFim: Date;
  }[];
  usos: {
    perguntas: number;
    coletasDiarias: number;
    resultados: number;
    rhc: number;
  };
};

function cenario(
  usos: EstadoPeriodos['usos'] = {
    perguntas: 0,
    coletasDiarias: 0,
    resultados: 0,
    rhc: 0,
  },
) {
  const auditorias: unknown[] = [];
  const estado: EstadoPeriodos = { proximoId: 1, periodos: [], usos };
  const tx = {
    $queryRaw: async () => [],
    usuario: { findUniqueOrThrow: async () => ({ nome: 'Operadora' }) },
    auditoria: {
      create: async ({ data }: { data: unknown }) => {
        auditorias.push(data);
        return data;
      },
    },
    periodo: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const { tipo, dataInicio, dataFim, id } = where as {
          tipo: string;
          dataInicio: Date;
          dataFim: Date;
          id?: { not: number };
        };
        return (
          estado.periodos.find(
            (p) =>
              p.tipo === tipo &&
              p.dataInicio.getTime() === dataInicio.getTime() &&
              p.dataFim.getTime() === dataFim.getTime() &&
              (id === undefined || p.id !== id.not),
          ) ?? null
        );
      },
      findUnique: async ({ where }: { where: { id: number } }) => {
        const p = estado.periodos.find((x) => x.id === where.id);
        return p ? { ...p, _count: estado.usos } : null;
      },
      create: async ({
        data,
      }: {
        data: Omit<EstadoPeriodos['periodos'][number], 'id'>;
      }) => {
        const row = { ...data, id: estado.proximoId++ };
        estado.periodos.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: number };
        data: Partial<EstadoPeriodos['periodos'][number]>;
      }) => {
        const p = estado.periodos.find((x) => x.id === where.id)!;
        Object.assign(p, data);
        return { ...p, _count: estado.usos };
      },
    },
  };
  const autorizacao = {
    executar: (
      _c: unknown,
      _recurso: string,
      _acao: string,
      fn: (t: unknown, a: unknown) => Promise<unknown>,
    ) => fn(tx, contexto),
  } as unknown as AutorizacaoService;
  const service = new PeriodosService({} as PrismaService, autorizacao);
  return { service, estado, auditorias };
}

const MES_JANEIRO = {
  tipo: 'mes',
  rotulo: 'Janeiro 2026',
  dataInicio: '2026-01-01',
  dataFim: '2026-01-31',
} as const;

describe('Leitura de períodos', () => {
  it('serializa datas civis e computa o uso por referências', () => {
    const base = {
      id: 3,
      tipo: 'mes',
      rotulo: 'Janeiro 2026',
      dataInicio: new Date('2026-01-01T00:00:00Z'),
      dataFim: new Date('2026-01-31T00:00:00Z'),
    };
    const linha = paraLinha(base);
    assert.deepEqual(linha, {
      id: 3,
      tipo: 'mes',
      rotulo: 'Janeiro 2026',
      dataInicio: '2026-01-01',
      dataFim: '2026-01-31',
    });
    const livre = paraDetalhe({
      ...base,
      _count: { perguntas: 0, coletasDiarias: 0, resultados: 0, rhc: 0 },
    });
    const usado = paraDetalhe({
      ...base,
      _count: { perguntas: 0, coletasDiarias: 2, resultados: 0, rhc: 0 },
    });
    assert.equal(livre.emUso, false);
    assert.equal(usado.emUso, true);
  });
});

describe('Criação de períodos', () => {
  it('grava o período e audita na mesma transação', async () => {
    const { service, estado, auditorias } = cenario();
    const criado = await service.criar(contexto, { ...MES_JANEIRO });
    assert.equal(criado.dataInicio, '2026-01-01');
    assert.equal(estado.periodos.length, 1);
    assert.equal(auditorias.length, 1);
  });

  it('recusa identidade canônica repetida (tipo e intervalo)', async () => {
    const { service } = cenario();
    await service.criar(contexto, { ...MES_JANEIRO });
    await assert.rejects(
      () => service.criar(contexto, { ...MES_JANEIRO, rotulo: 'Outro rótulo' }),
      (e: { response?: { error?: { code?: string } } }) =>
        e.response?.error?.code === 'PERIODO_DUPLICADO',
    );
  });
});

describe('Alteração de períodos', () => {
  it('bloqueia mudança de identidade em período já usado e permite rótulo', async () => {
    const { service, estado, auditorias } = cenario({
      perguntas: 1,
      coletasDiarias: 0,
      resultados: 0,
      rhc: 0,
    });
    const criado = await service.criar(contexto, { ...MES_JANEIRO });
    await assert.rejects(
      () =>
        service.alterar(contexto, criado.id, {
          dataInicio: '2026-01-02',
        }),
      (e: { response?: { error?: { code?: string } } }) =>
        e.response?.error?.code === 'PERIODO_EM_USO',
    );
    const alterado = await service.alterar(contexto, criado.id, {
      rotulo: 'Janeiro/2026',
    });
    assert.equal(alterado.rotulo, 'Janeiro/2026');
    assert.equal(
      estado.periodos[0].dataInicio.getTime(),
      Date.parse('2026-01-01T00:00:00Z'),
    );
    assert.equal(auditorias.length, 2);
  });

  it('altera datas de período sem uso e registra antes/depois', async () => {
    const { service, estado, auditorias } = cenario();
    const criado = await service.criar(contexto, { ...MES_JANEIRO });
    await service.alterar(contexto, criado.id, { dataFim: '2026-01-30' });
    assert.equal(
      estado.periodos[0].dataFim.getTime(),
      Date.parse('2026-01-30T00:00:00Z'),
    );
    const evento = auditorias[1] as { antes: unknown; depois: unknown };
    assert.equal((evento.antes as { dataFim: string }).dataFim, '2026-01-31');
    assert.equal((evento.depois as { dataFim: string }).dataFim, '2026-01-30');
  });

  it('sem mudança efetiva não grava nada', async () => {
    const { service, auditorias } = cenario();
    const criado = await service.criar(contexto, { ...MES_JANEIRO });
    await service.alterar(contexto, criado.id, { rotulo: 'Janeiro 2026' });
    assert.equal(auditorias.length, 1);
  });
});
