import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');
for (const [ambiente, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  test(`${ambiente}: diferenças distinguem ausência, null, zero e false`, () => {
    assert.deepEqual(
      api.diferencasAuditoria(
        { leitos: null, ativo: false },
        { leitos: 0, novo: null, ativo: false },
      ),
      [
        {
          campo: 'leitos',
          antes: null,
          depois: 0,
          antesPresente: true,
          depoisPresente: true,
        },
        {
          campo: 'novo',
          antes: null,
          depois: null,
          antesPresente: false,
          depoisPresente: true,
        },
      ],
    );
    assert.deepEqual(
      api.diferencasAuditoria(
        { valor: { a: 1, b: 2 } },
        { valor: { b: 2, a: 1 } },
      ),
      [],
    );
    assert.equal(
      api.diferencasAuditoria({ valor: 1 }, null)[0].depoisPresente,
      false,
    );
  });
  test(`${ambiente}: valida contratos de JSON, origem e timestamps UTC`, () => {
    const v = {
      id: 1,
      entidade: 'conta',
      entidadeId: 3,
      acao: 'alterar',
      em: '2026-11-15T12:00:00Z',
      usuarioId: 1,
      autor: 'Pessoa fictícia',
      origem: 'manual',
      processo: null,
      correlacaoId: null,
    };
    assert.equal(api.isEventoAuditoriaResumo(v), true);
    assert.equal(
      api.isEventoAuditoriaResumo({ ...v, origem: 'invalida' }),
      false,
    );
    assert.equal(
      api.isEventoAuditoriaResumo({ ...v, em: '2026-11-15' }),
      false,
    );
    assert.equal(
      api.isEventoAuditoriaDetalhe({
        ...v,
        antes: null,
        depois: { ativo: false },
        diferencas: api.diferencasAuditoria(null, { ativo: false }),
      }),
      true,
    );
    assert.equal(
      api.isEventoAuditoriaDetalhe({
        ...v,
        antes: null,
        depois: { valor: Infinity },
        diferencas: [],
      }),
      false,
    );
  });
}
