import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  CABECALHO_NOME_ARQUIVO,
  isLoteImportacaoDetalhe,
  isPlanoImportacao,
  isResultadoConfirmacao,
  type ItemPlano,
  type Perfil,
  type PlanoImportacao,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';
import { dadosModeloTeste, dadosPesquisaTeste } from './pesquisa-teste';
import {
  construirXlsx,
  tabulacaoFicticia,
  type CelulaTeste,
} from './xlsx-teste';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  error?: { code: string };
}

describe(
  'Importação: conciliação e confirmação HTTP/PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const perfis = new Map<Perfil, number>();
    const usuarios: number[] = [];
    const empreendimentos: number[] = [];
    const pesquisas: number[] = [];
    let modeloId = 0;
    let periodoId = 0;
    let alfa = 0;
    let beta = 0;
    let pesquisaA = 0;
    let perguntaA = 0;
    let pesquisaPublico = 0;
    let perguntaPublico = 0;
    let pesquisaRascunho = 0;
    let perguntaRascunho = 0;
    const sufixo = Date.now();

    const planilha = (linhas: Array<[string, CelulaTeste]>) =>
      Buffer.from(
        construirXlsx([
          tabulacaoFicticia(
            linhas.map(([nome, ocupacao]) => ({ nome, ocupacao })),
          ),
        ]),
      );
    const nomes = () => ({
      alfa: `Hotel Import Alfa ${sufixo}`,
      beta: `Pousada Import Beta ${sufixo}`,
      gama: `Resort Import Gama ${sufixo}`,
    });

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
    const cabecalhos = (cookie: string, json: boolean) => ({
      Origin: origem,
      Cookie: cookie,
      'X-OTO-Request': '1',
      ...(json ? { 'content-type': 'application/json' } : {}),
    });
    async function enviar(cookie: string, arquivo: Buffer) {
      const r = await fetch(
        `${base}/api/importacoes?fonte=tabulacao_consolidado`,
        {
          method: 'POST',
          headers: {
            ...cabecalhos(cookie, false),
            'content-type': 'application/octet-stream',
            [CABECALHO_NOME_ARQUIVO]: encodeURIComponent('Tabulação.xlsx'),
          },
          body: new Uint8Array(arquivo),
        },
      );
      return { status: r.status, json: (await r.json()) as Corpo };
    }
    async function chamar(
      caminho: string,
      cookie: string,
      metodo = 'GET',
      corpo?: unknown,
    ) {
      const r = await fetch(`${base}/api${caminho}`, {
        method: metodo,
        headers: cabecalhos(cookie, metodo !== 'GET'),
        body:
          metodo === 'GET' || metodo === 'DELETE'
            ? undefined
            : JSON.stringify(corpo ?? {}),
      });
      const texto = await r.text();
      return {
        status: r.status,
        texto,
        json: (texto && r.headers.get('content-type')?.includes('json')
          ? JSON.parse(texto)
          : {}) as Corpo,
      };
    }
    const plano = (r: { json: Corpo }) => {
      assert.ok(isPlanoImportacao(r.json.data), JSON.stringify(r.json));
      return r.json.data as PlanoImportacao;
    };
    const item = (p: PlanoImportacao, nome: string): ItemPlano =>
      p.itens.find((i) => i.nomeInformado === nome)!;
    async function novoLote(
      cookie: string,
      linhas: Array<[string, CelulaTeste]>,
    ) {
      const r = await enviar(cookie, planilha(linhas));
      assert.equal(r.status, 201, JSON.stringify(r.json));
      assert.ok(isLoteImportacaoDetalhe(r.json.data));
      return r.json.data as { id: number; estado: string };
    }
    const destinoOk = (pesquisaId = pesquisaA, perguntaId = perguntaA) => ({
      pesquisaId,
      perguntaId,
    });

    async function criarEdicao(
      titulo: string,
      ajuste: Record<string, unknown> = {},
    ) {
      const p = await prisma.pesquisa.create({
        data: {
          ...dadosPesquisaTeste(
            modeloId,
            titulo,
            new Date(Date.now() - 10 * 86400000),
          ),
          ...ajuste,
        },
      });
      pesquisas.push(p.id);
      const campo = await prisma.pesquisaCampo.findFirstOrThrow({
        where: { modeloId },
      });
      const pergunta = await prisma.pesquisaPergunta.create({
        data: {
          pesquisaId: p.id,
          campoId: campo.id,
          periodoId,
          rotulo: 'Ocupação do período (%)',
        },
      });
      return { pesquisaId: p.id, perguntaId: pergunta.id };
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
      for (const perfil of [
        'administrador',
        'gestor',
        'estagiario',
        'visualizador',
      ] as const) {
        const u = await prisma.usuario.create({
          data: {
            nome: `Conciliação ${perfil}`,
            email: `conciliacao-${perfil}-${sufixo}@example.test`,
            perfil,
          },
        });
        usuarios.push(u.id);
        perfis.set(perfil, u.id);
      }
      const n = nomes();
      for (const nome of [n.alfa, n.beta, n.gama]) {
        empreendimentos.push(
          (
            await prisma.empreendimento.create({
              data: { nomeFantasia: nome, situacao: 'ativo' },
            })
          ).id,
        );
      }
      [alfa, beta] = empreendimentos;
      periodoId = (
        await prisma.periodo.create({
          data: {
            tipo: 'feriado_prolongado',
            rotulo: `Carnaval teste ${sufixo}`,
            dataInicio: new Date('2026-02-14T00:00:00Z'),
            dataFim: new Date('2026-02-18T00:00:00Z'),
          },
        })
      ).id;
      const modelo = await prisma.pesquisaModelo.create({
        data: {
          ...dadosModeloTeste(
            `Modelo conciliação ${sufixo}`,
            'Meios de hospedagem',
          ),
          campos: {
            create: {
              chave: 'ocupacao',
              rotulo: 'Ocupação (%)',
              tipoValor: 'percentual',
              obrigatorio: true,
              ordem: 1,
            },
          },
        },
        include: { campos: true },
      });
      modeloId = modelo.id;
      await prisma.pesquisaCampoVersao.create({
        data: {
          modeloId,
          numero: 1,
          campoId: modelo.campos[0].id,
          chave: 'ocupacao',
          rotulo: 'Ocupação (%)',
          tipoValor: 'percentual',
          obrigatorio: true,
          ordem: 1,
        },
      });
      ({ pesquisaId: pesquisaA, perguntaId: perguntaA } = await criarEdicao(
        `Edição A ${sufixo}`,
      ));
      ({ pesquisaId: pesquisaPublico, perguntaId: perguntaPublico } =
        await criarEdicao(`Edição com público ${sufixo}`, {
          destinatariosRegistradosEm: new Date(),
        }));
      await prisma.pesquisaDestinatario.create({
        data: { pesquisaId: pesquisaPublico, empreendimentoId: alfa },
      });
      ({ pesquisaId: pesquisaRascunho, perguntaId: perguntaRascunho } =
        await criarEdicao(`Rascunho ${sufixo}`, {
          status: 'rascunho',
          abertaEm: null,
        }));
    });

    after(async () => {
      if (prisma) {
        await prisma.$executeRaw`DROP TRIGGER IF EXISTS teste_falha_aplicacao ON importacao_aplicacao`;
        await prisma.$executeRaw`DROP FUNCTION IF EXISTS teste_falha_aplicacao()`;
        await prisma.$transaction(async (tx) => {
          const ids = { in: pesquisas };
          await tx.importacaoAplicacao.deleteMany({
            where: { lote: { criadoPor: { in: usuarios } } },
          });
          await tx.importacaoCorrespondencia.deleteMany({
            where: { criadoPor: { in: usuarios } },
          });
          await tx.importacaoLote.deleteMany({
            where: { criadoPor: { in: usuarios } },
          });
          await tx.respostaItem.deleteMany({
            where: { resposta: { pesquisaId: ids } },
          });
          await tx.resposta.deleteMany({ where: { pesquisaId: ids } });
          await tx.pesquisaDestinatario.deleteMany({
            where: { pesquisaId: ids },
          });
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
          await tx.periodo.deleteMany({ where: { id: periodoId } });
          await tx.empreendimento.deleteMany({
            where: { id: { in: empreendimentos } },
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
        });
      }
      await app?.close();
    });

    it('fluxo completo: destino, conferência, decisões, confirmação e reimportação sem duplicar', async () => {
      const gestor = await sessao('gestor');
      const n = nomes();
      const lote = await novoLote(gestor, [
        [n.alfa, { v: 0.755, pct: true }],
        [n.beta, { v: 0.5, pct: true }],
        [n.gama, '82,5%'],
      ]);
      assert.equal(lote.estado, 'lido');
      const L = (c: string) => `/importacoes/${lote.id}${c}`;

      // Destino: rascunho, expectativa e pergunta de outra edição são recusados.
      const rascunho = await chamar(
        L('/destino'),
        gestor,
        'PUT',
        destinoOk(pesquisaRascunho, perguntaRascunho),
      );
      assert.deepEqual(
        [rascunho.status, rascunho.json.error?.code],
        [409, 'DESTINO_INCOMPATIVEL'],
      );
      await prisma.pesquisa.update({
        where: { id: pesquisaPublico },
        data: { tipoColeta: 'expectativa' },
      });
      const expectativa = await chamar(
        L('/destino'),
        gestor,
        'PUT',
        destinoOk(pesquisaPublico, perguntaPublico),
      );
      assert.equal(expectativa.json.error?.code, 'DESTINO_INCOMPATIVEL');
      await prisma.pesquisa.update({
        where: { id: pesquisaPublico },
        data: { tipoColeta: 'consolidado' },
      });
      assert.equal(
        (
          await chamar(
            L('/destino'),
            gestor,
            'PUT',
            destinoOk(pesquisaA, perguntaPublico),
          )
        ).status,
        404,
      );
      assert.equal(
        (await chamar(L('/destino'), gestor, 'PUT', { pesquisaId: 'x' }))
          .status,
        400,
      );

      // Sem destino e sem decisão: tudo pendente, com sugestões por nome, e nada a confirmar.
      const sem = plano(await chamar(L('/plano'), gestor));
      assert.equal(sem.itens.length, 3);
      assert.ok(
        sem.itens.every(
          (i) =>
            i.situacao === 'pendente' && i.motivo === 'SEM_CORRESPONDENCIA',
        ),
      );
      assert.deepEqual(
        item(sem, n.alfa).candidatos.map((c) => [c.id, c.motivo]),
        [[alfa, 'nome_igual']],
      );
      assert.equal(sem.podeConfirmar, false);

      const comDestino = plano(
        await chamar(L('/destino'), gestor, 'PUT', destinoOk()),
      );
      assert.equal(comDestino.destino?.pesquisaId, pesquisaA);
      assert.ok(
        comDestino.avisos.some((a) => /5 diárias.*5 dias|diárias/.test(a)) ||
          comDestino.avisos.length >= 1,
      );
      const nada = await chamar(L('/confirmacoes'), gestor, 'POST', {
        novos: 0,
        atualizados: 0,
      });
      assert.deepEqual(
        [nada.status, nada.json.error?.code],
        [409, 'NADA_A_CONFIRMAR'],
      );

      // Decisões: vincula Alfa e Beta, rejeita Gama.
      const linhaDe = (p: PlanoImportacao, nome: string) =>
        item(p, nome).linhaId;
      let p = plano(
        await chamar(
          L(`/linhas/${linhaDe(comDestino, n.alfa)}/decisao`),
          gestor,
          'PUT',
          { tipo: 'vincular', empreendimentoId: alfa },
        ),
      );
      p = plano(
        await chamar(
          L(`/linhas/${linhaDe(p, n.beta)}/decisao`),
          gestor,
          'PUT',
          { tipo: 'vincular', empreendimentoId: beta },
        ),
      );
      p = plano(
        await chamar(
          L(`/linhas/${linhaDe(p, n.gama)}/decisao`),
          gestor,
          'PUT',
          { tipo: 'rejeitar', motivo: 'Fora da pesquisa' },
        ),
      );
      assert.deepEqual(p.totais, {
        lidas: 3,
        novos: 2,
        atualizados: 0,
        semMudanca: 0,
        conflitos: 0,
        rejeitados: 1,
        pendentes: 0,
        aplicados: 0,
      });
      assert.equal(p.podeConfirmar, true);

      // Totais desatualizados são recusados; os corretos gravam em uma transação.
      const velho = await chamar(L('/confirmacoes'), gestor, 'POST', {
        novos: 3,
        atualizados: 0,
      });
      assert.deepEqual(
        [velho.status, velho.json.error?.code],
        [409, 'PLANO_DESATUALIZADO'],
      );
      assert.equal(
        await prisma.resposta.count({ where: { pesquisaId: pesquisaA } }),
        0,
      );
      const ok = await chamar(L('/confirmacoes'), gestor, 'POST', {
        novos: 2,
        atualizados: 0,
      });
      assert.equal(ok.status, 200, ok.texto);
      assert.ok(isResultadoConfirmacao(ok.json.data));
      assert.deepEqual(ok.json.data, {
        confirmacao: 'concluido',
        criadas: 2,
        atualizadas: 0,
        semMudanca: 0,
        pendentes: 0,
        conflitos: 0,
        rejeitadas: 1,
        recalculoPendente: true,
      });

      const respostas = await prisma.resposta.findMany({
        where: { pesquisaId: pesquisaA },
        include: { itens: true },
        orderBy: { empreendimentoId: 'asc' },
      });
      assert.deepEqual(
        respostas.map((r) => [
          r.empreendimentoId,
          r.canal,
          r.usuarioId,
          r.itens[0].valorNumerico?.toFixed(),
        ]),
        [
          [alfa, 'importacao', perfis.get('gestor'), '75.5'],
          [beta, 'importacao', perfis.get('gestor'), '50'],
        ],
      );
      const aplicacoes = await prisma.importacaoAplicacao.findMany({
        where: { loteId: lote.id },
        orderBy: { linhaId: 'asc' },
      });
      assert.equal(aplicacoes.length, 2);
      assert.ok(
        aplicacoes.every(
          (a) =>
            a.regra === 'tabulacao-consolidado/1:decisao-manual' &&
            a.confirmadoPor === perfis.get('gestor') &&
            a.acao === 'criar',
        ),
      );
      const auditoria = await prisma.auditoria.findMany({
        where: {
          entidade: 'resposta',
          entidadeId: { in: respostas.map((r) => r.id) },
        },
      });
      assert.equal(auditoria.length, 2);
      const loteDb = await prisma.importacaoLote.findUniqueOrThrow({
        where: { id: lote.id },
      });
      assert.deepEqual(
        [loteDb.confirmacao, loteDb.recalculoPendente, loteDb.confirmadoPor],
        ['concluido', true, perfis.get('gestor')],
      );

      // Reconfirmar é idempotente; o destino fica travado.
      const repetido = await chamar(L('/confirmacoes'), gestor, 'POST', {
        novos: 0,
        atualizados: 0,
      });
      assert.equal(repetido.status, 200);
      assert.equal(
        await prisma.resposta.count({ where: { pesquisaId: pesquisaA } }),
        2,
      );
      assert.equal(
        await prisma.importacaoAplicacao.count({ where: { loteId: lote.id } }),
        2,
      );
      const travado = await chamar(
        L('/destino'),
        gestor,
        'PUT',
        destinoOk(pesquisaPublico, perguntaPublico),
      );
      assert.equal(travado.json.error?.code, 'DESTINO_TRAVADO');
      const depois = plano(await chamar(L('/plano'), gestor));
      assert.deepEqual(
        [depois.totais.aplicados, depois.totais.rejeitados],
        [2, 1],
      );
      const decidida = await chamar(
        L(`/linhas/${linhaDe(p, n.alfa)}/decisao`),
        gestor,
        'PUT',
        { tipo: 'rejeitar' },
      );
      assert.equal(decidida.json.error?.code, 'LINHA_APLICADA');

      // Nova versão do arquivo (Beta mudou para 60%, Gama aparece): reaproveita correspondências salvas.
      const lote2 = await novoLote(gestor, [
        [n.alfa, { v: 0.755, pct: true }],
        [n.beta, { v: 0.6, pct: true }],
        [n.gama, '82,5%'],
      ]);
      const M = (c: string) => `/importacoes/${lote2.id}${c}`;
      await chamar(M('/destino'), gestor, 'PUT', destinoOk());
      let q = plano(await chamar(M('/plano'), gestor));
      assert.deepEqual(
        q.itens.map((i) => [i.situacao, i.origemDecisao]),
        [
          ['sem_mudanca', 'correspondencia_salva'],
          ['conflito', 'correspondencia_salva'],
          ['pendente', null],
        ],
      );
      assert.equal(item(q, n.beta).valorAtual, '50');

      // Sem resolver o conflito, só o que não muda é aplicado: confirmação parcial, nada sobrescrito.
      const parcial = await chamar(M('/confirmacoes'), gestor, 'POST', {
        novos: 0,
        atualizados: 0,
      });
      assert.deepEqual(parcial.json.data, {
        confirmacao: 'parcial',
        criadas: 0,
        atualizadas: 0,
        semMudanca: 1,
        pendentes: 1,
        conflitos: 1,
        rejeitadas: 0,
        recalculoPendente: false,
      });
      assert.equal(
        (
          await prisma.resposta.findFirstOrThrow({
            where: { pesquisaId: pesquisaA, empreendimentoId: beta },
            include: { itens: true },
          })
        ).itens[0].valorNumerico?.toFixed(),
        '50',
      );

      // Conflito exige escolha explícita; substituir atualiza a resposta existente sem duplicar.
      const semVinculo = await chamar(
        M(`/linhas/${item(q, n.gama).linhaId}/conflito`),
        gestor,
        'PUT',
        { resolucao: 'substituir' },
      );
      assert.equal(semVinculo.json.error?.code, 'SEM_VINCULO');
      const semConflito = await chamar(
        M(`/linhas/${item(q, n.alfa).linhaId}/conflito`),
        gestor,
        'PUT',
        { resolucao: 'substituir' },
      );
      assert.equal(semConflito.status, 409);
      q = plano(
        await chamar(
          M(`/linhas/${item(q, n.beta).linhaId}/conflito`),
          gestor,
          'PUT',
          { resolucao: 'substituir' },
        ),
      );
      assert.deepEqual(
        [item(q, n.beta).situacao, q.totais.atualizados],
        ['atualizar', 1],
      );
      const atualizou = await chamar(M('/confirmacoes'), gestor, 'POST', {
        novos: 0,
        atualizados: 1,
      });
      assert.deepEqual(atualizou.json.data, {
        confirmacao: 'parcial',
        criadas: 0,
        atualizadas: 1,
        semMudanca: 0,
        pendentes: 1,
        conflitos: 0,
        rejeitadas: 0,
        recalculoPendente: true,
      });
      const respBeta = await prisma.resposta.findFirstOrThrow({
        where: { pesquisaId: pesquisaA, empreendimentoId: beta },
        include: { itens: true },
      });
      assert.equal(respBeta.itens[0].valorNumerico?.toFixed(), '60');
      assert.ok(respBeta.atualizadaEm);
      assert.equal(
        await prisma.resposta.count({ where: { pesquisaId: pesquisaA } }),
        2,
      );
      const aud = await prisma.auditoria.findFirstOrThrow({
        where: {
          entidade: 'resposta',
          entidadeId: respBeta.id,
          acao: 'alterar',
        },
      });
      assert.match(JSON.stringify(aud.antes), /"valor":"50"/);
      assert.match(JSON.stringify(aud.depois), /"valor":"60"/);
      const ap2 = await prisma.importacaoAplicacao.findMany({
        where: { loteId: lote2.id },
        orderBy: { linhaId: 'asc' },
      });
      assert.deepEqual(
        ap2.map((a) => [
          a.acao,
          a.valorAnterior?.toFixed() ?? null,
          a.valorNovo.toFixed(),
          a.regra.endsWith('correspondencia-salva'),
        ]),
        [
          ['sem_mudanca', '75.5', '75.5', true],
          ['atualizar', '50', '60', false],
        ],
      );

      // CSV de rejeições: só pendentes, conflitos e rejeitadas, com permissão de exportação.
      const csv = await chamar(M('/rejeicoes'), gestor);
      assert.equal(csv.status, 200);
      assert.ok(csv.texto.startsWith('"Linha";"Nome informado"'));
      assert.ok(csv.texto.includes(n.gama) && !csv.texto.includes(n.alfa));
      assert.equal(
        (await chamar(M('/rejeicoes'), await sessao('estagiario'))).status,
        403,
      );

      // Remover decisão volta ao estado anterior à decisão manual.
      const gamaLinha = item(q, n.gama).linhaId;
      await chamar(M(`/linhas/${gamaLinha}/decisao`), gestor, 'PUT', {
        tipo: 'rejeitar',
      });
      assert.equal(
        (await chamar(M(`/linhas/${gamaLinha}/decisao`), gestor, 'DELETE'))
          .status,
        204,
      );
      assert.equal(
        (await chamar(M(`/linhas/${gamaLinha}/decisao`), gestor, 'DELETE'))
          .status,
        404,
      );
    });

    it('público congelado rejeita empreendimentos fora da edição', async () => {
      const gestor = await sessao('gestor');
      const n = nomes();
      const lote = await novoLote(gestor, [
        [n.alfa, { v: 0.3, pct: true }],
        [n.beta, { v: 0.4, pct: true }],
      ]);
      await chamar(
        `/importacoes/${lote.id}/destino`,
        gestor,
        'PUT',
        destinoOk(pesquisaPublico, perguntaPublico),
      );
      let p = plano(await chamar(`/importacoes/${lote.id}/plano`, gestor));
      for (const [nome, id] of [
        [n.alfa, alfa],
        [n.beta, beta],
      ] as const)
        p = plano(
          await chamar(
            `/importacoes/${lote.id}/linhas/${item(p, nome).linhaId}/decisao`,
            gestor,
            'PUT',
            { tipo: 'vincular', empreendimentoId: id },
          ),
        );
      assert.deepEqual(
        p.itens.map((i) => [i.situacao, i.motivo]),
        [
          ['novo', null],
          ['rejeitado', 'FORA_DO_PUBLICO'],
        ],
      );
    });

    it('falha de persistência desfaz tudo e não marca o lote como confirmado', async () => {
      const gestor = await sessao('gestor');
      const n = nomes();
      await prisma.$executeRaw`CREATE OR REPLACE FUNCTION teste_falha_aplicacao() RETURNS trigger AS $$ BEGIN IF NEW.valor_novo = 13 THEN RAISE EXCEPTION 'falha simulada'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql`;
      await prisma.$executeRaw`CREATE TRIGGER teste_falha_aplicacao BEFORE INSERT ON importacao_aplicacao FOR EACH ROW EXECUTE FUNCTION teste_falha_aplicacao()`;
      const alvo = await criarEdicao(`Edição de falha ${sufixo}`);
      const lote = await novoLote(gestor, [
        [`${n.alfa} F`, { v: 0.2, pct: true }],
        [`${n.beta} F`, { v: 0.13, pct: true }],
      ]);
      const P = (c: string) => `/importacoes/${lote.id}${c}`;
      await chamar(
        P('/destino'),
        gestor,
        'PUT',
        destinoOk(alvo.pesquisaId, alvo.perguntaId),
      );
      let p = plano(await chamar(P('/plano'), gestor));
      for (const [nome, id] of [
        [`${n.alfa} F`, alfa],
        [`${n.beta} F`, beta],
      ] as const)
        p = plano(
          await chamar(
            P(`/linhas/${item(p, nome).linhaId}/decisao`),
            gestor,
            'PUT',
            { tipo: 'vincular', empreendimentoId: id },
          ),
        );
      const falha = await chamar(P('/confirmacoes'), gestor, 'POST', {
        novos: 2,
        atualizados: 0,
      });
      assert.ok(falha.status >= 500, String(falha.status));
      assert.equal(
        await prisma.resposta.count({ where: { pesquisaId: alvo.pesquisaId } }),
        0,
      );
      assert.equal(
        await prisma.importacaoAplicacao.count({ where: { loteId: lote.id } }),
        0,
      );
      const loteDb = await prisma.importacaoLote.findUniqueOrThrow({
        where: { id: lote.id },
      });
      assert.deepEqual(
        [loteDb.confirmacao, loteDb.confirmadoEm, loteDb.recalculoPendente],
        ['nao_confirmado', null, false],
      );
      await prisma.$executeRaw`DROP TRIGGER teste_falha_aplicacao ON importacao_aplicacao`;
      // Retomada: com a causa removida, a mesma confirmação conclui.
      const retomada = await chamar(P('/confirmacoes'), gestor, 'POST', {
        novos: 2,
        atualizados: 0,
      });
      assert.equal(retomada.status, 200, retomada.texto);
      assert.equal(
        await prisma.resposta.count({ where: { pesquisaId: alvo.pesquisaId } }),
        2,
      );
    });

    it('permissões: só administrador e gestor conciliam; empresário, estagiário e visualizador são barrados', async () => {
      const gestor = await sessao('gestor');
      const lote = await novoLote(gestor, [
        [`${nomes().alfa} P`, { v: 0.5, pct: true }],
      ]);
      const P = (c: string) => `/importacoes/${lote.id}${c}`;
      for (const perfil of ['estagiario', 'visualizador'] as const) {
        const cookie = await sessao(perfil);
        assert.equal((await chamar(P('/plano'), cookie)).status, 403);
        assert.equal(
          (await chamar(P('/destino'), cookie, 'PUT', destinoOk())).status,
          403,
        );
        assert.equal(
          (
            await chamar(P('/confirmacoes'), cookie, 'POST', {
              novos: 0,
              atualizados: 0,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await chamar(P('/linhas/1/decisao'), cookie, 'PUT', {
              tipo: 'rejeitar',
            })
          ).status,
          403,
        );
      }
      const admin = await sessao('administrador');
      assert.equal((await chamar(P('/plano'), admin)).status, 200);
      // Entrada inválida e recursos de outro lote.
      assert.equal(
        (
          await chamar(P('/linhas/999999999/decisao'), gestor, 'PUT', {
            tipo: 'rejeitar',
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await chamar(P('/linhas/1/decisao'), gestor, 'PUT', {
            tipo: 'vincular',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await chamar(P('/linhas/1/decisao'), gestor, 'PUT', {
            tipo: 'vincular',
            empreendimentoId: 1,
            extra: 1,
          })
        ).status,
        400,
      );
      assert.equal(
        (await chamar('/importacoes/999999999/plano', gestor)).status,
        404,
      );
    });
  },
);
