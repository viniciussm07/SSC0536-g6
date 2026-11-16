import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import {
  COLECOES,
  definirColecao,
  type DefinicaoColecao,
} from '@ssc0536/common';
import { controllerColecao } from '../src/colecoes/colecao.controller';
import { celulaCsv, exportacaoAtual } from '../src/colecoes/csv';
import { executarColecao } from '../src/odata/colecao-odata';
import { lerConsultaColecao } from '../src/odata/odata.decorators';
import { MAPA_EMPREENDIMENTOS } from '../src/cadastro/empreendimentos.odata';
import { PrismaService } from '../src/prisma/prisma.service';
import { AutorizacaoService } from '../src/acesso/autorizacao.service';
import { lerCsv } from './csv-helper';

class Leitor {
  async listar() {
    await exportacaoAtual
      .getStore()
      ?.escrever([
        { id: 1, nomeFantasia: 'Hotel; "Olímpia"\nTeste', senha: 'segredo' },
      ]);
    return { data: [], meta: { top: 20, skip: 0 } };
  }
}
describe('Coleções declarativas e CSV', () => {
  it('escapa textos, preserva valores e neutraliza fórmulas', () => {
    assert.equal(celulaCsv(null), '');
    assert.equal(celulaCsv(0), '"0"');
    assert.equal(celulaCsv(false), '"Não"');
    assert.equal(celulaCsv(-5), '"-5"');
    assert.equal(celulaCsv(' =1+1'), '"\' =1+1"');
    assert.equal(celulaCsv('a;"b"\nc'), '"a;""b""\nc"');
  });
  it('a flag sozinha registra a rota e entrega arquivo, sem expor campos extras', async () => {
    for (const habilitada of [false, true]) {
      const definicao: DefinicaoColecao = definirColecao({
        ...COLECOES.empreendimentos,
        exportacao: habilitada,
      });
      const controller = controllerColecao(definicao, Leitor, (s) =>
        s.listar(),
      );
      const modulo = await Test.createTestingModule({
        controllers: [controller],
        providers: [
          Leitor,
          {
            provide: AutorizacaoService,
            useValue: { exigir: async () => 'todos' },
          },
          { provide: PrismaService, useValue: {} },
        ],
      }).compile();
      const app = modulo.createNestApplication({ logger: false });
      await app.listen(0, '127.0.0.1');
      try {
        const url = await app.getUrl();
        assert.equal((await fetch(`${url}/empreendimentos`)).status, 200);
        const r = await fetch(`${url}/empreendimentos/exportacoes`);
        assert.equal(r.status, habilitada ? 200 : 404);
        if (habilitada) {
          assert.match(r.headers.get('content-type')!, /text\/csv/);
          const texto = await r.text();
          assert.ok(!texto.includes('segredo'));
          assert.equal(lerCsv(texto)[1][1], 'Hotel; "Olímpia"\nTeste');
          assert.equal(
            (await fetch(`${url}/empreendimentos/exportacoes?$top=10`)).status,
            400,
          );
        }
      } finally {
        await app.close();
      }
    }
  });
  it('exporta além da página em lotes na mesma transação, mantendo filtro e desempate', async () => {
    const definicao = COLECOES.empreendimentos;
    const consulta = lerConsultaColecao(
      { $filter: "situacao eq 'ativo'", $orderby: 'nomeFantasia desc' },
      { esquema: definicao.esquema },
    );
    const tx = {};
    const chamadas: {
      skip: number;
      take: number;
      where: unknown;
      orderBy: unknown;
    }[] = [];
    const prisma = {
      $transaction: async (
        acao: (db: unknown) => Promise<void>,
        opcoes: unknown,
      ) => {
        assert.deepEqual(opcoes, {
          isolationLevel: 'RepeatableRead',
          timeout: 120000,
        });
        await acao(tx);
      },
    } as unknown as PrismaService;
    const linhas: unknown[] = [];
    await exportacaoAtual.run(
      {
        signal: new AbortController().signal,
        escrever: async (lote) => {
          linhas.push(...lote);
        },
      },
      () =>
        executarColecao({
          prisma,
          consulta,
          esquema: definicao.esquema,
          mapa: MAPA_EMPREENDIMENTOS,
          escopo: [{ id: { gt: 0 } }],
          buscar: ((args: {
            skip: number;
            take: number;
            db: unknown;
            where: unknown;
            orderBy: unknown;
          }) => {
            assert.equal(args.db, tx);
            chamadas.push(args);
            return Promise.resolve(
              Array.from({ length: args.skip ? 5 : 1000 }, (_, i) => ({
                id: args.skip + i,
              })),
            );
          }) as never,
          contar: (() => {
            throw new Error('CSV não conta nem pagina como JSON');
          }) as never,
          mapear: (l: unknown) => l,
        }),
    );
    assert.equal(linhas.length, 1005);
    assert.deepEqual(
      chamadas.map((c) => c.skip),
      [0, 1000],
    );
    assert.deepEqual(chamadas[0].where, {
      AND: [{ id: { gt: 0 } }, { situacao: { equals: 'ativo' } }],
    });
    assert.deepEqual(chamadas[0].orderBy, [
      { nomeFantasia: 'desc' },
      { id: 'asc' },
    ]);
  });
});
