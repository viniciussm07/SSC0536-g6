import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { isVersaoInventarioDetalhe, type Perfil } from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  meta?: { total?: number };
  error?: { code: string; details?: { field?: string; message?: string }[] };
}
type Detalhe = {
  id: number;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  tipoAlteracao: string;
  situacaoConferencia: string;
  substituidaPorId: number | null;
  autor: string;
  capacidade: Record<string, { estado: string; valor: unknown }>;
  itens: {
    itemId: number;
    itemVersao: number;
    estado: string;
    detalhe: string | null;
  }[];
};

const hoje = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );
const somar = (iso: string, dias: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + dias * 86_400_000)
    .toISOString()
    .slice(0, 10);

describe(
  'Inventário versionado HTTP/PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const perfis = new Map<string, number>();
    const usuarios: number[] = [];
    const empreendimentos: number[] = [];
    let empresa = 0;
    let outra = 0;
    let segmentoId = 0;
    const itens = { nao: 0, sanitario: 0, outros: 0, inativo: 0 };

    async function sessao(chave: string) {
      const token = novoToken();
      await prisma.sessao.create({
        data: {
          tokenHash: hashToken(token),
          usuarioId: perfis.get(chave)!,
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
      contexto: number | null = empresa,
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
          ...(contexto ? { 'x-identification': String(contexto) } : {}),
        },
        body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      });
      return { status: r.status, json: (await r.json()) as Corpo };
    }
    const caminho = (id = empresa) => `/empreendimentos/${id}/inventarios`;
    const detalhe = (r: { json: Corpo }) => r.json.data as Detalhe;
    const campos = (r: { json: Corpo }) =>
      (r.json.error?.details ?? []).map((d) => d.field).sort();
    const linhaDoTempo = (id = empresa) =>
      prisma.inventarioVersao.findMany({
        where: { empreendimentoId: id, substituidaPorId: null },
        orderBy: { vigenciaInicio: 'asc' },
      });

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
      for (const [chave, perfil] of [
        ['gestor', 'gestor'],
        ['empresario', 'empresario'],
        ['outro', 'empresario'],
      ] as [string, Perfil][]) {
        const u = await prisma.usuario.create({
          data: {
            nome: `Inventário ${chave}`,
            email: `inventario-${chave}@example.test`,
            perfil,
          },
        });
        usuarios.push(u.id);
        perfis.set(chave, u.id);
      }
      segmentoId = (
        await prisma.segmento.create({
          data: {
            chave: 'inventario.teste',
            nome: 'Segmento inventário',
            nivelCadastro: 'completo',
          },
        })
      ).id;
      for (const nomeFantasia of ['Hotel Inventário', 'Pousada Alheia'])
        empreendimentos.push(
          (
            await prisma.empreendimento.create({
              data: {
                nomeFantasia,
                situacao: 'ativo',
                segmentos: { create: { segmentoId } },
              },
            })
          ).id,
        );
      [empresa, outra] = empreendimentos;
      await prisma.usuarioEmpreendimento.createMany({
        data: [
          { usuarioId: perfis.get('empresario')!, empreendimentoId: empresa },
          { usuarioId: perfis.get('outro')!, empreendimentoId: outra },
        ],
      });
      const grupo = await prisma.catalogoGrupo.create({
        data: {
          segmentoId,
          chave: 'inv.recepcao',
          pergunta: 'Recepção?',
          selecao: 'multipla',
          permiteOutro: true,
          ordem: 1,
        },
      });
      for (const [chave, rotulo, extra] of [
        ['nao', 'Não', { exclusivo: true }],
        ['sanitario', 'Sanitário', {}],
        ['outros', 'Outros', { outro: true }],
        ['inativo', 'Antigo', { ativo: false }],
      ] as const) {
        const item = await prisma.catalogoItem.create({
          data: {
            grupoId: grupo.id,
            chave: `inv.recepcao.${chave}`,
            rotulo,
            ordem: 1,
            exclusivo: false,
            ...extra,
          },
        });
        await prisma.catalogoItemVersao.create({
          data: {
            itemId: item.id,
            numero: 1,
            rotulo,
            pergunta: grupo.pergunta,
            selecao: grupo.selecao,
            exclusivo: item.exclusivo,
            outro: item.outro,
            aceitaQuantidade: false,
            criadaEm: new Date(),
          },
        });
        itens[chave] = item.id;
      }
    });

    after(async () => {
      if (prisma) {
        await prisma.$transaction(async (tx) => {
          const ids = { in: empreendimentos };
          await tx.inventarioItem.deleteMany({
            where: { versao: { empreendimentoId: ids } },
          });
          // Substituídas apontam para as substitutas (RESTRICT): saem primeiro, sem "reviver" ninguém.
          await tx.inventarioVersao.deleteMany({
            where: { empreendimentoId: ids, substituidaPorId: { not: null } },
          });
          await tx.inventarioVersao.deleteMany({
            where: { empreendimentoId: ids },
          });
          await tx.usuarioEmpreendimento.deleteMany({
            where: { usuarioId: { in: usuarios } },
          });
          await tx.empreendimentoSegmento.deleteMany({
            where: { empreendimentoId: ids },
          });
          await tx.empreendimento.deleteMany({ where: { id: ids } });
          await tx.$executeRaw`ALTER TABLE catalogo_item_versao DISABLE TRIGGER catalogo_item_versao_imutavel`;
          await tx.catalogoItemVersao.deleteMany({
            where: { item: { grupo: { segmentoId } } },
          });
          await tx.$executeRaw`ALTER TABLE catalogo_item_versao ENABLE TRIGGER catalogo_item_versao_imutavel`;
          await tx.catalogoItem.deleteMany({
            where: { grupo: { segmentoId } },
          });
          await tx.catalogoGrupo.deleteMany({ where: { segmentoId } });
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

    it('empresário cria a primeira versão: autoria da sessão, estados preservados e auditoria atômica', async () => {
      const empresario = await sessao('empresario');
      const forjada = await chamar(caminho(), empresario, 'POST', {
        tipoAlteracao: 'mudanca_real',
        vigenciaInicio: hoje(),
        criadaPor: perfis.get('gestor'),
      });
      assert.equal(forjada.status, 400);
      assert.deepEqual(campos(forjada), ['criadaPor']);

      const r = await chamar(caminho(), empresario, 'POST', {
        tipoAlteracao: 'mudanca_real',
        vigenciaInicio: hoje(),
        capacidade: {
          totalUh: 10,
          leitos: 0,
          uhsPcd: { estado: 'nao_se_aplica' },
          funcTemporarios: null,
          funciona24h: false,
          checkin: '14:00',
        },
        itens: [
          { itemId: itens.sanitario, estado: 'sim' },
          { itemId: itens.outros, estado: 'sim', detalhe: 'Lavanderia' },
          { itemId: itens.nao, estado: 'nao_informado' },
        ],
      });
      assert.equal(r.status, 201, JSON.stringify(r.json));
      const v1 = detalhe(r);
      assert.ok(isVersaoInventarioDetalhe(v1));
      assert.equal(v1.autor, 'Inventário empresario');
      assert.equal(v1.situacaoConferencia, 'pendente');
      assert.equal(v1.vigenciaFim, null);
      assert.deepEqual(v1.capacidade.leitos, { estado: 'informado', valor: 0 });
      assert.deepEqual(v1.capacidade.uhsPcd, {
        estado: 'nao_se_aplica',
        valor: null,
      });
      assert.deepEqual(v1.capacidade.funcTemporarios, {
        estado: 'desconhecido',
        valor: null,
      });
      assert.deepEqual(v1.capacidade.maxLeitosPorUh, {
        estado: 'desconhecido',
        valor: null,
      });
      assert.deepEqual(v1.capacidade.funciona24h, {
        estado: 'informado',
        valor: false,
      });
      assert.deepEqual(v1.capacidade.checkin, {
        estado: 'informado',
        valor: '14:00',
      });
      assert.deepEqual(
        v1.itens.map((i) => [i.itemId, i.estado, i.itemVersao]).sort(),
        [
          [itens.nao, 'nao_informado', 1],
          [itens.sanitario, 'sim', 1],
          [itens.outros, 'sim', 1],
        ].sort(),
      );
      const linha = await prisma.inventarioVersao.findUniqueOrThrow({
        where: { id: v1.id },
      });
      assert.equal(linha.criadaPor, perfis.get('empresario'));
      assert.deepEqual(linha.estados, {
        maxLeitosPorUh: 'desconhecido',
        uhsPcd: 'nao_se_aplica',
        funcFixos: 'desconhecido',
        funcTemporarios: 'desconhecido',
        checkout: 'desconhecido',
      });
      const trilha = await prisma.auditoria.findMany({
        where: { entidade: 'inventario_versao', entidadeId: v1.id },
      });
      assert.deepEqual(
        trilha.map((t) => [t.acao, t.usuarioId]),
        [['criar', perfis.get('empresario')]],
      );

      // Leitura: vigente hoje, detalhe e coleção OData com os novos campos.
      const vigente = await chamar(`${caminho()}/vigente`, empresario);
      assert.equal(detalhe(vigente).id, v1.id);
      assert.equal(
        detalhe(await chamar(`${caminho()}/${v1.id}`, empresario)).id,
        v1.id,
      );
      const lista = await chamar(
        `${caminho()}?$count=true&$filter=${encodeURIComponent("autor eq 'Inventário empresario' and substituidaPorId eq null")}`,
        empresario,
      );
      assert.equal(lista.json.meta?.total, 1);
      assert.equal(
        (await chamar(`${caminho()}/vigente?data=2000-01-01`, empresario)).json
          .data,
        null,
      );
      assert.equal(
        (await chamar(`${caminho()}/vigente?data=ontem`, empresario)).status,
        400,
      );
    });

    it('acesso cruzado e contexto: outro empresário não lê nem grava; contexto divergente é recusado', async () => {
      const outro = await sessao('outro');
      for (const [metodo, corpo] of [
        ['GET', undefined],
        ['POST', { tipoAlteracao: 'mudanca_real', vigenciaInicio: hoje() }],
      ] as const)
        assert.equal(
          (await chamar(caminho(), outro, metodo, corpo, empresa)).status,
          404,
          metodo,
        );
      const [v1] = await linhaDoTempo();
      assert.equal(
        (
          await chamar(
            `${caminho()}/${v1.id}`,
            outro,
            'GET',
            undefined,
            empresa,
          )
        ).status,
        404,
      );
      const empresario = await sessao('empresario');
      assert.ok(
        (
          await chamar(
            `${caminho()}/vigente`,
            empresario,
            'GET',
            undefined,
            null,
          )
        ).status >= 400,
      );
      assert.ok(
        (
          await chamar(
            `${caminho()}/vigente`,
            empresario,
            'GET',
            undefined,
            outra,
          )
        ).status >= 400,
      );
    });

    it('mudança real futura fecha a anterior no dia anterior (fim inclusivo), herda campos e itens', async () => {
      const gestor = await sessao('gestor');
      const inicio = somar(hoje(), 30);
      const r = await chamar(caminho(), gestor, 'POST', {
        tipoAlteracao: 'mudanca_real',
        vigenciaInicio: inicio,
        capacidade: { totalUh: 12, leitos: { estado: 'nao_se_aplica' } },
      });
      assert.equal(r.status, 201, JSON.stringify(r.json));
      const v2 = detalhe(r);
      assert.equal(v2.autor, 'Inventário gestor');
      assert.deepEqual(v2.capacidade.totalUh, {
        estado: 'informado',
        valor: 12,
      });
      assert.deepEqual(v2.capacidade.leitos, {
        estado: 'nao_se_aplica',
        valor: null,
      });
      // Herdados da versão anterior: horário, funcionamento e itens (com a versão de item usada).
      assert.deepEqual(v2.capacidade.checkin, {
        estado: 'informado',
        valor: '14:00',
      });
      assert.deepEqual(v2.capacidade.uhsPcd, {
        estado: 'nao_se_aplica',
        valor: null,
      });
      assert.equal(v2.itens.length, 3);
      const [v1, ,] = await linhaDoTempo();
      assert.equal(
        v1.vigenciaFim?.toISOString().slice(0, 10),
        somar(inicio, -1),
      );
      // Fronteira inclusiva: no último dia da v1 vale a v1; no dia seguinte, a v2.
      const empresario = await sessao('empresario');
      assert.equal(
        detalhe(
          await chamar(
            `${caminho()}/vigente?data=${somar(inicio, -1)}`,
            empresario,
          ),
        ).id,
        v1.id,
      );
      assert.equal(
        detalhe(await chamar(`${caminho()}/vigente?data=${inicio}`, empresario))
          .id,
        v2.id,
      );
      // Fecho da versão anterior fica auditado, com autor.
      const fecho = await prisma.auditoria.findMany({
        where: {
          entidade: 'inventario_versao',
          entidadeId: v1.id,
          acao: 'alterar',
        },
      });
      assert.equal(fecho.length, 1);
      assert.equal(fecho[0].usuarioId, perfis.get('gestor'));
      assert.deepEqual(
        (fecho[0].antes as { vigenciaFim: unknown }).vigenciaFim,
        null,
      );
      // Mesmo dia de início de versão existente: correção, não mudança real.
      const repetida = await chamar(caminho(), gestor, 'POST', {
        tipoAlteracao: 'mudanca_real',
        vigenciaInicio: inicio,
      });
      assert.equal(repetida.status, 400);
      assert.deepEqual(campos(repetida), ['vigenciaInicio']);
    });

    it('retroativa: empresário é recusado; equipe registra antes da primeira versão; itens exclusivos e "outro" validados', async () => {
      const empresario = await sessao('empresario');
      const gestor = await sessao('gestor');
      const retro = somar(hoje(), -1);
      const recusada = await chamar(caminho(), empresario, 'POST', {
        tipoAlteracao: 'mudanca_real',
        vigenciaInicio: retro,
      });
      assert.equal(recusada.status, 403);
      assert.equal(recusada.json.error?.code, 'ALTERACAO_RETROATIVA_RESTRITA');
      // O estado final do catálogo respeita as regras do grupo, também com valores herdados da base.
      const conflito = await chamar(caminho(), gestor, 'POST', {
        tipoAlteracao: 'mudanca_real',
        vigenciaInicio: somar(hoje(), 200),
        itens: [{ itemId: itens.nao, estado: 'sim' }],
      });
      assert.equal(conflito.status, 400);
      assert.deepEqual(campos(conflito), ['grupos.inv.recepcao']);
      assert.deepEqual(
        campos(
          await chamar(caminho(), gestor, 'POST', {
            tipoAlteracao: 'mudanca_real',
            vigenciaInicio: somar(hoje(), 200),
            itens: [{ itemId: itens.outros, estado: 'sim', detalhe: ' ' }],
          }),
        ),
        ['itens[0].detalhe'],
      );
      assert.deepEqual(
        campos(
          await chamar(caminho(), gestor, 'POST', {
            tipoAlteracao: 'mudanca_real',
            vigenciaInicio: somar(hoje(), 200),
            itens: [{ itemId: itens.inativo, estado: 'sim' }],
          }),
        ),
        ['itens[0].itemId'],
      );
      const ok = await chamar(caminho(), gestor, 'POST', {
        tipoAlteracao: 'mudanca_real',
        vigenciaInicio: retro,
        capacidade: { funcFixos: 4 },
      });
      assert.equal(ok.status, 201, JSON.stringify(ok.json));
      // Sem versão que cubra a data, a nova vai até o dia anterior à próxima versão.
      const linha = await linhaDoTempo();
      assert.deepEqual(
        linha.map((v) => [
          v.vigenciaInicio.toISOString().slice(0, 10),
          v.vigenciaFim?.toISOString().slice(0, 10) ?? null,
        ]),
        [
          [retro, retro],
          [hoje(), somar(hoje(), 29)],
          [somar(hoje(), 30), null],
        ],
      );
    });

    it('correção substitui a versão no mesmo intervalo sem apagar a evidência anterior', async () => {
      const empresario = await sessao('empresario');
      const [, , v2] = await linhaDoTempo();
      const semMotivo = await chamar(caminho(), empresario, 'POST', {
        tipoAlteracao: 'correcao',
        corrigeId: v2.id,
      });
      assert.equal(semMotivo.status, 400);
      assert.deepEqual(campos(semMotivo), ['motivo']);
      const comData = await chamar(caminho(), empresario, 'POST', {
        tipoAlteracao: 'correcao',
        corrigeId: v2.id,
        motivo: 'x',
        vigenciaInicio: hoje(),
      });
      assert.deepEqual(campos(comData), ['vigenciaInicio']);
      const r = await chamar(caminho(), empresario, 'POST', {
        tipoAlteracao: 'correcao',
        corrigeId: v2.id,
        motivo: 'Leitos digitados errado',
        capacidade: { leitos: 18 },
      });
      assert.equal(r.status, 201, JSON.stringify(r.json));
      const corrigida = detalhe(r);
      assert.equal(corrigida.tipoAlteracao, 'correcao');
      assert.equal(
        corrigida.vigenciaInicio,
        v2.vigenciaInicio.toISOString().slice(0, 10),
      );
      assert.deepEqual(corrigida.capacidade.leitos, {
        estado: 'informado',
        valor: 18,
      });
      assert.deepEqual(corrigida.capacidade.totalUh, {
        estado: 'informado',
        valor: 12,
      });
      // A versão corrigida continua consultável e aponta para a substituta.
      const antiga = detalhe(await chamar(`${caminho()}/${v2.id}`, empresario));
      assert.equal(antiga.substituidaPorId, corrigida.id);
      assert.deepEqual(antiga.capacidade.leitos, {
        estado: 'nao_se_aplica',
        valor: null,
      });
      assert.equal(
        detalhe(
          await chamar(
            `${caminho()}/vigente?data=${somar(hoje(), 40)}`,
            empresario,
          ),
        ).id,
        corrigida.id,
      );
      // Corrigir de novo a substituída não vale; a substituta sim.
      assert.deepEqual(
        campos(
          await chamar(caminho(), empresario, 'POST', {
            tipoAlteracao: 'correcao',
            corrigeId: v2.id,
            motivo: 'de novo',
          }),
        ),
        ['corrigeId'],
      );
      assert.equal(
        (
          await chamar(caminho(), empresario, 'POST', {
            tipoAlteracao: 'correcao',
            corrigeId: corrigida.id,
            motivo: 'ajuste',
          })
        ).status,
        201,
      );
      // Coleção mostra tudo; filtro separa as vigentes das substituídas.
      const todas = await chamar(
        `${caminho()}?$count=true&$top=100`,
        empresario,
      );
      const vigentes = await chamar(
        `${caminho()}?$count=true&$filter=${encodeURIComponent('substituidaPorId eq null')}`,
        empresario,
      );
      assert.equal(
        (todas.json.meta?.total ?? 0) - (vigentes.json.meta?.total ?? 0),
        2,
      );
      const trilha = await prisma.auditoria.findMany({
        where: {
          entidade: 'inventario_versao',
          entidadeId: v2.id,
          acao: 'alterar',
        },
      });
      assert.ok(
        trilha.some(
          (t) =>
            (t.depois as { substituidaPorId?: number }).substituidaPorId ===
            corrigida.id,
        ),
      );
    });

    it('banco protege a linha do tempo: sem sobreposição e sem reescrever o conteúdo', async () => {
      // Versão com itens (a primeira criada pelo empresário), para exercitar também o gatilho dos itens.
      const v1 = await prisma.inventarioVersao.findFirstOrThrow({
        where: {
          empreendimentoId: empresa,
          criadaPor: perfis.get('empresario')!,
          tipoAlteracao: 'mudanca_real',
        },
        orderBy: { id: 'asc' },
      });
      await assert.rejects(
        prisma.inventarioVersao.create({
          data: {
            empreendimentoId: empresa,
            criadaPor: perfis.get('gestor')!,
            vigenciaInicio: v1.vigenciaInicio,
            vigenciaFim: v1.vigenciaFim,
            tipoAlteracao: 'mudanca_real',
            situacaoConferencia: 'pendente',
          },
        }),
        /inventario_versao_vigencia_excl|23P01|exclusion/i,
      );
      await assert.rejects(
        prisma.inventarioVersao.update({
          where: { id: v1.id },
          data: { totalUh: 999 },
        }),
        /imutável/,
      );
      await assert.rejects(
        prisma.inventarioItem.updateMany({
          where: { versaoId: v1.id },
          data: { estado: 'nao' },
        }),
        /imutável/,
      );
      await assert.rejects(
        prisma.inventarioVersao.update({
          where: { id: v1.id },
          data: { vigenciaFim: new Date('2000-01-01') },
        }),
        /check|vigencia/i,
      );
      // Conferência e fim da vigência são os campos que podem mudar.
      await prisma.inventarioVersao.update({
        where: { id: v1.id },
        data: { situacaoConferencia: 'parcial' },
      });
    });

    it('duas atualizações concorrentes no mesmo dia não criam vigências conflitantes', async () => {
      const empresario = await sessao('outro');
      const inicio = somar(hoje(), 60);
      const envio = (leitos: number) =>
        chamar(
          `/empreendimentos/${outra}/inventarios`,
          empresario,
          'POST',
          {
            tipoAlteracao: 'mudanca_real',
            vigenciaInicio: inicio,
            capacidade: { leitos },
          },
          outra,
        );
      const resultados = await Promise.all([envio(10), envio(11), envio(12)]);
      const status = resultados.map((r) => r.status).sort();
      assert.deepEqual(
        status,
        [201, 400, 400],
        JSON.stringify(resultados.map((r) => r.json)),
      );
      const linha = await linhaDoTempo(outra);
      assert.equal(linha.length, 1);
      // Duas mudanças diferentes em paralelo também terminam sem sobreposição.
      const a = somar(hoje(), 90);
      const b = somar(hoje(), 100);
      const paralelas = await Promise.all(
        [a, b].map((d) =>
          chamar(
            `/empreendimentos/${outra}/inventarios`,
            empresario,
            'POST',
            { tipoAlteracao: 'mudanca_real', vigenciaInicio: d },
            outra,
          ),
        ),
      );
      assert.deepEqual(
        paralelas.map((r) => r.status),
        [201, 201],
      );
      const final = await linhaDoTempo(outra);
      for (let i = 1; i < final.length; i++)
        assert.ok(
          final[i - 1].vigenciaFim !== null &&
            final[i - 1].vigenciaFim! < final[i].vigenciaInicio,
          'versões não podem se sobrepor',
        );
    });

    it('conferência é da equipe; completo exige UH e leitos informados; substituída não se confere', async () => {
      const empresario = await sessao('empresario');
      const gestor = await sessao('gestor');
      const v2 = await prisma.inventarioVersao.findFirstOrThrow({
        where: { empreendimentoId: empresa, substituidaPorId: { not: null } },
      });
      const alvo = `${caminho()}/${v2.id}/conferencia`;
      assert.equal(
        (
          await chamar(alvo, empresario, 'PUT', {
            situacaoConferencia: 'completo',
          })
        ).json.error?.code,
        'CONFERENCIA_RESTRITA',
      );
      assert.equal(
        (await chamar(alvo, gestor, 'PUT', { situacaoConferencia: 'ok' }))
          .status,
        400,
      );
      const base = await chamar(caminho(), gestor, 'POST', {
        tipoAlteracao: 'mudanca_real',
        vigenciaInicio: somar(hoje(), 45),
        capacidade: { leitos: null },
      });
      assert.equal(base.status, 201, JSON.stringify(base.json));
      const incompleta = detalhe(base);
      const recusada = await chamar(
        `${caminho()}/${incompleta.id}/conferencia`,
        gestor,
        'PUT',
        {
          situacaoConferencia: 'completo',
        },
      );
      assert.equal(recusada.status, 400);
      assert.deepEqual(campos(recusada), ['situacaoConferencia']);
      const ok = await chamar(alvo, gestor, 'PUT', {
        situacaoConferencia: 'completo',
        motivo: 'Conferido por telefone',
      });
      // v2 foi substituída por correção: não se confere.
      assert.equal(ok.json.error?.code, 'VERSAO_SUBSTITUIDA');
      const vigente = (await linhaDoTempo()).find(
        (v) => v.totalUh !== null && v.leitos !== null,
      )!;
      const conferida = await chamar(
        `${caminho()}/${vigente.id}/conferencia`,
        gestor,
        'PUT',
        {
          situacaoConferencia: 'completo',
          motivo: 'Conferido por telefone',
        },
      );
      assert.equal(conferida.status, 200, JSON.stringify(conferida.json));
      assert.equal(detalhe(conferida).situacaoConferencia, 'completo');
      const trilha = await prisma.auditoria.findMany({
        where: {
          entidade: 'inventario_versao',
          entidadeId: vigente.id,
          acao: 'alterar',
        },
        orderBy: { id: 'desc' },
      });
      assert.deepEqual(
        (trilha[0].depois as { situacaoConferencia: string })
          .situacaoConferencia,
        'completo',
      );
      assert.equal(trilha[0].usuarioId, perfis.get('gestor'));
      // Sem mudança, nada é auditado de novo.
      await chamar(`${caminho()}/${vigente.id}/conferencia`, gestor, 'PUT', {
        situacaoConferencia: 'completo',
      });
      assert.equal(
        await prisma.auditoria.count({
          where: {
            entidade: 'inventario_versao',
            entidadeId: vigente.id,
            acao: 'alterar',
          },
        }),
        trilha.length,
      );
    });

    it('catálogo editado depois não muda a leitura histórica; nova versão usa a versão atual do item', async () => {
      const gestor = await sessao('gestor');
      const primeira = await prisma.inventarioVersao.findFirstOrThrow({
        where: {
          empreendimentoId: empresa,
          criadaPor: perfis.get('empresario')!,
          tipoAlteracao: 'mudanca_real',
        },
        orderBy: { id: 'asc' },
      });
      // Edição do catálogo (versão 2 do item "Sanitário").
      await prisma.catalogoItem.update({
        where: { id: itens.sanitario },
        data: { rotulo: 'Sanitário PCD', versaoAtual: 2 },
      });
      await prisma.catalogoItemVersao.create({
        data: {
          itemId: itens.sanitario,
          numero: 2,
          rotulo: 'Sanitário PCD',
          pergunta: 'Recepção?',
          selecao: 'multipla',
          exclusivo: false,
          outro: false,
          aceitaQuantidade: false,
          criadaEm: new Date(),
        },
      });
      const historico = detalhe(
        await chamar(`${caminho()}/${primeira.id}`, gestor),
      );
      assert.equal(
        historico.itens.find((i) => i.itemId === itens.sanitario)?.itemVersao,
        1,
      );
      const snapshot = await prisma.inventarioItem.findFirstOrThrow({
        where: { versaoId: primeira.id, itemId: itens.sanitario },
        include: { snapshot: true },
      });
      assert.equal(snapshot.snapshot.rotulo, 'Sanitário');
      const nova = await chamar(caminho(), gestor, 'POST', {
        tipoAlteracao: 'mudanca_real',
        vigenciaInicio: somar(hoje(), 120),
        itens: [{ itemId: itens.sanitario, estado: 'nao' }],
      });
      assert.equal(nova.status, 201, JSON.stringify(nova.json));
      const atualizado = detalhe(nova).itens.find(
        (i) => i.itemId === itens.sanitario,
      )!;
      assert.deepEqual([atualizado.estado, atualizado.itemVersao], ['nao', 2]);
      // Item herdado mantém a versão com que foi respondido.
      assert.equal(
        detalhe(nova).itens.find((i) => i.itemId === itens.outros)?.itemVersao,
        1,
      );
    });
  },
);
