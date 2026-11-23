import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ColetaDiariaLinha } from '@ssc0536/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { AutorizacaoService } from '../src/acesso/autorizacao.service';
import type { ContextoAcesso } from '../src/acesso/acesso.types';
import { ColetasService } from '../src/diarias/coletas.service';
import { ParametrosService } from '../src/diarias/parametros.service';
import { RhcService } from '../src/diarias/rhc.service';
import {
  paraColeta,
  paraParametro,
  paraRhc,
} from '../src/diarias/diarias.leitura';

const contexto = {
  usuario: { id: 7, nome: 'Operadora' },
} as unknown as ContextoAcesso;

type ColetaFake = {
  id: number;
  empreendimentoId: number;
  periodoId: number;
  fonte: string;
  dataColeta: Date;
  dataEstadia: Date;
  tipoDia: string;
  valorDiaria: { toString(): string };
  moeda: string;
  unidadePreco: string;
  origem: string;
  situacaoConferencia: string;
  referenciaOrigem: string | null;
  observacao: string | null;
  conferidoEm: Date | null;
  conferidoPorUsuarioId: number | null;
  empreendimento: { nomeFantasia: string };
  periodo: { rotulo: string };
  conferidoPor: { nome: string } | null;
};

function decimal(valor: string) {
  return { toString: () => valor };
}

function cenario() {
  const auditorias: unknown[] = [];
  const estado = {
    proximoId: 1,
    coletas: [] as ColetaFake[],
  };
  const comRelacoes = (row: ColetaFake) => ({
    ...row,
    conferidoPor: row.conferidoPorUsuarioId
      ? { nome: 'Operadora' }
      : row.conferidoPor,
  });
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async () => 0,
    empreendimento: {
      findUnique: async () => ({ id: 900001 }),
    },
    periodo: {
      findUnique: async () => ({
        dataInicio: new Date('2026-11-01T00:00:00Z'),
        dataFim: new Date('2026-11-30T00:00:00Z'),
      }),
    },
    usuario: {
      findUniqueOrThrow: async () => ({ nome: 'Operadora' }),
    },
    auditoria: {
      create: async ({ data }: { data: unknown }) => {
        auditorias.push(data);
        return data;
      },
    },
    coletaDiaria: {
      findFirst: async ({
        where,
      }: {
        where: {
          empreendimentoId: number;
          periodoId: number;
          fonte: string;
          dataEstadia: Date;
          tipoDia: string;
          id?: { not: number };
        };
      }) =>
        estado.coletas.find(
          (row) =>
            row.empreendimentoId === where.empreendimentoId &&
            row.periodoId === where.periodoId &&
            row.fonte === where.fonte &&
            row.dataEstadia.getTime() === where.dataEstadia.getTime() &&
            row.tipoDia === where.tipoDia &&
            (where.id === undefined || row.id !== where.id.not),
        ) ?? null,
      create: async ({
        data,
      }: {
        data: Omit<
          ColetaFake,
          | 'id'
          | 'empreendimento'
          | 'periodo'
          | 'conferidoPor'
          | 'conferidoEm'
          | 'conferidoPorUsuarioId'
        > & { referenciaOrigem?: string | null; observacao?: string | null };
      }) => {
        const row: ColetaFake = {
          ...data,
          id: estado.proximoId++,
          valorDiaria: decimal(String(data.valorDiaria)),
          conferidoEm: null,
          conferidoPorUsuarioId: null,
          empreendimento: { nomeFantasia: 'Hotel A' },
          periodo: { rotulo: 'Novembro 2026' },
          conferidoPor: null,
          referenciaOrigem: data.referenciaOrigem ?? null,
          observacao: data.observacao ?? null,
        };
        estado.coletas.push(row);
        return comRelacoes(row);
      },
      findUnique: async ({ where }: { where: { id: number } }) => {
        const row = estado.coletas.find((c) => c.id === where.id);
        return row ? comRelacoes(row) : null;
      },
      findUniqueOrThrow: async ({ where }: { where: { id: number } }) => {
        const row = estado.coletas.find((c) => c.id === where.id)!;
        return comRelacoes(row);
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: number };
        data: Partial<ColetaFake> & { valorDiaria?: string };
      }) => {
        const row = estado.coletas.find((c) => c.id === where.id)!;
        Object.assign(row, data, {
          valorDiaria:
            data.valorDiaria === undefined
              ? row.valorDiaria
              : decimal(data.valorDiaria),
        });
        return comRelacoes(row);
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
  const prisma = {
    coletaDiaria: tx.coletaDiaria,
  } as unknown as PrismaService;
  return {
    service: new ColetasService(prisma, autorizacao),
    estado,
    auditorias,
  };
}

const ENTRADA = {
  empreendimentoId: 900001,
  periodoId: 900002,
  fonte: 'booking',
  dataColeta: '2026-11-01',
  dataEstadia: '2026-11-15',
  tipoDia: 'fim_de_semana' as const,
  valorDiaria: '199.90',
};

describe('Coletas de diária — regras de serviço', () => {
  it('cria com origem manual/pendente e audita', async () => {
    const { service, estado, auditorias } = cenario();
    const criada = await service.criar(contexto, ENTRADA);
    assert.equal(criada.origem, 'manual');
    assert.equal(criada.situacaoConferencia, 'pendente');
    assert.equal(criada.empreendimentoNome, 'Hotel A');
    assert.equal(estado.coletas.length, 1);
    assert.equal(auditorias.length, 1);
  });

  it('recusa duplicata com mesmo valor e conflito com valor divergente', async () => {
    const { service } = cenario();
    await service.criar(contexto, { ...ENTRADA, valorDiaria: '199.9' });
    await assert.rejects(
      () => service.criar(contexto, ENTRADA),
      (e: { response?: { error?: { code?: string } } }) =>
        e.response?.error?.code === 'COLETA_DIARIA_DUPLICADA',
    );
    await assert.rejects(
      () => service.criar(contexto, { ...ENTRADA, valorDiaria: '210' }),
      (e: { response?: { error?: { code?: string } } }) =>
        e.response?.error?.code === 'COLETA_DIARIA_CONFLITO',
    );
  });

  it('conferência registra responsável e mudança de valor volta para pendente', async () => {
    const { service, estado } = cenario();
    const criada = await service.criar(contexto, ENTRADA);
    const conferida = await service.alterar(contexto, criada.id, {
      situacaoConferencia: 'conferida',
    });
    assert.equal(conferida.situacaoConferencia, 'conferida');
    assert.equal(conferida.conferidoPor, 'Operadora');
    assert.ok(conferida.conferidoEm);
    assert.equal(estado.coletas[0].conferidoPorUsuarioId, 7);

    const alterada = await service.alterar(contexto, criada.id, {
      valorDiaria: '210.50',
    });
    assert.equal(alterada.situacaoConferencia, 'pendente');
    assert.equal(alterada.valorDiaria, '210.50');
    assert.equal(alterada.conferidoPor, null);
  });
});

describe('Leitura das fontes complementares', () => {
  it('serializa datas, decimais e relações', () => {
    const coleta = paraColeta({
      id: 1,
      empreendimentoId: 2,
      periodoId: 3,
      fonte: 'booking',
      dataColeta: new Date('2026-11-01T00:00:00Z'),
      dataEstadia: new Date('2026-11-15T00:00:00Z'),
      tipoDia: 'fim_de_semana',
      valorDiaria: decimal('199.90') as never,
      moeda: 'BRL',
      unidadePreco: 'por_uh_diaria',
      origem: 'manual',
      situacaoConferencia: 'pendente',
      referenciaOrigem: null,
      observacao: null,
      conferidoEm: null,
      empreendimento: { nomeFantasia: 'Hotel A' },
      periodo: { rotulo: 'Novembro 2026' },
      conferidoPor: null,
    }) as ColetaDiariaLinha;
    assert.equal(coleta.dataEstadia, '2026-11-15');
    assert.equal(coleta.valorDiaria, '199.90');
    assert.equal(coleta.periodoRotulo, 'Novembro 2026');
    assert.equal(coleta.conferidoPor, null);

    const rhc = paraRhc({
      id: 1,
      periodoId: 3,
      qtdRhc: 2,
      leitos: 8,
      origem: 'manual',
      situacaoConferencia: 'conferida',
      revisao: 2,
      observacao: null,
      conferidoEm: new Date('2026-11-20T12:00:00Z'),
      periodo: { rotulo: 'Novembro 2026' },
      conferidoPor: { nome: 'Operadora' },
    });
    assert.equal(rhc.conferidoEm, '2026-11-20T12:00:00.000Z');
    assert.equal(rhc.conferidoPor, 'Operadora');

    const parametro = paraParametro({
      id: 1,
      chave: 'x',
      valor: decimal('15.15') as never,
      unidade: 'percentual_0_100',
      vigenciaInicio: new Date('2026-01-01T00:00:00Z'),
      vigenciaFim: null,
      fonte: null,
      situacao: 'hipotese_pendente_homologacao',
      observacao: null,
    });
    assert.equal(parametro.valor, '15.15');
    assert.equal(parametro.vigenciaFim, null);
  });
});

type RhcFake = {
  id: number;
  periodoId: number;
  qtdRhc: number;
  leitos: number;
  origem: string;
  situacaoConferencia: string;
  revisao: number;
  observacao: string | null;
  conferidoEm: Date | null;
  conferidoPorUsuarioId: number | null;
  periodo: { rotulo: string };
  conferidoPor: { nome: string } | null;
};

function cenarioRhc() {
  const auditorias: unknown[] = [];
  const estado = { proximoId: 1, rhcs: [] as RhcFake[] };
  const comRelacoes = (row: RhcFake) => ({
    ...row,
    periodo: { rotulo: 'Novembro 2026' },
    conferidoPor: row.conferidoPorUsuarioId
      ? { nome: 'Operadora' }
      : row.conferidoPor,
  });
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async () => 0,
    periodo: { findUnique: async () => ({ id: 1 }) },
    usuario: { findUniqueOrThrow: async () => ({ nome: 'Operadora' }) },
    auditoria: {
      create: async ({ data }: { data: unknown }) => {
        auditorias.push(data);
        return data;
      },
    },
    rhcPeriodo: {
      findFirst: async ({
        where,
      }: {
        where: {
          periodoId: number;
          situacaoConferencia: string;
          id?: { not: number };
        };
      }) =>
        estado.rhcs.find(
          (row) =>
            row.periodoId === where.periodoId &&
            row.situacaoConferencia === where.situacaoConferencia &&
            (where.id === undefined || row.id !== where.id.not),
        ) ?? null,
      create: async ({
        data,
      }: {
        data: Omit<
          RhcFake,
          | 'id'
          | 'periodo'
          | 'conferidoPor'
          | 'conferidoEm'
          | 'conferidoPorUsuarioId'
        >;
      }) => {
        const row: RhcFake = {
          ...data,
          id: estado.proximoId++,
          conferidoEm: null,
          conferidoPorUsuarioId: null,
          periodo: { rotulo: 'Novembro 2026' },
          conferidoPor: null,
        };
        estado.rhcs.push(row);
        return comRelacoes(row);
      },
      findUnique: async ({ where }: { where: { id: number } }) => {
        const row = estado.rhcs.find((r) => r.id === where.id);
        return row ? comRelacoes(row) : null;
      },
      findUniqueOrThrow: async ({ where }: { where: { id: number } }) => {
        const row = estado.rhcs.find((r) => r.id === where.id)!;
        return comRelacoes(row);
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: number };
        data: Partial<RhcFake>;
      }) => {
        const row = estado.rhcs.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return comRelacoes(row);
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
  const prisma = { rhcPeriodo: tx.rhcPeriodo } as unknown as PrismaService;
  return { service: new RhcService(prisma, autorizacao), estado, auditorias };
}

describe('RHC — regras de serviço', () => {
  it('cria pendente com revisão 1 e audita', async () => {
    const { service, auditorias } = cenarioRhc();
    const criado = await service.criar(contexto, {
      periodoId: 1,
      qtdRhc: 2,
      leitos: 8,
    });
    assert.equal(criado.situacaoConferencia, 'pendente');
    assert.equal(criado.revisao, 1);
    assert.equal(criado.periodoRotulo, 'Novembro 2026');
    assert.equal(auditorias.length, 1);
  });

  it('recusa segunda conferência no mesmo período', async () => {
    const { service } = cenarioRhc();
    const primeiro = await service.criar(contexto, {
      periodoId: 1,
      qtdRhc: 2,
      leitos: 8,
    });
    const segundo = await service.criar(contexto, {
      periodoId: 1,
      qtdRhc: 3,
      leitos: 12,
    });
    await service.alterar(contexto, primeiro.id, {
      situacaoConferencia: 'conferida',
    });
    await assert.rejects(
      () =>
        service.alterar(contexto, segundo.id, {
          situacaoConferencia: 'conferida',
        }),
      (e: { response?: { error?: { code?: string } } }) =>
        e.response?.error?.code === 'RHC_JA_CONFERIDO',
    );
  });

  it('mudança de leitos incrementa revisão e volta para pendente', async () => {
    const { service } = cenarioRhc();
    const criado = await service.criar(contexto, {
      periodoId: 1,
      qtdRhc: 2,
      leitos: 8,
    });
    await service.alterar(contexto, criado.id, {
      situacaoConferencia: 'conferida',
    });
    const alterado = await service.alterar(contexto, criado.id, {
      leitos: 10,
    });
    assert.equal(alterado.situacaoConferencia, 'pendente');
    assert.equal(alterado.revisao, 2);
    assert.equal(alterado.leitos, 10);
  });
});

type ParametroFake = {
  id: number;
  chave: string;
  valor: { toString(): string };
  unidade: string;
  vigenciaInicio: Date;
  vigenciaFim: Date | null;
  fonte: string | null;
  situacao: string;
  observacao: string | null;
};

function cenarioParametro() {
  const auditorias: unknown[] = [];
  const estado = { proximoId: 1, parametros: [] as ParametroFake[] };
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async () => 0,
    usuario: { findUniqueOrThrow: async () => ({ nome: 'Operadora' }) },
    auditoria: {
      create: async ({ data }: { data: unknown }) => {
        auditorias.push(data);
        return data;
      },
    },
    parametroCalculo: {
      findMany: async ({
        where,
      }: {
        where: { chave: string; id?: { not: number } };
      }) =>
        estado.parametros
          .filter(
            (row) =>
              row.chave === where.chave &&
              (where.id === undefined || row.id !== where.id.not),
          )
          .map((row) => ({
            id: row.id,
            vigenciaInicio: row.vigenciaInicio,
            vigenciaFim: row.vigenciaFim,
          })),
      findUnique: async ({ where }: { where: { id: number } }) =>
        estado.parametros.find((p) => p.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }: { where: { id: number } }) =>
        estado.parametros.find((p) => p.id === where.id)!,
      create: async ({
        data,
      }: {
        data: Omit<ParametroFake, 'id' | 'valor'> & { valor: string };
      }) => {
        const row: ParametroFake = {
          ...data,
          id: estado.proximoId++,
          valor: decimal(String(data.valor)),
        };
        estado.parametros.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: number };
        data: Partial<ParametroFake> & { valor?: string };
      }) => {
        const row = estado.parametros.find((p) => p.id === where.id)!;
        Object.assign(row, data, {
          valor: data.valor === undefined ? row.valor : decimal(data.valor),
        });
        return row;
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
  const prisma = {
    parametroCalculo: tx.parametroCalculo,
  } as unknown as PrismaService;
  return {
    service: new ParametrosService(prisma, autorizacao),
    estado,
    auditorias,
  };
}

const PARAMETRO = {
  chave: 'day_use.percentual',
  valor: '15.15',
  unidade: 'percentual_0_100',
  vigenciaInicio: '2026-01-01',
  vigenciaFim: '2026-12-31',
  situacao: 'hipotese_pendente_homologacao' as const,
};

describe('Parâmetros — regras de serviço', () => {
  it('cria com unidade/situação e audita', async () => {
    const { service, auditorias } = cenarioParametro();
    const criado = await service.criar(contexto, PARAMETRO);
    assert.equal(criado.valor, '15.15');
    assert.equal(criado.unidade, 'percentual_0_100');
    assert.equal(criado.situacao, 'hipotese_pendente_homologacao');
    assert.equal(auditorias.length, 1);
  });

  it('recusa chave repetida no mesmo início e vigência sobreposta', async () => {
    const { service } = cenarioParametro();
    await service.criar(contexto, PARAMETRO);
    await assert.rejects(
      () => service.criar(contexto, PARAMETRO),
      (e: { response?: { error?: { code?: string } } }) =>
        e.response?.error?.code === 'PARAMETRO_DUPLICADO',
    );
    await assert.rejects(
      () =>
        service.criar(contexto, {
          ...PARAMETRO,
          vigenciaInicio: '2026-06-01',
        }),
      (e: { response?: { error?: { code?: string } } }) =>
        e.response?.error?.code === 'PARAMETRO_VIGENCIA_SOBREPOSTA',
    );
    await service.criar(contexto, {
      ...PARAMETRO,
      vigenciaInicio: '2027-01-01',
      vigenciaFim: '2027-12-31',
    });
  });

  it('altera situação e preserva o histórico', async () => {
    const { service, estado } = cenarioParametro();
    const criado = await service.criar(contexto, PARAMETRO);
    const alterado = await service.alterar(contexto, criado.id, {
      situacao: 'homologado',
    });
    assert.equal(alterado.situacao, 'homologado');
    assert.equal(estado.parametros.length, 1);
  });
});
