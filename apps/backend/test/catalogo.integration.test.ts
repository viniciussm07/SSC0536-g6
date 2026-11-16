import { dadosCsv } from './csv-helper';
import { COLECOES } from '@ssc0536/common';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  isFormularioCatalogo,
  isGrupoCatalogo,
  isItemCatalogo,
  type Perfil,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';
import {
  GRUPOS_HOSPEDAGEM_V1,
  carregarCatalogoHospedagem,
} from '../src/catalogo/carga-hospedagem';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  meta?: { total?: number };
  error?: { code: string; details?: { field?: string; message?: string }[] };
}
class Reverter extends Error {}

describe(
  'Catálogos do inventário HTTP/PostgreSQL',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const perfis = new Map<Perfil, number>();
    const usuarios: number[] = [];
    let segmentoId = 0;
    let empreendimentoId = 0;

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
    const dados = <T>(r: { json: Corpo }) => r.json.data as T;

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
            nome: `Catálogo ${perfil}`,
            email: `catalogo-${perfil}@example.test`,
            perfil,
          },
        });
        usuarios.push(u.id);
        perfis.set(perfil, u.id);
      }
      segmentoId = (
        await prisma.segmento.create({
          data: {
            chave: 'catalogo.teste',
            nome: 'Segmento de teste do catálogo',
            nivelCadastro: 'completo',
          },
        })
      ).id;
      empreendimentoId = (
        await prisma.empreendimento.create({
          data: { nomeFantasia: 'Hotel Catálogo', situacao: 'ativo' },
        })
      ).id;
    });

    after(async () => {
      if (prisma) {
        await prisma.$transaction(async (tx) => {
          await tx.inventarioItem.deleteMany({
            where: { versao: { empreendimentoId } },
          });
          await tx.inventarioVersao.deleteMany({ where: { empreendimentoId } });
          await tx.empreendimento.deleteMany({
            where: { id: empreendimentoId },
          });
          // Snapshots são imutáveis por gatilho; a limpeza do teste o suspende só nesta transação.
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

    it('carga v1 do dicionário: idempotente, não destrutiva e com versão 1 imutável (reverte ao final)', async () => {
      const totalItens = GRUPOS_HOSPEDAGEM_V1.reduce(
        (soma, grupo) => soma + grupo.itens.length,
        0,
      );
      assert.equal(totalItens, 160, 'uma opção por coluna AZ:HC');
      let primeira!: Awaited<ReturnType<typeof carregarCatalogoHospedagem>>;
      let segunda!: Awaited<ReturnType<typeof carregarCatalogoHospedagem>>;
      await assert.rejects(
        prisma.$transaction(async (tx) => {
          primeira = await carregarCatalogoHospedagem(tx);
          // Edição da gestão não é sobrescrita por uma nova carga.
          const item = await tx.catalogoItem.findFirstOrThrow({
            where: { chave: 'hospedagem.geral.pet' },
          });
          await tx.catalogoItem.update({
            where: { id: item.id },
            data: { rotulo: 'Pet (editado pela gestão)' },
          });
          segunda = await carregarCatalogoHospedagem(tx);
          const depois = await tx.catalogoItem.findUniqueOrThrow({
            where: { id: item.id },
          });
          assert.equal(depois.rotulo, 'Pet (editado pela gestão)');
          const naoExclusivos = await tx.catalogoItem.count({
            where: {
              rotulo: 'Não',
              exclusivo: false,
              chave: { startsWith: 'hospedagem.' },
            },
          });
          assert.equal(naoExclusivos, 0);
          const sem1 = await tx.catalogoItem.count({
            where: {
              chave: { startsWith: 'hospedagem.' },
              versoes: { none: { numero: 1 } },
            },
          });
          assert.equal(sem1, 0);
          const outros = await tx.catalogoItem.findMany({
            where: { chave: { startsWith: 'hospedagem.' }, outro: true },
          });
          assert.ok(outros.length >= 10);
          throw new Reverter();
        }),
        Reverter,
      );
      assert.equal(
        primeira.gruposCriados + primeira.itensCriados + primeira.jaExistentes,
        GRUPOS_HOSPEDAGEM_V1.length + totalItens,
      );
      assert.equal(segunda.gruposCriados + segunda.itensCriados, 0);
      assert.equal(
        segunda.jaExistentes,
        GRUPOS_HOSPEDAGEM_V1.length + totalItens,
      );
    });

    it('gestão de catálogo é restrita ao administrador; criação valida, versiona e audita', async () => {
      const admin = await sessao('administrador');
      const gestor = await sessao('gestor');
      const empresario = await sessao('empresario');
      const corpoGrupo = {
        segmentoId,
        chave: 'teste.recepcao',
        pergunta: 'Recepção?',
        selecao: 'multipla',
        permiteOutro: true,
        secao: 'Teste',
        ordem: 10,
      };
      for (const cookie of [gestor, empresario]) {
        assert.equal((await chamar('/catalogos/grupos', cookie)).status, 403);
        assert.equal(
          (await chamar('/catalogos/grupos', cookie, 'POST', corpoGrupo))
            .status,
          403,
        );
      }
      assert.equal(
        (await chamar('/catalogos/grupos', await sessao('administrador')))
          .status,
        200,
      );
      const invalido = await chamar('/catalogos/grupos', admin, 'POST', {
        ...corpoGrupo,
        chave: 'Chave Ruim',
        selecao: 'varias',
      });
      assert.equal(invalido.status, 400, JSON.stringify(invalido.json));
      assert.equal(invalido.json.error?.code, 'ENTRADA_INVALIDA');
      const semSegmento = await chamar('/catalogos/grupos', admin, 'POST', {
        ...corpoGrupo,
        segmentoId: 2147483000,
      });
      assert.equal(semSegmento.status, 400);

      const criado = await chamar(
        '/catalogos/grupos',
        admin,
        'POST',
        corpoGrupo,
      );
      assert.equal(criado.status, 201);
      const grupo = dados<{ id: number }>(criado);
      assert.ok(isGrupoCatalogo(grupo));
      assert.equal(
        (await chamar('/catalogos/grupos', admin, 'POST', corpoGrupo)).json
          .error?.code,
        'CHAVE_DUPLICADA',
      );

      const novoItem = (chave: string, extra: object = {}) =>
        chamar('/catalogos/itens', admin, 'POST', {
          grupoId: grupo.id,
          chave,
          rotulo: chave,
          exclusivo: false,
          outro: false,
          aceitaQuantidade: false,
          ordem: 1,
          ...extra,
        });
      const nao = await novoItem('teste.recepcao.nao', {
        rotulo: 'Não',
        exclusivo: true,
      });
      const sanit = await novoItem('teste.recepcao.sanitario', {
        rotulo: 'Sanitário',
        ordem: 2,
      });
      const outro = await novoItem('teste.recepcao.outros', {
        rotulo: 'Outros',
        outro: true,
        ordem: 3,
      });
      for (const r of [nao, sanit, outro]) {
        assert.equal(r.status, 201);
        assert.ok(isItemCatalogo(r.json.data));
        assert.equal((r.json.data as { versao: number }).versao, 1);
      }
      // Contradições e regras do grupo.
      assert.equal(
        (
          await novoItem('teste.recepcao.contradicao', {
            exclusivo: true,
            outro: true,
          })
        ).status,
        400,
      );
      const semOutro = await chamar('/catalogos/grupos', admin, 'POST', {
        ...corpoGrupo,
        chave: 'teste.sem-outro',
        permiteOutro: false,
      });
      const grupoSemOutro = dados<{ id: number }>(semOutro);
      assert.equal(
        (
          await chamar('/catalogos/itens', admin, 'POST', {
            grupoId: grupoSemOutro.id,
            chave: 'teste.sem-outro.outros',
            rotulo: 'Outros',
            exclusivo: false,
            outro: true,
            aceitaQuantidade: false,
            ordem: 1,
          })
        ).status,
        400,
      );

      // Alterar rótulo cria a versão 2; ordem não cria versão; sem mudança não audita.
      const itemId = (sanit.json.data as { id: number }).id;
      const renomeado = await chamar(
        `/catalogos/itens/${itemId}`,
        admin,
        'PUT',
        {
          rotulo: 'Sanitário PCD',
          motivo: 'Padronização do rótulo',
        },
      );
      assert.equal(renomeado.status, 200);
      assert.equal((renomeado.json.data as { versao: number }).versao, 2);
      const reordenado = await chamar(
        `/catalogos/itens/${itemId}`,
        admin,
        'PUT',
        { ordem: 9 },
      );
      assert.equal((reordenado.json.data as { versao: number }).versao, 2);
      const igual = await chamar(`/catalogos/itens/${itemId}`, admin, 'PUT', {
        ordem: 9,
      });
      assert.equal(igual.status, 200);
      const versoes = await chamar(
        `/catalogos/itens/${itemId}/versoes?$orderby=numero asc&$count=true`,
        admin,
      );
      assert.deepEqual(
        (versoes.json.data as { numero: number; rotulo: string }[]).map((v) => [
          v.numero,
          v.rotulo,
        ]),
        [
          [1, 'Sanitário'],
          [2, 'Sanitário PCD'],
        ],
      );
      assert.equal(versoes.json.meta?.total, 2);
      const arquivo = await fetch(
        `${base}/api/catalogos/itens/${itemId}/versoes/exportacoes?$orderby=numero%20asc`,
        { headers: { Cookie: admin } },
      );
      const csv = await dadosCsv<{ numero: number; rotulo: string }>(
        arquivo,
        COLECOES.catalogoVersoes,
      );
      assert.deepEqual(
        csv.data.map((v) => [v.numero, v.rotulo]),
        [
          [1, 'Sanitário'],
          [2, 'Sanitário PCD'],
        ],
      );

      const trilha = await prisma.auditoria.findMany({
        where: { entidade: 'catalogo_item', entidadeId: itemId },
        orderBy: { id: 'asc' },
      });
      assert.deepEqual(
        trilha.map((t) => t.acao),
        ['criar', 'alterar', 'alterar'],
      );
      assert.equal(
        trilha.every((t) => t.usuarioId === perfis.get('administrador')),
        true,
      );
      assert.deepEqual(
        (trilha[1].antes as { rotulo: string }).rotulo,
        'Sanitário',
      );
      // Estado final contraditório é recusado sem criar versão.
      assert.equal(
        (
          await chamar(`/catalogos/itens/${itemId}`, admin, 'PUT', {
            exclusivo: true,
            outro: true,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await chamar('/catalogos/itens/2147483000', admin, 'PUT', {
            ordem: 1,
          })
        ).status,
        404,
      );
      // Pergunta do grupo versiona todos os itens; seleção e chave não mudam.
      const pergunta = await chamar(
        `/catalogos/grupos/${grupo.id}`,
        admin,
        'PUT',
        {
          pergunta: 'Recepção (revisada)?',
          motivo: 'Revisão do texto',
        },
      );
      assert.equal(pergunta.status, 200);
      assert.deepEqual(
        (pergunta.json.data as { itens: { versao: number }[] }).itens
          .map((i) => i.versao)
          .sort(),
        [2, 2, 3],
      );
      assert.equal(
        (
          await chamar(`/catalogos/grupos/${grupo.id}`, admin, 'PUT', {
            selecao: 'unica',
          })
        ).status,
        400,
      );
    });

    it('formulário expõe só o ativo; inativar preserva o histórico e a validação usa as mesmas regras', async () => {
      const admin = await sessao('administrador');
      const gestor = await sessao('gestor');
      const empresario = await sessao('empresario');
      const grupo = await prisma.catalogoGrupo.findUniqueOrThrow({
        where: { chave: 'teste.recepcao' },
        include: { itens: true },
      });
      const porChave = (chave: string) =>
        grupo.itens.find((i) => i.chave === chave)!;
      const nao = porChave('teste.recepcao.nao');
      const sanit = porChave('teste.recepcao.sanitario');
      const outro = porChave('teste.recepcao.outros');

      // Qualquer perfil com acesso a inventários lê a definição; inativos só para quem gere o catálogo.
      for (const cookie of [admin, gestor, empresario]) {
        const r = await chamar(`/segmentos/${segmentoId}/catalogo`, cookie);
        assert.equal(r.status, 200);
        assert.ok(isFormularioCatalogo(r.json.data));
      }
      assert.equal(
        (
          await chamar(
            `/segmentos/${segmentoId}/catalogo?incluirInativos=true`,
            gestor,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await chamar(
            `/segmentos/${segmentoId}/catalogo?incluirInativos=talvez`,
            admin,
          )
        ).status,
        400,
      );
      assert.equal(
        (await chamar('/segmentos/2147483000/catalogo', gestor)).status,
        404,
      );

      // Inventário histórico referencia a versão 1 do item (snapshot imutável).
      const versao = await prisma.inventarioVersao.create({
        data: {
          empreendimentoId,
          criadaPor: perfis.get('gestor')!,
          vigenciaInicio: new Date('2026-01-01'),
          tipoAlteracao: 'mudanca_real',
          situacaoConferencia: 'parcial',
        },
      });
      await prisma.inventarioItem.create({
        data: {
          versaoId: versao.id,
          itemId: sanit.id,
          itemVersao: 1,
          estado: 'sim',
        },
      });
      await assert.rejects(
        prisma.inventarioItem.create({
          data: {
            versaoId: versao.id,
            itemId: nao.id,
            itemVersao: 99,
            estado: 'nao',
          },
        }),
      );
      await assert.rejects(
        prisma.catalogoItemVersao.update({
          where: { itemId_numero: { itemId: sanit.id, numero: 1 } },
          data: { rotulo: 'Reescrito' },
        }),
        /imutável/,
      );

      const inativar = await chamar(
        `/catalogos/itens/${sanit.id}`,
        admin,
        'PUT',
        {
          ativo: false,
        },
      );
      assert.equal(inativar.status, 200);
      const historico = await prisma.inventarioItem.findFirstOrThrow({
        where: { versaoId: versao.id, itemId: sanit.id },
        include: { snapshot: true },
      });
      assert.equal(historico.estado, 'sim');
      assert.equal(historico.snapshot.rotulo, 'Sanitário');

      const ativo = dados<{ grupos: { itens: { chave: string }[] }[] }>(
        await chamar(`/segmentos/${segmentoId}/catalogo`, gestor),
      );
      const chavesAtivas = ativo.grupos.flatMap((g) =>
        g.itens.map((i) => i.chave),
      );
      assert.ok(!chavesAtivas.includes('teste.recepcao.sanitario'));
      const todos = dados<{ grupos: { itens: { chave: string }[] }[] }>(
        await chamar(
          `/segmentos/${segmentoId}/catalogo?incluirInativos=true`,
          admin,
        ),
      );
      assert.ok(
        todos.grupos
          .flatMap((g) => g.itens.map((i) => i.chave))
          .includes('teste.recepcao.sanitario'),
      );

      const validar = (itens: unknown) =>
        chamar(`/segmentos/${segmentoId}/catalogo/validacoes`, gestor, 'POST', {
          itens,
        });
      assert.equal(
        (await validar([{ itemId: nao.id, estado: 'sim' }])).status,
        200,
      );
      const exclusivo = await validar([
        { itemId: nao.id, estado: 'sim' },
        { itemId: outro.id, estado: 'sim', detalhe: 'Lavanderia' },
      ]);
      assert.equal(exclusivo.status, 400);
      assert.equal(
        exclusivo.json.error?.details?.[0].field,
        'grupos.teste.recepcao',
      );
      assert.equal(
        (await validar([{ itemId: outro.id, estado: 'sim' }])).json.error
          ?.details?.[0].field,
        'itens[0].detalhe',
      );
      assert.equal(
        (await validar([{ itemId: sanit.id, estado: 'sim' }])).json.error
          ?.details?.[0].message,
        'Item inativo não aceita novas respostas.',
      );
      assert.equal(
        (await validar([{ itemId: outro.id, estado: 'nao_informado' }])).status,
        200,
      );
      assert.equal(
        (
          await chamar(
            `/segmentos/${segmentoId}/catalogo/validacoes`,
            gestor,
            'POST',
            'x',
          )
        ).status,
        400,
      );
    });

    it('coleções de gestão aceitam OData e respeitam a permissão', async () => {
      const admin = await sessao('administrador');
      const filtro = new URLSearchParams({
        $filter: `segmentoId eq ${segmentoId} and contains(chave,'recepcao')`,
        $count: 'true',
      });
      const grupos = await chamar(`/catalogos/grupos?${filtro}`, admin);
      assert.equal(grupos.status, 200);
      assert.equal(grupos.json.meta?.total, 1);
      const itens = await chamar(
        `/catalogos/itens?${new URLSearchParams({
          $filter: "grupoChave eq 'teste.recepcao' and ativo eq false",
          $count: 'true',
        })}`,
        admin,
      );
      assert.equal(itens.json.meta?.total, 1);
      assert.equal(
        (await chamar('/catalogos/itens?$filter=segredo eq 1', admin)).status,
        400,
      );
      assert.equal(
        (await chamar('/catalogos/itens', await sessao('gestor'))).status,
        403,
      );
    });
  },
);
