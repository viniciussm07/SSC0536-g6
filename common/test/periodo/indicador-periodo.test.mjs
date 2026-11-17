import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');

const linha = (extra = {}) => ({
  id: 1,
  indicadorId: 2,
  nome: 'Taxa fictícia',
  unidade: '%',
  periodo: 'Janeiro 2026 — fictício',
  periodoId: 3,
  periodoTipo: 'mes',
  periodoInicio: '2026-01-01',
  periodoFim: '2026-01-31',
  tipoColeta: 'consolidado',
  recorte: 'total',
  metodo: 'ponderada',
  valor: '62.5',
  ...extra,
});

for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  test(`${formato}: tipos de período do MER`, () => {
    assert.deepEqual(api.TIPOS_PERIODO, ['mes', 'feriado_prolongado']);
    assert.equal(api.isTipoPeriodo('feriado_prolongado'), true);
    assert.equal(api.isTipoPeriodo('semana'), false);
    assert.equal(api.isTipoPeriodo(undefined), false);
  });

  test(`${formato}: linha de indicador exige identidade, tipo e datas do período`, () => {
    assert.equal(api.isIndicadorConsulta(linha()), true);
    assert.equal(
      api.isIndicadorConsulta(
        linha({
          periodoTipo: 'feriado_prolongado',
          periodoInicio: '2026-02-14',
          periodoFim: '2026-02-14',
        }),
      ),
      true,
    );
    for (const [campo, valor] of [
      ['periodoId', undefined],
      ['periodoId', 0],
      ['periodoTipo', 'trimestre'],
      ['periodoInicio', '2026-1-1'],
      ['periodoInicio', '2026-01-01T00:00:00.000Z'],
      ['periodoFim', null],
      ['periodoFim', '2025-12-31'], // termina antes de começar
    ]) {
      assert.equal(
        api.isIndicadorConsulta(linha({ [campo]: valor })),
        false,
        `${campo}=${valor}`,
      );
    }
  });

  test(`${formato}: esquema OData de indicadores filtra e ordena pelo período`, () => {
    const campos = Object.fromEntries(
      api.ESQUEMA_INDICADORES.campos.map((c) => [c.nome, c]),
    );
    // Campos anteriores continuam presentes (acréscimo compatível).
    for (const nome of [
      'id',
      'indicadorId',
      'nome',
      'unidade',
      'periodo',
      'tipoColeta',
      'recorte',
      'metodo',
      'valor',
    ])
      assert.ok(campos[nome], nome);
    assert.equal(campos.periodoId.tipo, 'inteiro');
    assert.equal(campos.periodoTipo.tipo, 'enum');
    assert.deepEqual(campos.periodoTipo.valores, api.TIPOS_PERIODO);
    assert.equal(campos.periodoInicio.tipo, 'data');
    assert.equal(campos.periodoFim.tipo, 'data');
    const consulta = api.lerConsultaOData(
      {
        $filter:
          "periodoTipo eq 'mes' and periodoInicio ge 2025-10-01 and periodoFim le 2026-09-30",
        $orderby: 'periodoInicio asc',
      },
      api.ESQUEMA_INDICADORES,
    );
    assert.equal(consulta.valido, true);
    const filtro = api.montarFiltro(
      [
        {
          campo: 'periodoTipo',
          operador: 'igual',
          valor: 'feriado_prolongado',
        },
        {
          campo: 'periodoInicio',
          operador: 'entre',
          valor: '2026-01-01',
          valor2: '2026-12-31',
        },
      ],
      api.ESQUEMA_INDICADORES,
    );
    assert.deepEqual(filtro, {
      valido: true,
      data: "periodoTipo eq 'feriado_prolongado' and (periodoInicio ge 2026-01-01 and periodoInicio le 2026-12-31)",
    });
    assert.equal(
      api.montarFiltro(
        [{ campo: 'periodoTipo', operador: 'igual', valor: 'semana' }],
        api.ESQUEMA_INDICADORES,
      ).valido,
      false,
    );
  });
}
