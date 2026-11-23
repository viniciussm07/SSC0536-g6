import assert from 'node:assert/strict';
import { test } from 'node:test';
import dados from '../../../fixtures/oto/producao-simulada/dados.json';
import {
  DEFINICOES_APRESENTACAO,
  calcularIndicadoresApresentacao,
} from './indicadores-apresentacao';

const linhas = calcularIndicadoresApresentacao(dados);

test('gera os indicadores de cada edição, sem inventar códigos', () => {
  const codigos = new Set([
    ...DEFINICOES_APRESENTACAO.map((d) => d.codigo),
    'taxa_ocupacao_tipo',
  ]);
  assert.ok(linhas.length > 0);
  for (const l of linhas) assert.ok(codigos.has(l.codigo), l.codigo);
  assert.equal(new Set(linhas.map((l) => l.periodoId)).size, 10);
  assert.deepEqual(
    new Set(linhas.map((l) => l.tipoColeta)),
    new Set(['consolidado']),
  );
});

test('a taxa de ocupação é calculada e fica entre 0 e 100; indisponível nunca vira zero', () => {
  const taxas = linhas.filter(
    (l) => l.codigo === 'taxa_ocupacao_uh' && l.recorte === 'total',
  );
  assert.equal(taxas.length, 9);
  for (const t of taxas) {
    assert.equal(t.valor.estado, 'disponivel');
    if (t.valor.estado === 'disponivel') {
      const n = Number(t.valor.valor);
      assert.ok(n > 0 && n <= 100, String(n));
    }
  }
  for (const l of linhas)
    if (l.valor.estado === 'indisponivel')
      assert.ok(l.valor.motivo && l.valor.detalhe);
});

test('é determinístico', () => {
  assert.deepEqual(calcularIndicadoresApresentacao(dados), linhas);
});

test('diária média e RevPAR saem das coletas; sem taxa, o RevPAR fica indisponível', () => {
  const ponderada = linhas.filter(
    (l) =>
      l.codigo === 'diaria_media_ponderada' &&
      l.recorte === 'total' &&
      l.valor.estado === 'disponivel',
  );
  assert.equal(ponderada.length, 5);
  for (const l of ponderada)
    if (l.valor.estado === 'disponivel')
      assert.ok(Number(l.valor.valor) > 100 && Number(l.valor.valor) < 1500);
  const revpar = linhas.filter(
    (l) => l.codigo === 'revpar' && l.recorte === 'total',
  );
  assert.equal(revpar.length, 5);
  const semTaxa = revpar.filter((l) => l.valor.estado === 'indisponivel');
  assert.equal(semTaxa.length, 1);
  // RevPAR = diária × taxa ÷ 100 no mesmo período e recorte.
  for (const r of revpar) {
    if (r.valor.estado !== 'disponivel') continue;
    const d = ponderada.find((x) => x.periodoId === r.periodoId)!;
    const t = linhas.find(
      (x) =>
        x.periodoId === r.periodoId &&
        x.codigo === 'taxa_ocupacao_uh' &&
        x.recorte === 'total',
    )!;
    if (d.valor.estado === 'disponivel' && t.valor.estado === 'disponivel')
      assert.ok(
        Math.abs(
          Number(r.valor.valor) -
            (Number(d.valor.valor) * Number(t.valor.valor)) / 100,
        ) < 1e-6,
      );
  }
});
