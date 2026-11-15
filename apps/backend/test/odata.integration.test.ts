import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  avaliarFiltro,
  calcularPendencias,
  lerFiltro,
  PENDENCIAS_CADASTRO,
  type NoFiltro,
  type Perfil,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Resposta {
  data?: { id: number; [campo: string]: unknown }[];
  meta?: Record<string, number>;
  error?: { code: string; details?: { field: string; position?: number }[] };
}
interface LinhaOraculo {
  id: number;
  nomeFantasia: string;
  cnpj: string | null;
  situacao: string;
  tipoHospedagem: string | null;
  pendencias: string[];
}

describe('Consultas OData HTTP/PostgreSQL', { skip: !databaseUrl }, () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  const origem = 'http://localhost:5173';
  const usuarios: number[] = [];
  const perfis = new Map<Perfil, number>();
  const criados: number[] = [];
  const segmentos: number[] = [];
  let oraculo: LinhaOraculo[] = [];
  let vinculados: number[] = [];

  async function sessao(perfil: Perfil) {
    const token = novoToken();
    await prisma.sessao.create({
      data: {
        tokenHash: hashToken(token),
        usuarioId: perfis.get(perfil)!,
        criadaEm: new Date(),
        expiraEm: new Date(Date.now() + 3600000),
      },
    });
    return `oto_sessao=${token}`;
  }
  async function pegar(caminho: string, cookie: string, contexto?: number) {
    const r = await fetch(`${base}/api${caminho}`, {
      headers: {
        Origin: origem,
        Cookie: cookie,
        ...(contexto ? { 'x-identification': String(contexto) } : {}),
      },
    });
    return { status: r.status, json: (await r.json()) as Resposta };
  }
  const q = (params: Record<string, string>) =>
    '?' + new URLSearchParams(params).toString();
  /** Consulta somente as linhas desta suíte (o banco de teste é compartilhado). */
  const empreendimentos = (
    cookie: string,
    params: Record<string, string> = {},
    filtro?: string,
  ) => {
    const escopo = `id in (${criados.join(',')})`;
    return pegar(
      `/empreendimentos${q({
        $top: '100',
        $count: 'true',
        ...params,
        $filter: filtro ? `(${filtro}) and ${escopo}` : escopo,
      })}`,
      cookie,
    );
  };
  const ids = (r: { json: Resposta }) => (r.json.data ?? []).map((l) => l.id);
  const esperados = (no: NoFiltro) =>
    oraculo
      .filter((linha) =>
        avaliarFiltro(
          no,
          linha as unknown as Record<string, unknown>,
          (nome, l) =>
            nome === 'pendencia'
              ? l.pendencias
              : (l as unknown as Record<string, unknown>)[nome],
        ),
      )
      .map((l) => l.id)
      .sort((a, b) => a - b);

  before(async () => {
    assert.ok(databaseUrl);
    assert.match(new URL(databaseUrl).pathname, /\/[a-zA-Z0-9_]+_test$/);
    process.env.DATABASE_URL = databaseUrl;
    process.env.FRONTEND_URL = origem;
    process.env.AUTH_COOKIE_SECURE = 'false';
    const { AppModule } = await import('../src/app.module.js');
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    prisma = app.get(PrismaService);
    for (const perfil of ['administrador', 'gestor', 'empresario'] as const) {
      const u = await prisma.usuario.create({
        data: {
          nome: `OData ${perfil}`,
          email: `odata-${perfil}@example.test`,
          perfil,
        },
      });
      usuarios.push(u.id);
      perfis.set(perfil, u.id);
    }
    segmentos.push(
      (
        await prisma.segmento.create({
          data: {
            chave: 'odata.teste',
            nome: 'Segmento OData',
            nivelCadastro: 'completo',
          },
        })
      ).id,
    );
    const dados = [
      {
        nomeFantasia: 'Hotel Alfa',
        cnpj: '11222333000181',
        tipoHospedagem: 'HOTEL',
        situacao: 'ativo',
        completo: true,
      },
      {
        nomeFantasia: 'hotel alfa II',
        cnpj: null,
        tipoHospedagem: 'hotel',
        situacao: 'ativo',
      },
      {
        nomeFantasia: 'Pousada Água Azul',
        cnpj: '11.222.333/0002-62',
        tipoHospedagem: 'POUSADA',
        situacao: 'encerrado',
      },
      {
        nomeFantasia: 'Pousada 100% Natural',
        cnpj: null,
        tipoHospedagem: null,
        situacao: 'ativo',
      },
      {
        nomeFantasia: 'Chalé A_B',
        cnpj: null,
        tipoHospedagem: 'CHALE',
        situacao: 'ativo',
      },
      {
        nomeFantasia: 'Chalé AxB',
        cnpj: '99888777000166',
        tipoHospedagem: 'CHALE',
        situacao: 'ativo',
      },
      {
        nomeFantasia: "D'Angelo Hotel",
        cnpj: '45723174000110',
        tipoHospedagem: 'HOTEL',
        situacao: 'encerrado',
      },
      {
        nomeFantasia: 'Zeta',
        cnpj: null,
        tipoHospedagem: null,
        situacao: 'ativo',
      },
      {
        nomeFantasia: 'Zeta',
        cnpj: null,
        tipoHospedagem: null,
        situacao: 'ativo',
      },
      {
        nomeFantasia: 'Zeta',
        cnpj: '00000000000191',
        tipoHospedagem: 'POUSADA',
        situacao: 'ativo',
      },
    ];
    for (const d of dados) {
      const e = await prisma.empreendimento.create({
        data: {
          nomeFantasia: d.nomeFantasia,
          cnpj: d.cnpj,
          tipoHospedagem: d.tipoHospedagem,
          situacao: d.situacao,
          ...(d.situacao === 'encerrado'
            ? { dataEncerramento: new Date('2026-09-30') }
            : {}),
          ...(d.completo
            ? {
                razaoSocial: 'Hotel Alfa Ltda.',
                categoriaIndicador: 'hotel',
                endereco: 'Rua A, 1',
                segmentos: { create: [{ segmentoId: segmentos[0] }] },
                contatos: {
                  create: [
                    {
                      tipo: 'email',
                      valor: 'a@example.test',
                      finalidade: 'publico',
                    },
                  ],
                },
                cadastur: { create: [{ situacao: 'nao_possui' }] },
              }
            : {}),
        },
      });
      criados.push(e.id);
    }
    // O primeiro cadastro tem outras pendências ocasionais para variar `pendencia`.
    await prisma.empreendimento.update({
      where: { id: criados[2] },
      data: { endereco: 'Rua B, 2', razaoSocial: 'Pousada Ltda.' },
    });
    await prisma.contato.create({
      data: {
        empreendimentoId: criados[2],
        tipo: 'site',
        valor: 'https://example.test',
        finalidade: 'publico',
      },
    });
    vinculados = criados.slice(0, 2);
    await prisma.usuarioEmpreendimento.createMany({
      data: vinculados.map((empreendimentoId) => ({
        usuarioId: perfis.get('empresario')!,
        empreendimentoId,
      })),
    });
    const linhas = await prisma.empreendimento.findMany({
      where: { id: { in: criados } },
      include: {
        _count: { select: { segmentos: true, contatos: true, cadastur: true } },
      },
    });
    oraculo = linhas.map((l) => ({
      id: l.id,
      nomeFantasia: l.nomeFantasia,
      cnpj: l.cnpj,
      situacao: l.situacao,
      tipoHospedagem: l.tipoHospedagem,
      pendencias: calcularPendencias({
        cnpj: l.cnpj,
        razaoSocial: l.razaoSocial,
        tipoHospedagem: l.tipoHospedagem,
        categoriaIndicador: l.categoriaIndicador,
        endereco: l.endereco,
        segmentos: l._count.segmentos,
        contatos: l._count.contatos,
        cadastur: l._count.cadastur,
      }),
    }));
  });
  after(async () => {
    if (prisma)
      await prisma.$transaction(async (tx) => {
        await tx.contato.deleteMany({
          where: { empreendimentoId: { in: criados } },
        });
        await tx.cadastur.deleteMany({
          where: { empreendimentoId: { in: criados } },
        });
        await tx.empreendimentoSegmento.deleteMany({
          where: { empreendimentoId: { in: criados } },
        });
        await tx.usuarioEmpreendimento.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await tx.empreendimento.deleteMany({ where: { id: { in: criados } } });
        await tx.segmento.deleteMany({ where: { id: { in: segmentos } } });
        await tx.sessao.deleteMany({ where: { usuarioId: { in: usuarios } } });
        await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
      });
    await app?.close();
  });

  it('oráculo: cada operador em cada campo filtrável devolve exatamente o que o avaliador em memória prevê', async () => {
    const gestor = await sessao('gestor');
    const textos = (campo: 'nomeFantasia' | 'cnpj' | 'tipoHospedagem') => [
      ...new Set(
        oraculo.map((l) => l[campo]).filter((v): v is string => v !== null),
      ),
    ];
    const aspas = (v: string) => `'${v.replace(/'/g, "''")}'`;
    const expressoes: string[] = [];
    for (const campo of ['nomeFantasia', 'cnpj', 'tipoHospedagem'] as const) {
      const valores = textos(campo).slice(0, 6);
      for (const v of [...valores, 'zzz', '%', '_']) {
        expressoes.push(`${campo} eq ${aspas(v)}`, `${campo} ne ${aspas(v)}`);
        expressoes.push(
          `contains(${campo},${aspas(v.slice(0, 3))})`,
          `startswith(${campo},${aspas(v.slice(0, 2))})`,
          `endswith(${campo},${aspas(v.slice(-2))})`,
        );
        expressoes.push(`not contains(${campo},${aspas(v.slice(0, 3))})`);
      }
      const minusculos = valores.map((v) => v.toLowerCase());
      for (const v of [...minusculos, 'a', '%', '_', "'"]) {
        expressoes.push(
          `contains(tolower(${campo}),${aspas(v)})`,
          `tolower(${campo}) eq ${aspas(v)}`,
          `tolower(${campo}) ne ${aspas(v)}`,
          `startswith(tolower(${campo}),${aspas(v.slice(0, 2))})`,
          `not endswith(tolower(${campo}),${aspas(v.slice(-2))})`,
        );
      }
      expressoes.push(
        `tolower(${campo}) in ('chalé a_b','pousada 100%','a%')`,
        `not tolower(${campo}) in ('chalé a_b','a_')`,
        `tolower(${campo}) in (${minusculos.slice(0, 3).map(aspas).join(',')})`,
        `${campo} in (${valores.slice(0, 3).map(aspas).join(',')})`,
        `not ${campo} in (${valores.slice(0, 2).map(aspas).join(',')})`,
      );
      expressoes.push(`contains(tolower(${campo}),'Hotel')`);
    }
    for (const campo of ['cnpj', 'tipoHospedagem'])
      expressoes.push(
        `${campo} eq null`,
        `${campo} ne null`,
        `not (${campo} eq null)`,
      );
    for (const op of ['eq', 'ne', 'gt', 'ge', 'lt', 'le'])
      expressoes.push(`id ${op} ${criados[3]}`, `not (id ${op} ${criados[5]})`);
    expressoes.push(
      `id in (${criados.slice(1, 4).join(',')})`,
      `not id in (${criados.slice(0, 3).join(',')})`,
    );
    for (const situacao of ['ativo', 'encerrado'])
      expressoes.push(
        `situacao eq '${situacao}'`,
        `situacao ne '${situacao}'`,
        `situacao in ('${situacao}')`,
      );
    for (const p of PENDENCIAS_CADASTRO)
      expressoes.push(
        `pendencia eq '${p}'`,
        `pendencia ne '${p}'`,
        `not pendencia eq '${p}'`,
      );
    expressoes.push(
      `pendencia in ('sem_cnpj','sem_contato')`,
      `not pendencia in ('sem_cnpj')`,
    );
    // Combinações pseudoaleatórias (semente fixa), incluindo and/or/not e parênteses.
    let semente = 20261115;
    const rnd = () =>
      (semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296;
    const base = [...expressoes];
    for (let i = 0; i < 160; i++) {
      const a = base[Math.floor(rnd() * base.length)];
      const b = base[Math.floor(rnd() * base.length)];
      const c = base[Math.floor(rnd() * base.length)];
      expressoes.push(
        `(${a}) ${rnd() < 0.5 ? 'and' : 'or'} (${b})`,
        `not ((${a}) ${rnd() < 0.5 ? 'and' : 'or'} (${b}))`,
        `(${a}) or ((${b}) and not (${c}))`,
      );
    }
    let casos = 0;
    for (const e of expressoes) {
      const lido = lerFiltro(e);
      assert.ok(lido.valido, e);
      const r = await empreendimentos(gestor, {}, e);
      assert.equal(r.status, 200, `${e} -> ${JSON.stringify(r.json)}`);
      const obtido = ids(r).sort((a, b) => a - b);
      assert.deepEqual(obtido, esperados(lido.data), `filtro: ${e}`);
      assert.equal(r.json.meta?.total, obtido.length, e);
      casos++;
    }
    assert.ok(casos > 800, `casos executados: ${casos}`);
  });

  it('identificação: CNPJ com ou sem máscara ou ID do sistema', async () => {
    const gestor = await sessao('gestor');
    const por = async (f: string) =>
      ids(await empreendimentos(gestor, {}, f)).sort((a, b) => a - b);
    assert.deepEqual(await por("identificacao eq '11222333000181'"), [
      criados[0],
    ]);
    assert.deepEqual(await por("identificacao eq '11.222.333/0001-81'"), [
      criados[0],
    ]);
    // CNPJ guardado com máscara é encontrado digitando só os dígitos.
    assert.deepEqual(await por("identificacao eq '11222333000262'"), [
      criados[2],
    ]);
    // Dígitos parciais só enxergam CNPJs guardados só com dígitos (o legado mascarado exige a
    // máscara digitada ou o CNPJ completo).
    assert.deepEqual(await por("contains(identificacao,'1122233300')"), [
      criados[0],
    ]);
    assert.deepEqual(await por("contains(identificacao,'11.222.333')"), [
      criados[0],
      criados[2],
    ]);
    assert.deepEqual(await por(`identificacao eq '${criados[4]}'`), [
      criados[4],
    ]);
    assert.deepEqual(
      await por(`contains(identificacao,'${criados[4]}')`).then((v) =>
        v.includes(criados[4]),
      ),
      true,
    );
    assert.deepEqual(await por("identificacao eq ''"), []);
    assert.equal(
      (await por("contains(identificacao,'')")).length,
      criados.length,
    );
    assert.equal(
      (await por("not contains(identificacao,'1122233300')")).length,
      criados.length - 1,
    );
  });

  it('curingas do LIKE e aspas são texto literal; strings de injeção não executam nada', async () => {
    const gestor = await sessao('gestor');
    const por = async (f: string) =>
      ids(await empreendimentos(gestor, {}, f)).sort((a, b) => a - b);
    assert.deepEqual(await por("contains(nomeFantasia,'%')"), [criados[3]]);
    assert.deepEqual(await por("contains(nomeFantasia,'_')"), [criados[4]]);
    assert.deepEqual(await por("startswith(nomeFantasia,'Chalé A_')"), [
      criados[4],
    ]);
    assert.deepEqual(await por("nomeFantasia eq 'Chalé A_B'"), [criados[4]]);
    assert.deepEqual(await por("contains(tolower(nomeFantasia),'100%')"), [
      criados[3],
    ]);
    assert.deepEqual(await por("tolower(nomeFantasia) eq 'chalé a_b'"), [
      criados[4],
    ]);
    assert.deepEqual(await por("contains(nomeFantasia,'D''Angelo')"), [
      criados[6],
    ]);
    const antes = await prisma.empreendimento.count();
    assert.deepEqual(await por("nomeFantasia eq 'x'' or ''1''=''1'"), []);
    assert.deepEqual(
      await por("nomeFantasia eq 'x''; DROP TABLE empreendimento; --'"),
      [],
    );
    assert.equal(await prisma.empreendimento.count(), antes);
  });

  it('ordenação, paginação OData e ordem estável com empates', async () => {
    const gestor = await sessao('gestor');
    const nomes = async (params: Record<string, string>) =>
      (await empreendimentos(gestor, params)).json.data!.map(
        (l) => `${l.nomeFantasia}#${l.id}`,
      );
    const completo = await nomes({ $orderby: 'nomeFantasia asc' });
    // Páginas de 3 reproduzem a lista completa; nenhum item repete ou falta (há três "Zeta").
    const paginas = [
      ...(await nomes({ $orderby: 'nomeFantasia asc', $top: '3', $skip: '0' })),
      ...(await nomes({ $orderby: 'nomeFantasia asc', $top: '3', $skip: '3' })),
      ...(await nomes({ $orderby: 'nomeFantasia asc', $top: '3', $skip: '6' })),
      ...(await nomes({ $orderby: 'nomeFantasia asc', $top: '3', $skip: '9' })),
    ];
    assert.deepEqual(paginas, completo);
    assert.equal(new Set(paginas).size, criados.length);
    const zetas = completo
      .filter((n) => n.startsWith('Zeta#'))
      .map((n) => Number(n.split('#')[1]));
    assert.deepEqual(
      zetas,
      [...zetas].sort((a, b) => a - b),
      'desempate por ID crescente',
    );
    // Nulos por último, em qualquer direção; asc e desc são inversas entre os valores.
    const cnpjs = async (direcao: string) =>
      (
        await empreendimentos(gestor, { $orderby: `cnpj ${direcao}` })
      ).json.data!.map((l) => l.cnpj as string | null);
    const asc = await cnpjs('asc');
    const desc = await cnpjs('desc');
    for (const lista of [asc, desc]) {
      const primeiroNulo = lista.indexOf(null);
      assert.ok(primeiroNulo > 0);
      assert.ok(lista.slice(primeiroNulo).every((c) => c === null));
    }
    const comValor = (lista: (string | null)[]) =>
      lista.filter((c): c is string => c !== null);
    assert.deepEqual(comValor(asc), [...comValor(desc)].reverse());
    const r = await empreendimentos(gestor, { $top: '2', $skip: '1' });
    assert.deepEqual(r.json.meta, { top: 2, skip: 1, total: criados.length });
    assert.equal(
      (await empreendimentos(gestor, { $top: '0' })).json.data?.length,
      0,
    );
    // Sem $count não há total.
    const semContagem = await pegar(
      `/empreendimentos${q({ $top: '1', $filter: `id in (${criados.join(',')})` })}`,
      gestor,
    );
    assert.deepEqual(semContagem.json.meta, { top: 1, skip: 0 });
  });

  it('o filtro do usuário nunca amplia o escopo do empresário', async () => {
    const empresario = await sessao('empresario');
    const gestor = await sessao('gestor');
    const alheio = criados[5];
    const todos = await empreendimentos(empresario);
    assert.deepEqual(
      ids(todos).sort((a, b) => a - b),
      vinculados,
    );
    assert.deepEqual(
      ids(await empreendimentos(empresario, {}, `id eq ${alheio}`)),
      [],
    );
    assert.deepEqual(
      ids(
        await empreendimentos(
          empresario,
          {},
          `id eq ${alheio} or id ne ${alheio}`,
        ),
      ).sort((a, b) => a - b),
      vinculados,
    );
    assert.deepEqual(
      ids(
        await empreendimentos(
          empresario,
          {},
          `not (id in (${vinculados.join(',')}))`,
        ),
      ),
      [],
    );
    assert.deepEqual(
      ids(
        await empreendimentos(
          empresario,
          {},
          "contains(tolower(nomeFantasia),'chalé')",
        ),
      ),
      [],
    );
    // O mesmo filtro, com escopo global, enxerga o alheio.
    assert.deepEqual(
      ids(await empreendimentos(gestor, {}, `id eq ${alheio}`)),
      [alheio],
    );
    // Exportação respeita contexto e filtro juntos.
    const exp = await pegar(
      `/empreendimentos/exportacoes${q({ $filter: "situacao eq 'ativo'", $count: 'true' })}`,
      gestor,
      criados[0],
    );
    assert.deepEqual(ids(exp), [criados[0]]);
    const expSem = await pegar(
      `/empreendimentos/exportacoes${q({ $filter: "situacao eq 'encerrado'", $count: 'true' })}`,
      gestor,
      criados[0],
    );
    assert.deepEqual(ids(expSem), []);
    assert.equal(
      (
        await pegar(
          `/empreendimentos/exportacoes${q({ $filter: "situacao eq 'ativo'" })}`,
          empresario,
        )
      ).status,
      403,
    );
  });

  it('erros: FILTRO_INVALIDO com campo, posição e sem vazar detalhes internos', async () => {
    const gestor = await sessao('gestor');
    const erro = async (params: Record<string, string>) => {
      const r = await pegar(`/empreendimentos${q(params)}`, gestor);
      assert.equal(r.status, 400, JSON.stringify(params));
      assert.equal(r.json.error?.code, 'FILTRO_INVALIDO');
      return r.json.error!.details!;
    };
    assert.deepEqual((await erro({ $filter: "telefone eq 'x'" }))[0], {
      field: '$filter',
      message: 'Campo desconhecido: telefone.',
      position: 0,
    });
    assert.equal((await erro({ $filter: 'id eq' }))[0].position, 5);
    assert.equal(
      (await erro({ $filter: "situacao eq 'talvez'" }))[0].field,
      '$filter',
    );
    assert.equal(
      (await erro({ $filter: "identificacao gt 'a'" }))[0].field,
      '$filter',
    );
    assert.equal(
      (await erro({ $filter: 'tolower(id) eq 1' }))[0].field,
      '$filter',
    );
    assert.equal(
      (await erro({ $orderby: 'identificacao' }))[0].field,
      '$orderby',
    );
    assert.equal(
      (await erro({ $orderby: 'pendencia desc' }))[0].field,
      '$orderby',
    );
    assert.equal((await erro({ $top: '101' }))[0].field, '$top');
    assert.equal((await erro({ $select: 'id' }))[0].field, '$select');
    assert.equal((await erro({ foo: '1' }))[0].field, 'foo');
    assert.equal((await erro({ $top: '5', page: '2' }))[0].field, 'page');
    assert.equal(
      (await erro({ $filter: `id eq 1${' or id eq 1'.repeat(60)}` }))[0].field,
      '$filter',
    );
    const corpo = JSON.stringify(await erro({ $filter: "x eq 'a'" }));
    assert.doesNotMatch(corpo, /prisma|select|stack|at /i);
  });

  it('parâmetros do formato antigo são recusados e o envelope é só o OData', async () => {
    const gestor = await sessao('gestor');
    const antigos: Record<string, string>[] = [
      { page: '1', pageSize: '100' },
      { busca: 'alfa' },
      { situacao: 'ativo' },
      { incompleto: 'true' },
      { tipoHospedagem: 'hotel' },
    ];
    for (const antigo of antigos) {
      const resposta = await pegar(`/empreendimentos${q(antigo)}`, gestor);
      assert.equal(resposta.status, 400);
      assert.equal(resposta.json.error?.code, 'FILTRO_INVALIDO');
    }
    const semParametros = await pegar('/empreendimentos', gestor);
    assert.equal(semParametros.status, 200);
    assert.deepEqual(semParametros.json.meta, { top: 20, skip: 0 });
    const contado = await pegar(
      `/empreendimentos${q({ $count: 'true' })}`,
      gestor,
    );
    assert.deepEqual(Object.keys(contado.json.meta!).sort(), [
      'skip',
      'top',
      'total',
    ]);
  });

  it('contas: filtro, ordenação e contagem em GET /contas', async () => {
    const admin = await sessao('administrador');
    const escopo = `id in (${usuarios.join(',')})`;
    const consultar = (params: Record<string, string>) =>
      pegar(`/contas${q({ $count: 'true', ...params })}`, admin);
    const r1 = await consultar({
      $filter: `perfil eq 'gestor' and ativo eq true and ${escopo}`,
    });
    assert.equal(r1.status, 200);
    assert.deepEqual(ids(r1), [perfis.get('gestor')]);
    assert.equal(r1.json.meta?.total, 1);
    const r2 = await consultar({
      $filter: `contains(tolower(email),'odata-') and ${escopo}`,
      $orderby: 'email desc',
    });
    assert.deepEqual(
      (r2.json.data ?? []).map((c) => c.email),
      [
        'odata-gestor@example.test',
        'odata-empresario@example.test',
        'odata-administrador@example.test',
      ],
    );
    assert.deepEqual(
      ids(
        await consultar({
          $filter: `perfil in ('gestor','empresario') and ${escopo}`,
          $orderby: 'perfil desc, id asc',
        }),
      ),
      [perfis.get('gestor'), perfis.get('empresario')],
    );
    assert.equal((await consultar({ $filter: "senha eq 'x'" })).status, 400);
    assert.equal((await consultar({ $filter: "perfil eq 'rei'" })).status, 400);
    assert.equal(
      (await pegar(`/contas${q({ $top: '2' })}`, admin)).json.meta?.top,
      2,
    );
    const empresario = await sessao('empresario');
    assert.equal(
      (await pegar(`/contas${q({ $top: '1' })}`, empresario)).status,
      403,
    );
  });
});
