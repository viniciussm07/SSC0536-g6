import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { AutorizacaoService } from '../src/acesso/autorizacao.service';
import type { ContextoAcesso } from '../src/acesso/acesso.types';
import { ModelosPesquisaService } from '../src/pesquisas/modelos.service';

const contexto = { usuario: { id: 7 } } as unknown as ContextoAcesso;

type CampoRow = {
  id: number;
  modeloId: number;
  chave: string;
  rotulo: string;
  tipoValor: string;
  obrigatorio: boolean;
  ordem: number;
};
type OpcaoRow = {
  id: number;
  campoId: number;
  chave: string;
  rotulo: string;
  ordem: number;
};

function cenario() {
  const auditorias: unknown[] = [];
  const estado = {
    proximoCampo: 1,
    proximoOpcao: 1,
    proximoModelo: 1,
    modelos: [] as {
      id: number;
      nome: string;
      publicoAlvo: string;
      versaoAtual: number;
      criadaEm: Date;
    }[],
    campos: [] as CampoRow[],
    opcoes: [] as OpcaoRow[],
    versoes: [] as {
      modeloId: number;
      numero: number;
      nome: string;
      publicoAlvo: string;
      motivo: string | null;
    }[],
    camposVersao: [] as {
      modeloId: number;
      numero: number;
      campoId: number;
      chave: string;
      opcoes: unknown;
    }[],
  };
  const camposComOpcoes = (modeloId: number) =>
    estado.campos
      .filter((c) => c.modeloId === modeloId)
      .map((c) => ({
        ...c,
        opcoes: estado.opcoes.filter((o) => o.campoId === c.id),
      }));
  const tx = {
    $queryRaw: async () => [],
    usuario: { findUniqueOrThrow: async () => ({ nome: 'Operadora' }) },
    auditoria: {
      create: async ({ data }: { data: unknown }) => {
        auditorias.push(data);
        return data;
      },
    },
    pesquisaModelo: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: estado.proximoModelo++,
          criadaEm: new Date(),
          versaoAtual: 1,
          ...data,
        } as (typeof estado.modelos)[number];
        estado.modelos.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: number } }) => {
        const m = estado.modelos.find((x) => x.id === where.id);
        return m ? { ...m, campos: camposComOpcoes(m.id) } : null;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: number };
        data: Record<string, unknown>;
      }) => {
        const m = estado.modelos.find((x) => x.id === where.id)!;
        Object.assign(m, data);
        return { ...m };
      },
    },
    pesquisaCampo: {
      create: async ({ data }: { data: Omit<CampoRow, 'id'> }) => {
        const row = { id: estado.proximoCampo++, ...data };
        estado.campos.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: number };
        data: Partial<CampoRow>;
      }) => {
        const c = estado.campos.find((x) => x.id === where.id)!;
        Object.assign(c, data);
        return { ...c };
      },
      deleteMany: async ({
        where,
      }: {
        where: { modeloId: number; id: { in: number[] } };
      }) => {
        estado.campos = estado.campos.filter(
          (c) => !where.id.in.includes(c.id),
        );
        return { count: 0 };
      },
    },
    pesquisaCampoOpcao: {
      deleteMany: async ({ where }: { where: { campoId: number } }) => {
        estado.opcoes = estado.opcoes.filter(
          (o) => o.campoId !== where.campoId,
        );
        return { count: 0 };
      },
      createMany: async ({ data }: { data: Omit<OpcaoRow, 'id'>[] }) => {
        for (const o of data)
          estado.opcoes.push({ id: estado.proximoOpcao++, ...o });
        return { count: data.length };
      },
    },
    pesquisaModeloVersao: {
      create: async ({ data }: { data: (typeof estado.versoes)[number] }) => {
        estado.versoes.push(data);
        return data;
      },
    },
    pesquisaCampoVersao: {
      create: async ({
        data,
      }: {
        data: (typeof estado.camposVersao)[number];
      }) => {
        estado.camposVersao.push(data);
        return data;
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
  const service = new ModelosPesquisaService({} as PrismaService, autorizacao);
  return { service, estado, auditorias };
}

const MODELO = {
  nome: 'Pesquisa de ocupação',
  publicoAlvo: 'Meios de hospedagem',
  campos: [
    {
      chave: 'ocupacao',
      rotulo: 'Taxa de ocupação (%)',
      tipoValor: 'percentual' as const,
      obrigatorio: true,
      ordem: 1,
      opcoes: [],
    },
    {
      chave: 'publico',
      rotulo: 'Perfil do público',
      tipoValor: 'escolha' as const,
      obrigatorio: false,
      ordem: 2,
      opcoes: [
        { chave: 'familias', rotulo: 'Famílias', ordem: 1 },
        { chave: 'congresso', rotulo: 'Congresso', ordem: 2 },
      ],
    },
  ],
};

describe('Criação de modelo de pesquisa', () => {
  it('grava campos e opções e registra o snapshot da versão 1', async () => {
    const { service, estado, auditorias } = cenario();
    const criado = await service.criar(contexto, structuredClone(MODELO));
    assert.equal(criado.versao, 1);
    assert.equal(criado.campos.length, 2);
    assert.equal(estado.opcoes.length, 2);
    assert.equal(estado.versoes.length, 1);
    assert.equal(estado.versoes[0].numero, 1);
    assert.equal(estado.camposVersao.length, 2);
    const campoEscolha = estado.camposVersao.find((c) => c.chave === 'publico');
    assert.deepEqual(
      campoEscolha?.opcoes,
      structuredClone(MODELO.campos[1].opcoes),
    );
    assert.equal(auditorias.length, 1);
  });
});

describe('Versionamento do modelo', () => {
  it('mudança semântica gera nova versão preservando a anterior', async () => {
    const { service, estado } = cenario();
    const criado = await service.criar(contexto, structuredClone(MODELO));
    const campos = structuredClone(MODELO.campos);
    campos[0].rotulo = 'Ocupação do período (%)';
    await service.alterar(contexto, criado.id, {
      campos,
      motivo: 'Revisão do rótulo aprovada',
    });
    assert.equal(estado.modelos[0].versaoAtual, 2);
    assert.equal(estado.versoes.length, 2);
    assert.equal(estado.versoes[1].numero, 2);
    assert.equal(estado.versoes[1].motivo, 'Revisão do rótulo aprovada');
    // Snapshot da versão 1 permanece com o rótulo antigo.
    const v1 = estado.camposVersao.filter((c) => c.numero === 1);
    assert.equal(v1.find((c) => c.chave === 'ocupacao')?.chave, 'ocupacao');
    assert.equal(estado.camposVersao.filter((c) => c.numero === 2).length, 2);
  });

  it('mudança só de ordem não gera nova versão', async () => {
    const { service, estado } = cenario();
    const criado = await service.criar(contexto, structuredClone(MODELO));
    const campos = structuredClone(MODELO.campos);
    campos[0].ordem = 2;
    campos[1].ordem = 1;
    await service.alterar(contexto, criado.id, { campos });
    assert.equal(estado.versoes.length, 1);
    assert.equal(estado.modelos[0].versaoAtual, 1);
    assert.equal(estado.campos[0].ordem, 2);
  });

  it('alteração de opção é semântica e remoção de campo também', async () => {
    const { service, estado } = cenario();
    const criado = await service.criar(contexto, structuredClone(MODELO));
    const campos = structuredClone(MODELO.campos);
    campos[1].opcoes[0].rotulo = 'Famílias e casais';
    await service.alterar(contexto, criado.id, { campos });
    assert.equal(estado.versoes.length, 2);
    await service.alterar(contexto, criado.id, {
      campos: [campos[0]],
    });
    assert.equal(estado.versoes.length, 3);
    assert.equal(estado.campos.length, 1);
  });

  it('sem mudança não grava nada', async () => {
    const { service, estado, auditorias } = cenario();
    const criado = await service.criar(contexto, structuredClone(MODELO));
    await service.alterar(contexto, criado.id, {
      campos: structuredClone(MODELO.campos),
    });
    assert.equal(estado.versoes.length, 1);
    assert.equal(auditorias.length, 1);
  });
});
