import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  isColetaDiariaLinha,
  isParametroCalculoLinha,
  isRhcPeriodoLinha,
  type Perfil,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  meta?: { top?: number; skip?: number; total?: number };
  error?: { code: string; details?: { field?: string; message?: string }[] };
}

describe(
  'Diárias, RHC e parâmetros HTTP/PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const perfis = new Map<Perfil, number>();
    const usuarios: number[] = [];
    const coletas: number[] = [];
    const rhcs: number[] = [];
    const parametros: number[] = [];
    let empreendimentoId: number;
    let periodoId: number;

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
          ...(corpo !== undefined
            ? { 'content-type': 'application/json' }
            : {}),
        },
        body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      });
      return { status: r.status, json: (await r.json()) as Corpo };
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
      for (const perfil of ['gestor', 'visualizador'] as const) {
        const u = await prisma.usuario.create({
          data: {
            nome: `Fontes ${perfil}`,
            email: `fontes-${perfil}-${Date.now()}@example.test`,
            perfil,
          },
        });
        usuarios.push(u.id);
        perfis.set(perfil, u.id);
      }
      const empreendimento = await prisma.empreendimento.create({
        data: { nomeFantasia: 'Hotel Fontes Teste', situacao: 'ativo' },
      });
      empreendimentoId = empreendimento.id;
      const periodo = await prisma.periodo.create({
        data: {
          tipo: 'mes',
          rotulo: 'Novembro de 2040',
          dataInicio: new Date('2040-11-01T00:00:00Z'),
          dataFim: new Date('2040-11-30T00:00:00Z'),
        },
      });
      periodoId = periodo.id;
    });

    after(async () => {
      if (prisma) {
        await prisma.$transaction(async (tx) => {
          await tx.coletaDiaria.deleteMany({ where: { id: { in: coletas } } });
          await tx.rhcPeriodo.deleteMany({ where: { id: { in: rhcs } } });
          await tx.parametroCalculo.deleteMany({
            where: { id: { in: parametros } },
          });
          await tx.sessao.deleteMany({
            where: { usuarioId: { in: usuarios } },
          });
          await tx.$executeRaw`ALTER TABLE auditoria DISABLE TRIGGER auditoria_imutavel`;
          await tx.auditoria.deleteMany({
            where: { usuarioId: { in: usuarios } },
          });
          await tx.$executeRaw`ALTER TABLE auditoria ENABLE TRIGGER auditoria_imutavel`;
          await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
          if (empreendimentoId !== undefined)
            await tx.empreendimento.deleteMany({
              where: { id: empreendimentoId },
            });
          if (periodoId !== undefined)
            await tx.periodo.deleteMany({ where: { id: periodoId } });
        });
      }
      await app?.close();
    });

    it('coleta manual: cria, lista, confere e trata conflito/duplicata', async () => {
      const gestor = await sessao('gestor');
      const visualizador = await sessao('visualizador');
      const coleta = {
        empreendimentoId,
        periodoId,
        fonte: 'booking',
        dataColeta: '2040-11-01',
        dataEstadia: '2040-11-15',
        tipoDia: 'fim_de_semana',
        valorDiaria: '199,90',
        referenciaOrigem: 'aba JANEIRO; célula AI6',
        observacao: 'Preço ofertado.',
      };
      const criada = await chamar('/coletas-diarias', gestor, 'POST', coleta);
      assert.equal(criada.status, 201);
      assert.ok(isColetaDiariaLinha(criada.json.data));
      const linha = criada.json.data as { id: number; valorDiaria: string };
      assert.equal(linha.valorDiaria, '199.90');
      coletas.push(linha.id);

      const lista = await chamar(
        '/coletas-diarias?$filter=situacaoConferencia eq ' +
          "'pendente'&$count=true",
        gestor,
      );
      assert.equal(lista.status, 200);
      assert.ok(
        (lista.json.data as unknown[]).some((l) => l === criada.json.data),
      );

      const duplicada = await chamar(
        '/coletas-diarias',
        gestor,
        'POST',
        coleta,
      );
      assert.equal(duplicada.status, 409);
      assert.equal(duplicada.json.error?.code, 'COLETA_DIARIA_DUPLICADA');

      const conflito = await chamar('/coletas-diarias', gestor, 'POST', {
        ...coleta,
        valorDiaria: '210',
      });
      assert.equal(conflito.status, 409);
      assert.equal(conflito.json.error?.code, 'COLETA_DIARIA_CONFLITO');

      // Data de estadia fora do período é recusada.
      const fora = await chamar('/coletas-diarias', gestor, 'POST', {
        ...coleta,
        dataEstadia: '2040-12-01',
      });
      assert.equal(fora.status, 400);

      const conferida = await chamar(
        `/coletas-diarias/${linha.id}`,
        gestor,
        'PUT',
        { situacaoConferencia: 'conferida' },
      );
      assert.equal(conferida.status, 200);
      const corpoConferido = conferida.json.data as {
        situacaoConferencia: string;
        conferidoPor: string | null;
      };
      assert.equal(corpoConferido.situacaoConferencia, 'conferida');
      assert.equal(corpoConferido.conferidoPor, 'Fontes gestor');

      const alterada = await chamar(
        `/coletas-diarias/${linha.id}`,
        gestor,
        'PUT',
        { valorDiaria: '210.50' },
      );
      assert.equal(alterada.status, 200);
      const corpoAlterado = alterada.json.data as {
        valorDiaria: string;
        situacaoConferencia: string;
        conferidoPor: string | null;
      };
      assert.equal(corpoAlterado.valorDiaria, '210.50');
      assert.equal(corpoAlterado.situacaoConferencia, 'pendente');
      assert.equal(corpoAlterado.conferidoPor, null);

      // Visualizador não tem o recurso `calculos`.
      const negado = await chamar('/coletas-diarias?$top=5', visualizador);
      assert.equal(negado.status, 403);

      const eventos = await prisma.auditoria.findMany({
        where: { entidade: 'coleta_diaria', entidadeId: linha.id },
        orderBy: { id: 'asc' },
      });
      assert.equal(eventos[0].acao, 'criar');
      assert.ok(eventos.some((e) => e.acao === 'alterar'));
    });

    it('RHC aceita somente uma conferência por período e mantém a revisão', async () => {
      const gestor = await sessao('gestor');
      const primeiro = await chamar('/rhc-periodos', gestor, 'POST', {
        periodoId,
        qtdRhc: 2,
        leitos: 8,
      });
      assert.equal(primeiro.status, 201);
      assert.ok(isRhcPeriodoLinha(primeiro.json.data));
      const idPrimeiro = (primeiro.json.data as { id: number }).id;
      rhcs.push(idPrimeiro);

      const segundo = await chamar('/rhc-periodos', gestor, 'POST', {
        periodoId,
        qtdRhc: 3,
        leitos: 12,
      });
      assert.equal(segundo.status, 201);
      const idSegundo = (segundo.json.data as { id: number }).id;
      rhcs.push(idSegundo);

      const conferido = await chamar(
        `/rhc-periodos/${idPrimeiro}`,
        gestor,
        'PUT',
        { situacaoConferencia: 'conferida' },
      );
      assert.equal(conferido.status, 200);

      const conflito = await chamar(
        `/rhc-periodos/${idSegundo}`,
        gestor,
        'PUT',
        { situacaoConferencia: 'conferida' },
      );
      assert.equal(conflito.status, 409);
      assert.equal(conflito.json.error?.code, 'RHC_JA_CONFERIDO');

      const revisado = await chamar(
        `/rhc-periodos/${idSegundo}`,
        gestor,
        'PUT',
        { leitos: 14 },
      );
      assert.equal(revisado.status, 200);
      assert.equal((revisado.json.data as { revisao: number }).revisao, 2);
    });

    it('parâmetro registra vigência/situação e recusa chave repetida no mesmo início', async () => {
      const gestor = await sessao('gestor');
      const parametro = {
        chave: 'day_use.percentual.teste',
        valor: '15,15',
        unidade: 'percentual_0_100',
        vigenciaInicio: '2040-01-01',
        fonte: 'Nota fictícia de teste.',
        situacao: 'hipotese_pendente_homologacao',
      };
      const criado = await chamar(
        '/parametros-calculo',
        gestor,
        'POST',
        parametro,
      );
      assert.equal(criado.status, 201);
      assert.ok(isParametroCalculoLinha(criado.json.data));
      const id = (criado.json.data as { id: number }).id;
      parametros.push(id);

      const duplicado = await chamar(
        '/parametros-calculo',
        gestor,
        'POST',
        parametro,
      );
      assert.equal(duplicado.status, 409);
      assert.equal(duplicado.json.error?.code, 'PARAMETRO_DUPLICADO');

      const alterado = await chamar(
        `/parametros-calculo/${id}`,
        gestor,
        'PUT',
        { situacao: 'homologado' },
      );
      assert.equal(alterado.status, 200);
      assert.equal(
        (alterado.json.data as { situacao: string }).situacao,
        'homologado',
      );

      const lista = await chamar(
        '/parametros-calculo?$filter=chave eq ' +
          "'day_use.percentual.teste'&$count=true",
        gestor,
      );
      assert.equal(lista.status, 200);
      assert.equal(lista.json.meta?.total, 1);
    });
  },
);
