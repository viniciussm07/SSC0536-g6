import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertSeedTarget,
  scenario,
  acessoDemo,
  seedDemoFixtures,
} from './demo-fixtures';
import type { Prisma } from '../src/generated/prisma/client';
import { SENHA_LIMITES } from '@ssc0536/common';

describe('Massa fictícia: verificações unitárias', () => {
  it('registra apenas acesso sintético para o administrador já existente', () => {
    const admin = scenario.usuarios.find(
      (user) => user.id === acessoDemo.usuarioId,
    );
    assert.equal(acessoDemo.synthetic, true);
    assert.equal(admin?.email, acessoDemo.email);
    assert.equal(admin?.perfil, 'administrador');
    assert.equal(admin?.ativo, true);
    assert.ok(
      acessoDemo.senha.length >= SENHA_LIMITES.minimo &&
        acessoDemo.senha.length <= SENHA_LIMITES.maximo,
    );
  });
  it('a própria função de carga recusa credenciais demo fora de base local antes de acessar dados', async () => {
    const tx = {} as Prisma.TransactionClient;
    await assert.rejects(
      seedDemoFixtures(tx, 'postgresql://app@localhost/oto_dev', 'production'),
      /produção/,
    );
    await assert.rejects(
      seedDemoFixtures(
        tx,
        'postgresql://app@remote.example.test/oto_test',
        'development',
      ),
      /local/,
    );
    await assert.rejects(
      seedDemoFixtures(tx, 'postgresql://app@localhost/app', 'development'),
      /local/,
    );
  });
  it('recusa produção, bancos comuns, remotos e URL inválida', () => {
    for (const url of [
      undefined,
      'inválida',
      'file:./app_test',
      'postgresql://app@remote.example.test/oto_test',
      'postgresql://app@localhost/app',
    ]) {
      assert.throws(() => assertSeedTarget(url));
    }
    assert.throws(() =>
      assertSeedTarget('postgresql://app@localhost/oto_dev', 'production'),
    );
    assert.doesNotThrow(() =>
      assertSeedTarget('postgresql://app@localhost/oto_dev', 'development'),
    );
    assert.doesNotThrow(() =>
      assertSeedTarget('postgresql://app@127.0.0.1/oto_test', 'test'),
    );
  });

  it('distingue resposta zero de ausência de resposta e capacidade desconhecida', () => {
    assert.ok(
      scenario.respostaItens.some((item) => item.valorNumerico === '0'),
    );
    assert.equal(
      scenario.respostas.some((item) => item.pesquisaId === 900005),
      false,
    );
    const parcial = scenario.inventarios.find(
      (item) => item.empreendimentoId === 900004,
    );
    assert.ok(parcial);
    assert.equal(parcial.totalUh, undefined);
    assert.equal(parcial.leitos, undefined);
  });

  it('mantém a versão antiga de capacidade e isola os vínculos dos empresários', () => {
    const versoes = scenario.inventarios.filter(
      (item) => item.empreendimentoId === 900001,
    );
    assert.deepEqual(
      versoes.map((item) => item.totalUh),
      [10, 15],
    );
    assert.ok(versoes[0].vigenciaFim! < versoes[1].vigenciaInicio);
    assert.equal(
      scenario.usuarioEmpreendimentos.some(
        (item) =>
          item.usuarioId === 900005 &&
          item.empreendimentoId === 900002 &&
          item.ativo,
      ),
      false,
    );
    assert.ok(
      scenario.usuarios.every((user) => user.email.endsWith('@example.test')),
    );
  });
});
