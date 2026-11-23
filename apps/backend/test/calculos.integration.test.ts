import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  isExecucaoCalculoDetalhe,
  isExecucaoCalculoLinha,
  isSolicitacaoCalculo,
  type ExecucaoCalculoDetalhe,
  type Perfil,
  type SolicitacaoCalculo,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';
import { dadosModeloTeste, dadosPesquisaTeste } from './pesquisa-teste';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  meta?: { total?: number };
  error?: { code: string; details?: { field?: string }[] };
}
const data = (d: string) => new Date(`${d}T00:00:00Z`);

describe(
  'Cálculo, recálculo e publicação HTTP/PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const perfis = new Map<Perfil, number>();
    const usuarios: number[] = [];
    const empreendimentos: number[] = [];
    const parametros: number[] = [];
    let periodoId = 0;
    let modeloId = 0;
    let pesquisaId = 0;
    let perguntaTaxa = 0;
    let perguntaTexto = 0;
    let respostaA = 0;
    let loteRecalculoId = 0;

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

      for (const perfil of ['gestor', 'estagiario', 'visualizador'] as const) {
        const u = await prisma.usuario.create({
          data: {
            nome: `Cálculo ${perfil}`,
            email: `calculo-${perfil}-${Date.now()}@example.test`,
            perfil,
          },
        });
        usuarios.push(u.id);
        perfis.set(perfil, u.id);
      }
      const gestor = perfis.get('gestor')!;
      // Período isolado no futuro: nenhum parâmetro de outra suíte cruza estas datas.
      const periodo = await prisma.periodo.create({
        data: {
          tipo: 'mes',
          rotulo: 'Janeiro 2091 (cálculo)',
          dataInicio: data('2091-01-01'),
          dataFim: data('2091-01-31'),
        },
      });
      periodoId = periodo.id;
      for (const [nome, categoria, uh, leitos, max] of [
        ['Hotel Cálculo A', 'hotel', 10, 20, 2],
        ['Pousada Cálculo B', 'pousada', 5, 10, 2],
      ] as const) {
        const e = await prisma.empreendimento.create({
          data: {
            nomeFantasia: nome,
            situacao: 'ativo',
            categoriaIndicador: categoria,
          },
        });
        empreendimentos.push(e.id);
        await prisma.inventarioVersao.create({
          data: {
            empreendimentoId: e.id,
            criadaPor: gestor,
            vigenciaInicio: data('2090-01-01'),
            tipoAlteracao: 'mudanca_real',
            situacaoConferencia: 'completo',
            totalUh: uh,
            leitos,
            maxLeitosPorUh: max,
          },
        });
      }
      const modelo = await prisma.pesquisaModelo.create({
        data: dadosModeloTeste(
          'Modelo de teste do cálculo',
          'Meios de hospedagem',
        ),
      });
      modeloId = modelo.id;
      const [taxa, texto] = await Promise.all(
        [
          ['ocupacao', 'Ocupação (%)', 'percentual', 1],
          ['obs', 'Observação', 'texto', 2],
        ].map(([chave, rotulo, tipoValor, ordem]) =>
          prisma.pesquisaCampo.create({
            data: {
              modeloId,
              chave: chave as string,
              rotulo: rotulo as string,
              tipoValor: tipoValor as string,
              obrigatorio: false,
              ordem: ordem as number,
            },
          }),
        ),
      );
      const pesquisa = await prisma.pesquisa.create({
        data: {
          ...dadosPesquisaTeste(modeloId, 'Consolidado de teste do cálculo'),
          destinatariosRegistradosEm: new Date(),
          destinatarios: {
            create: empreendimentos.map((empreendimentoId) => ({
              empreendimentoId,
            })),
          },
        },
      });
      pesquisaId = pesquisa.id;
      perguntaTaxa = (
        await prisma.pesquisaPergunta.create({
          data: {
            pesquisaId,
            campoId: taxa.id,
            periodoId,
            rotulo: 'Ocupação (%)',
          },
        })
      ).id;
      perguntaTexto = (
        await prisma.pesquisaPergunta.create({
          data: {
            pesquisaId,
            campoId: texto.id,
            periodoId,
            rotulo: 'Observação',
          },
        })
      ).id;
      const lote = await prisma.importacaoLote.create({
        data: {
          fonte: 'tabulacao_consolidado',
          nomeArquivo: 'calculo-ficticio.xlsx',
          tamanhoBytes: 10,
          sha256: 'a'.repeat(64),
          versaoParser: 'tabulacao-consolidado/1',
          estado: 'lido',
          criadoPor: gestor,
          pesquisaId,
          perguntaId: perguntaTaxa,
          recalculoPendente: true,
        },
      });
      loteRecalculoId = lote.id;
      for (const [i, valor] of ['75', '50'].entries()) {
        const r = await prisma.resposta.create({
          data: {
            pesquisaId,
            empreendimentoId: empreendimentos[i],
            usuarioId: gestor,
            respondidaEm: new Date(),
            canal: 'sistema',
            itens: {
              create: { perguntaId: perguntaTaxa, valorNumerico: valor },
            },
          },
        });
        if (i === 0) respostaA = r.id;
      }
      await prisma.rhcPeriodo.create({
        data: { periodoId, qtdRhc: 2, leitos: 8 },
      });
      // A parte 17 só libera o agregado conferido; o pendente acima não entra no cálculo.
      await prisma.rhcPeriodo.create({
        data: {
          periodoId,
          qtdRhc: 3,
          leitos: 12,
          situacaoConferencia: 'conferida',
          conferidoEm: new Date(),
          conferidoPorUsuarioId: gestor,
        },
      });
      for (const [chave, valor] of [
        ['leitos_media.minimo_por_uh', '1'],
        ['day_use.fator_hospedados', '1'],
        ['day_use.percentual', '15.15'],
      ]) {
        const p = await prisma.parametroCalculo.create({
          data: {
            chave,
            valor,
            vigenciaInicio: data('2091-01-01'),
            vigenciaFim: data('2091-12-31'),
            fonte: 'Hipótese de teste, não homologada',
          },
        });
        parametros.push(p.id);
      }
    });

    after(async () => {
      try {
        if (prisma) {
          await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`ALTER TABLE indicador_resultado DISABLE TRIGGER indicador_resultado_protegido`;
            await tx.$executeRaw`ALTER TABLE calculo_execucao DISABLE TRIGGER calculo_execucao_protegida`;
            await tx.$executeRaw`ALTER TABLE calculo_execucao_resposta DISABLE TRIGGER calculo_execucao_resposta_protegida`;
            const execucoes = { execucao: { pesquisaId } };
            await tx.indicadorResultadoVersao.deleteMany({
              where: { resultado: execucoes },
            });
            await tx.indicadorResultadoParametro.deleteMany({
              where: { resultado: execucoes },
            });
            await tx.indicadorResultado.deleteMany({ where: execucoes });
            await tx.calculoExecucaoResposta.deleteMany({ where: execucoes });
            await tx.calculoExecucao.deleteMany({ where: { pesquisaId } });
            await tx.$executeRaw`ALTER TABLE indicador_resultado ENABLE TRIGGER indicador_resultado_protegido`;
            await tx.$executeRaw`ALTER TABLE calculo_execucao ENABLE TRIGGER calculo_execucao_protegida`;
            await tx.$executeRaw`ALTER TABLE calculo_execucao_resposta ENABLE TRIGGER calculo_execucao_resposta_protegida`;
            await tx.visibilidadeIndicadorPerfil.deleteMany({
              where: {
                perfil: 'visualizador',
                indicador: { codigo: 'taxa_ocupacao_uh' },
              },
            });
            await tx.parametroCalculo.deleteMany({
              where: { id: { in: parametros } },
            });
            await tx.rhcPeriodo.deleteMany({ where: { periodoId } });
            await tx.respostaItem.deleteMany({
              where: { resposta: { pesquisaId } },
            });
            await tx.resposta.deleteMany({ where: { pesquisaId } });
            await tx.pesquisaDestinatario.deleteMany({ where: { pesquisaId } });
            await tx.importacaoLote.deleteMany({ where: { pesquisaId } });
            await tx.pesquisaPergunta.deleteMany({ where: { pesquisaId } });
            await tx.pesquisa.deleteMany({ where: { id: pesquisaId } });
            await tx.$executeRaw`ALTER TABLE pesquisa_modelo_versao DISABLE TRIGGER pesquisa_modelo_versao_imutavel`;
            await tx.pesquisaModeloVersao.deleteMany({ where: { modeloId } });
            await tx.$executeRaw`ALTER TABLE pesquisa_modelo_versao ENABLE TRIGGER pesquisa_modelo_versao_imutavel`;
            await tx.pesquisaCampo.deleteMany({ where: { modeloId } });
            await tx.pesquisaModelo.deleteMany({ where: { id: modeloId } });
            await tx.inventarioVersao.deleteMany({
              where: { empreendimentoId: { in: empreendimentos } },
            });
            await tx.empreendimento.deleteMany({
              where: { id: { in: empreendimentos } },
            });
            await tx.periodo.deleteMany({ where: { id: periodoId } });
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
      } finally {
        // Fecha o servidor e o pool mesmo se a limpeza falhar; senão o processo não termina.
        await app?.close();
      }
    });

    const taxaDe = (e: ExecucaoCalculoDetalhe) =>
      e.resultados.find(
        (r) => r.codigo === 'taxa_ocupacao_uh' && r.recorte === 'total',
      )!.valor;

    it('calcula, reaproveita insumos iguais, recalcula após correção e publica com substituição', async () => {
      const gestor = await sessao('gestor');
      const estagiario = await sessao('estagiario');
      const visualizador = await sessao('visualizador');

      const negado = await chamar('/calculos', estagiario, 'POST', {
        perguntaId: perguntaTaxa,
      });
      assert.equal(negado.status, 403);

      const texto = await chamar('/calculos', gestor, 'POST', {
        perguntaId: perguntaTexto,
      });
      assert.equal(texto.status, 400);
      assert.equal(texto.json.error?.code, 'PERGUNTA_NAO_CALCULAVEL');
      const inexistente = await chamar('/calculos', gestor, 'POST', {
        perguntaId: 2147483000,
      });
      assert.equal(inexistente.status, 404);
      const extra = await chamar('/calculos', gestor, 'POST', {
        perguntaId: perguntaTaxa,
        periodoId,
      });
      assert.equal(extra.status, 400);

      const r1 = await chamar('/calculos', gestor, 'POST', {
        perguntaId: perguntaTaxa,
      });
      assert.equal(r1.status, 201, JSON.stringify(r1.json));
      assert.ok(isSolicitacaoCalculo(r1.json.data));
      const e1 = (r1.json.data as SolicitacaoCalculo).execucao;
      assert.equal(e1.situacao, 'concluido');
      assert.equal(e1.revisao, 1);
      assert.equal(e1.publicacao, 'calculado');
      assert.equal(e1.insumosAtuais, 'iguais');
      assert.equal(e1.insumos.populacao, 'destinatarios');
      assert.equal(e1.insumos.rhc.situacao, 'vigente');
      assert.equal(e1.insumos.rhc.qtdRhc, 3);
      assert.equal(
        (
          await prisma.importacaoLote.findUniqueOrThrow({
            where: { id: loteRecalculoId },
            select: { recalculoPendente: true },
          })
        ).recalculoPendente,
        false,
      );
      // (75 × 10 + 50 × 5) ÷ 15
      assert.deepEqual(taxaDe(e1), {
        estado: 'disponivel',
        valor: '66.666666666667',
      });
      assert.ok(
        e1.resultados.some(
          (r) =>
            r.codigo === 'turistas_rhc' && r.valor.estado === 'indisponivel',
        ),
      );

      const repetida = await chamar('/calculos', gestor, 'POST', {
        perguntaId: perguntaTaxa,
      });
      assert.equal(repetida.status, 200);
      const reaproveitada = repetida.json.data as SolicitacaoCalculo;
      assert.equal(reaproveitada.reaproveitada, true);
      assert.equal(reaproveitada.execucao.id, e1.id);
      assert.equal(
        await prisma.calculoExecucao.count({
          where: { perguntaId: perguntaTaxa },
        }),
        1,
      );

      // Resultado calculado não aparece no consumo antes da publicação.
      const definicao = await prisma.indicadorDefinicao.findUniqueOrThrow({
        where: { codigo: 'taxa_ocupacao_uh' },
      });
      await prisma.visibilidadeIndicadorPerfil.upsert({
        where: {
          perfil_indicadorId: {
            perfil: 'visualizador',
            indicadorId: definicao.id,
          },
        },
        create: {
          perfil: 'visualizador',
          indicadorId: definicao.id,
          permitido: true,
        },
        update: { permitido: true },
      });
      const consumo = () =>
        chamar(
          `/indicadores?$filter=indicadorId eq ${definicao.id} and periodoId eq ${periodoId}&$count=true`,
          visualizador,
        );
      assert.equal((await consumo()).json.meta?.total, 0);

      const p1 = await chamar(
        `/calculos/${e1.id}/publicacao`,
        gestor,
        'POST',
        {},
      );
      assert.equal(p1.status, 200, JSON.stringify(p1.json));
      assert.equal(
        (p1.json.data as ExecucaoCalculoDetalhe).publicacao,
        'publicado',
      );
      const lista1 = await consumo();
      assert.equal(lista1.json.meta?.total, 1);
      assert.equal(
        (lista1.json.data as { valor: string }[])[0].valor,
        '66.666666666667',
      );

      // O banco recusa reescrever resultado e insumos de uma execução.
      const resultado = await prisma.indicadorResultado.findFirstOrThrow({
        where: { execucaoId: e1.id },
      });
      await assert.rejects(
        prisma.indicadorResultado.update({
          where: { id: resultado.id },
          data: { valor: '1' },
        }),
      );
      await assert.rejects(
        prisma.calculoExecucao.update({
          where: { id: e1.id },
          data: { insumosHash: '0'.repeat(64) },
        }),
      );
      await assert.rejects(
        prisma.calculoExecucao.delete({ where: { id: e1.id } }),
      );

      // Correção de uma resposta torna os insumos atuais diferentes do retrato.
      await prisma.respostaItem.update({
        where: {
          respostaId_perguntaId: {
            respostaId: respostaA,
            perguntaId: perguntaTaxa,
          },
        },
        data: { valorNumerico: '90' },
      });
      const detalhe = await chamar(`/calculos/${e1.id}`, gestor);
      assert.ok(isExecucaoCalculoDetalhe(detalhe.json.data));
      assert.equal(
        (detalhe.json.data as ExecucaoCalculoDetalhe).insumosAtuais,
        'alterados',
      );
      // O resultado publicado continua o mesmo até nova publicação.
      assert.equal((await consumo()).json.meta?.total, 1);

      const r2 = await chamar('/calculos', gestor, 'POST', {
        perguntaId: perguntaTaxa,
        motivo: 'Correção fictícia da resposta A',
      });
      assert.equal(r2.status, 201);
      const e2 = (r2.json.data as SolicitacaoCalculo).execucao;
      assert.equal(e2.revisao, 2);
      // (90 × 10 + 50 × 5) ÷ 15
      assert.deepEqual(taxaDe(e2), {
        estado: 'disponivel',
        valor: '76.666666666667',
      });

      const semMotivo = await chamar(
        `/calculos/${e2.id}/publicacao`,
        gestor,
        'POST',
        {},
      );
      assert.equal(semMotivo.status, 400);
      assert.equal(semMotivo.json.error?.details?.[0]?.field, 'motivo');
      const p2 = await chamar(`/calculos/${e2.id}/publicacao`, gestor, 'POST', {
        motivo: 'Resposta corrigida',
      });
      assert.equal(p2.status, 200);
      const anterior = await chamar(`/calculos/${e1.id}`, gestor);
      const a = anterior.json.data as ExecucaoCalculoDetalhe;
      assert.equal(a.publicacao, 'substituido');
      assert.equal(a.substituidaPorId, e2.id);
      // Revisão anterior preservada com seus valores.
      assert.deepEqual(taxaDe(a), {
        estado: 'disponivel',
        valor: '66.666666666667',
      });
      const lista2 = await consumo();
      assert.equal(lista2.json.meta?.total, 1);
      assert.equal(
        (lista2.json.data as { valor: string }[])[0].valor,
        '76.666666666667',
      );

      const republicar = await chamar(
        `/calculos/${e1.id}/publicacao`,
        gestor,
        'POST',
        {
          motivo: 'x',
        },
      );
      assert.equal(republicar.status, 409);

      const colecao = await chamar(
        `/calculos?$filter=perguntaId eq ${perguntaTaxa}&$orderby=revisao asc&$count=true`,
        gestor,
      );
      assert.equal(colecao.status, 200);
      assert.equal(colecao.json.meta?.total, 2);
      assert.ok((colecao.json.data as unknown[]).every(isExecucaoCalculoLinha));

      const linhagem = await prisma.calculoExecucaoResposta.count({
        where: { execucaoId: e2.id },
      });
      assert.equal(linhagem, 2);
      const auditoria = await prisma.auditoria.findMany({
        where: {
          entidade: 'calculo_execucao',
          entidadeId: { in: [e1.id, e2.id] },
        },
      });
      assert.ok(auditoria.length >= 6);
    });
  },
);
