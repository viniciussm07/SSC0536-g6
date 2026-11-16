import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TIPOS_PERIODO } from '@ssc0536/common';
import type { Prisma } from '../src/generated/prisma/client';
import { scenario } from './demo-fixtures';
import { carregarIndicadoresDemo, indicadoresDemo } from './indicadores-demo';

describe('Massa fictícia de indicadores: verificações unitárias', () => {
  const { definicoes, periodos, resultados, visibilidades } = indicadoresDemo;

  it('é sintética e rotula definições e períodos como fictícios', () => {
    assert.equal(indicadoresDemo.metadata.synthetic, true);
    for (const d of definicoes) {
      assert.match(d.nome, /fictícia, não homologada/);
      assert.match(d.codigo, /^fixture\.demo\./);
    }
    for (const p of periodos) assert.match(p.rotulo, /fictíci/);
  });

  it('cobre 12 meses contínuos e feriados prolongados com datas coerentes', () => {
    const meses = periodos.filter((p) => p.tipo === 'mes');
    assert.equal(meses.length, 12);
    assert.ok(periodos.some((p) => p.tipo === 'feriado_prolongado'));
    for (const p of periodos) {
      assert.ok((TIPOS_PERIODO as readonly string[]).includes(p.tipo));
      assert.match(p.dataInicio, /^\d{4}-\d\d-\d\dT00:00:00\.000Z$/);
      assert.ok(p.dataInicio <= p.dataFim, p.rotulo);
    }
    for (let i = 1; i < meses.length; i++) {
      const fimAnterior = new Date(meses[i - 1].dataFim);
      fimAnterior.setUTCDate(fimAnterior.getUTCDate() + 1);
      assert.equal(fimAnterior.toISOString(), meses[i].dataInicio);
    }
  });

  it('tem os dois tipos de coleta e os quatro recortes, sem duplicar a chave', () => {
    const ocupacao = resultados.filter((r) => r.definicaoId === 910001);
    assert.deepEqual([...new Set(ocupacao.map((r) => r.tipoColeta))].sort(), [
      'consolidado',
      'expectativa',
    ]);
    assert.deepEqual([...new Set(ocupacao.map((r) => r.recorte))].sort(), [
      'hotel',
      'pousada',
      'resort',
      'total',
    ]);
    const chaves = resultados.map(
      (r) => `${r.definicaoId}|${r.periodoId}|${r.tipoColeta}|${r.recorte}`,
    );
    assert.equal(new Set(chaves).size, chaves.length);
    const ids = new Set(periodos.map((p) => p.id));
    for (const r of resultados) {
      assert.ok(ids.has(r.periodoId));
      assert.match(r.valor, /^\d+\.\d+$/);
      if (r.definicaoId === 910001)
        assert.ok(Number(r.valor) >= 0 && Number(r.valor) <= 100);
    }
  });

  it('não colide com IDs do cenário compartilhado e libera só gestor e visualizador', () => {
    const doCenario = new Set([
      ...scenario.periodos.map((p) => p.id),
      ...scenario.definicoes.map((d) => d.id),
      ...scenario.resultados.map((r) => r.id),
    ]);
    for (const x of [...periodos, ...definicoes, ...resultados])
      assert.equal(doCenario.has(x.id), false, String(x.id));
    assert.deepEqual([...new Set(visibilidades.map((v) => v.perfil))].sort(), [
      'gestor',
      'visualizador',
    ]);
  });

  it('recusa destino fora de _dev/_test antes de consultar o banco', async () => {
    const tx = new Proxy(
      {},
      {
        get() {
          throw new Error('não deveria acessar o banco');
        },
      },
    ) as Prisma.TransactionClient;
    for (const url of [
      undefined,
      'postgresql://app:app@localhost:5432/oto',
      'postgresql://app:app@db.example.com:5432/oto_dev',
    ])
      await assert.rejects(carregarIndicadoresDemo(tx, url, 'development'));
    await assert.rejects(
      carregarIndicadoresDemo(
        tx,
        'postgresql://app:app@localhost:5432/oto_dev',
        'production',
      ),
    );
  });
});
