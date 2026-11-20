import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  isDestinatarioLinha,
  isPesquisaDetalhe,
  isPesquisaLinha,
  type PesquisaDetalhe,
  type Perfil,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';
import { exigirRecebimento } from '../src/pesquisas/recebimento';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  meta?: { top?: number; skip?: number; total?: number };
  error?: { code: string; details?: { field?: string; message?: string }[] };
}

const DIA = 86_400_000;
const dia = (deslocamento: number) =>
  new Date(Date.now() + deslocamento * DIA).toISOString().slice(0, 10);
const instante = (deslocamentoMs: number) =>
  new Date(Date.now() + deslocamentoMs).toISOString();
const codigo = (erro: unknown) =>
  (erro as { getResponse(): { error: { code: string } } }).getResponse().error
    .code;

describe('Edições de pesquisa HTTP/PostgreSQL', { skip: !databaseUrl }, () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  const origem = 'http://localhost:5173';
  const perfis = new Map<Perfil, number>();
  const usuarios: number[] = [];
  const pesquisas: number[] = [];
  const periodos: number[] = [];
  const empreendimentos: number[] = [];
  let segmentoId = 0;
  let modeloId = 0;
  let passado = 0;
  let futuro = 0;
  const [ativo1, ativo2, encerrado] = [0, 1, 2];

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
  async function chamar(
    caminho: string,
    cookie: string,
    metodo = 'GET',
    corpo?: unknown,
  ) {
    const r = await fetch(`${base}/api${caminho}`, {
      method: metodo,
      headers: {
        Origin: origem,
        Cookie: cookie,
        'X-OTO-Request': '1',
        // Escritas exigem JSON (defesa de origem), mesmo sem corpo.
        ...(metodo !== 'GET' ? { 'content-type': 'application/json' } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
    const texto = await r.text();
    return {
      status: r.status,
      json: (texto ? JSON.parse(texto) : {}) as Corpo,
    };
  }
  async function criarRascunho(cookie: string, extra: object = {}) {
    const r = await chamar('/pesquisas', cookie, 'POST', {
      titulo: 'Consolidado de teste',
      tipoColeta: 'consolidado',
      modeloId,
      periodoIds: [passado],
      abertura: instante(-DIA),
      prazo: instante(7 * DIA),
      segmentoIds: [segmentoId],
      ...extra,
    });
    if (r.status === 201) pesquisas.push((r.json.data as { id: number }).id);
    return r;
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
    for (const perfil of ['administrador', 'gestor', 'estagiario'] as const) {
      const u = await prisma.usuario.create({
        data: {
          nome: `Edições ${perfil}`,
          email: `edicoes-${perfil}@example.test`,
          perfil,
        },
      });
      usuarios.push(u.id);
      perfis.set(perfil, u.id);
    }
    // Público isolado por um segmento próprio do teste.
    const segmento = await prisma.segmento.create({
      data: {
        chave: `teste.edicoes.${Date.now()}`,
        nome: 'Segmento de teste das edições',
        nivelCadastro: 'basico',
      },
    });
    segmentoId = segmento.id;
    for (const [nome, situacao] of [
      ['Pousada Fictícia A', 'ativo'],
      ['Hotel Fictício B', 'ativo'],
      ['Hotel Fictício Encerrado', 'encerrado'],
    ] as const) {
      const e = await prisma.empreendimento.create({
        data: {
          nomeFantasia: nome,
          situacao,
          segmentos: { create: { segmentoId } },
        },
      });
      empreendimentos.push(e.id);
    }
    // Feriados curtos com datas relativas: passado (consolidado) e futuro (expectativa).
    for (const [inicio, fim] of [
      [-40, -38],
      [40, 43],
    ]) {
      const p = await prisma.periodo.create({
        data: {
          tipo: 'feriado_prolongado',
          rotulo: `Feriado de teste ${inicio}`,
          dataInicio: new Date(`${dia(inicio)}T00:00:00Z`),
          dataFim: new Date(`${dia(fim)}T00:00:00Z`),
        },
      });
      periodos.push(p.id);
    }
    [passado, futuro] = periodos;
    const gestor = await sessao('gestor');
    const modelo = await chamar('/modelos-pesquisa', gestor, 'POST', {
      nome: 'Modelo de teste das edições',
      publicoAlvo: 'Meios de hospedagem',
      campos: [
        {
          chave: 'ocupacao',
          rotulo: 'Ocupação (%)',
          tipoValor: 'percentual',
          obrigatorio: true,
          ordem: 1,
        },
        {
          chave: 'observacao',
          rotulo: 'Observação',
          tipoValor: 'texto',
          obrigatorio: false,
          ordem: 2,
        },
      ],
    });
    assert.equal(modelo.status, 201);
    modeloId = (modelo.json.data as { id: number }).id;
  });

  after(async () => {
    if (prisma) {
      await prisma.$transaction(async (tx) => {
        const ids = { in: pesquisas };
        await tx.pesquisaEvento.deleteMany({ where: { pesquisaId: ids } });
        await tx.pesquisaDestinatario.deleteMany({
          where: { pesquisaId: ids },
        });
        await tx.resposta.deleteMany({ where: { pesquisaId: ids } });
        await tx.pesquisaPergunta.deleteMany({ where: { pesquisaId: ids } });
        await tx.pesquisa.deleteMany({ where: { id: ids } });
        await tx.$executeRaw`ALTER TABLE pesquisa_campo_versao DISABLE TRIGGER pesquisa_campo_versao_imutavel`;
        await tx.$executeRaw`ALTER TABLE pesquisa_modelo_versao DISABLE TRIGGER pesquisa_modelo_versao_imutavel`;
        await tx.pesquisaCampoVersao.deleteMany({ where: { modeloId } });
        await tx.pesquisaModeloVersao.deleteMany({ where: { modeloId } });
        await tx.$executeRaw`ALTER TABLE pesquisa_campo_versao ENABLE TRIGGER pesquisa_campo_versao_imutavel`;
        await tx.$executeRaw`ALTER TABLE pesquisa_modelo_versao ENABLE TRIGGER pesquisa_modelo_versao_imutavel`;
        await tx.pesquisaCampo.deleteMany({ where: { modeloId } });
        await tx.pesquisaModelo.deleteMany({ where: { id: modeloId } });
        await tx.periodo.deleteMany({ where: { id: { in: periodos } } });
        await tx.empreendimentoSegmento.deleteMany({ where: { segmentoId } });
        await tx.empreendimento.deleteMany({
          where: { id: { in: empreendimentos } },
        });
        await tx.segmento.deleteMany({ where: { id: segmentoId } });
        await tx.sessao.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await tx.$executeRaw`ALTER TABLE auditoria DISABLE TRIGGER auditoria_imutavel`;
        await tx.auditoria.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await tx.$executeRaw`ALTER TABLE auditoria ENABLE TRIGGER auditoria_imutavel`;
        await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
      });
    }
    await app?.close();
  });

  it('gestão global nega escopo vinculado em leitura, CSV e mutações', async () => {
    const gestor = await sessao('gestor');
    const criado = await criarRascunho(gestor);
    assert.equal(criado.status, 201);
    const id = (criado.json.data as PesquisaDetalhe).id;
    const regras = await prisma.permissaoPerfil.findMany({
      where: { perfil: 'gestor', recurso: 'pesquisas' },
    });
    await prisma.usuarioEmpreendimento.create({
      data: {
        usuarioId: perfis.get('gestor')!,
        empreendimentoId: empreendimentos[ativo1],
        ativo: true,
      },
    });
    try {
      await prisma.permissaoPerfil.updateMany({
        where: {
          perfil: 'gestor',
          recurso: 'pesquisas',
          acao: { in: ['consultar', 'exportar', 'criar', 'alterar'] },
        },
        data: { escopo: 'vinculados' },
      });
      for (const [caminho, metodo, corpo] of [
        ['/pesquisas', 'GET', undefined],
        ['/pesquisas/exportacoes', 'GET', undefined],
        [`/pesquisas/${id}`, 'GET', undefined],
        [`/pesquisas/${id}/destinatarios`, 'GET', undefined],
        [`/pesquisas/${id}/destinatarios/exportacoes`, 'GET', undefined],
        ['/pesquisas', 'POST', {}],
        [`/pesquisas/${id}`, 'PUT', { titulo: 'Não autorizado' }],
        [`/pesquisas/${id}/abertura`, 'POST', {}],
        [`/pesquisas/${id}/encerramento`, 'POST', {}],
        [`/pesquisas/${id}`, 'DELETE', undefined],
      ] as const)
        assert.equal(
          (await chamar(caminho, gestor, metodo, corpo)).status,
          403,
          `${metodo} ${caminho}`,
        );
      assert.equal(
        (await prisma.pesquisa.findUniqueOrThrow({ where: { id } })).titulo,
        'Consolidado de teste',
      );
    } finally {
      for (const regra of regras)
        await prisma.permissaoPerfil.update({
          where: {
            perfil_recurso_acao: {
              perfil: regra.perfil,
              recurso: regra.recurso,
              acao: regra.acao,
            },
          },
          data: { escopo: regra.escopo },
        });
      await prisma.usuarioEmpreendimento.delete({
        where: {
          usuarioId_empreendimentoId: {
            usuarioId: perfis.get('gestor')!,
            empreendimentoId: empreendimentos[ativo1],
          },
        },
      });
    }
  });

  it('rascunho congela a versão vigente, gera perguntas e valida períodos', async () => {
    const gestor = await sessao('gestor');
    const estagiario = await sessao('estagiario');

    const incompativel = await criarRascunho(gestor, { periodoIds: [futuro] });
    assert.equal(incompativel.status, 400);
    assert.equal(incompativel.json.error?.details?.[0]?.field, 'periodoIds');

    const negado = await criarRascunho(estagiario);
    assert.equal(negado.status, 403);

    const criado = await criarRascunho(gestor);
    assert.equal(criado.status, 201);
    assert.ok(isPesquisaDetalhe(criado.json.data));
    const d = criado.json.data as PesquisaDetalhe;
    assert.equal(d.status, 'rascunho');
    assert.equal(d.situacao, 'rascunho');
    assert.equal(d.modeloVersao, 1);
    assert.deepEqual(
      d.perguntas.map((p) => p.chave),
      ['ocupacao', 'observacao'],
    );
    assert.deepEqual(d.participacao, {
      elegiveis: 2,
      destinatarios: null,
      respondentes: 0,
      pendentes: null,
    });

    const lista = await chamar(
      `/pesquisas?$filter=id eq ${d.id}&$count=true`,
      estagiario,
    );
    assert.equal(lista.status, 200);
    assert.equal(lista.json.meta?.total, 1);
    assert.ok((lista.json.data as unknown[]).every(isPesquisaLinha));

    // Rascunho troca o tipo e o período; as perguntas são regeneradas.
    const trocado = await chamar(`/pesquisas/${d.id}`, gestor, 'PUT', {
      tipoColeta: 'expectativa',
      periodoIds: [futuro],
    });
    assert.equal(trocado.status, 200);
    const t = trocado.json.data as PesquisaDetalhe;
    assert.deepEqual(
      t.periodos.map((p) => p.id),
      [futuro],
    );
    assert.ok(t.perguntas.every((p) => p.periodoId === futuro));

    const auditoria = await prisma.auditoria.findMany({
      where: { entidade: 'pesquisa', entidadeId: d.id },
      orderBy: { id: 'asc' },
    });
    assert.deepEqual(
      auditoria.map((a) => a.acao),
      ['criar', 'alterar'],
    );

    // Rascunho é excluível; nada fica para trás.
    const excluido = await chamar(`/pesquisas/${d.id}`, gestor, 'DELETE');
    assert.equal(excluido.status, 204);
    assert.equal(await prisma.pesquisa.count({ where: { id: d.id } }), 0);
  });

  it('abre congelando o público, grava um evento e bloqueia mudanças estruturais', async () => {
    const gestor = await sessao('gestor');
    const r = await criarRascunho(gestor);
    const id = (r.json.data as PesquisaDetalhe).id;
    const antes = Date.now();

    const aberta = await chamar(`/pesquisas/${id}/abertura`, gestor, 'POST');
    assert.equal(aberta.status, 200);
    const d = aberta.json.data as PesquisaDetalhe;
    assert.equal(d.status, 'aberta');
    assert.equal(d.situacao, 'recebendo');
    assert.ok(Date.parse(d.abertura) >= antes - 1000);
    assert.deepEqual(d.participacao, {
      elegiveis: 2,
      destinatarios: 2,
      respondentes: 0,
      pendentes: 2,
    });

    const repetida = await chamar(`/pesquisas/${id}/abertura`, gestor, 'POST');
    assert.equal(repetida.status, 409);
    assert.equal(repetida.json.error?.code, 'PESQUISA_ESTADO_INVALIDO');
    assert.equal(
      await prisma.pesquisaEvento.count({
        where: { pesquisaId: id, tipo: 'aberta', processadoEm: null },
      }),
      1,
    );

    // Novo empreendimento ativo depois da abertura não muda o denominador.
    const tardio = await prisma.empreendimento.create({
      data: {
        nomeFantasia: 'Hotel Fictício Tardio',
        situacao: 'ativo',
        segmentos: { create: { segmentoId } },
      },
    });
    empreendimentos.push(tardio.id);
    const depois = await chamar(`/pesquisas/${id}`, gestor);
    assert.equal(
      (depois.json.data as PesquisaDetalhe).participacao.destinatarios,
      2,
    );
    // Isola os próximos casos: o tardio sai do público elegível.
    await prisma.empreendimento.update({
      where: { id: tardio.id },
      data: { situacao: 'encerrado' },
    });

    const bloqueado = await chamar(`/pesquisas/${id}`, gestor, 'PUT', {
      tipoColeta: 'expectativa',
      segmentoIds: [],
    });
    assert.equal(bloqueado.status, 409);
    assert.equal(bloqueado.json.error?.code, 'PESQUISA_CAMPO_BLOQUEADO');
    assert.deepEqual(
      bloqueado.json.error?.details?.map((x) => x.field),
      ['tipoColeta', 'segmentoIds'],
    );

    const novoPrazo = instante(10 * DIA);
    const prorrogada = await chamar(`/pesquisas/${id}`, gestor, 'PUT', {
      prazo: novoPrazo,
      motivo: 'Prorrogação fictícia',
    });
    assert.equal(prorrogada.status, 200);
    assert.equal((prorrogada.json.data as PesquisaDetalhe).prazo, novoPrazo);
    const registro = await prisma.auditoria.findFirst({
      where: { entidade: 'pesquisa', entidadeId: id },
      orderBy: { id: 'desc' },
    });
    assert.equal(
      (registro?.depois as { motivo?: string } | null)?.motivo,
      'Prorrogação fictícia',
    );

    // Campo usado pela edição não sai do modelo.
    const modelo = await chamar(
      `/modelos-pesquisa/${modeloId}`,
      gestor,
      'PUT',
      {
        campos: [
          {
            chave: 'ocupacao',
            rotulo: 'Ocupação (%)',
            tipoValor: 'percentual',
            obrigatorio: true,
            ordem: 1,
          },
        ],
      },
    );
    assert.equal(modelo.status, 409);
    assert.equal(modelo.json.error?.code, 'CAMPO_EM_USO');
  });

  it('acompanha respondentes e pendentes; recebimento respeita janela e público', async () => {
    const gestor = await sessao('gestor');
    const r = await criarRascunho(gestor, {
      abertura: instante(DIA),
      prazo: instante(3 * DIA),
    });
    const id = (r.json.data as PesquisaDetalhe).id;
    const aberta = await chamar(`/pesquisas/${id}/abertura`, gestor, 'POST');
    assert.equal((aberta.json.data as PesquisaDetalhe).situacao, 'agendada');

    // Agendada não recebe; dentro da janela recebe só destinatários.
    await assert.rejects(
      prisma.$transaction((tx) =>
        exigirRecebimento(tx, id, empreendimentos[ativo1]),
      ),
      (e) => codigo(e) === 'PESQUISA_FORA_DO_PRAZO',
    );
    const dentro = new Date(Date.now() + 2 * DIA);
    await prisma.$transaction((tx) =>
      exigirRecebimento(tx, id, empreendimentos[ativo1], () => dentro),
    );
    await assert.rejects(
      prisma.$transaction((tx) =>
        exigirRecebimento(tx, id, empreendimentos[encerrado], () => dentro),
      ),
      (e) => codigo(e) === 'PESQUISA_NAO_DESTINATARIO',
    );
    await assert.rejects(
      prisma.$transaction((tx) =>
        exigirRecebimento(
          tx,
          id,
          empreendimentos[ativo1],
          () => new Date(Date.now() + 4 * DIA),
        ),
      ),
      (e) => codigo(e) === 'PESQUISA_FORA_DO_PRAZO',
    );

    const respondidaEm = new Date();
    await prisma.resposta.create({
      data: {
        pesquisaId: id,
        empreendimentoId: empreendimentos[ativo1],
        usuarioId: perfis.get('gestor')!,
        respondidaEm,
        canal: 'sistema',
      },
    });
    const detalhe = await chamar(`/pesquisas/${id}`, gestor);
    assert.deepEqual((detalhe.json.data as PesquisaDetalhe).participacao, {
      elegiveis: 2,
      destinatarios: 2,
      respondentes: 1,
      pendentes: 1,
    });

    const pendentes = await chamar(
      `/pesquisas/${id}/destinatarios?$filter=situacaoResposta eq 'pendente'&$count=true`,
      gestor,
    );
    assert.equal(pendentes.status, 200);
    assert.equal(pendentes.json.meta?.total, 1);
    const [pendente] = pendentes.json.data as unknown[];
    assert.ok(isDestinatarioLinha(pendente));
    assert.equal(
      (pendente as { empreendimentoId: number }).empreendimentoId,
      empreendimentos[ativo2],
    );

    const respondeu = await chamar(
      `/pesquisas/${id}/destinatarios?$filter=respondidaEm ge ${new Date(respondidaEm.getTime() - 1000).toISOString()}`,
      gestor,
    );
    assert.deepEqual(respondeu.json.data, [
      {
        empreendimentoId: empreendimentos[ativo1],
        nomeFantasia: 'Pousada Fictícia A',
        situacaoResposta: 'respondeu',
        respondidaEm: respondidaEm.toISOString(),
      },
    ]);

    const invalido = await chamar(
      `/pesquisas/${id}/destinatarios?$orderby=situacaoResposta`,
      gestor,
    );
    assert.equal(invalido.status, 400);
  });

  it('encerramento serializa com envio em andamento e é definitivo', async () => {
    const gestor = await sessao('gestor');
    const r = await criarRascunho(gestor);
    const id = (r.json.data as PesquisaDetalhe).id;
    await chamar(`/pesquisas/${id}/abertura`, gestor, 'POST');

    let envioConfirmado = 0;
    let liberar!: () => void;
    const segurando = new Promise<void>((ok) => (liberar = ok));
    let travado!: () => void;
    const comTrava = new Promise<void>((ok) => (travado = ok));
    const envio = prisma.$transaction(
      async (tx) => {
        await exigirRecebimento(tx, id, empreendimentos[ativo2]);
        travado();
        await segurando;
        envioConfirmado = Date.now();
      },
      { timeout: 10000 },
    );
    await comTrava;
    const encerramento = chamar(
      `/pesquisas/${id}/encerramento`,
      gestor,
      'POST',
    );
    await new Promise((ok) => setTimeout(ok, 300));
    liberar();
    await envio;
    const fim = await encerramento;
    assert.equal(fim.status, 200);
    const d = fim.json.data as PesquisaDetalhe;
    assert.equal(d.situacao, 'encerrada');
    assert.ok(d.encerradaEm && Date.parse(d.encerradaEm) >= envioConfirmado);

    await assert.rejects(
      prisma.$transaction((tx) =>
        exigirRecebimento(tx, id, empreendimentos[ativo2]),
      ),
      (e) => codigo(e) === 'PESQUISA_FORA_DO_PRAZO',
    );
    for (const [caminho, metodo, corpo] of [
      [`/pesquisas/${id}`, 'PUT', { titulo: 'Outro' }],
      [`/pesquisas/${id}`, 'DELETE', undefined],
      [`/pesquisas/${id}/encerramento`, 'POST', undefined],
      [`/pesquisas/${id}/abertura`, 'POST', undefined],
    ] as const) {
      const resposta = await chamar(caminho, gestor, metodo, corpo);
      assert.equal(resposta.status, 409, `${metodo} ${caminho}`);
    }
  });

  it('edição expirada não é prorrogada (reabertura pendente)', async () => {
    const gestor = await sessao('gestor');
    const r = await criarRascunho(gestor);
    const id = (r.json.data as PesquisaDetalhe).id;
    await chamar(`/pesquisas/${id}/abertura`, gestor, 'POST');
    await prisma.pesquisa.update({
      where: { id },
      data: {
        abertura: new Date(Date.now() - 3 * DIA),
        prazo: new Date(Date.now() - DIA),
      },
    });
    const d = await chamar(`/pesquisas/${id}`, gestor);
    assert.equal((d.json.data as PesquisaDetalhe).situacao, 'expirada');
    const prorrogar = await chamar(`/pesquisas/${id}`, gestor, 'PUT', {
      prazo: instante(5 * DIA),
    });
    assert.equal(prorrogar.status, 409);
    assert.equal(prorrogar.json.error?.code, 'PESQUISA_REABERTURA_PENDENTE');
    const encerrar = await chamar(
      `/pesquisas/${id}/encerramento`,
      gestor,
      'POST',
    );
    assert.equal(encerrar.status, 200);
  });
});
