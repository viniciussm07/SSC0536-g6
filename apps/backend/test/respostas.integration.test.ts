import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  isFormularioResposta,
  isPesquisaRespondenteLinha,
  type FormularioResposta,
  type PesquisaRespondenteLinha,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  meta?: { total?: number };
  error?: { code: string; details?: { field?: string; message?: string }[] };
}

const DIA = 86_400_000;
const dia = (deslocamento: number) =>
  new Date(Date.now() + deslocamento * DIA).toISOString().slice(0, 10);
const instante = (deslocamentoMs: number) =>
  new Date(Date.now() + deslocamentoMs).toISOString();

describe(
  'Respostas de pesquisa HTTP/PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const usuarios: number[] = [];
    const empreendimentos: number[] = [];
    const pesquisas: number[] = [];
    const periodosExtras: number[] = [];
    let gestor = 0;
    let empresarioA = 0;
    let empresarioB = 0;
    let segmentoId = 0;
    let modeloId = 0;
    let periodoId = 0;
    let [hotelA, hotelB, foraDoPublico] = [0, 0, 0];

    async function sessao(usuarioId: number) {
      const token = novoToken();
      await prisma.sessao.create({
        data: {
          tokenHash: hashToken(token),
          usuarioId,
          criadaEm: new Date(),
          expiraEm: new Date(Date.now() + 3600000),
        },
      });
      return `oto_sessao=${token}`;
    }
    async function chamar(
      caminho: string,
      cookie: string,
      opcoes: { metodo?: string; corpo?: unknown; contexto?: number } = {},
    ) {
      const metodo = opcoes.metodo ?? 'GET';
      const r = await fetch(`${base}/api${caminho}`, {
        method: metodo,
        headers: {
          Origin: origem,
          Cookie: cookie,
          'X-OTO-Request': '1',
          ...(opcoes.contexto !== undefined
            ? { 'x-identification': String(opcoes.contexto) }
            : {}),
          ...(metodo !== 'GET' ? { 'content-type': 'application/json' } : {}),
        },
        body:
          opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
      });
      const texto = await r.text();
      return {
        status: r.status,
        json: (texto ? JSON.parse(texto) : {}) as Corpo,
      };
    }
    const enviar = (
      cookie: string,
      empreendimentoId: number,
      pesquisaId: number,
      itens: unknown,
    ) =>
      chamar(
        `/empreendimentos/${empreendimentoId}/pesquisas/${pesquisaId}/resposta`,
        cookie,
        {
          metodo: 'PUT',
          corpo: { itens },
          contexto: empreendimentoId,
        },
      );
    const formulario = async (
      cookie: string,
      empreendimentoId: number,
      pesquisaId: number,
    ) => {
      const r = await chamar(
        `/empreendimentos/${empreendimentoId}/pesquisas/${pesquisaId}`,
        cookie,
        {
          contexto: empreendimentoId,
        },
      );
      return { ...r, form: r.json.data as FormularioResposta };
    };

    /** Edição aberta com o público do segmento de teste. */
    async function abrirEdicao(titulo: string) {
      const cookie = await sessao(gestor);
      const criada = await chamar('/pesquisas', cookie, {
        metodo: 'POST',
        corpo: {
          titulo,
          tipoColeta: 'consolidado',
          modeloId,
          periodoIds: [periodoId],
          abertura: instante(-DIA),
          prazo: instante(7 * DIA),
          segmentoIds: [segmentoId],
        },
      });
      assert.equal(criada.status, 201);
      const id = (criada.json.data as { id: number }).id;
      pesquisas.push(id);
      const aberta = await chamar(`/pesquisas/${id}/abertura`, cookie, {
        metodo: 'POST',
      });
      assert.equal(aberta.status, 200);
      return id;
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

      const segmento = await prisma.segmento.create({
        data: {
          chave: `teste.respostas.${Date.now()}`,
          nome: 'Segmento de teste das respostas',
          nivelCadastro: 'basico',
        },
      });
      segmentoId = segmento.id;
      for (const [nome, noSegmento] of [
        ['Pousada Respondente A', true],
        ['Hotel Respondente B', true],
        ['Hotel Fora do Público', false],
      ] as const) {
        const e = await prisma.empreendimento.create({
          data: {
            nomeFantasia: nome,
            situacao: 'ativo',
            ...(noSegmento ? { segmentos: { create: { segmentoId } } } : {}),
          },
        });
        empreendimentos.push(e.id);
      }
      [hotelA, hotelB, foraDoPublico] = empreendimentos;
      for (const [nome, perfil, vinculos] of [
        ['Gestor', 'gestor', []],
        ['Empresário A', 'empresario', [hotelA, foraDoPublico]],
        ['Empresário B', 'empresario', [hotelB]],
      ] as const) {
        const u = await prisma.usuario.create({
          data: {
            nome: `Respostas ${nome}`,
            email: `respostas-${usuarios.length}-${Date.now()}@example.test`,
            perfil,
            empreendimentos: {
              create: vinculos.map((empreendimentoId) => ({
                empreendimentoId,
              })),
            },
          },
        });
        usuarios.push(u.id);
      }
      [gestor, empresarioA, empresarioB] = usuarios;
      const periodo = await prisma.periodo.create({
        data: {
          tipo: 'feriado_prolongado',
          rotulo: 'Feriado de teste das respostas',
          dataInicio: new Date(`${dia(-40)}T00:00:00Z`),
          dataFim: new Date(`${dia(-38)}T00:00:00Z`),
        },
      });
      periodoId = periodo.id;
      const modelo = await chamar('/modelos-pesquisa', await sessao(gestor), {
        metodo: 'POST',
        corpo: {
          nome: 'Modelo de teste das respostas',
          publicoAlvo: 'Meios de hospedagem',
          campos: [
            {
              chave: 'ocupacao',
              rotulo: 'Ocupação (%)',
              tipoValor: 'percentual',
              obrigatorio: true,
              ordem: 1,
              opcoes: [],
            },
            {
              chave: 'canal',
              rotulo: 'Canal principal',
              tipoValor: 'escolha',
              obrigatorio: false,
              ordem: 2,
              opcoes: [
                { chave: 'direto', rotulo: 'Direto', ordem: 1 },
                { chave: 'agencia', rotulo: 'Agência', ordem: 2 },
              ],
            },
            {
              chave: 'observacao',
              rotulo: 'Observação',
              tipoValor: 'texto',
              obrigatorio: false,
              ordem: 3,
              opcoes: [],
            },
          ],
        },
      });
      assert.equal(modelo.status, 201, JSON.stringify(modelo.json));
      modeloId = (modelo.json.data as { id: number }).id;
    });

    after(async () => {
      if (prisma) {
        await prisma.$transaction(async (tx) => {
          const ids = { in: pesquisas };
          await tx.respostaItem.deleteMany({
            where: { resposta: { pesquisaId: ids } },
          });
          await tx.resposta.deleteMany({ where: { pesquisaId: ids } });
          await tx.pesquisaEvento.deleteMany({ where: { pesquisaId: ids } });
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
          await tx.pesquisaCampoOpcao.deleteMany({
            where: { campo: { modeloId } },
          });
          await tx.pesquisaCampo.deleteMany({ where: { modeloId } });
          await tx.pesquisaModelo.deleteMany({ where: { id: modeloId } });
          await tx.periodo.deleteMany({
            where: { id: { in: [periodoId, ...periodosExtras] } },
          });
          await tx.usuarioEmpreendimento.deleteMany({
            where: { usuarioId: { in: usuarios } },
          });
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

    it('painel e formulário respeitam vínculo, contexto e público congelado', async () => {
      const pesquisaId = await abrirEdicao('Consolidado do painel');
      const a = await sessao(empresarioA);

      const semContexto = await chamar(
        `/empreendimentos/${hotelA}/pesquisas`,
        a,
      );
      assert.equal(semContexto.status, 400);
      const painel = await chamar(
        `/empreendimentos/${hotelA}/pesquisas?$filter=pesquisaId eq ${pesquisaId}&$count=true`,
        a,
        { contexto: hotelA },
      );
      assert.equal(painel.status, 200);
      assert.equal(painel.json.meta?.total, 1);
      const [linha] = painel.json.data as PesquisaRespondenteLinha[];
      assert.ok(isPesquisaRespondenteLinha(linha));
      assert.equal(linha.situacaoResposta, 'pendente');
      assert.equal(linha.respondidaEm, null);

      // Sem vínculo: 404, sem confirmar a existência do empreendimento.
      const alheio = await chamar(`/empreendimentos/${hotelB}/pesquisas`, a, {
        contexto: hotelB,
      });
      assert.equal(alheio.status, 404);
      // Vinculado, mas fora do público congelado: o painel não lista e o formulário não existe.
      const fora = await chamar(
        `/empreendimentos/${foraDoPublico}/pesquisas?$filter=pesquisaId eq ${pesquisaId}`,
        a,
        { contexto: foraDoPublico },
      );
      assert.deepEqual(fora.json.data, []);
      assert.equal(
        (await formulario(a, foraDoPublico, pesquisaId)).status,
        404,
      );

      const { status, form } = await formulario(a, hotelA, pesquisaId);
      assert.equal(status, 200);
      assert.ok(isFormularioResposta(form));
      assert.equal(form.situacao, 'recebendo');
      assert.equal(form.resposta, null);
      assert.deepEqual(
        form.perguntas.map((p) => [p.chave, p.tipoValor, p.obrigatorio]),
        [
          ['ocupacao', 'percentual', true],
          ['canal', 'escolha', false],
          ['observacao', 'texto', false],
        ],
      );
      assert.deepEqual(form.perguntas[1].opcoes, [
        { chave: 'direto', rotulo: 'Direto' },
        { chave: 'agencia', rotulo: 'Agência' },
      ]);
      assert.equal(form.perguntas[0].opcoes, null);
    });

    it('envio valida contra a edição, é idempotente e corrige com auditoria', async () => {
      const pesquisaId = await abrirEdicao('Consolidado do envio');
      const outra = await abrirEdicao('Consolidado alheio');
      const a = await sessao(empresarioA);
      const b = await sessao(empresarioB);
      const { form } = await formulario(a, hotelA, pesquisaId);
      const [ocupacao, canal, observacao] = form.perguntas.map((p) => p.id);
      const { form: formOutra } = await formulario(a, hotelA, outra);

      const invalido = await enviar(a, hotelA, pesquisaId, [
        { perguntaId: formOutra.perguntas[0].id, valor: '10' },
        { perguntaId: canal, valor: 'telefone' },
      ]);
      assert.equal(invalido.status, 400);
      const campos = invalido.json.error?.details?.map((d) => d.field).sort();
      assert.deepEqual(
        campos,
        [
          `perguntas.${canal}`,
          `perguntas.${formOutra.perguntas[0].id}`,
          `perguntas.${ocupacao}`,
        ].sort(),
      );
      const percentual = await enviar(a, hotelA, pesquisaId, [
        { perguntaId: ocupacao, valor: '100,5' },
      ]);
      assert.equal(percentual.status, 400);
      // Autoria e empreendimento não vêm do corpo.
      const forjado = await chamar(
        `/empreendimentos/${hotelA}/pesquisas/${pesquisaId}/resposta`,
        a,
        {
          metodo: 'PUT',
          corpo: {
            itens: [],
            usuarioId: empresarioB,
            empreendimentoId: hotelB,
          },
          contexto: hotelA,
        },
      );
      assert.equal(forjado.status, 400);
      const outroHotel = await enviar(a, hotelB, pesquisaId, [
        { perguntaId: ocupacao, valor: '10' },
      ]);
      assert.equal(outroHotel.status, 404);

      const itens = [
        { perguntaId: ocupacao, valor: '72,5' },
        { perguntaId: canal, valor: 'agencia' },
        { perguntaId: observacao, valor: '' },
      ];
      const criada = await enviar(a, hotelA, pesquisaId, itens);
      assert.equal(criada.status, 201);
      const registrada = (criada.json.data as FormularioResposta).resposta!;
      assert.deepEqual(registrada.itens, [
        { perguntaId: ocupacao, valor: '72.5' },
        { perguntaId: canal, valor: 'agencia' },
      ]);
      assert.equal(registrada.atualizadaEm, null);
      assert.equal(registrada.canal, 'sistema');
      const gravada = await prisma.resposta.findUniqueOrThrow({
        where: { id: registrada.id },
      });
      assert.equal(gravada.usuarioId, empresarioA);

      // Reenvio igual (nova tentativa após perda de conexão): 200, sem nova gravação nem auditoria.
      const reenvio = await enviar(a, hotelA, pesquisaId, itens);
      assert.equal(reenvio.status, 200);
      assert.equal(
        (reenvio.json.data as FormularioResposta).resposta!.atualizadaEm,
        null,
      );

      // Duplo clique simultâneo: um cria, o outro encontra o mesmo conteúdo.
      const dobro = [{ perguntaId: ocupacao, valor: '40' }];
      const statuses = (
        await Promise.all([
          enviar(b, hotelB, pesquisaId, dobro),
          enviar(b, hotelB, pesquisaId, dobro),
        ])
      )
        .map((r) => r.status)
        .sort();
      assert.deepEqual(statuses, [200, 201]);
      assert.equal(
        await prisma.resposta.count({
          where: { pesquisaId, empreendimentoId: hotelB },
        }),
        1,
      );

      const corrigida = await enviar(a, hotelA, pesquisaId, [
        { perguntaId: ocupacao, valor: '80' },
      ]);
      assert.equal(corrigida.status, 200);
      const depois = (corrigida.json.data as FormularioResposta).resposta!;
      assert.equal(depois.id, registrada.id);
      assert.equal(depois.respondidaEm, registrada.respondidaEm);
      assert.ok(depois.atualizadaEm);
      assert.deepEqual(depois.itens, [{ perguntaId: ocupacao, valor: '80' }]);

      const auditorias = await prisma.auditoria.findMany({
        where: { entidade: 'resposta', entidadeId: registrada.id },
        orderBy: { id: 'asc' },
      });
      assert.deepEqual(
        auditorias.map((x) => x.acao),
        ['criar', 'alterar'],
      );
      assert.equal(auditorias[1].usuarioId, empresarioA);

      const painel = await chamar(
        `/empreendimentos/${hotelA}/pesquisas?$filter=situacaoResposta eq 'respondeu' and pesquisaId eq ${pesquisaId}`,
        a,
        { contexto: hotelA },
      );
      assert.equal((painel.json.data as unknown[]).length, 1);
      const destinatarios = await chamar(
        `/pesquisas/${pesquisaId}/destinatarios?$filter=situacaoResposta eq 'respondeu'&$count=true`,
        await sessao(gestor),
      );
      assert.equal(destinatarios.json.meta?.total, 2);
    });

    it('aceita corpo acima do limite padrão e aplica a validação da edição', async () => {
      const pesquisaId = await abrirEdicao('Corpo extenso');
      const a = await sessao(empresarioA);
      const itens = Array.from({ length: 100 }, (_, i) => ({
        perguntaId: 1000000 + i,
        valor: 'x'.repeat(2000),
      }));
      const resultado = await enviar(a, hotelA, pesquisaId, itens);
      assert.equal(resultado.status, 400);
      assert.equal(resultado.json.error?.code, 'ENTRADA_INVALIDA');
      assert.ok(
        resultado.json.error?.details?.some((d) =>
          d.field?.startsWith('perguntas.'),
        ),
      );
      const outraRota = await chamar(
        '/modelos-pesquisa',
        await sessao(gestor),
        { metodo: 'POST', corpo: { texto: 'x'.repeat(200000) } },
      );
      assert.equal(outraRota.status, 413);
    });

    it('registra e relê resposta válida maior que 100 KiB', async () => {
      for (let i = 0; i < 17; i++) {
        const periodo = await prisma.periodo.create({
          data: {
            tipo: 'feriado_prolongado',
            rotulo: `Período extenso ${i}`,
            dataInicio: new Date(`${dia(-1000 - i * 3)}T00:00:00Z`),
            dataFim: new Date(`${dia(-999 - i * 3)}T00:00:00Z`),
          },
        });
        periodosExtras.push(periodo.id);
      }
      const gestorCookie = await sessao(gestor);
      const criada = await chamar('/pesquisas', gestorCookie, {
        metodo: 'POST',
        corpo: {
          titulo: 'Pesquisa extensa',
          tipoColeta: 'consolidado',
          modeloId,
          periodoIds: [periodoId, ...periodosExtras],
          abertura: instante(-DIA),
          prazo: instante(DIA),
          segmentoIds: [segmentoId],
        },
      });
      assert.equal(criada.status, 201, JSON.stringify(criada.json));
      const pesquisaId = (criada.json.data as { id: number }).id;
      pesquisas.push(pesquisaId);
      assert.equal(
        (
          await chamar(`/pesquisas/${pesquisaId}/abertura`, gestorCookie, {
            metodo: 'POST',
          })
        ).status,
        200,
      );
      const cookie = await sessao(empresarioA);
      const { form } = await formulario(cookie, hotelA, pesquisaId);
      const texto = '界'.repeat(2000);
      const itens = form.perguntas
        .filter((p) => p.chave !== 'canal')
        .map((p) => ({
          perguntaId: p.id,
          valor: p.chave === 'observacao' ? texto : '50',
        }));
      assert.ok(
        Buffer.byteLength(JSON.stringify({ itens }), 'utf8') > 100 * 1024,
      );
      const envio = await enviar(cookie, hotelA, pesquisaId, itens);
      assert.equal(envio.status, 201, JSON.stringify(envio.json.error));
      const lida = await formulario(cookie, hotelA, pesquisaId);
      assert.equal(lida.status, 200);
      assert.equal(lida.form.resposta?.itens.length, 36);
      for (const pergunta of form.perguntas.filter(
        (p) => p.chave === 'observacao',
      )) {
        assert.equal(
          lida.form.resposta?.itens.find((i) => i.perguntaId === pergunta.id)
            ?.valor,
          texto,
        );
      }
    });

    it('autoriza a operação efetiva e preserva consulta de resposta legada', async () => {
      const pesquisaId = await abrirEdicao('Resposta legada');
      const a = await sessao(empresarioA);
      const { form } = await formulario(a, hotelA, pesquisaId);
      const itens = [{ perguntaId: form.perguntas[0].id, valor: '30' }];
      assert.equal((await enviar(a, hotelA, pesquisaId, itens)).status, 201);
      const regras = await prisma.permissaoPerfil.findMany({
        where: {
          perfil: 'empresario',
          recurso: 'respostas',
          acao: { in: ['criar', 'alterar'] },
        },
      });
      try {
        await prisma.permissaoPerfil.updateMany({
          where: { perfil: 'empresario', recurso: 'respostas', acao: 'criar' },
          data: { escopo: 'nenhum' },
        });
        assert.equal(
          (await enviar(a, hotelA, pesquisaId, [{ ...itens[0], valor: '35' }]))
            .status,
          200,
        );
        await prisma.permissaoPerfil.updateMany({
          where: {
            perfil: 'empresario',
            recurso: 'respostas',
            acao: 'alterar',
          },
          data: { escopo: 'nenhum' },
        });
        assert.equal(
          (await enviar(a, hotelA, pesquisaId, [{ ...itens[0], valor: '40' }]))
            .status,
          403,
        );
        await prisma.pesquisaDestinatario.delete({
          where: {
            pesquisaId_empreendimentoId: {
              pesquisaId,
              empreendimentoId: hotelA,
            },
          },
        });
        const legado = await formulario(a, hotelA, pesquisaId);
        assert.equal(legado.status, 200);
        assert.deepEqual(legado.form.resposta?.itens, [
          { perguntaId: form.perguntas[0].id, valor: '35' },
        ]);
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
      }
    });

    it('rejeita envio que espera a trava administrativa até o prazo vencer', async () => {
      const pesquisaId = await abrirEdicao('Prazo durante trava');
      const a = await sessao(empresarioA);
      const { form } = await formulario(a, hotelA, pesquisaId);
      let liberar!: () => void;
      let travada!: () => void;
      let prazo = 0;
      const pronto = new Promise<void>((resolve) => {
        travada = resolve;
      });
      const fim = new Promise<void>((resolve) => {
        liberar = resolve;
      });
      const administracao = prisma.$transaction(
        async (tx) => {
          await tx.pesquisa.update({
            where: { id: pesquisaId },
            data: { prazo: new Date((prazo = Date.now() + 3000)) },
          });
          travada();
          await fim;
        },
        { timeout: 12000 },
      );
      await pronto;
      const envio = enviar(a, hotelA, pesquisaId, [
        { perguntaId: form.perguntas[0].id, valor: '50' },
      ]);
      try {
        let bloqueado = false;
        for (let tentativa = 0; tentativa < 100; tentativa++) {
          const linhas = await prisma.$queryRaw<{ bloqueado: boolean }[]>`
            SELECT EXISTS (SELECT 1 FROM pg_stat_activity
              WHERE wait_event_type = 'Lock' AND query LIKE '%FOR SHARE%'
              AND query LIKE '%pesquisa%') AS bloqueado`;
          if (linhas[0].bloqueado) {
            bloqueado = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        assert.ok(bloqueado, 'envio aguardou a trava da pesquisa');
        assert.ok(Date.now() < prazo, 'bloqueio observado antes do prazo');
        await prisma.$queryRaw`SELECT pg_sleep(3.2)::text`;
      } finally {
        liberar();
        await administracao;
      }
      const resultado = await envio;
      assert.equal(resultado.status, 409);
      assert.equal(resultado.json.error?.code, 'PESQUISA_FORA_DO_PRAZO');
      assert.equal(await prisma.resposta.count({ where: { pesquisaId } }), 0);
    });

    it('prazo vencido e encerramento bloqueiam envio, mas a resposta segue consultável', async () => {
      const pesquisaId = await abrirEdicao('Consolidado do prazo');
      const a = await sessao(empresarioA);
      const { form } = await formulario(a, hotelA, pesquisaId);
      const itens = [{ perguntaId: form.perguntas[0].id, valor: '55' }];
      assert.equal((await enviar(a, hotelA, pesquisaId, itens)).status, 201);

      await prisma.pesquisa.update({
        where: { id: pesquisaId },
        data: {
          abertura: new Date(Date.now() - 2 * DIA),
          prazo: new Date(Date.now() - 1000),
        },
      });
      const vencida = await enviar(a, hotelA, pesquisaId, [
        { perguntaId: form.perguntas[0].id, valor: '60' },
      ]);
      assert.equal(vencida.status, 409);
      assert.equal(vencida.json.error?.code, 'PESQUISA_FORA_DO_PRAZO');
      assert.equal((await enviar(a, hotelA, pesquisaId, itens)).status, 409);
      const consulta = await formulario(a, hotelA, pesquisaId);
      assert.equal(consulta.form.situacao, 'expirada');
      assert.deepEqual(consulta.form.resposta?.itens, [
        { perguntaId: form.perguntas[0].id, valor: '55' },
      ]);

      await prisma.pesquisa.update({
        where: { id: pesquisaId },
        data: {
          prazo: new Date(Date.now() + DIA),
          status: 'encerrada',
          encerradaEm: new Date(),
        },
      });
      const encerrada = await enviar(a, hotelA, pesquisaId, itens);
      assert.equal(encerrada.status, 409);
      assert.equal(encerrada.json.error?.code, 'PESQUISA_FORA_DO_PRAZO');
    });
  },
);
