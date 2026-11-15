import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_TEST_URL;
const day = new Date('2026-11-01T00:00:00.000Z');

describe('Schema OTO no PostgreSQL/PostGIS', { skip: !databaseUrl }, () => {
  let prisma: PrismaClient;

  before(async () => {
    assert.ok(databaseUrl);
    assert.match(
      new URL(databaseUrl).pathname,
      /\/[a-zA-Z0-9_]+_test$/,
      'DATABASE_TEST_URL deve apontar para um banco exclusivo com nome terminado em _test.',
    );
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    await prisma.$connect();
  });

  after(async () => {
    await prisma?.$disconnect();
  });

  // Toda fixture é revertida, inclusive quando uma asserção falha.
  async function rollback(
    work: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    const marker = new Error('rollback da fixture');
    await assert.rejects(
      prisma.$transaction(
        async (tx) => {
          await work(tx);
          throw marker;
        },
        { timeout: 15000 },
      ),
      (error) => error === marker,
    );
  }

  const usuario = {
    nome: 'Teste OTO',
    email: 'schema-oto@example.test',
    perfil: 'gestor',
  };

  it('persiste e consulta o grafo completo das 27 tabelas e os tipos nativos', async () => {
    await rollback(async (tx) => {
      const user = await tx.usuario.create({ data: usuario });
      const segmento = await tx.segmento.create({
        data: {
          chave: 'hospedagem',
          nome: 'Hospedagem',
          nivelCadastro: 'completo',
        },
      });
      const empreendimento = await tx.empreendimento.create({
        data: {
          nomeFantasia: 'Pousada de teste',
          situacao: 'ativo',
          segmentos: { create: { segmentoId: segmento.id } },
          usuarios: { create: { usuarioId: user.id } },
          contatos: {
            create: {
              tipo: 'email',
              valor: 'contato@example.test',
              finalidade: 'publico',
            },
          },
          cadastur: { create: { situacao: 'nao_possui' } },
        },
      });
      const grupo = await tx.catalogoGrupo.create({
        data: {
          segmentoId: segmento.id,
          chave: 'hospedagem.pagamento',
          pergunta: 'Quais pagamentos?',
          selecao: 'multipla',
          permiteOutro: true,
          ordem: 1,
        },
      });
      const item = await tx.catalogoItem.create({
        data: {
          grupoId: grupo.id,
          chave: 'hospedagem.pagamento.pix',
          rotulo: 'Pix',
          exclusivo: false,
          ordem: 1,
        },
      });
      await tx.catalogoItemVersao.create({
        data: {
          itemId: item.id,
          numero: 1,
          rotulo: item.rotulo,
          pergunta: grupo.pergunta,
          selecao: grupo.selecao,
          exclusivo: item.exclusivo,
          outro: item.outro,
          aceitaQuantidade: item.aceitaQuantidade,
          criadaEm: new Date(),
        },
      });
      const inventario = await tx.inventarioVersao.create({
        data: {
          empreendimentoId: empreendimento.id,
          criadaPor: user.id,
          vigenciaInicio: day,
          tipoAlteracao: 'mudanca_real',
          situacaoConferencia: 'parcial',
          totalUh: 10,
          checkin: new Date('1970-01-01T14:00:00.000Z'),
          itens: { create: { itemId: item.id, estado: 'sim' } },
        },
      });
      const periodo = await tx.periodo.create({
        data: {
          tipo: 'mes',
          rotulo: 'Novembro 2026',
          dataInicio: day,
          dataFim: new Date('2026-11-30T00:00:00Z'),
        },
      });
      const modelo = await tx.pesquisaModelo.create({
        data: {
          nome: 'Ocupação',
          publicoAlvo: 'empreendimento',
          campos: {
            create: {
              chave: 'ocupacao',
              rotulo: 'Ocupação',
              tipoValor: 'percentual',
              obrigatorio: true,
              ordem: 1,
            },
          },
        },
        include: { campos: true },
      });
      const pesquisa = await tx.pesquisa.create({
        data: {
          modeloId: modelo.id,
          titulo: 'Ocupação de novembro',
          tipoColeta: 'consolidado',
          abertura: day,
          prazo: new Date('2026-12-01T00:00:00Z'),
          status: 'aberta',
          perguntas: {
            create: {
              campoId: modelo.campos[0].id,
              periodoId: periodo.id,
              rotulo: 'Ocupação em novembro',
            },
          },
        },
        include: { perguntas: true },
      });
      const resposta = await tx.resposta.create({
        data: {
          pesquisaId: pesquisa.id,
          empreendimentoId: empreendimento.id,
          usuarioId: user.id,
          respondidaEm: day,
          canal: 'sistema',
          itens: {
            create: {
              perguntaId: pesquisa.perguntas[0].id,
              valorNumerico: '75.1234567890123456789',
            },
          },
        },
        include: { itens: true },
      });
      assert.equal(
        resposta.itens[0].valorNumerico?.toString(),
        '75.1234567890123456789',
      );
      const coleta = await tx.coletaDiaria.create({
        data: {
          empreendimentoId: empreendimento.id,
          periodoId: periodo.id,
          fonte: 'booking',
          dataColeta: day,
          dataEstadia: day,
          tipoDia: 'semana',
          valorDiaria: '199.90',
        },
      });
      assert.equal(coleta.valorDiaria.toFixed(2), '199.90');
      const definicao = await tx.indicadorDefinicao.create({
        data: {
          codigo: 'ocupacao',
          nome: 'Ocupação',
          unidade: '%',
          formulaDescricao: 'UHs ocupadas / total * 100',
          versaoFormula: 1,
        },
      });
      const parametro = await tx.parametroCalculo.create({
        data: {
          chave: 'day_use_pct',
          valor: '0.25',
          vigenciaInicio: day,
        },
      });
      const resultado = await tx.indicadorResultado.create({
        data: {
          definicaoId: definicao.id,
          periodoId: periodo.id,
          tipoColeta: 'consolidado',
          recorte: 'pousada',
          metodo: 'ponderada',
          valor: '75.123456',
          calculadoEm: day,
          versoes: { create: { versaoId: inventario.id } },
          parametros: { create: { parametroId: parametro.id } },
        },
      });
      await tx.rhcPeriodo.create({
        data: { periodoId: periodo.id, qtdRhc: 3, leitos: 50 },
      });
      const auditoria = await tx.auditoria.create({
        data: {
          usuarioId: user.id,
          entidade: 'empreendimento',
          entidadeId: empreendimento.id,
          acao: 'criar',
          depois: { nome_fantasia: empreendimento.nomeFantasia },
          em: day,
        },
      });
      assert.deepEqual(auditoria.depois, { nome_fantasia: 'Pousada de teste' });
      const grafo = await tx.indicadorResultado.findUniqueOrThrow({
        where: { id: resultado.id },
        include: {
          periodo: { include: { rhc: true } },
          parametros: { include: { parametro: true } },
          versoes: {
            include: {
              versao: {
                include: {
                  itens: { include: { item: { include: { grupo: true } } } },
                },
              },
            },
          },
        },
      });
      assert.equal(grafo.periodo.rhc[0].qtdRhc, 3);
      assert.equal(grafo.parametros[0].parametro.valor.toString(), '0.25');
      assert.equal(grafo.versoes[0].versao.itens[0].item.grupo.id, grupo.id);
      await tx.$executeRaw`UPDATE empreendimento SET localizacao = ST_SetSRID(ST_MakePoint(-47.89, -22.01), 4326)::geography WHERE id = ${empreendimento.id}`;
      const [point] = await tx.$queryRaw<
        Array<{ longitude: number; latitude: number }>
      >`
        SELECT ST_X(localizacao::geometry) AS longitude, ST_Y(localizacao::geometry) AS latitude
        FROM empreendimento WHERE id = ${empreendimento.id}`;
      assert.equal(point.longitude, -47.89);
      assert.equal(point.latitude, -22.01);
      await assert.rejects(
        tx.resposta.create({
          data: {
            pesquisaId: pesquisa.id,
            empreendimentoId: empreendimento.id,
            usuarioId: user.id,
            respondidaEm: day,
            canal: 'importacao',
          },
        }),
        { code: 'P2002' },
      );
    });
  });

  it('rejeita e-mail duplicado', async () => {
    await rollback(async (tx) => {
      await tx.usuario.create({ data: usuario });
      await assert.rejects(tx.usuario.create({ data: usuario }), {
        code: 'P2002',
      });
    });
  });

  it('rejeita vínculos com empreendimento inexistente', async () => {
    await rollback(async (tx) => {
      await assert.rejects(
        tx.contato.create({
          data: {
            empreendimentoId: -1,
            tipo: 'email',
            valor: 'teste@example.test',
            finalidade: 'interno',
          },
        }),
        { code: 'P2003' },
      );
    });
  });

  it('rejeita chave composta duplicada e exclusão de usuário referenciado', async () => {
    await rollback(async (tx) => {
      const user = await tx.usuario.create({ data: usuario });
      const empreendimento = await tx.empreendimento.create({
        data: { nomeFantasia: 'Teste', situacao: 'ativo' },
      });
      const link = { usuarioId: user.id, empreendimentoId: empreendimento.id };
      await tx.usuarioEmpreendimento.create({ data: link });
      await assert.rejects(tx.usuarioEmpreendimento.create({ data: link }), {
        code: 'P2002',
      });
    });
    await rollback(async (tx) => {
      const user = await tx.usuario.create({ data: usuario });
      await tx.empreendimento.create({
        data: {
          nomeFantasia: 'Teste',
          situacao: 'ativo',
          usuarios: { create: { usuarioId: user.id } },
        },
      });
      await assert.rejects(tx.usuario.delete({ where: { id: user.id } }), {
        code: 'P2003',
      });
    });
  });

  it('permite CNPJ ausente ou repetido, conforme regra pendente do diagrama', async () => {
    await rollback(async (tx) => {
      await tx.empreendimento.createMany({
        data: [
          { nomeFantasia: 'Sem CNPJ 1', situacao: 'ativo' },
          { nomeFantasia: 'Sem CNPJ 2', situacao: 'ativo' },
          {
            nomeFantasia: 'Com CNPJ 1',
            situacao: 'ativo',
            cnpj: '12345678000100',
          },
          {
            nomeFantasia: 'Com CNPJ 2',
            situacao: 'ativo',
            cnpj: '12345678000100',
          },
        ],
      });
    });
  });
});
