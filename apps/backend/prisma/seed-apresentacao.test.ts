import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertAmbienteApresentacao as ok } from './seed-apresentacao';

const url = 'postgresql://u:p@db:5432/oto_apresentacao';
const senha = 'senha-longa-123';

test('aceita banco _apresentacao com confirmação e senha', () => {
  assert.doesNotThrow(() => ok(url, 'apresentacao', senha));
});

test('rejeita sem confirmação, banco errado ou senha curta', () => {
  assert.throws(() => ok(url, undefined, senha));
  assert.throws(() =>
    ok('postgresql://u:p@db:5432/oto_prod', 'apresentacao', senha),
  );
  assert.throws(() => ok(url, 'apresentacao', 'curta'));
  assert.throws(() => ok(undefined, 'apresentacao', senha));
});
