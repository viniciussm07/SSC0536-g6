import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import dados from '../../../fixtures/oto/producao-simulada/dados.json';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashSenha } from '../src/autenticacao/segredos';
import {
  DEFINICOES_APRESENTACAO,
  FERIADOS_APRESENTACAO,
  calcularIndicadoresApresentacao,
  rhcApresentacao,
} from './indicadores-apresentacao';

const markerId = 9_100_000;
const hash = createHash('sha256').update(JSON.stringify(dados)).digest('hex');
const criadaEm = new Date('2026-01-01T00:00:00.000Z');

// Ambiente de apresentação: banco próprio, nunca o de produção real do OTO.
// O guard de demo-fixtures.ts (_dev/_test) permanece intacto.
export function assertAmbienteApresentacao(
  databaseUrl: string | undefined,
  ambiente: string | undefined,
  senha: string | undefined,
) {
  if (ambiente !== 'apresentacao')
    throw new Error(
      'Defina OTO_AMBIENTE=apresentacao para confirmar o ambiente.',
    );
  if (!databaseUrl || !URL.canParse(databaseUrl))
    throw new Error('Informe DATABASE_URL do ambiente de apresentação.');
  if (!/^\/[a-zA-Z0-9_]+_apresentacao$/.test(new URL(databaseUrl).pathname))
    throw new Error('O nome do banco deve terminar em _apresentacao.');
  if (!senha || senha.length < 12)
    throw new Error('Defina APRESENTACAO_SENHA com ao menos 12 caracteres.');
}

type Tx = Parameters<
  Parameters<PrismaClient['$transaction']>[0] extends (tx: infer T) => unknown
    ? (tx: T) => unknown
    : never
>[0];

/**
 * Indicadores calculados com as fórmulas v1 sobre as respostas e os inventários simulados,
 * mais o RHC agregado conferido. Entram como carga (sem execução): números derivados dos dados
 * simulados, não homologados pelo OTO. Visíveis a administrador, gestor e visualizador.
 */
async function carregarIndicadores(tx: Tx) {
  const conferente = dados.usuarios.find((u) => u.perfil === 'administrador');
  await tx.rhcPeriodo.createMany({
    data: rhcApresentacao(dados.periodos).map((r) => ({
      ...r,
      origem: 'manual',
      situacaoConferencia: 'conferida',
      conferidoEm: new Date(dados.metadata.referenceDate),
      conferidoPorUsuarioId: conferente?.id ?? null,
      observacao: 'Dado simulado para apresentação.',
    })),
  });
  const ids = new Map<string, number>();
  for (const f of DEFINICOES_APRESENTACAO) {
    const criada = await tx.indicadorDefinicao.create({
      data: {
        codigo: f.codigo,
        nome: f.nome,
        unidade: f.unidade,
        formulaDescricao: `Fórmula v${f.versaoFormula} transcrita de ${f.origem}; pendente de homologação do OTO.`,
        versaoFormula: f.versaoFormula,
        visibilidades: {
          create: ['administrador', 'gestor', 'visualizador'].map((perfil) => ({
            perfil,
            permitido: true,
          })),
        },
      },
      select: { id: true },
    });
    ids.set(f.codigo, criada.id);
  }
  const calculadoEm = new Date(dados.metadata.referenceDate);
  await tx.indicadorResultado.createMany({
    data: calcularIndicadoresApresentacao(dados).map((r) => ({
      definicaoId: ids.get(r.codigo)!,
      periodoId: r.periodoId,
      tipoColeta: r.tipoColeta,
      recorte: r.recorte,
      metodo: r.metodo,
      valor: r.valor.estado === 'disponivel' ? r.valor.valor : null,
      estado: r.valor.estado,
      motivoIndisponibilidade:
        r.valor.estado === 'indisponivel' ? r.valor.motivo : null,
      detalheIndisponibilidade:
        r.valor.estado === 'indisponivel' ? r.valor.detalhe : null,
      calculadoEm,
    })),
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  const senha = process.env.APRESENTACAO_SENHA;
  assertAmbienteApresentacao(url, process.env.OTO_AMBIENTE, senha);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    const r = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(536007)`;
        if (await tx.auditoria.findUnique({ where: { id: markerId } }))
          return 'ja-carregado';
        if ((await tx.usuario.count()) || (await tx.empreendimento.count()))
          throw new Error('Banco não está vazio; nada foi alterado.');
        await tx.usuario.createMany({ data: dados.usuarios });
        await tx.segmento.createMany({ data: dados.segmentos });
        await tx.empreendimento.createMany({ data: dados.empreendimentos });
        await tx.empreendimentoSegmento.createMany({
          data: dados.empreendimentoSegmentos,
        });
        await tx.usuarioEmpreendimento.createMany({
          data: dados.usuarioEmpreendimentos,
        });
        await tx.contato.createMany({ data: dados.contatos });
        await tx.cadastur.createMany({ data: dados.cadastur });
        await tx.catalogoGrupo.createMany({ data: dados.catalogoGrupos });
        await tx.catalogoItem.createMany({ data: dados.catalogoItens });
        const grupos = new Map(dados.catalogoGrupos.map((g) => [g.id, g]));
        await tx.catalogoItemVersao.createMany({
          data: dados.catalogoItens.map((i) => {
            const g = grupos.get(i.grupoId)!;
            return {
              itemId: i.id,
              numero: 1,
              rotulo: i.rotulo,
              pergunta: g.pergunta,
              selecao: g.selecao,
              exclusivo: i.exclusivo,
              outro: false,
              aceitaQuantidade: false,
              criadaEm,
              motivo: 'Carga de apresentação',
            };
          }),
        });
        await tx.inventarioVersao.createMany({ data: dados.inventarios });
        await tx.inventarioItem.createMany({ data: dados.inventarioItens });
        await tx.periodo.createMany({
          data: [...dados.periodos, ...FERIADOS_APRESENTACAO],
        });
        await tx.pesquisaModelo.createMany({ data: dados.pesquisaModelos });
        await tx.pesquisaCampo.createMany({ data: dados.pesquisaCampos });
        await tx.pesquisaModeloVersao.createMany({
          data: dados.pesquisaModelos.map((m) => ({
            modeloId: m.id,
            numero: 1,
            nome: m.nome,
            publicoAlvo: m.publicoAlvo,
            criadaEm,
            motivo: 'Carga de apresentação',
          })),
        });
        await tx.pesquisaCampoVersao.createMany({
          data: dados.pesquisaCampos.map((c) => ({
            modeloId: c.modeloId,
            numero: 1,
            campoId: c.id,
            chave: c.chave,
            rotulo: c.rotulo,
            tipoValor: c.tipoValor,
            obrigatorio: c.obrigatorio,
            ordem: c.ordem,
          })),
        });
        await tx.pesquisa.createMany({
          data: dados.pesquisas.map((p) => ({
            ...p,
            modeloVersao: 1,
            abertaEm: p.abertura,
            encerradaEm: p.prazo,
            destinatariosRegistradosEm: p.abertura,
          })),
        });
        const ativos = dados.empreendimentos.filter(
          (e) => e.situacao === 'ativo',
        );
        await tx.pesquisaDestinatario.createMany({
          data: dados.pesquisas.flatMap((p) =>
            ativos.map((e) => ({
              pesquisaId: p.id,
              empreendimentoId: e.id,
              incluidoEm: p.abertura,
            })),
          ),
        });
        await tx.pesquisaPergunta.createMany({ data: dados.perguntas });
        await tx.resposta.createMany({ data: dados.respostas });
        await tx.respostaItem.createMany({ data: dados.respostaItens });
        const conferente = dados.usuarios.find(
          (u) => u.perfil === 'administrador',
        );
        await tx.coletaDiaria.createMany({
          data: dados.coletasDiarias.map((c) => ({
            ...c,
            situacaoConferencia: 'conferida',
            conferidoEm: new Date(dados.metadata.referenceDate),
            conferidoPorUsuarioId: conferente?.id ?? null,
          })),
        });
        await carregarIndicadores(tx);
        const senhaHash = await hashSenha(senha!);
        await tx.credencialLocal.createMany({
          data: dados.usuarios
            .filter((u) => u.ativo)
            .map((u) => ({ usuarioId: u.id, senhaHash })),
        });
        await tx.auditoria.create({
          data: {
            id: markerId,
            usuarioId: null,
            origem: 'automatica',
            processo: 'db:seed:apresentacao',
            entidade: 'presentation_dataset',
            entidadeId: dados.metadata.version,
            acao: 'criar',
            em: dados.metadata.referenceDate,
            depois: { ...dados.metadata, sha256: hash },
          },
        });
        return 'carregado';
      },
      { timeout: 60000 },
    );
    console.log(
      r === 'carregado'
        ? 'Ambiente de apresentação carregado.'
        : 'Já carregado; nada alterado.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module)
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : 'Falha na carga.');
    process.exitCode = 1;
  });
