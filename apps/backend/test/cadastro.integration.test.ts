import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  PENDENCIAS_CADASTRO,
  isEmpreendimentoDetalhe,
  isColecaoOData,
  isEmpreendimentoListado,
  isSegmentoResumo,
  type EmpreendimentoDetalhe,
  type Perfil,
} from '@ssc0536/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/configure-app';
import { hashToken, novoToken } from '../src/autenticacao/segredos';

const databaseUrl = process.env.DATABASE_TEST_URL;
interface Corpo {
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: { field?: string; id?: number; motivos?: string[] }[];
  };
}
describe(
  'Cadastro de empreendimentos HTTP/PostgreSQL/PostGIS',
  { skip: !databaseUrl },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let base: string;
    const origem = 'http://localhost:5173';
    const usuarios: number[] = [];
    const perfis = new Map<Perfil, number>();
    const segmentos: number[] = [];
    const criados: number[] = [];
    let vinculado: number;
    let alheio: number;

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
      contexto?: number | string,
    ) {
      const resposta = await fetch(`${base}/api${caminho}`, {
        method: metodo,
        headers: {
          Origin: origem,
          'Content-Type': 'application/json',
          'X-OTO-Request': '1',
          Cookie: cookie,
          ...(contexto === undefined
            ? {}
            : { 'x-identification': String(contexto) }),
        },
        body: metodo === 'GET' ? undefined : JSON.stringify(corpo ?? {}),
      });
      const json = (await resposta.json().catch(() => ({}))) as Corpo;
      return { status: resposta.status, json };
    }
    async function criar(
      cookie: string,
      extra: Record<string, unknown> = {},
      nome = 'Hotel Fictício Gama',
    ) {
      const r = await chamar('/empreendimentos', cookie, 'POST', {
        nomeFantasia: nome,
        situacao: 'ativo',
        segmentoIds: [segmentos[0]],
        ...extra,
      });
      if (r.status === 201) criados.push((r.json.data as { id: number }).id);
      return r;
    }
    const detalhe = (r: { json: Corpo }) => {
      assert.ok(isEmpreendimentoDetalhe(r.json.data), JSON.stringify(r.json));
      return r.json.data as EmpreendimentoDetalhe;
    };
    const auditorias = (id: number) =>
      prisma.auditoria.findMany({
        where: { entidade: 'empreendimento', entidadeId: id },
        orderBy: { id: 'asc' },
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
      for (const perfil of [
        'administrador',
        'gestor',
        'estagiario',
        'visualizador',
        'empresario',
      ] as const) {
        const u = await prisma.usuario.create({
          data: {
            nome: `Cadastro ${perfil}`,
            email: `cadastro-${perfil}@example.test`,
            perfil,
          },
        });
        usuarios.push(u.id);
        perfis.set(perfil, u.id);
      }
      for (const chave of ['teste.hospedagem', 'teste.outro'])
        segmentos.push(
          (
            await prisma.segmento.create({
              data: {
                chave: `cadastro.${chave}`,
                nome: `Segmento ${chave}`,
                nivelCadastro: 'completo',
              },
            })
          ).id,
        );
      vinculado = (
        await prisma.empreendimento.create({
          data: {
            nomeFantasia: 'Pousada Vinculada Fictícia',
            situacao: 'ativo',
          },
        })
      ).id;
      alheio = (
        await prisma.empreendimento.create({
          data: { nomeFantasia: 'Pousada Alheia Fictícia', situacao: 'ativo' },
        })
      ).id;
      criados.push(vinculado, alheio);
      await prisma.usuarioEmpreendimento.create({
        data: {
          usuarioId: perfis.get('empresario')!,
          empreendimentoId: vinculado,
        },
      });
    });
    after(async () => {
      if (prisma)
        await prisma.$transaction(async (tx) => {
          const ids = { in: criados };
          await tx.resposta.deleteMany({ where: { empreendimentoId: ids } });
          await tx.inventarioVersao.deleteMany({
            where: { empreendimentoId: ids },
          });
          await tx.contato.deleteMany({ where: { empreendimentoId: ids } });
          await tx.cadastur.deleteMany({ where: { empreendimentoId: ids } });
          await tx.empreendimentoSegmento.deleteMany({
            where: { empreendimentoId: ids },
          });
          await tx.usuarioEmpreendimento.deleteMany({
            where: { usuarioId: { in: usuarios } },
          });
          await tx.empreendimento.deleteMany({ where: { id: ids } });
          await tx.segmento.deleteMany({ where: { id: { in: segmentos } } });
          await tx.sessao.deleteMany({
            where: { usuarioId: { in: usuarios } },
          });
          await tx.auditoria.deleteMany({
            where: { usuarioId: { in: usuarios } },
          });
          await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
        });
      await app?.close();
    });

    it('equipe cadastra parcial sem CNPJ, com pendências, autoria da sessão e auditoria atômica', async () => {
      const gestor = await sessao('gestor');
      const r = await criar(gestor);
      assert.equal(r.status, 201);
      const d = detalhe(r);
      assert.equal(d.cnpj, null);
      assert.equal(d.localizacao, null);
      assert.deepEqual(d.pendencias, [
        'sem_cnpj',
        'sem_razao_social',
        'sem_tipo_hospedagem',
        'sem_categoria_indicador',
        'sem_endereco',
        'sem_contato',
        'sem_cadastur',
      ]);
      assert.equal(d.segmentos[0].id, segmentos[0]);
      const [linha] = await auditorias(d.id);
      assert.equal(linha.usuarioId, perfis.get('gestor'));
      assert.equal(linha.acao, 'criar');
      assert.equal(
        (linha.depois as { nomeFantasia: string }).nomeFantasia,
        'Hotel Fictício Gama',
      );
      // Autoria nunca vem do payload.
      const forjado = await criar(
        gestor,
        { usuarioId: perfis.get('administrador') },
        'Outro Hotel Forjado',
      );
      assert.equal(forjado.status, 400);
      assert.equal(forjado.json.error?.details?.[0].field, 'usuarioId');
    });

    it('cadastro completo grava contatos, Cadastur e coordenadas PostGIS e responde o detalhe', async () => {
      const admin = await sessao('administrador');
      const r = await criar(
        admin,
        {
          razaoSocial: 'Hospedagem Fictícia Delta Ltda.',
          cnpj: '45.723.174/0001-10',
          idOrigem: 'fixture:delta',
          tipoHospedagem: 'HOTEL',
          categoriaIndicador: 'hotel',
          endereco: 'Rua Fictícia, 100',
          zona: 'urbana',
          localizacao: { longitude: -49.0, latitude: -20.0 },
          dataInicioAtividades: '2026-01-01',
          contatos: [
            {
              tipo: 'email',
              valor: 'pesquisas@example.test',
              finalidade: 'interno',
              responsavelNome: 'Pessoa Fictícia',
            },
            {
              tipo: 'site',
              valor: 'https://example.test',
              finalidade: 'publico',
            },
          ],
          cadastur: [
            {
              situacao: 'numero_proprio',
              numero: '000123-FIC',
              vencimento: '2027-01-31',
            },
          ],
        },
        'Hotel Fictício Delta',
      );
      assert.equal(r.status, 201, JSON.stringify(r.json));
      const d = detalhe(r);
      assert.equal(d.cnpj, '45723174000110');
      assert.deepEqual(d.localizacao, { longitude: -49, latitude: -20 });
      assert.equal(d.contatos.length, 2);
      assert.equal(d.cadastur[0].numero, '000123-FIC');
      assert.equal(d.cadastur[0].vencimento, '2027-01-31');
      assert.deepEqual(d.pendencias, []);
      const lido = await chamar(
        `/empreendimentos/${d.id}`,
        admin,
        'GET',
        undefined,
        d.id,
      );
      assert.deepEqual(detalhe(lido), d);
      const [linha] = await prisma.$queryRaw<{ tipo: string }[]>`
      SELECT GeometryType(localizacao::geometry) AS tipo FROM empreendimento WHERE id = ${d.id}`;
      assert.equal(linha.tipo, 'POINT');
    });

    it('valida entrada no servidor: campos, datas, coordenadas, contatos e segmentos', async () => {
      const gestor = await sessao('gestor');
      const ruim = async (
        extra: Record<string, unknown>,
        campo: string,
        status = 400,
      ) => {
        const r = await criar(gestor, extra, 'Hotel Inválido Fictício');
        assert.equal(r.status, status, JSON.stringify(r.json));
        assert.ok(
          r.json.error?.details?.some((e) => e.field?.startsWith(campo)),
          `${campo}: ${JSON.stringify(r.json.error)}`,
        );
      };
      await ruim({ cnpj: '123' }, 'cnpj');
      await ruim(
        { localizacao: { longitude: 200, latitude: 0 } },
        'localizacao.longitude',
      );
      await ruim({ situacao: 'encerrado' }, 'dataEncerramento');
      await ruim(
        { dataInicioAtividades: '2026-02-30' },
        'dataInicioAtividades',
      );
      await ruim(
        {
          contatos: [
            {
              tipo: 'site',
              valor: 'javascript:alert(1)',
              finalidade: 'publico',
            },
          ],
        },
        'contatos[0].valor',
      );
      await ruim({ cadastur: [{ situacao: 'igual_cnpj' }] }, 'cadastur'); // sem CNPJ cadastrado
      await ruim({ segmentoIds: [2147483000] }, 'segmentoIds');
      await ruim({ segmentoIds: [] }, 'segmentoIds');
      const semCorpo = await chamar('/empreendimentos', gestor, 'POST', []);
      assert.equal(semCorpo.status, 400);
      assert.equal(semCorpo.json.error?.code, 'ENTRADA_INVALIDA');
    });

    it('duplicidade potencial: mesmo nome normalizado ou CNPJ exige confirmação; parecidos não bloqueiam', async () => {
      const gestor = await sessao('gestor');
      // Nome igual, sem acento e em outra caixa.
      const nome = await criar(gestor, {}, 'HOTEL FICTICIO GAMA');
      assert.equal(nome.status, 409);
      assert.equal(nome.json.error?.code, 'DUPLICIDADE_POTENCIAL');
      assert.deepEqual(nome.json.error?.details?.[0].motivos, ['nome_igual']);
      // CNPJ com máscara versus dígitos armazenados.
      const cnpj = await criar(
        gestor,
        { cnpj: '45723174000110' },
        'Totalmente Outro Nome',
      );
      assert.equal(cnpj.status, 409);
      assert.deepEqual(cnpj.json.error?.details?.[0].motivos, ['cnpj_igual']);
      // Nomes apenas parecidos (homônimos) não são bloqueados nem fundidos.
      const parecido = await criar(gestor, {}, 'Hotel Fictício Gama II');
      assert.equal(parecido.status, 201);
      // Confirmação explícita cria outro cadastro e registra os candidatos na auditoria.
      const confirmado = await criar(
        gestor,
        { confirmarSemDuplicidade: true },
        'Hotel Fictício Gama',
      );
      assert.equal(confirmado.status, 201);
      const d = detalhe(confirmado);
      const [linha] = await auditorias(d.id);
      assert.equal(
        (linha.depois as { duplicidadesConfirmadas: number[] })
          .duplicidadesConfirmadas.length,
        1,
      );
      // O cadastro original continua separado (nada foi fundido).
      const lista = await chamar(
        `/empreendimentos?${new URLSearchParams({ $filter: "contains(tolower(nomeFantasia),'gama')", $top: '100' })}`,
        gestor,
      );
      assert.ok(isColecaoOData(lista.json, isEmpreendimentoListado));
      assert.ok(
        (lista.json as unknown as { data: unknown[] }).data.length >= 3,
      );
    });

    it('atualização parcial: null limpa, omitido preserva, auditoria só com os campos alterados', async () => {
      const gestor = await sessao('gestor');
      const base = detalhe(
        await criar(
          gestor,
          { endereco: 'Rua A, 1', razaoSocial: 'Razão Fictícia' },
          'Hotel Fictício Épsilon',
        ),
      );
      const alterar = (corpo: unknown, contexto: number | string = base.id) =>
        chamar(`/empreendimentos/${base.id}`, gestor, 'PUT', corpo, contexto);
      const r = await alterar({
        endereco: 'Rua B, 2',
        razaoSocial: null,
        zona: 'rural',
        localizacao: { longitude: -48.9, latitude: -20.1 },
      });
      assert.equal(r.status, 200, JSON.stringify(r.json));
      const d = detalhe(r);
      assert.equal(d.endereco, 'Rua B, 2');
      assert.equal(d.razaoSocial, null);
      assert.equal(d.nomeFantasia, 'Hotel Fictício Épsilon');
      assert.equal(d.zona, 'rural');
      assert.deepEqual(d.localizacao, { longitude: -48.9, latitude: -20.1 });
      const linhas = await auditorias(base.id);
      const alteracao = linhas[1];
      assert.equal(alteracao.acao, 'alterar');
      assert.equal(alteracao.usuarioId, perfis.get('gestor'));
      assert.deepEqual(Object.keys(alteracao.antes as object).sort(), [
        'endereco',
        'localizacao',
        'razaoSocial',
        'zona',
      ]);
      assert.equal(
        (alteracao.antes as { razaoSocial: string }).razaoSocial,
        'Razão Fictícia',
      );
      assert.equal(
        (alteracao.depois as { endereco: string }).endereco,
        'Rua B, 2',
      );
      // Atualização sem mudança real não gera auditoria.
      assert.equal((await alterar({ endereco: 'Rua B, 2' })).status, 200);
      assert.equal((await auditorias(base.id)).length, 2);
      // Limpar coordenadas.
      assert.equal(
        detalhe(await alterar({ localizacao: null })).localizacao,
        null,
      );
      // Corpo vazio e campo desconhecido.
      assert.equal((await alterar({})).status, 400);
      assert.equal((await alterar({ id: 5 })).status, 400);
    });

    it('contatos e Cadastur: conjunto desejado cria, atualiza e remove; ID alheio é rejeitado', async () => {
      const gestor = await sessao('gestor');
      const d = detalhe(
        await criar(
          gestor,
          {
            contatos: [
              { tipo: 'email', valor: 'a@example.test', finalidade: 'publico' },
              {
                tipo: 'telefone',
                valor: '(17) 99999-0000',
                finalidade: 'interno',
              },
            ],
            cadastur: [{ situacao: 'nao_possui' }],
          },
          'Hotel Fictício Zeta',
        ),
      );
      const [c1] = d.contatos;
      const alterar = (corpo: unknown) =>
        chamar(`/empreendimentos/${d.id}`, gestor, 'PUT', corpo, d.id);
      const r = await alterar({
        contatos: [
          {
            id: c1.id,
            tipo: 'email',
            valor: 'novo@example.test',
            finalidade: 'publico',
          },
          {
            tipo: 'site',
            valor: 'https://example.test',
            finalidade: 'publico',
          },
        ],
        cadastur: [
          {
            id: d.cadastur[0].id,
            situacao: 'numero_proprio',
            numero: '000987',
          },
        ],
      });
      assert.equal(r.status, 200, JSON.stringify(r.json));
      const novo = detalhe(r);
      assert.equal(novo.contatos.length, 2);
      assert.equal(
        novo.contatos.find((c) => c.id === c1.id)?.valor,
        'novo@example.test',
      );
      assert.ok(
        !novo.contatos.some((c) => c.tipo === 'telefone'),
        'contato fora do conjunto é removido',
      );
      assert.equal(novo.cadastur[0].numero, '000987');
      // ID de contato de outro empreendimento.
      const outro = await prisma.contato.create({
        data: {
          empreendimentoId: alheio,
          tipo: 'email',
          valor: 'alheio@example.test',
          finalidade: 'interno',
        },
      });
      const estrangeiro = await alterar({
        contatos: [
          {
            id: outro.id,
            tipo: 'email',
            valor: 'roubo@example.test',
            finalidade: 'publico',
          },
        ],
      });
      assert.equal(estrangeiro.status, 400);
      assert.equal(
        estrangeiro.json.error?.details?.[0].field,
        'contatos[0].id',
      );
      assert.equal(
        (await prisma.contato.findUniqueOrThrow({ where: { id: outro.id } }))
          .valor,
        'alheio@example.test',
      );
      // Lista vazia remove todos os contatos.
      assert.equal(detalhe(await alterar({ contatos: [] })).contatos.length, 0);
    });

    it('encerrar exige data e preserva inventários e respostas; reativar limpa a data', async () => {
      const gestor = await sessao('gestor');
      const d = detalhe(await criar(gestor, {}, 'Hotel Fictício Eta'));
      const modelo = await prisma.pesquisaModelo.create({
        data: { nome: 'Modelo cadastro fictício', publicoAlvo: 'hotelaria' },
      });
      const pesquisa = await prisma.pesquisa.create({
        data: {
          modeloId: modelo.id,
          titulo: 'Pesquisa cadastro fictícia',
          tipoColeta: 'consolidado',
          abertura: new Date(),
          prazo: new Date(),
          status: 'aberta',
        },
      });
      await prisma.inventarioVersao.create({
        data: {
          empreendimentoId: d.id,
          criadaPor: perfis.get('gestor')!,
          vigenciaInicio: new Date('2026-01-01'),
          tipoAlteracao: 'mudanca_real',
          situacaoConferencia: 'pendente',
          totalUh: 5,
        },
      });
      await prisma.resposta.create({
        data: {
          pesquisaId: pesquisa.id,
          empreendimentoId: d.id,
          usuarioId: perfis.get('gestor')!,
          respondidaEm: new Date(),
          canal: 'sistema',
        },
      });
      const alterar = (corpo: unknown) =>
        chamar(`/empreendimentos/${d.id}`, gestor, 'PUT', corpo, d.id);
      try {
        const semData = await alterar({ situacao: 'encerrado' });
        assert.equal(semData.status, 400);
        assert.equal(
          semData.json.error?.details?.[0].field,
          'dataEncerramento',
        );
        const encerrado = detalhe(
          await alterar({
            situacao: 'encerrado',
            dataEncerramento: '2026-09-30',
          }),
        );
        assert.equal(encerrado.situacao, 'encerrado');
        assert.equal(encerrado.dataEncerramento, '2026-09-30');
        assert.equal(
          await prisma.inventarioVersao.count({
            where: { empreendimentoId: d.id },
          }),
          1,
        );
        assert.equal(
          await prisma.resposta.count({ where: { empreendimentoId: d.id } }),
          1,
        );
        // Reativar sem limpar a data é inconsistente; com null é aceito.
        assert.equal((await alterar({ situacao: 'ativo' })).status, 400);
        const reativado = detalhe(
          await alterar({ situacao: 'ativo', dataEncerramento: null }),
        );
        assert.equal(reativado.dataEncerramento, null);
        // Filtro de situação na listagem.
        await alterar({
          situacao: 'encerrado',
          dataEncerramento: '2026-10-01',
        });
        const lista = await chamar(
          `/empreendimentos?${new URLSearchParams({ $filter: "situacao eq 'encerrado'", $top: '100' })}`,
          gestor,
        );
        assert.ok(
          (lista.json as unknown as { data: { id: number }[] }).data.some(
            (e) => e.id === d.id,
          ),
        );
      } finally {
        await prisma.resposta.deleteMany({
          where: { pesquisaId: pesquisa.id },
        });
        await prisma.pesquisa.delete({ where: { id: pesquisa.id } });
        await prisma.pesquisaModelo.delete({ where: { id: modelo.id } });
      }
    });

    it('listagem filtra por pendência, tipo e busca (nome ou CNPJ) e mantém ordem estável', async () => {
      const gestor = await sessao('gestor');
      const incompletos = await chamar(
        `/empreendimentos?${new URLSearchParams({ $filter: `pendencia in (${PENDENCIAS_CADASTRO.map((p) => `'${p}'`).join(',')})`, $top: '100' })}`,
        gestor,
      );
      assert.ok(isColecaoOData(incompletos.json, isEmpreendimentoListado));
      const dados = (
        incompletos.json as unknown as {
          data: { nomeFantasia: string; pendencias: string[] }[];
        }
      ).data;
      assert.ok(
        dados.length > 0 && dados.every((e) => e.pendencias.length > 0),
      );
      assert.ok(
        !dados.some((e) => e.nomeFantasia === 'Hotel Fictício Delta'),
        'cadastro completo não é incompleto',
      );
      const completos = await chamar(
        `/empreendimentos?${new URLSearchParams({ $filter: `pendencia eq 'sem_cnpj'`, $top: '100' })}`,
        gestor,
      );
      assert.equal(completos.status, 200);
      const tipo = await chamar(
        `/empreendimentos?${new URLSearchParams({ $filter: "tolower(tipoHospedagem) eq 'hotel'", $top: '100' })}`,
        gestor,
      );
      assert.deepEqual(
        (tipo.json as unknown as { data: { nomeFantasia: string }[] }).data.map(
          (e) => e.nomeFantasia,
        ),
        ['Hotel Fictício Delta'],
      );
      const porCnpj = await chamar(
        `/empreendimentos?${new URLSearchParams({ $filter: "contains(identificacao,'45723174')" })}`,
        gestor,
      );
      assert.equal(
        (porCnpj.json as unknown as { data: unknown[] }).data.length,
        1,
      );
      // Ordem estável: páginas pequenas reproduzem a página grande (nome, depois ID).
      const ids = async (consulta: string) =>
        (
          (await chamar(`/empreendimentos?${consulta}`, gestor))
            .json as unknown as {
            data: { id: number }[];
          }
        ).data.map((e) => e.id);
      const todos = await ids('$top=100');
      const emPaginas = [
        ...(await ids('$top=3&$skip=0')),
        ...(await ids('$top=3&$skip=3')),
        ...(await ids('$top=3&$skip=6')),
      ];
      assert.deepEqual(emPaginas, todos.slice(0, emPaginas.length));
      assert.equal(new Set(emPaginas).size, emPaginas.length);
      assert.equal(
        (
          await chamar(
            `/empreendimentos?${new URLSearchParams({ $filter: "situacao eq 'talvez'" })}`,
            gestor,
          )
        ).status,
        400,
      );
      assert.equal(
        (await chamar('/empreendimentos?incompleto=quem', gestor)).status,
        400,
      );
    });

    it('empresário edita só o permitido do próprio empreendimento; equipe-only e criação são negados', async () => {
      const empresario = await sessao('empresario');
      const gestor = await sessao('gestor');
      const alterar = (
        corpo: unknown,
        id = vinculado,
        contexto: number | string | null = id,
      ) =>
        chamar(
          `/empreendimentos/${id}`,
          empresario,
          'PUT',
          corpo,
          contexto ?? undefined,
        );
      const ok = await alterar({
        endereco: 'Rua do Empresário, 10',
        contatos: [
          {
            tipo: 'email',
            valor: 'empresa@example.test',
            finalidade: 'publico',
          },
        ],
      });
      assert.equal(ok.status, 200, JSON.stringify(ok.json));
      const [linha] = (await auditorias(vinculado)).slice(-1);
      assert.equal(
        linha.usuarioId,
        perfis.get('empresario'),
        'autoria vem da sessão do empresário',
      );
      for (const proibido of [
        { nomeFantasia: 'Renomeado' },
        { cnpj: '45723174000110' },
        { situacao: 'encerrado', dataEncerramento: '2026-09-30' },
        { segmentoIds: [segmentos[1]] },
        { categoriaIndicador: 'hotel' },
      ]) {
        const r = await alterar(proibido);
        assert.equal(r.status, 403, JSON.stringify(proibido));
        assert.equal(r.json.error?.code, 'CAMPO_RESTRITO');
      }
      assert.equal((await alterar({ endereco: 'x' }, alheio)).status, 404);
      assert.equal(
        (await alterar({ endereco: 'x' }, vinculado, null)).status,
        400,
      );
      assert.equal(
        (await alterar({ endereco: 'x' }, vinculado, alheio)).status,
        409,
      );
      const criacao = await criar(empresario, {}, 'Empresário Não Cria');
      assert.equal(criacao.status, 403);
      // O cadastro permanece o mesmo depois das tentativas negadas.
      const depois = await chamar(
        `/empreendimentos/${vinculado}`,
        gestor,
        'GET',
        undefined,
        vinculado,
      );
      assert.equal(detalhe(depois).nomeFantasia, 'Pousada Vinculada Fictícia');
    });

    it('estagiário cadastra e atualiza; visualizador não acessa; segmentos listam para quem consulta', async () => {
      const estagiario = await sessao('estagiario');
      const r = await criar(estagiario, {}, 'Hotel Fictício Teta');
      assert.equal(r.status, 201);
      const d = detalhe(r);
      assert.equal(
        (
          await chamar(
            `/empreendimentos/${d.id}`,
            estagiario,
            'PUT',
            { endereco: 'Rua E, 5' },
            d.id,
          )
        ).status,
        200,
      );
      const visualizador = await sessao('visualizador');
      assert.equal(
        (await criar(visualizador, {}, 'Hotel Visualizador')).status,
        403,
      );
      assert.equal((await chamar('/segmentos', visualizador)).status, 403);
      const lista = await chamar('/segmentos', estagiario);
      assert.equal(lista.status, 200);
      const itens = lista.json.data as unknown[];
      assert.ok(itens.every(isSegmentoResumo) && itens.length >= 2);
      assert.equal((await chamar('/empreendimentos', '')).status, 401);
    });

    it('edições concorrentes do mesmo cadastro são serializadas e nenhuma se perde', async () => {
      const gestor = await sessao('gestor');
      const d = detalhe(await criar(gestor, {}, 'Hotel Fictício Iota'));
      const campos = [
        { endereco: 'Rua Concorrente, 1' },
        { razaoSocial: 'Concorrente Ltda.' },
        { tipoHospedagem: 'POUSADA' },
        { zona: 'urbana' },
      ];
      const respostas = await Promise.all(
        campos.map((c) =>
          chamar(`/empreendimentos/${d.id}`, gestor, 'PUT', c, d.id),
        ),
      );
      assert.deepEqual(
        respostas.map((r) => r.status),
        [200, 200, 200, 200],
      );
      const final = detalhe(
        await chamar(
          `/empreendimentos/${d.id}`,
          gestor,
          'GET',
          undefined,
          d.id,
        ),
      );
      assert.equal(final.endereco, 'Rua Concorrente, 1');
      assert.equal(final.razaoSocial, 'Concorrente Ltda.');
      assert.equal(final.tipoHospedagem, 'POUSADA');
      assert.equal(final.zona, 'urbana');
      assert.equal(
        (await auditorias(d.id)).length,
        5,
        'uma criação e quatro alterações',
      );
    });

    it('falha depois da escrita reverte o cadastro e a auditoria juntos', async () => {
      const { AutorizacaoService } =
        await import('../src/acesso/autorizacao.service.js');
      const autorizacao = app.get(AutorizacaoService);
      const token = (await sessao('gestor')).split('=')[1];
      const contexto = await autorizacao.identificar(token);
      const totalAuditorias = await prisma.auditoria.count();
      const totalEmpreendimentos = await prisma.empreendimento.count();
      await assert.rejects(
        autorizacao.executar(
          contexto,
          'empreendimentos',
          'criar',
          async (tx, atual) => {
            const e = await tx.empreendimento.create({
              data: { nomeFantasia: 'Nunca Persistido', situacao: 'ativo' },
            });
            await tx.auditoria.create({
              data: {
                usuarioId: atual.usuario.id,
                entidade: 'empreendimento',
                entidadeId: e.id,
                acao: 'criar',
                depois: {},
                em: new Date(),
              },
            });
            throw new Error('Falha simulada antes do commit');
          },
        ),
        /Falha simulada/,
      );
      assert.equal(await prisma.auditoria.count(), totalAuditorias);
      assert.equal(await prisma.empreendimento.count(), totalEmpreendimentos);
    });
  },
);
