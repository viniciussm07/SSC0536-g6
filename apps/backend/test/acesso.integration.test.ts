import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  PERMISSOES_INICIAIS,
  isAcessoAtual,
  isCodigoAtivacaoConta,
  isEmpreendimentoResumo,
  isIndicadorConsulta,
  isPaginatedResponse,
  type Perfil,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';
import { AutorizacaoService } from '../src/acesso/autorizacao.service';

const databaseUrl = process.env.DATABASE_TEST_URL;
describe('Autorização HTTP/PostgreSQL', { skip: !databaseUrl }, () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  const usuarios: number[] = [];
  const empresas: number[] = [];
  const definicoes: number[] = [];
  let periodoId: number;
  let modeloId: number;
  let pesquisaId: number;
  const perfis = new Map<Perfil, number>();
  const origem = 'http://localhost:5173';
  async function sessao(id: number) {
    const token = novoToken();
    await prisma.sessao.create({
      data: {
        tokenHash: hashToken(token),
        usuarioId: id,
        criadaEm: new Date(),
        expiraEm: new Date(Date.now() + 3600000),
      },
    });
    return `oto_sessao=${token}`;
  }
  function request(
    path: string,
    cookie?: string,
    method = 'GET',
    body?: unknown,
    contexto?: string | number,
  ) {
    return fetch(`${base}/api${path}`, {
      method,
      headers: {
        ...(contexto === undefined
          ? {}
          : { 'x-identification': String(contexto) }),
        Origin: origem,
        'Content-Type': 'application/json',
        'X-OTO-Request': '1',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  }
  async function codigoErro(res: Response) {
    const body = (await res.json()) as { error?: { code?: string } };
    return body.error?.code;
  }
  async function dados<T>(
    res: Response,
    guard: (value: unknown) => value is T,
  ): Promise<T> {
    const body = await res.json();
    assert.ok(
      typeof body === 'object' &&
        body !== null &&
        'data' in body &&
        guard(body.data),
    );
    return body.data;
  }
  async function empresasJson(res: Response) {
    const body = await res.json();
    assert.ok(isPaginatedResponse(body, isEmpreendimentoResumo));
    return body;
  }
  async function indicadoresJson(res: Response) {
    const body = await res.json();
    assert.ok(isPaginatedResponse(body, isIndicadorConsulta));
    return body;
  }
  async function admin() {
    return sessao(perfis.get('administrador')!);
  }
  async function regras(perfil: Perfil, permissoes: unknown[]) {
    return request(`/perfis/${perfil}/permissoes`, await admin(), 'PUT', {
      permissoes,
    });
  }
  before(async () => {
    assert.ok(databaseUrl);
    assert.match(new URL(databaseUrl).pathname, /\/[a-zA-Z0-9_]+_test$/);
    process.env.DATABASE_URL = databaseUrl;
    process.env.FRONTEND_URL = origem;
    process.env.AUTH_COOKIE_SECURE = 'false';
    const { AppModule } = await import('../src/app.module.js');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    prisma = app.get(PrismaService);
    for (const perfil of [
      'administrador',
      'gestor',
      'estagiario',
      'visualizador',
      'empresario',
    ] as const) {
      const usuario = await prisma.usuario.create({
        data: {
          nome: `Teste ${perfil}`,
          email: `acesso-${perfil}@example.test`,
          perfil,
        },
      });
      usuarios.push(usuario.id);
      perfis.set(perfil, usuario.id);
    }
    for (const nome of ['A', 'A2', 'B']) {
      empresas.push(
        (
          await prisma.empreendimento.create({
            data: {
              nomeFantasia: `Hotel fictício ${nome}`,
              // Somente o primeiro tem CNPJ; os demais provam que "não informado" é null.
              cnpj: nome === 'A' ? '11222333000181' : null,
              situacao: 'ativo',
            },
          })
        ).id,
      );
    }
    await prisma.usuarioEmpreendimento.createMany({
      data: empresas.slice(0, 2).map((empreendimentoId) => ({
        usuarioId: perfis.get('empresario')!,
        empreendimentoId,
      })),
    });
    for (const empreendimentoId of empresas) {
      await prisma.inventarioVersao.create({
        data: {
          empreendimentoId,
          criadaPor: perfis.get('gestor')!,
          vigenciaInicio: new Date('2026-01-01'),
          tipoAlteracao: 'mudanca_real',
          situacaoConferencia: 'pendente',
          totalUh: 10,
        },
      });
    }
    modeloId = (
      await prisma.pesquisaModelo.create({
        data: { nome: 'Modelo fictício', publicoAlvo: 'hotelaria' },
      })
    ).id;
    pesquisaId = (
      await prisma.pesquisa.create({
        data: {
          modeloId,
          titulo: 'Pesquisa fictícia',
          tipoColeta: 'consolidado',
          abertura: new Date(),
          prazo: new Date(),
          status: 'aberta',
        },
      })
    ).id;
    await prisma.resposta.createMany({
      data: empresas.map((empreendimentoId) => ({
        pesquisaId,
        empreendimentoId,
        usuarioId: perfis.get('gestor')!,
        respondidaEm: new Date(),
        canal: 'sistema',
      })),
    });
    periodoId = (
      await prisma.periodo.create({
        data: {
          tipo: 'mes',
          rotulo: 'Teste',
          dataInicio: new Date('2026-01-01'),
          dataFim: new Date('2026-01-31'),
        },
      })
    ).id;
    for (const codigo of ['liberado', 'restrito']) {
      const definicao = await prisma.indicadorDefinicao.create({
        data: {
          codigo: `acesso-${codigo}`,
          nome: codigo,
          unidade: '%',
          formulaDescricao: 'Demonstração fictícia',
          versaoFormula: 1,
        },
      });
      definicoes.push(definicao.id);
      await prisma.indicadorResultado.create({
        data: {
          definicaoId: definicao.id,
          periodoId,
          tipoColeta: 'consolidado',
          recorte: 'total',
          metodo: 'aritmetica',
          valor: '12.345',
          calculadoEm: new Date(),
        },
      });
    }
  });
  after(async () => {
    if (prisma)
      await prisma.$transaction(async (tx) => {
        await tx.permissaoPerfil.deleteMany();
        await tx.permissaoPerfil.createMany({ data: [...PERMISSOES_INICIAIS] });
        await tx.visibilidadeIndicadorPerfil.deleteMany({
          where: { indicadorId: { in: definicoes } },
        });
        await tx.indicadorResultado.deleteMany({
          where: { definicaoId: { in: definicoes } },
        });
        await tx.indicadorDefinicao.deleteMany({
          where: { id: { in: definicoes } },
        });
        if (periodoId) await tx.periodo.delete({ where: { id: periodoId } });
        await tx.resposta.deleteMany({
          where: { empreendimentoId: { in: empresas } },
        });
        if (pesquisaId) await tx.pesquisa.delete({ where: { id: pesquisaId } });
        if (modeloId)
          await tx.pesquisaModelo.delete({ where: { id: modeloId } });
        await tx.inventarioVersao.deleteMany({
          where: { empreendimentoId: { in: empresas } },
        });
        await tx.usuarioEmpreendimento.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await tx.empreendimento.deleteMany({ where: { id: { in: empresas } } });
        await tx.sessao.deleteMany({ where: { usuarioId: { in: usuarios } } });
        await tx.ativacaoConta.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await tx.credencialLocal.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await tx.auditoria.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
      });
    await app?.close();
  });
  it('contexto de entidade: exigido, validado e divergência rejeitada sem expor dados', async () => {
    const empresario = await sessao(perfis.get('empresario')!);
    const [a, b] = empresas;
    const cabecalho = codigoErro;
    for (const suffix of ['', '/inventarios', '/respostas']) {
      const caminho = `/empreendimentos/${a}${suffix}`;
      assert.equal(
        await cabecalho(await request(caminho, empresario)),
        'CONTEXTO_OBRIGATORIO',
      );
      for (const invalido of ['', '0', '-1', '1.5', 'abc', '99999999999'])
        assert.equal(
          await cabecalho(
            await request(caminho, empresario, 'GET', undefined, invalido),
          ),
          'CONTEXTO_INVALIDO',
        );
      const divergente = await request(
        caminho,
        empresario,
        'GET',
        undefined,
        b,
      );
      assert.equal(divergente.status, 409);
      assert.equal(await cabecalho(divergente), 'CONTEXTO_DIVERGENTE');
    }
    // Gestor (escopo global) também precisa do contexto para dados de uma entidade.
    const gestor = await sessao(perfis.get('gestor')!);
    assert.equal((await request(`/empreendimentos/${a}`, gestor)).status, 400);
    assert.equal(
      (await request(`/empreendimentos/${a}`, gestor, 'GET', undefined, a))
        .status,
      200,
    );
    assert.equal(
      (
        await request(
          `/empreendimentos/${empresas[2]}`,
          gestor,
          'GET',
          undefined,
          empresas[2],
        )
      ).status,
      200,
    );
    // Gestor exporta o conjunto global sem contexto e apenas a entidade com contexto.
    const global = await empresasJson(
      await request('/empreendimentos/exportacoes', gestor),
    );
    assert.ok(global.data.length >= empresas.length);
    const unico = await empresasJson(
      await request(
        '/empreendimentos/exportacoes',
        gestor,
        'GET',
        undefined,
        a,
      ),
    );
    assert.deepEqual(
      unico.data.map((e: { id: number }) => e.id),
      [a],
    );
    // Contexto inexistente: 404 (nada é confirmado) e o catálogo de seleção ignora o contexto.
    assert.equal(
      (
        await request(
          '/empreendimentos/2147483647',
          gestor,
          'GET',
          undefined,
          2147483647,
        )
      ).status,
      404,
    );
    const catalogo = await empresasJson(
      await request('/empreendimentos', gestor, 'GET', undefined, a),
    );
    assert.ok(catalogo.data.length >= empresas.length);
    // Busca por nome é limitada ao escopo autorizado.
    const nome = (
      await prisma.empreendimento.findUniqueOrThrow({ where: { id: a } })
    ).nomeFantasia;
    const busca = await empresasJson(
      await request(
        `/empreendimentos?busca=${encodeURIComponent(nome.slice(1, 6).toUpperCase())}`,
        empresario,
      ),
    );
    assert.ok(busca.data.every((e: { id: number }) => [a, b].includes(e.id)));
    // CNPJ é devolvido como cadastrado (ou null) no catálogo, no detalhe e nos vínculos.
    const porId = new Map(
      catalogo.data.map((e: { id: number; cnpj: string | null }) => [
        e.id,
        e.cnpj,
      ]),
    );
    assert.equal(porId.get(a), '11222333000181');
    assert.equal(porId.get(b), null);
    const detalhe = (await (
      await request(`/empreendimentos/${a}`, empresario, 'GET', undefined, a)
    ).json()) as { data: { cnpj: string | null } };
    assert.equal(detalhe.data.cnpj, '11222333000181');
    const atual = await dados(
      await request('/acessos/atual', empresario),
      isAcessoAtual,
    );
    assert.deepEqual(
      atual.vinculos.map((v) => [v.empreendimentoId, v.cnpj]),
      [
        [a, '11222333000181'],
        [b, null],
      ],
    );
    // A busca também encontra pelo CNPJ.
    const porCnpj = await empresasJson(
      await request('/empreendimentos?busca=11222333', gestor),
    );
    assert.deepEqual(
      porCnpj.data.map((e: { id: number }) => e.id),
      [a],
    );
    // Indicadores são da visão geral e ignoram o cabeçalho.
    assert.equal(
      (await request('/indicadores', gestor, 'GET', undefined, a)).status,
      200,
    );
  });
  it('migration instala exatamente a matriz aprovada da POC e não libera acesso anônimo', async () => {
    const atual = await prisma.permissaoPerfil.findMany();
    const ordenar = (rows: object[]) =>
      rows.map((row) => JSON.stringify(row, Object.keys(row).sort())).sort();
    assert.deepEqual(ordenar(atual), ordenar([...PERMISSOES_INICIAIS]));
    for (const path of [
      '/contas',
      '/empreendimentos',
      '/indicadores',
      '/indicadores/exportacoes',
    ])
      assert.equal((await request(path)).status, 401);
    assert.equal(
      (await request('/contas', await sessao(perfis.get('visualizador')!)))
        .status,
      403,
    );
    assert.equal(
      (await request('/contas', await sessao(perfis.get('gestor')!))).status,
      403,
    );
    assert.equal(
      (await request('/empreendimentos?pageSize=101', await admin())).status,
      400,
    );
  });
  it('empresário consulta múltiplos vínculos; IDs estrangeiros não revelam inventários ou respostas', async () => {
    const cookie = await sessao(perfis.get('empresario')!);
    const lista = await empresasJson(await request('/empreendimentos', cookie));
    assert.deepEqual(
      lista.data.map((e: { id: number }) => e.id),
      empresas.slice(0, 2),
    );
    assert.equal(lista.meta.total, 2);
    const acesso = await dados(
      await request('/acessos/atual', cookie),
      isAcessoAtual,
    );
    assert.equal(acesso.vinculos.length, 2);
    for (const suffix of ['', '/inventarios', '/respostas']) {
      assert.equal(
        (
          await request(
            `/empreendimentos/${empresas[0]}${suffix}`,
            cookie,
            'GET',
            undefined,
            empresas[0],
          )
        ).status,
        200,
      );
      // Vínculo e escopo são decididos antes do contexto: nada revela IDs estrangeiros.
      assert.equal(
        (
          await request(
            `/empreendimentos/${empresas[2]}${suffix}`,
            cookie,
            'GET',
            undefined,
            empresas[2],
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await request(
            `/empreendimentos/${empresas[2]}${suffix}`,
            cookie,
            'GET',
            undefined,
            empresas[0],
          )
        ).status,
        404,
      );
    }
    assert.equal(
      (await request('/empreendimentos/exportacoes', cookie)).status,
      403,
    );
    const regrasAtuais = PERMISSOES_INICIAIS.filter(
      (p) => p.perfil === 'empresario',
    ).map(({ recurso, acao, escopo }) => ({ recurso, acao, escopo }));
    assert.equal(
      (
        await regras('empresario', [
          ...regrasAtuais,
          {
            recurso: 'empreendimentos',
            acao: 'exportar',
            escopo: 'vinculados',
          },
        ])
      ).status,
      200,
    );
    assert.equal((await request('/empreendimentos', cookie)).status, 401);
    const novo = await sessao(perfis.get('empresario')!);
    const semContexto = await request('/empreendimentos/exportacoes', novo);
    assert.equal(semContexto.status, 400);
    assert.equal(await codigoErro(semContexto), 'CONTEXTO_OBRIGATORIO');
    const exportado = await empresasJson(
      await request(
        '/empreendimentos/exportacoes',
        novo,
        'GET',
        undefined,
        empresas[1],
      ),
    );
    assert.deepEqual(
      exportado.data.map((e: { id: number }) => e.id),
      [empresas[1]],
    );
    assert.equal(
      (
        await request(`/contas/${perfis.get('gestor')}`, novo, 'PUT', {
          perfil: 'administrador',
          ativo: true,
        })
      ).status,
      403,
    );
  });
  it('mudança de vínculo revoga sessão e retira o empreendimento; autoria não vem do payload', async () => {
    const id = perfis.get('empresario')!;
    const cookie = await sessao(id);
    const caminho = `/contas/${id}/vinculos/${empresas[0]}`;
    const ator = await admin();
    assert.equal(
      (
        await request(caminho, ator, 'PUT', {
          ativo: false,
          usuarioId: perfis.get('gestor'),
        })
      ).status,
      400,
    );
    assert.equal(
      (await request(caminho, ator, 'PUT', { ativo: false })).status,
      200,
    );
    assert.equal((await request('/empreendimentos', cookie)).status, 401);
    const novo = await sessao(id);
    assert.equal(
      (
        await request(
          `/empreendimentos/${empresas[0]}`,
          novo,
          'GET',
          undefined,
          empresas[0],
        )
      ).status,
      404,
    );
    const lista = await empresasJson(await request('/empreendimentos', novo));
    assert.deepEqual(
      lista.data.map((e: { id: number }) => e.id),
      [empresas[1]],
    );
    const auditoria = await prisma.auditoria.findFirstOrThrow({
      where: { entidade: 'usuario_empreendimento', entidadeId: id },
    });
    assert.equal(auditoria.usuarioId, perfis.get('administrador'));
  });
  it('rejeita ampliação indevida e bloqueio da administração sem alterar a política', async () => {
    const revisao = await prisma.politicaAcesso.findUniqueOrThrow({
      where: { id: 1 },
    });
    assert.equal(
      (
        await regras('empresario', [
          { recurso: 'empreendimentos', acao: 'consultar', escopo: 'todos' },
        ])
      ).status,
      400,
    );
    assert.equal(
      (
        await regras('visualizador', [
          { recurso: 'indicadores', acao: 'alterar', escopo: 'todos' },
        ])
      ).status,
      400,
    );
    assert.equal(
      (
        await regras('estagiario', [
          { recurso: 'publicacoes', acao: 'publicar', escopo: 'todos' },
        ])
      ).status,
      400,
    );
    assert.equal((await regras('administrador', [])).status, 409);
    assert.equal(
      (
        await request(
          `/contas/${perfis.get('administrador')}`,
          await admin(),
          'PUT',
          { perfil: 'gestor', ativo: false },
        )
      ).status,
      409,
    );
    assert.deepEqual(
      await prisma.politicaAcesso.findUniqueOrThrow({ where: { id: 1 } }),
      revisao,
    );
  });
  it('indicador exige liberação explícita por perfil, inclusive na exportação e para administrador', async () => {
    const viewer = perfis.get('visualizador')!;
    let cookie = await sessao(viewer);
    assert.deepEqual(
      (await indicadoresJson(await request('/indicadores', cookie))).data,
      [],
    );
    assert.deepEqual(
      (await indicadoresJson(await request('/indicadores', await admin())))
        .data,
      [],
    );
    const caminho = `/perfis/visualizador/visibilidades/${definicoes[0]}`;
    assert.equal(
      (await request(caminho, await admin(), 'PUT', { permitido: true }))
        .status,
      200,
    );
    assert.equal((await request('/indicadores', cookie)).status, 401);
    cookie = await sessao(viewer);
    const liberados = await indicadoresJson(
      await request('/indicadores', cookie),
    );
    assert.equal(liberados.data.length, 1);
    assert.equal(liberados.data[0].valor, '12.345');
    assert.equal(liberados.data[0].indicadorId, definicoes[0]);
    assert.equal(
      (await request('/indicadores/exportacoes', cookie)).status,
      403,
    );
    assert.equal(
      (
        await regras('visualizador', [
          { recurso: 'indicadores', acao: 'consultar', escopo: 'todos' },
          { recurso: 'indicadores', acao: 'exportar', escopo: 'todos' },
        ])
      ).status,
      200,
    );
    cookie = await sessao(viewer);
    assert.deepEqual(
      (await indicadoresJson(await request('/indicadores/exportacoes', cookie)))
        .data,
      liberados.data,
    );
    assert.equal(
      (await request(caminho, await admin(), 'PUT', { permitido: false }))
        .status,
      200,
    );
    assert.equal(
      (await request('/indicadores/exportacoes', cookie)).status,
      401,
    );
    assert.deepEqual(
      (
        await indicadoresJson(
          await request('/indicadores/exportacoes', await sessao(viewer)),
        )
      ).data,
      [],
    );
  });
  it('admin cria e recupera conta, revoga acesso por perfil/inativação e não expõe segredos nas listagens/auditoria', async () => {
    const ator = await admin();
    const res = await request('/contas', ator, 'POST', {
      nome: 'Pessoa fictícia',
      email: 'acesso-nova@example.test',
      perfil: 'empresario',
    });
    assert.equal(res.status, 201);
    const data = await dados(res, isCodigoAtivacaoConta);
    usuarios.push(data.usuarioId);
    assert.match(data.token, /^[a-f0-9]{64}$/);
    assert.equal(
      (
        await request('/contas', ator, 'POST', {
          nome: 'Outra',
          email: 'acesso-nova@example.test',
          perfil: 'gestor',
        })
      ).status,
      409,
    );
    const cookie = await sessao(data.usuarioId);
    assert.equal(
      (
        await request(`/contas/${data.usuarioId}`, ator, 'PUT', {
          perfil: 'visualizador',
          ativo: true,
        })
      ).status,
      200,
    );
    assert.equal((await request('/acessos/atual', cookie)).status, 401);
    const novo = await sessao(data.usuarioId);
    const recuperacao = await request(
      `/contas/${data.usuarioId}/ativacoes`,
      ator,
      'POST',
      {},
    );
    assert.equal(recuperacao.status, 201);
    const codigo = (await dados(recuperacao, isCodigoAtivacaoConta)).token;
    assert.notEqual(codigo, data.token);
    assert.equal((await request('/acessos/atual', novo)).status, 401);
    assert.ok(
      (
        await prisma.ativacaoConta.findUniqueOrThrow({
          where: { tokenHash: hashToken(data.token) },
        })
      ).usadaEm,
    );
    assert.equal(
      (
        await request(`/contas/${data.usuarioId}`, ator, 'PUT', {
          perfil: 'visualizador',
          ativo: false,
        })
      ).status,
      200,
    );
    assert.equal(
      (await request('/acessos/atual', await sessao(data.usuarioId))).status,
      401,
    );
    const listagem = await (await request('/contas', ator)).text();
    const auditoria = JSON.stringify(
      await prisma.auditoria.findMany({
        where: { usuarioId: perfis.get('administrador') },
      }),
    );
    for (const texto of [listagem, auditoria]) {
      assert.ok(!texto.includes(data.token));
      assert.ok(!texto.includes(codigo));
      assert.ok(!texto.includes('tokenHash'));
      assert.ok(!texto.includes('senhaHash'));
    }
  });
  it('erro após escrita e auditoria reverte também a revisão e preserva sessão', async () => {
    const token = (await admin()).split('=')[1];
    const autorizacao = app.get(AutorizacaoService);
    const contexto = await autorizacao.identificar(token);
    const id = perfis.get('gestor')!;
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    const politica = await prisma.politicaAcesso.findUniqueOrThrow({
      where: { id: 1 },
    });
    const total = await prisma.auditoria.count();
    await assert.rejects(
      autorizacao.alterar(contexto, 'contas', 'alterar', async (tx) => {
        await tx.usuario.update({ where: { id }, data: { ativo: false } });
        await tx.auditoria.create({
          data: {
            usuarioId: contexto.usuario.id,
            entidade: 'conta',
            entidadeId: id,
            acao: 'alterar',
            depois: { ativo: false },
            em: new Date(),
          },
        });
        throw new Error('Falha simulada antes do commit');
      }),
      /Falha simulada/,
    );
    assert.deepEqual(
      await prisma.usuario.findUniqueOrThrow({ where: { id } }),
      antes,
    );
    assert.deepEqual(
      await prisma.politicaAcesso.findUniqueOrThrow({ where: { id: 1 } }),
      politica,
    );
    assert.equal(await prisma.auditoria.count(), total);
    assert.equal((await request('/contas', `oto_sessao=${token}`)).status, 200);
  });
  it('dois administradores concorrentes não desativam ambos nem usam sessão revogada', async () => {
    const primeiro = perfis.get('administrador')!;
    const segundo = (
      await prisma.usuario.create({
        data: {
          nome: 'Outro admin fictício',
          email: 'acesso-admin2@example.test',
          perfil: 'administrador',
        },
      })
    ).id;
    usuarios.push(segundo);
    const c1 = await sessao(primeiro);
    const c2 = await sessao(segundo);
    const resultados = await Promise.all([
      request(`/contas/${segundo}`, c1, 'PUT', {
        perfil: 'administrador',
        ativo: false,
      }),
      request(`/contas/${primeiro}`, c2, 'PUT', {
        perfil: 'administrador',
        ativo: false,
      }),
    ]);
    assert.deepEqual(resultados.map((r) => r.status).sort(), [200, 401]);
    assert.equal(
      await prisma.usuario.count({
        where: { id: { in: [primeiro, segundo] }, ativo: true },
      }),
      1,
    );
  });
});
