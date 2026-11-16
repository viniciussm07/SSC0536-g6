import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  avaliarFiltro,
  ESQUEMAS_ODATA,
  lerFiltro,
  validarFiltro,
  type CampoOData,
  type EsquemaOData,
  type Perfil,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';

const databaseUrl = process.env.DATABASE_TEST_URL;
type Linha = Record<string, unknown>;
interface Resposta {
  data?: Linha[];
  meta?: { total?: number };
  error?: { code: string };
}

/**
 * Oráculo dirigido pelo esquema: para cada coleção (exceto empreendimentos, que tem o seu em
 * `odata.integration.test.ts`), cada campo filtrável e cada operador válido para o tipo é
 * consultado no servidor e comparado ao avaliador em memória sobre as mesmas linhas.
 */
describe(
  'Oráculo OData das demais coleções (HTTP/PostgreSQL)',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const perfis = new Map<Perfil, number>();
    const usuarios: number[] = [];
    const empreendimentos: number[] = [];
    const definicoes: number[] = [];
    let empresa = 0;
    let periodoId = 0;
    let feriadoId = 0;
    let modeloId = 0;
    const pesquisas: number[] = [];

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
    async function pegar(
      caminho: string,
      params: Record<string, string>,
      cookie: string,
      contexto?: number,
    ) {
      const r = await fetch(
        `${base}/api${caminho}?${new URLSearchParams(params)}`,
        {
          headers: {
            Origin: origem,
            Cookie: cookie,
            ...(contexto ? { 'x-identification': String(contexto) } : {}),
          },
        },
      );
      return { status: r.status, json: (await r.json()) as Resposta };
    }

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
            nome: `Oráculo ${perfil}`,
            email: `oraculo-${perfil}@example.test`,
            perfil,
            ativo: perfil !== 'empresario',
          },
        });
        usuarios.push(u.id);
        perfis.set(perfil, u.id);
      }
      const nomes = ['Alfa', 'Beta_1', '100% Gama', "D'Delta", 'Épsilon'];
      for (const nomeFantasia of nomes)
        empreendimentos.push(
          (
            await prisma.empreendimento.create({
              data: { nomeFantasia, situacao: 'ativo' },
            })
          ).id,
        );
      empresa = empreendimentos[0];
      await prisma.usuarioEmpreendimento.createMany({
        data: empreendimentos.slice(0, 4).map((empreendimentoId, i) => ({
          usuarioId: perfis.get('empresario')!,
          empreendimentoId,
          ativo: i % 2 === 0,
        })),
      });
      const contatos = [
        ['telefone', '(16) 99999-0001', 'publico', 'Ana', 'Gerente'],
        ['email', 'a_b@example.test', 'interno', null, null],
        ['email', '100%@example.test', 'publico', 'Bruno', null],
        ['site', 'https://exemplo.test', 'publico', null, 'Diretor'],
        ['rede_social', '@alfa', 'interno', "D'Ávila", 'Social'],
        ['telefone', '(16) 99999-0002', 'interno', 'Ana', null],
      ] as const;
      await prisma.contato.createMany({
        data: contatos.map(([tipo, valor, finalidade, nome, cargo]) => ({
          empreendimentoId: empresa,
          tipo,
          valor,
          finalidade,
          responsavelNome: nome,
          responsavelCargo: cargo,
        })),
      });
      await prisma.cadastur.createMany({
        data: [
          { situacao: 'nao_possui', numero: null, vencimento: null },
          { situacao: 'igual_cnpj', numero: null, vencimento: null },
          {
            situacao: 'numero_proprio',
            numero: '000123',
            vencimento: new Date('2027-01-31'),
          },
          {
            situacao: 'numero_proprio',
            numero: '9_9%',
            vencimento: new Date('2026-06-30'),
          },
        ].map((c) => ({ empreendimentoId: empresa, ...c })),
      });
      const inventarios = [
        ['2026-01-01', '2026-03-31', 10, 20, 'completo'],
        ['2026-04-01', null, null, null, 'pendente'],
        ['2025-01-01', '2025-05-31', 8, null, 'parcial'],
        ['2025-06-01', '2025-12-31', 8, 16, 'completo'],
        ['2024-01-01', '2024-12-31', null, 12, 'pendente'],
      ] as const;
      for (const [ini, fim, uh, leitos, situacaoConferencia] of inventarios)
        await prisma.inventarioVersao.create({
          data: {
            empreendimentoId: empresa,
            criadaPor: perfis.get('gestor')!,
            vigenciaInicio: new Date(ini),
            vigenciaFim: fim ? new Date(fim) : null,
            tipoAlteracao: 'mudanca_real',
            situacaoConferencia,
            totalUh: uh,
            leitos,
          },
        });
      modeloId = (
        await prisma.pesquisaModelo.create({
          data: { nome: 'Modelo oráculo', publicoAlvo: 'hotelaria' },
        })
      ).id;
      const canais = ['sistema', 'importacao', 'sistema', 'import_%'];
      for (const [i, canal] of canais.entries()) {
        const p = await prisma.pesquisa.create({
          data: {
            modeloId,
            titulo: ['Pesquisa A', 'pesquisa b', 'Pesquisa 100%', 'Ç_x'][i],
            tipoColeta: 'consolidado',
            abertura: new Date(),
            prazo: new Date(),
            status: 'aberta',
          },
        });
        pesquisas.push(p.id);
        await prisma.resposta.create({
          data: {
            pesquisaId: p.id,
            empreendimentoId: empresa,
            usuarioId: perfis.get('gestor')!,
            respondidaEm: new Date(Date.UTC(2026, i, 10 + i, 12, 30)),
            canal,
          },
        });
      }
      periodoId = (
        await prisma.periodo.create({
          data: {
            tipo: 'mes',
            rotulo: 'Oráculo 2026-01',
            dataInicio: new Date('2026-01-01'),
            dataFim: new Date('2026-01-31'),
          },
        })
      ).id;
      // Segundo período (outro tipo e datas) para filtrar e ordenar pelos campos do período.
      feriadoId = (
        await prisma.periodo.create({
          data: {
            tipo: 'feriado_prolongado',
            rotulo: 'Oráculo feriado 2025-12',
            dataInicio: new Date('2025-12-24'),
            dataFim: new Date('2025-12-26'),
          },
        })
      ).id;
      const resultados = [
        ['Taxa A', '%', 'hotel', 'aritmetica', '12.5'],
        ['taxa b', '%', 'pousada', 'ponderada', '7'],
        ['Taxa_C', 'R$', 'total', 'aritmetica', '1000.125'],
        ['Taxa 100%', 'dias', 'resort', 'ponderada', '0'],
        ['Taxa E', '%', 'total', 'aritmetica', '99.999'],
      ] as const;
      for (const [
        i,
        [nome, unidade, recorte, metodo, valor],
      ] of resultados.entries()) {
        const d = await prisma.indicadorDefinicao.create({
          data: {
            codigo: `oraculo-${i}`,
            nome,
            unidade,
            formulaDescricao: 'Demonstração fictícia',
            versaoFormula: 1,
          },
        });
        definicoes.push(d.id);
        await prisma.indicadorResultado.create({
          data: {
            definicaoId: d.id,
            periodoId: i % 3 === 1 ? feriadoId : periodoId,
            tipoColeta: i % 2 ? 'expectativa' : 'consolidado',
            recorte,
            metodo,
            valor,
            calculadoEm: new Date(),
          },
        });
        // gestor: 0..2 liberados, 3 restrito explícito, 4 sem linha (padrão falso).
        if (i < 4)
          await prisma.visibilidadeIndicadorPerfil.create({
            data: {
              perfil: 'gestor',
              indicadorId: d.id,
              permitido: i < 3,
            },
          });
      }
    });

    after(async () => {
      if (!prisma) return;
      await prisma.visibilidadeIndicadorPerfil.deleteMany({
        where: { indicadorId: { in: definicoes } },
      });
      await prisma.indicadorResultado.deleteMany({
        where: { definicaoId: { in: definicoes } },
      });
      await prisma.indicadorDefinicao.deleteMany({
        where: { id: { in: definicoes } },
      });
      if (periodoId) await prisma.periodo.delete({ where: { id: periodoId } });
      if (feriadoId) await prisma.periodo.delete({ where: { id: feriadoId } });
      await prisma.resposta.deleteMany({
        where: { empreendimentoId: { in: empreendimentos } },
      });
      await prisma.pesquisa.deleteMany({ where: { id: { in: pesquisas } } });
      if (modeloId)
        await prisma.pesquisaModelo.delete({ where: { id: modeloId } });
      await prisma.inventarioVersao.deleteMany({
        where: { empreendimentoId: { in: empreendimentos } },
      });
      await prisma.contato.deleteMany({
        where: { empreendimentoId: { in: empreendimentos } },
      });
      await prisma.cadastur.deleteMany({
        where: { empreendimentoId: { in: empreendimentos } },
      });
      await prisma.usuarioEmpreendimento.deleteMany({
        where: { usuarioId: { in: usuarios } },
      });
      await prisma.empreendimento.deleteMany({
        where: { id: { in: empreendimentos } },
      });
      await prisma.sessao.deleteMany({
        where: { usuarioId: { in: usuarios } },
      });
      await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
      await app?.close();
    });

    const aspas = (v: string) => `'${v.replace(/'/g, "''")}'`;
    const literal = (campo: CampoOData, v: unknown) =>
      campo.tipo === 'texto' || campo.tipo === 'enum'
        ? aspas(String(v))
        : String(v);

    /** Expressões válidas para o tipo do campo, geradas a partir de valores reais da coleção. */
    function expressoesDoCampo(campo: CampoOData, linhas: Linha[]) {
      const n = campo.nome;
      const amostras = [
        ...new Set(
          linhas.map((l) => l[n]).filter((v) => v !== null && v !== undefined),
        ),
      ].slice(0, 5);
      const permitido = (op: string) =>
        !campo.operadores || campo.operadores.includes(op);
      const ex: string[] = [];
      if (campo.anulavel)
        ex.push(`${n} eq null`, `${n} ne null`, `not (${n} eq null)`);
      for (const v of amostras) {
        const l = literal(campo, v);
        if (permitido('eq')) ex.push(`${n} eq ${l}`, `not (${n} eq ${l})`);
        if (permitido('ne')) ex.push(`${n} ne ${l}`);
        // Ordem de texto depende da collation do banco: só tipos com ordem total portável.
        if (['inteiro', 'decimal', 'data', 'datahora'].includes(campo.tipo))
          for (const op of ['gt', 'ge', 'lt', 'le'])
            if (permitido(op)) ex.push(`${n} ${op} ${l}`);
      }
      if (campo.tipo !== 'booleano' && permitido('in') && amostras.length) {
        const lista = amostras
          .slice(0, 3)
          .map((v) => literal(campo, v))
          .join(',');
        ex.push(`${n} in (${lista})`, `not ${n} in (${lista})`);
      }
      if (campo.tipo === 'texto') {
        const textos = amostras.map(String);
        for (const v of [...textos, '%', '_', "'", 'zzz']) {
          const meio = v.slice(0, 3);
          if (permitido('contains'))
            ex.push(
              `contains(${n},${aspas(meio)})`,
              `not contains(${n},${aspas(meio)})`,
            );
          if (permitido('startswith'))
            ex.push(`startswith(${n},${aspas(v.slice(0, 2))})`);
          if (permitido('endswith'))
            ex.push(`endswith(${n},${aspas(v.slice(-2))})`);
        }
        for (const v of [...textos.map((t) => t.toLowerCase()), '%', '_']) {
          ex.push(
            `contains(tolower(${n}),${aspas(v.slice(0, 3))})`,
            `tolower(${n}) eq ${aspas(v)}`,
            `tolower(${n}) ne ${aspas(v)}`,
            `startswith(tolower(${n}),${aspas(v.slice(0, 2))})`,
            `not endswith(tolower(${n}),${aspas(v.slice(-2))})`,
          );
        }
        ex.push(`contains(tolower(${n}),'MAIÚSCULA')`);
      }
      return ex;
    }

    const chave = (esquema: EsquemaOData, l: Linha) =>
      JSON.stringify(esquema.desempate.map((c) => l[c]));

    async function oraculo(
      nome: keyof typeof ESQUEMAS_ODATA,
      caminho: string,
      perfil: Perfil,
      contexto?: number,
    ) {
      const esquema = ESQUEMAS_ODATA[nome];
      const cookie = await sessao(perfil);
      const consultar = (params: Record<string, string>) =>
        pegar(
          caminho,
          { $top: '100', $count: 'true', ...params },
          cookie,
          contexto,
        );
      const todas = await consultar({});
      assert.equal(todas.status, 200, `${nome}: ${JSON.stringify(todas.json)}`);
      const linhas = todas.json.data ?? [];
      assert.ok(linhas.length > 0, `${nome}: sem linhas`);
      assert.ok(
        (todas.json.meta?.total ?? 0) <= 100,
        `${nome}: coleção maior que a página de verdade`,
      );
      const expressoes = esquema.campos
        .filter((c) => c.filtravel)
        .flatMap((c) => expressoesDoCampo(c, linhas));
      // Combinações pseudoaleatórias (semente fixa) com and/or/not.
      let semente = 20261115 + expressoes.length;
      const rnd = () =>
        (semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296;
      const base = [...expressoes];
      for (let i = 0; i < 40; i++) {
        const [a, b, c] = [0, 0, 0].map(
          () => base[Math.floor(rnd() * base.length)],
        );
        expressoes.push(
          `(${a}) ${rnd() < 0.5 ? 'and' : 'or'} (${b})`,
          `(${a}) or ((${b}) and not (${c}))`,
        );
      }
      let casos = 0;
      for (const e of expressoes) {
        const lido = lerFiltro(e);
        assert.ok(lido.valido, `${nome}: ${e}`);
        assert.deepEqual(
          validarFiltro(lido.data, esquema),
          [],
          `${nome}: ${e}`,
        );
        const r = await consultar({ $filter: e });
        assert.equal(
          r.status,
          200,
          `${nome}: ${e} -> ${JSON.stringify(r.json)}`,
        );
        const esperado = linhas
          .filter((l) => avaliarFiltro(lido.data, l))
          .map((l) => chave(esquema, l))
          .sort();
        const obtido = (r.json.data ?? []).map((l) => chave(esquema, l)).sort();
        assert.deepEqual(obtido, esperado, `${nome}: ${e}`);
        assert.equal(r.json.meta?.total, esperado.length, `${nome}: ${e}`);
        casos++;
      }
      assert.ok(casos >= 20, `${nome}: casos executados ${casos}`);

      // Ordenação nos tipos com ordem total portável: nulos por último, desempate estável.
      for (const campo of esquema.campos.filter(
        (c) =>
          c.ordenavel &&
          ['inteiro', 'decimal', 'data', 'datahora', 'booleano'].includes(
            c.tipo,
          ),
      )) {
        for (const direcao of ['asc', 'desc'] as const) {
          const r = await consultar({
            $orderby: `${campo.nome} ${direcao}`,
          });
          assert.equal(r.status, 200, `${nome}.${campo.nome} ${direcao}`);
          const num = (v: unknown) =>
            campo.tipo === 'decimal' || campo.tipo === 'inteiro'
              ? Number(v)
              : (v as string | boolean);
          const esperado = [...linhas]
            .sort((a, b) => {
              const av = a[campo.nome];
              const bv = b[campo.nome];
              if (av === null || bv === null)
                return av === bv ? 0 : av === null ? 1 : -1;
              const x = num(av);
              const y = num(bv);
              if (x === y) return 0;
              return (x < y ? -1 : 1) * (direcao === 'asc' ? 1 : -1);
            })
            .map((l) => chave(esquema, l));
          const obtido = (r.json.data ?? []).map((l) => chave(esquema, l));
          // Empates: confere a sequência dos valores, não a ordem interna dos empatados.
          const valores = (ids: string[]) =>
            ids.map(
              (id) =>
                linhas.find((l) => chave(esquema, l) === id)?.[campo.nome],
            );
          assert.deepEqual(
            valores(obtido),
            valores(esperado),
            `${nome}.${campo.nome} ${direcao}`,
          );
        }
      }
    }

    it('contas', async () => {
      await oraculo('contas', '/contas', 'administrador');
    });
    it('vínculos', async () => {
      await oraculo(
        'vinculos',
        `/contas/${perfis.get('empresario')}/vinculos`,
        'administrador',
      );
    });
    it('permissões do perfil', async () => {
      await oraculo('permissoes', '/perfis/gestor/permissoes', 'administrador');
    });
    it('permissões: o banco recusa escopo inválido; a API só expõe valores do contrato', async () => {
      await assert.rejects(
        prisma.permissaoPerfil.create({
          data: {
            perfil: 'visualizador',
            recurso: 'indicadores',
            acao: 'consultar',
            escopo: 'escopo_invalido',
          },
        }),
        /permissao_perfil_escopo_check/,
      );
      const r = await pegar(
        '/perfis/visualizador/permissoes',
        { $top: '100' },
        await sessao('administrador'),
      );
      assert.equal(r.status, 200);
      assert.ok(
        (r.json.data ?? []).every((l) =>
          ['todos', 'vinculados', 'nenhum'].includes(String(l.escopo)),
        ),
      );
    });
    it('visibilidades do perfil (campo virtual permitido, no banco)', async () => {
      await oraculo(
        'visibilidades',
        '/perfis/gestor/visibilidades',
        'administrador',
      );
      const cookie = await sessao('administrador');
      const liberados = await pegar(
        '/perfis/gestor/visibilidades',
        { $filter: 'permitido eq true', $top: '100' },
        cookie,
      );
      const meus = (liberados.json.data ?? []).filter((l) =>
        definicoes.includes(Number(l.indicadorId)),
      );
      assert.equal(meus.length, 3);
      const restritos = await pegar(
        '/perfis/gestor/visibilidades',
        { $filter: 'permitido eq false', $top: '100' },
        cookie,
      );
      // Restrito explícito e ausência de linha contam como falso.
      assert.equal(
        (restritos.json.data ?? []).filter((l) =>
          definicoes.includes(Number(l.indicadorId)),
        ).length,
        2,
      );
      assert.equal(
        (
          await pegar(
            '/perfis/gestor/visibilidades',
            { $orderby: 'permitido asc' },
            cookie,
          )
        ).status,
        400,
      );
    });
    it('contatos', async () => {
      await oraculo(
        'contatos',
        `/empreendimentos/${empresa}/contatos`,
        'gestor',
        empresa,
      );
    });
    it('Cadastur', async () => {
      await oraculo(
        'cadastur',
        `/empreendimentos/${empresa}/cadastur`,
        'gestor',
        empresa,
      );
    });
    it('inventários', async () => {
      await oraculo(
        'inventarios',
        `/empreendimentos/${empresa}/inventarios`,
        'gestor',
        empresa,
      );
    });
    it('respostas', async () => {
      await oraculo(
        'respostas',
        `/empreendimentos/${empresa}/respostas`,
        'gestor',
        empresa,
      );
    });
    it('indicadores (só os liberados ao perfil)', async () => {
      await oraculo('indicadores', '/indicadores', 'gestor');
    });
  },
);
