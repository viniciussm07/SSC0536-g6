import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');

// Esquema mínimo e controlado para os testes de gramática e de tipos.
const campo = (nome, tipo, extra = {}) => ({
  nome,
  tipo,
  anulavel: false,
  filtravel: true,
  ordenavel: true,
  virtual: false,
  ...extra,
});
const ESQ = {
  recurso: 'teste',
  campos: [
    campo('id', 'inteiro'),
    campo('nome', 'texto'),
    campo('apelido', 'texto', { anulavel: true }),
    campo('situacao', 'enum', { valores: ['ativo', 'encerrado'] }),
    campo('ativo', 'booleano'),
    campo('total', 'inteiro', { anulavel: true }),
    campo('valor', 'decimal'),
    campo('dia', 'data', { anulavel: true }),
    campo('quando', 'datahora'),
    campo('oculto', 'texto', { filtravel: false, ordenavel: false }),
    campo('tags', 'enum', {
      valores: ['a', 'b'],
      virtual: true,
      ordenavel: false,
    }),
  ],
  ordenacaoPadrao: [{ campo: 'nome', direcao: 'asc' }],
  desempate: ['id'],
};

function prng(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  test(`${formato}: envelope de coleção OData é validado no limite HTTP`, () => {
    const linha = (valor) =>
      typeof valor === 'object' &&
      valor !== null &&
      typeof valor.id === 'number';
    assert.equal(
      api.isColecaoOData(
        { data: [{ id: 1 }], meta: { top: 20, skip: 0, total: 1 } },
        linha,
      ),
      true,
    );
    assert.equal(
      api.isColecaoOData(
        { data: [{ id: '1' }], meta: { top: 20, skip: 0 } },
        linha,
      ),
      false,
    );
    assert.equal(
      api.isColecaoOData(
        { data: [], meta: { top: 20, skip: -1, total: 0 } },
        linha,
      ),
      false,
    );
  });

  test(`${formato}: operadores da grade respeitam a restrição do campo`, () => {
    const identificacao = api.ESQUEMA_EMPREENDIMENTOS.campos.find(
      (campo) => campo.nome === 'identificacao',
    );
    const pendencia = api.ESQUEMA_EMPREENDIMENTOS.campos.find(
      (campo) => campo.nome === 'pendencia',
    );
    assert.deepEqual(api.operadoresDoCampo(identificacao), ['contem', 'igual']);
    assert.deepEqual(api.operadoresDoCampo(pendencia), [
      'igual',
      'diferente',
      'em',
    ]);
    assert.deepEqual(
      api.operadoresDoCampo(ESQ.campos.find((campo) => campo.nome === 'ativo')),
      ['igual', 'diferente'],
    );
  });

  const ler = (texto) => api.lerFiltro(texto);
  const ok = (texto) => {
    const r = ler(texto);
    assert.equal(r.valido, true, `${texto} -> ${JSON.stringify(r.erros)}`);
    return r.data;
  };
  const erro = (texto) => {
    const r = ler(texto);
    assert.equal(r.valido, false, texto);
    return r.erros[0];
  };
  const tipado = (texto) => {
    const no = ok(texto);
    return api.validarFiltro(no, ESQ);
  };

  test(`${formato}: literais e operadores de comparação`, () => {
    assert.deepEqual(ok("nome eq 'Hotel D''Água'").valor, {
      tipo: 'texto',
      valor: "Hotel D'Água",
    });
    assert.deepEqual(ok('total ge -10').valor, { tipo: 'inteiro', valor: -10 });
    assert.deepEqual(ok('valor gt 62.50').valor, {
      tipo: 'decimal',
      valor: '62.50',
    });
    assert.deepEqual(ok('ativo eq true').valor, {
      tipo: 'booleano',
      valor: true,
    });
    assert.deepEqual(ok('apelido eq null').valor, { tipo: 'nulo' });
    assert.deepEqual(ok('dia ge 2026-10-01').valor, {
      tipo: 'data',
      valor: '2026-10-01',
    });
    assert.deepEqual(ok('quando lt 2026-11-05T12:00:00Z').valor, {
      tipo: 'datahora',
      valor: '2026-11-05T12:00:00Z',
    });
    assert.deepEqual(
      ok('quando lt 2026-11-05T09:00-03:00').valor.tipo,
      'datahora',
    );
    for (const op of ['eq', 'ne', 'gt', 'ge', 'lt', 'le'])
      assert.equal(ok(`total ${op} 1`).operador, op);
  });

  test(`${formato}: precedência (not > and > or), parênteses e espaços`, () => {
    const no = ok('id eq 1 or id eq 2 and id eq 3');
    assert.equal(no.tipo, 'ou');
    assert.equal(no.direita.tipo, 'e');
    const agrupado = ok('(id eq 1 or id eq 2) and id eq 3');
    assert.equal(agrupado.tipo, 'e');
    assert.equal(agrupado.esquerda.tipo, 'ou');
    const negado = ok('not id eq 1 and id eq 2');
    assert.equal(negado.tipo, 'e');
    assert.equal(negado.esquerda.tipo, 'nao');
    assert.equal(ok('not (id eq 1 or id eq 2)').operando.tipo, 'ou');
    assert.equal(ok('  id   eq\t1\n').tipo, 'comparacao');
  });

  test(`${formato}: funções, tolower e in`, () => {
    const f = ok("contains(tolower(nome),'alfa')");
    assert.equal(f.tipo, 'funcao');
    assert.equal(f.funcao, 'contains');
    assert.equal(f.campo.minusculas, true);
    assert.equal(ok("startswith(nome,'A')").funcao, 'startswith');
    assert.equal(ok("endswith(nome,'z')").funcao, 'endswith');
    const em = ok("situacao in ('ativo','encerrado')");
    assert.equal(em.tipo, 'em');
    assert.equal(em.valores.length, 2);
    assert.equal(ok("tolower(nome) eq 'x'").campo.minusculas, true);
    assert.equal(ok('id in (1,2,3)').valores.length, 3);
  });

  test(`${formato}: erros de sintaxe carregam posição e nunca lançam`, () => {
    const casos = [
      ["nome eq 'aberto", 'aspa'],
      ['nome foo 1', 'Operador desconhecido'],
      ['nome eq', 'valor'],
      ['id eq 1 id eq 2', 'fim'],
      ['id eq 1 and', 'campo'],
      ['(id eq 1', "')'"],
      ['id eq 1)', 'fim'],
      ['id eq #', 'inesperado'],
      ['dia eq 2026-02-30', 'inexistente'],
      ['dia eq 2026-13-01', 'inexistente'],
      ['quando eq 2026-01-01T', 'inválidas'],
      ['total eq 12abc', 'mal formado'],
      ['id in ()', 'valor'],
      ['contains(nome,1)', 'texto'],
      ["contains(nome 'a')", "','"],
      ['', 'campo'],
      ['and', 'operador'],
      ['id EQ 1', 'Operador'],
    ];
    for (const [texto, trecho] of casos) {
      const e = erro(texto);
      assert.equal(e.field, '$filter');
      assert.match(
        e.message,
        new RegExp(trecho.replace(/[()']/g, '\\$&'), 'i'),
        `${texto}: ${e.message}`,
      );
      assert.equal(typeof e.position, 'number', texto);
      assert.ok(e.position >= 0 && e.position <= texto.length, texto);
    }
    assert.equal(erro("nome eq 'aberto").position, 8);
    assert.equal(api.lerFiltro(undefined).valido, false);
    assert.equal(api.lerFiltro(42).valido, false);
  });

  test(`${formato}: limites de tamanho, profundidade, nós e itens de in`, () => {
    const L = api.ODATA_LIMITES;
    assert.match(
      erro('id eq 1'.padEnd(L.filtroCaracteres + 1, ' ')).message,
      /caracteres/,
    );
    assert.equal(ler('id eq 1'.padEnd(L.filtroCaracteres, ' ')).valido, true);
    const aninhado = (n) => '('.repeat(n) + 'id eq 1' + ')'.repeat(n);
    assert.equal(ler(aninhado(L.profundidade)).valido, true);
    assert.match(erro(aninhado(L.profundidade + 1)).message, /aninhada/);
    assert.match(
      erro('not '.repeat(L.profundidade + 1) + 'id eq 1').message,
      /aninhada/,
    );
    const termos = (n) =>
      Array.from({ length: n }, (_, i) => `id eq ${i}`).join(' or ');
    assert.equal(ler(termos(Math.floor((L.nos + 1) / 2))).valido, true);
    assert.match(erro(termos(L.nos)).message, /complexa/);
    const itens = (n) =>
      `id in (${Array.from({ length: n }, (_, i) => i).join(',')})`;
    assert.equal(ler(itens(L.itensEm)).valido, true);
    assert.match(erro(itens(L.itensEm + 1)).message, /até/);
  });

  test(`${formato}: tipos — campo, filtrável, operador e literal contra o esquema`, () => {
    assert.deepEqual(
      tipado(
        "nome eq 'x' and id ge 1 and ativo eq false and valor gt 1 and valor lt 2.5",
      ),
      [],
    );
    assert.deepEqual(tipado('apelido eq null or total ne null'), []);
    assert.deepEqual(
      tipado(
        "situacao in ('ativo') and dia gt 2026-01-01 and quando le 2026-01-01T00:00:00Z",
      ),
      [],
    );
    const msg = (t) =>
      tipado(t)
        .map((e) => e.message)
        .join(' | ');
    assert.match(msg("telefone eq 'x'"), /desconhecido: telefone/);
    assert.match(msg("oculto eq 'x'"), /não filtrável: oculto/);
    assert.match(msg('nome eq 1'), /espera texto/);
    assert.match(msg("id eq '1'"), /espera inteiro/);
    assert.match(msg('id eq 1.5'), /espera inteiro/);
    assert.match(msg('id eq 99999999999999999999'), /espera inteiro/);
    assert.deepEqual(tipado('valor gt 99999999999999999999'), []);
    assert.match(
      msg("situacao eq 'talvez'"),
      /domínio de situacao: ativo, encerrado/,
    );
    assert.match(msg('ativo gt true'), /não se aplica/);
    assert.match(msg("situacao ge 'ativo'"), /não se aplica/);
    assert.match(msg('id eq null'), /não aceita null/);
    assert.match(msg('apelido gt null'), /null só admite eq e ne/);
    assert.match(
      msg('tolower(id) eq 1'),
      /tolower só se aplica a campos de texto/,
    );
    assert.match(msg("contains(id,'1')"), /só se aplica a campos de texto/);
    assert.match(msg('ativo in (true)'), /booleanos/);
    assert.match(msg('id in (1,null)'), /Use "eq null"/);
    assert.match(msg('dia eq 2026-01-01T00:00:00Z'), /espera data/);
    assert.match(msg('quando eq 2026-01-01'), /espera data e hora/);
    // Posição aponta para o campo problemático.
    assert.equal(tipado("id eq 1 and telefone eq 'x'")[0].position, 12);
    // Número inteiro é aceito em campo decimal; campo virtual filtrável aceita seu domínio.
    assert.deepEqual(
      tipado("valor ge 2 and tags eq 'a' and tags in ('a','b')"),
      [],
    );
    assert.match(msg("tags eq 'z'"), /domínio/);
    assert.match(msg("tags gt 'a'"), /não se aplica|não está disponível/);
    assert.match(msg("tolower(nome) gt 'a'"), /tolower só admite eq, ne e in/);
    assert.deepEqual(
      tipado("tolower(nome) ne 'a' and tolower(nome) in ('a')"),
      [],
    );
  });

  test(`${formato}: $orderby valida campo, direção, repetição e limite`, () => {
    const o = (t) => api.lerOrdenacao(t, ESQ);
    assert.deepEqual(o('nome').data, [{ campo: 'nome', direcao: 'asc' }]);
    assert.deepEqual(o('nome desc, id asc').data, [
      { campo: 'nome', direcao: 'desc' },
      { campo: 'id', direcao: 'asc' },
    ]);
    const msg = (t) =>
      o(t)
        .erros.map((e) => e.message)
        .join('|');
    assert.match(msg('telefone'), /desconhecido/);
    assert.match(msg('oculto'), /não ordenável/);
    assert.match(msg('tags'), /não ordenável/);
    assert.match(msg('nome up'), /Direção inválida/);
    assert.match(msg('nome asc extra'), /Use "campo asc"/);
    assert.match(msg('nome, nome'), /repetido/);
    assert.match(msg('id,nome,total,valor'), /até 3 campos/);
    assert.match(msg(''), /Use "campo asc"/);
    assert.equal(o('id, telefone').erros[0].position, 4);
  });

  test(`${formato}: lerConsultaOData aplica padrões, limites e recusa parâmetros não suportados`, () => {
    const q = (query) => api.lerConsultaOData(query, ESQ);
    const padrao = q({});
    assert.deepEqual(padrao.data, {
      filtro: null,
      ordenacao: [{ campo: 'nome', direcao: 'asc' }],
      top: 20,
      skip: 0,
      contar: false,
    });
    const cheio = q({
      $filter: 'id eq 1',
      $orderby: 'id desc',
      $top: '50',
      $skip: '100',
      $count: 'true',
      page: '9',
    });
    assert.equal(cheio.valido, true);
    assert.equal(cheio.data.top, 50);
    assert.equal(cheio.data.skip, 100);
    assert.equal(cheio.data.contar, true);
    assert.equal(cheio.data.filtro.tipo, 'comparacao');
    assert.equal(q({ $filter: '   ' }).data.filtro, null);
    assert.equal(q({ $top: '0' }).data.top, 0);
    const campos = (query) =>
      q(query)
        .erros.map((e) => e.field)
        .sort();
    assert.deepEqual(campos({ $select: 'id' }), ['$select']);
    assert.deepEqual(campos({ $expand: 'x', $search: 'y' }), [
      '$expand',
      '$search',
    ]);
    assert.deepEqual(campos({ $top: '101' }), ['$top']);
    assert.deepEqual(campos({ $top: '-1' }), ['$top']);
    assert.deepEqual(campos({ $top: '1.5' }), ['$top']);
    assert.deepEqual(campos({ $skip: '1000001' }), ['$skip']);
    assert.deepEqual(campos({ $count: 'sim' }), ['$count']);
    assert.deepEqual(campos({ $filter: ['id eq 1', 'id eq 2'] }), ['$filter']);
    assert.deepEqual(campos({ $filter: 'id eq', $orderby: 'x', $top: 'a' }), [
      '$filter',
      '$orderby',
      '$top',
    ]);
    assert.deepEqual(campos({ $filter: "telefone eq 'x'" }), ['$filter']);
  });

  test(`${formato}: ordem estável acrescenta o desempate uma única vez`, () => {
    const e = (o) =>
      api.ordenacaoEstavel(o, ESQ).map((x) => `${x.campo} ${x.direcao}`);
    assert.deepEqual(e([{ campo: 'nome', direcao: 'desc' }]), [
      'nome desc',
      'id asc',
    ]);
    assert.deepEqual(e([{ campo: 'id', direcao: 'desc' }]), ['id desc']);
    assert.deepEqual(e([]), ['id asc']);
  });

  test(`${formato}: montarFiltro gera filtros aceitos pelo parser, com texto sem diferenciar caixa`, () => {
    const m = (...c) => api.montarFiltro(c, ESQ);
    const t = (...c) => {
      const r = m(...c);
      assert.equal(r.valido, true, JSON.stringify(r.erros));
      return r.data;
    };
    assert.equal(t(), '');
    assert.equal(
      t({ campo: 'nome', operador: 'contem', valor: "D'Água" }),
      "contains(tolower(nome),'d''água')",
    );
    assert.equal(
      t({ campo: 'nome', operador: 'comecaCom', valor: 'Al' }),
      "startswith(tolower(nome),'al')",
    );
    assert.equal(
      t({ campo: 'nome', operador: 'igual', valor: 'Ana' }),
      "tolower(nome) eq 'ana'",
    );
    assert.equal(t({ campo: 'apelido', operador: 'nulo' }), 'apelido eq null');
    assert.equal(
      t({ campo: 'apelido', operador: 'naoNulo' }),
      'apelido ne null',
    );
    assert.equal(
      t({ campo: 'situacao', operador: 'em', valores: ['ativo', 'encerrado'] }),
      "situacao in ('ativo','encerrado')",
    );
    assert.equal(
      t({ campo: 'ativo', operador: 'igual', valor: 'true' }),
      'ativo eq true',
    );
    assert.equal(
      t({ campo: 'total', operador: 'maiorOuIgual', valor: '10' }),
      'total ge 10',
    );
    assert.equal(
      t({ campo: 'valor', operador: 'maior', valor: '62,5' }),
      'valor gt 62.5',
    );
    assert.equal(
      t({
        campo: 'dia',
        operador: 'entre',
        valor: '2026-10-01',
        valor2: '2026-10-31',
      }),
      '(dia ge 2026-10-01 and dia le 2026-10-31)',
    );
    assert.equal(
      t({ campo: 'quando', operador: 'maiorOuIgual', valor: '2026-11-05' }),
      'quando ge 2026-11-05T00:00:00Z',
    );
    assert.equal(
      t(
        { campo: 'id', operador: 'igual', valor: '1' },
        { campo: 'ativo', operador: 'igual', valor: 'false' },
      ),
      'id eq 1 and ativo eq false',
    );
    const erros = (...c) =>
      m(...c).erros.map((e) => `${e.field}: ${e.message}`);
    assert.match(
      erros({ campo: 'id', operador: 'igual', valor: 'x' })[0],
      /id: Informe um valor válido/,
    );
    assert.match(
      erros({ campo: 'nome', operador: 'maior', valor: 'x' }).join(),
      /Operador não disponível/,
    );
    assert.match(
      erros({ campo: 'id', operador: 'nulo' })[0],
      /Operador não disponível/,
    );
    assert.match(
      erros({ campo: 'oculto', operador: 'contem', valor: 'x' })[0],
      /não filtrável/,
    );
    assert.match(
      erros({ campo: 'dia', operador: 'entre', valor: '2026-10-01' })[0],
      /segundo valor/,
    );
    assert.match(
      erros({ campo: 'situacao', operador: 'igual', valor: 'talvez' })[0],
      /valor válido/,
    );
    assert.match(
      erros({ campo: 'dia', operador: 'igual', valor: '2026-02-30' })[0],
      /valor válido/,
    );
  });

  test(`${formato}: condicoesDoFiltro é o inverso para conjunções por coluna e recusa o resto`, () => {
    const volta = (texto) => api.condicoesDoFiltro(ok(texto));
    assert.deepEqual(volta("contains(tolower(nome),'x') and id ge 3"), [
      { campo: 'nome', operador: 'contem', valor: 'x' },
      { campo: 'id', operador: 'maiorOuIgual', valor: '3' },
    ]);
    assert.deepEqual(volta("situacao in ('ativo','encerrado')"), [
      { campo: 'situacao', operador: 'em', valores: ['ativo', 'encerrado'] },
    ]);
    assert.deepEqual(volta('apelido eq null and total ne null'), [
      { campo: 'apelido', operador: 'nulo' },
      { campo: 'total', operador: 'naoNulo' },
    ]);
    assert.deepEqual(api.condicoesDoFiltro(null), []);
    assert.equal(volta('id eq 1 or id eq 2'), null);
    assert.equal(volta('not id eq 1'), null);
    assert.equal(volta('id in (1,2) and (id eq 1 or id eq 2)'), null);
    // Ida e volta preserva o significado: o filtro refeito aceita as mesmas linhas.
    const original = ok(
      "(dia ge 2026-10-01 and dia le 2026-10-31) and tolower(nome) eq 'ana'",
    );
    const condicoes = api.condicoesDoFiltro(original);
    const refeito = api.montarFiltro(condicoes, ESQ);
    assert.equal(refeito.valido, true, JSON.stringify(refeito.erros));
    const linhas = [
      { nome: 'Ana', dia: '2026-10-15' },
      { nome: 'ANA', dia: '2026-09-30' },
      { nome: 'Beto', dia: '2026-10-15' },
      { nome: 'Ana', dia: null },
    ];
    for (const linha of linhas)
      assert.equal(
        api.avaliarFiltro(ok(refeito.data), linha),
        api.avaliarFiltro(original, { ...linha, nome: linha.nome }),
        JSON.stringify(linha),
      );
  });

  test(`${formato}: avaliador usa lógica de três valores como o SQL`, () => {
    const av = (texto, linha, leitura) =>
      api.avaliarFiltro(ok(texto), linha, leitura);
    // Nulo elimina a linha em ne, comparações e funções; eq/ne null são testes de nulo.
    assert.equal(av("apelido ne 'x'", { apelido: null }), false);
    assert.equal(av("apelido eq 'x'", { apelido: null }), false);
    assert.equal(av('apelido eq null', { apelido: null }), true);
    assert.equal(av('apelido eq null', { apelido: 'a' }), false);
    assert.equal(av('apelido ne null', { apelido: 'a' }), true);
    assert.equal(av('apelido eq null', {}), true);
    assert.equal(av('total gt 1', { total: null }), false);
    assert.equal(av("contains(apelido,'a')", { apelido: null }), false);
    assert.equal(av("apelido in ('a')", { apelido: null }), false);
    // not de desconhecido continua desconhecido (linha eliminada), não verdadeiro.
    assert.equal(av("not apelido eq 'x'", { apelido: null }), false);
    assert.equal(av("not apelido eq 'x'", { apelido: 'y' }), true);
    // Kleene: desconhecido or verdadeiro = verdadeiro; desconhecido and falso = falso.
    assert.equal(
      av("apelido eq 'x' or id eq 1", { apelido: null, id: 1 }),
      true,
    );
    assert.equal(
      av("apelido eq 'x' and id eq 2", { apelido: null, id: 1 }),
      false,
    );
    assert.equal(
      av("not (apelido eq 'x' and id eq 2)", { apelido: null, id: 1 }),
      true,
    );
    // texto: sensível a caixa, a menos que use tolower.
    assert.equal(av("nome eq 'Ana'", { nome: 'ana' }), false);
    assert.equal(av("tolower(nome) eq 'ana'", { nome: 'ANA' }), true);
    assert.equal(av("contains(tolower(nome),'lf')", { nome: 'Alfa' }), true);
    assert.equal(av("startswith(nome,'Al')", { nome: 'Alfa' }), true);
    assert.equal(av("endswith(nome,'fa')", { nome: 'Alfa' }), true);
    assert.equal(av("contains(nome,'%')", { nome: 'abc' }), false);
    assert.equal(av("contains(nome,'%')", { nome: '100%' }), true);
  });

  test(`${formato}: avaliador compara decimais, datas e instantes sem perda`, () => {
    const av = (texto, linha) => api.avaliarFiltro(ok(texto), linha);
    assert.equal(av('valor eq 0.1', { valor: '0.10' }), true);
    assert.equal(av('valor gt 62.5', { valor: '62.500001' }), true);
    assert.equal(
      av('valor lt 62.5', { valor: '62.4999999999999999999' }),
      true,
    );
    assert.equal(av('valor eq 2', { valor: 2 }), true);
    assert.equal(av('valor lt -1.5', { valor: '-2' }), true);
    assert.equal(av('valor gt -1.5', { valor: '-2' }), false);
    assert.equal(av('valor eq 0', { valor: '-0.0' }), true);
    assert.equal(
      av('valor gt 9007199254740993', { valor: '9007199254740994' }),
      true,
    );
    assert.equal(api.compararDecimais('1.10', '1.1'), 0);
    assert.equal(api.compararDecimais('10', '9.99'), 1);
    assert.equal(av('dia ge 2026-10-01', { dia: '2026-10-01' }), true);
    assert.equal(av('dia lt 2026-10-01', { dia: '2026-09-30' }), true);
    assert.equal(
      av('quando eq 2026-11-05T12:00:00Z', {
        quando: '2026-11-05T09:00:00-03:00',
      }),
      true,
    );
    assert.equal(
      av('quando gt 2026-11-05T12:00:00Z', {
        quando: new Date('2026-11-05T12:00:01Z'),
      }),
      true,
    );
    assert.equal(av('ativo eq true', { ativo: true }), true);
    assert.equal(av('ativo eq false', { ativo: true }), false);
  });

  test(`${formato}: valores em lista (campo virtual) comparam por existência`, () => {
    const leitura = (nome, linha) =>
      nome === 'tags' ? linha.listaTags : linha[nome];
    const av = (texto, listaTags) =>
      api.avaliarFiltro(ok(texto), { listaTags }, leitura);
    assert.equal(av("tags eq 'a'", ['a', 'b']), true);
    assert.equal(av("tags eq 'a'", ['b']), false);
    assert.equal(av("tags ne 'a'", ['b']), true);
    assert.equal(av("tags ne 'a'", ['a', 'b']), false);
    assert.equal(av("tags in ('a')", ['b', 'a']), true);
    assert.equal(av("tags eq 'a'", []), false);
  });

  test(`${formato}: esquemas dos recursos são coerentes com o contrato`, () => {
    const nomes = Object.keys(api.ESQUEMAS_ODATA);
    assert.deepEqual(nomes.sort(), [
      'auditorias',
      'cadastur',
      'catalogoGrupos',
      'catalogoItens',
      'catalogoVersoes',
      'coletasDiarias',
      'contas',
      'contatos',
      'destinatarios',
      'empreendimentos',
      'importacoes',
      'indicadores',
      'inventarios',
      'linhasImportacao',
      'modelosPesquisa',
      'ocorrenciasImportacao',
      'parametrosCalculo',
      'periodos',
      'permissoes',
      'pesquisas',
      'pesquisasRespondente',
      'respostas',
      'rhcPeriodos',
      'versoesModelo',
      'vinculos',
      'visibilidades',
    ]);
    for (const [chave, esquema] of Object.entries(api.ESQUEMAS_ODATA)) {
      assert.equal(esquema.recurso, chave);
      const campos = esquema.campos.map((c) => c.nome);
      assert.equal(
        new Set(campos).size,
        campos.length,
        `${chave}: nomes repetidos`,
      );
      for (const c of esquema.campos) {
        if (c.tipo === 'enum')
          assert.ok(c.valores?.length, `${chave}.${c.nome}: enum sem domínio`);
        else assert.equal(c.valores, undefined, `${chave}.${c.nome}`);
        if (c.virtual)
          assert.equal(
            c.ordenavel,
            false,
            `${chave}.${c.nome}: virtual não ordena`,
          );
        assert.ok(
          c.filtravel,
          `${chave}.${c.nome}: toda coluna devolvida é filtrável`,
        );
        assert.ok(api.operadoresDoCampo(c).length > 0, `${chave}.${c.nome}`);
      }
      for (const o of [
        ...esquema.ordenacaoPadrao,
        ...esquema.desempate.map((campo) => ({ campo })),
      ]) {
        const c = esquema.campos.find((x) => x.nome === o.campo);
        assert.ok(c?.ordenavel, `${chave}: ordenação ${o.campo}`);
      }
      assert.ok(esquema.desempate.length > 0, chave);
      // O padrão de cada esquema é aceito pela própria validação.
      assert.equal(api.lerConsultaOData({}, esquema).valido, true, chave);
    }
    const emp = api.ESQUEMA_EMPREENDIMENTOS.campos.find(
      (c) => c.nome === 'pendencia',
    );
    assert.deepEqual([...emp.valores], [...esm.PENDENCIAS_CADASTRO]);
    const contas = api.ESQUEMA_CONTAS.campos.find((c) => c.nome === 'perfil');
    assert.deepEqual([...contas.valores], [...esm.PERFIS]);
  });

  test(`${formato}: fuzz — texto arbitrário nunca lança e erros trazem posição válida`, () => {
    const alfabeto = [
      "'",
      "''",
      '(',
      ')',
      ',',
      ' ',
      'eq',
      'ne',
      'and',
      'or',
      'not',
      'in',
      'tolower',
      'contains',
      'id',
      'nome',
      '1',
      '-2',
      '3.5',
      'true',
      'null',
      '2026-01-01',
      '2026-02-30',
      'T',
      'Z',
      '%',
      '_',
      '\\',
      '"',
      '$',
      '😀',
      '\n',
    ];
    const rnd = prng(20261115);
    for (let i = 0; i < 4000; i++) {
      const n = Math.floor(rnd() * 14);
      let texto = '';
      for (let j = 0; j < n; j++)
        texto +=
          alfabeto[Math.floor(rnd() * alfabeto.length)] +
          (rnd() < 0.7 ? ' ' : '');
      const r = api.lerFiltro(texto);
      if (r.valido)
        assert.deepEqual(api.validarFiltro(r.data, ESQ).length >= 0, true);
      else
        for (const e of r.erros) {
          assert.equal(e.field, '$filter');
          if (e.position !== undefined)
            assert.ok(e.position >= 0 && e.position <= texto.length, texto);
        }
      const consulta = api.lerConsultaOData(
        { $filter: texto, $orderby: texto, $top: texto },
        ESQ,
      );
      assert.equal(typeof consulta.valido, 'boolean');
    }
  });

  test(`${formato}: fuzz — condições válidas sempre geram filtro aceito e avaliável`, () => {
    const rnd = prng(42);
    const valoresPorTipo = {
      texto: ['ana', "d'água", 'a%b', 'a_b', ''],
      inteiro: ['0', '7', '-3'],
      decimal: ['0', '1.5', '-2,25'],
      booleano: ['true', 'false'],
      data: ['2026-01-01', '2024-02-29'],
      datahora: ['2026-01-01', '2026-11-05T12:00:00Z'],
    };
    for (let i = 0; i < 1500; i++) {
      const campos = ESQ.campos.filter((c) => c.filtravel);
      const c = campos[Math.floor(rnd() * campos.length)];
      const operadores = api.operadoresDoCampo(c);
      const operador = operadores[Math.floor(rnd() * operadores.length)];
      const pool = c.tipo === 'enum' ? c.valores : valoresPorTipo[c.tipo];
      const pega = () => pool[Math.floor(rnd() * pool.length)];
      const condicao = {
        campo: c.nome,
        operador,
        valor: pega(),
        valor2: pega(),
        valores: [pega(), pega()],
      };
      const r = api.montarFiltro([condicao], ESQ);
      if (
        c.tipo === 'texto' &&
        ['contem', 'comecaCom', 'terminaCom', 'igual', 'diferente'].includes(
          operador,
        ) &&
        condicao.valor === ''
      ) {
        assert.equal(r.valido, false, JSON.stringify(condicao));
        continue;
      }
      assert.equal(
        r.valido,
        true,
        `${JSON.stringify(condicao)} -> ${JSON.stringify(r.erros)}`,
      );
      const lido = api.lerFiltro(r.data);
      assert.equal(lido.valido, true, r.data);
      assert.deepEqual(api.validarFiltro(lido.data, ESQ), []);
      assert.equal(
        typeof api.avaliarFiltro(lido.data, {
          nome: 'Ana',
          id: 1,
          valor: '1.5',
          dia: '2026-01-01',
          quando: '2026-01-01T00:00:00Z',
          ativo: true,
          situacao: 'ativo',
          tags: 'a',
        }),
        'boolean',
      );
    }
  });
}
