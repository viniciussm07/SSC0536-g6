import { createHash } from 'node:crypto';
import scenario from '../../../fixtures/oto/scenario.json';
import acessoDemo from '../../../fixtures/oto/acesso-demo.json';
import acessosPerfis from '../../../fixtures/oto/acessos-perfis-demo.json';
import { Prisma } from '../src/generated/prisma/client';
import { hashSenha } from '../src/autenticacao/segredos';

export { scenario, acessoDemo, acessosPerfis };
export const scenarioHash = createHash('sha256')
  .update(JSON.stringify(scenario))
  .digest('hex');
export const seedMarkerId = 9_000_000;
export const demoAccessMarkerId = 9_000_001;
export const profileAccessMarkerId = 9_000_002;
const demoAccessHash = createHash('sha256')
  .update(JSON.stringify(acessoDemo))
  .digest('hex');
const profileAccessHash = createHash('sha256')
  .update(JSON.stringify(acessosPerfis))
  .digest('hex');

export function assertSeedTarget(
  databaseUrl: string | undefined,
  nodeEnv?: string,
) {
  if (nodeEnv === 'production')
    throw new Error('A massa fictícia não pode ser carregada em produção.');
  if (!databaseUrl || !URL.canParse(databaseUrl))
    throw new Error('Informe DATABASE_URL para um banco local _dev ou _test.');
  const url = new URL(databaseUrl);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]', 'postgres'].includes(url.hostname) ||
    !/^\/[a-zA-Z0-9_]+_(dev|test)$/.test(url.pathname)
  )
    throw new Error(
      'Use um PostgreSQL local (localhost/postgres) com nome terminado em _dev ou _test.',
    );
}

// Execute dentro de uma transação: a carga e o marcador são confirmados juntos.
export async function seedDemoFixtures(
  tx: Prisma.TransactionClient,
  databaseUrl: string | undefined,
  nodeEnv = process.env.NODE_ENV,
) {
  assertSeedTarget(databaseUrl, nodeEnv);
  const marker = await tx.auditoria.findUnique({ where: { id: seedMarkerId } });
  if (marker) {
    const payload = marker.depois;
    if (
      marker.entidade !== 'fixture_dataset' ||
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload) ||
      payload.sha256 !== scenarioHash
    ) {
      throw new Error(
        'Marcador incompatível. Use outro banco vazio para esta versão da massa.',
      );
    }
    await seedDemoAccess(tx);
    await seedProfileAccess(tx);
    return 'already-seeded' as const;
  }

  const tables = [
    'usuario',
    'segmento',
    'empreendimento',
    'empreendimento_segmento',
    'usuario_empreendimento',
    'contato',
    'cadastur',
    'catalogo_grupo',
    'catalogo_item',
    'inventario_versao',
    'inventario_item',
    'periodo',
    'pesquisa_modelo',
    'pesquisa_campo',
    'pesquisa',
    'pesquisa_pergunta',
    'resposta',
    'resposta_item',
    'coleta_diaria',
    'indicador_definicao',
    'parametro_calculo',
    'indicador_resultado',
    'indicador_resultado_versao',
    'indicador_resultado_parametro',
    'rhc_periodo',
    'auditoria',
  ];
  for (const table of tables) {
    // Identificadores vêm somente da lista interna fixa; nenhum SQL é recebido do usuário.
    const [row] = await tx.$queryRaw<Array<{ populated: boolean }>>(
      Prisma.sql`SELECT EXISTS(SELECT 1 FROM ${Prisma.raw(`"${table}"`)} LIMIT 1) AS populated`,
    );
    if (row.populated)
      throw new Error(
        `A tabela ${table} contém dados. Use uma base de domínio vazia; nada foi alterado.`,
      );
  }

  await tx.usuario.createMany({ data: scenario.usuarios });
  await tx.segmento.createMany({ data: scenario.segmentos });
  await tx.empreendimento.createMany({ data: scenario.empreendimentos });
  await tx.empreendimentoSegmento.createMany({
    data: scenario.empreendimentoSegmentos,
  });
  await tx.usuarioEmpreendimento.createMany({
    data: scenario.usuarioEmpreendimentos,
  });
  await tx.contato.createMany({ data: scenario.contatos });
  await tx.cadastur.createMany({ data: scenario.cadastur });
  await tx.catalogoGrupo.createMany({ data: scenario.catalogoGrupos });
  await tx.catalogoItem.createMany({ data: scenario.catalogoItens });
  await tx.inventarioVersao.createMany({ data: scenario.inventarios });
  await tx.inventarioItem.createMany({ data: scenario.inventarioItens });
  await tx.periodo.createMany({ data: scenario.periodos });
  await tx.pesquisaModelo.createMany({ data: scenario.pesquisaModelos });
  await tx.pesquisaCampo.createMany({ data: scenario.pesquisaCampos });
  await tx.pesquisa.createMany({ data: scenario.pesquisas });
  await tx.pesquisaPergunta.createMany({ data: scenario.perguntas });
  await tx.resposta.createMany({ data: scenario.respostas });
  await tx.respostaItem.createMany({ data: scenario.respostaItens });
  await tx.coletaDiaria.createMany({ data: scenario.coletasDiarias });
  await tx.indicadorDefinicao.createMany({ data: scenario.definicoes });
  await tx.parametroCalculo.createMany({ data: scenario.parametros });
  await tx.indicadorResultado.createMany({ data: scenario.resultados });
  await tx.indicadorResultadoVersao.createMany({
    data: scenario.resultadoVersoes,
  });
  await tx.indicadorResultadoParametro.createMany({
    data: scenario.resultadoParametros,
  });
  await tx.rhcPeriodo.createMany({ data: scenario.rhcPeriodos });
  await tx.auditoria.create({
    data: {
      id: seedMarkerId,
      usuarioId: scenario.usuarios[0].id,
      entidade: 'fixture_dataset',
      entidadeId: scenario.metadata.version,
      acao: 'criar',
      em: scenario.metadata.referenceDate,
      depois: { ...scenario.metadata, sha256: scenarioHash },
    },
  });
  await seedDemoAccess(tx);
  await seedProfileAccess(tx);
  return 'seeded' as const;
}

// O marcador separado permite habilitar o acesso em massas v1 já carregadas sem reset.
// Depois da inicialização, jamais restaurar automaticamente uma credencial revogada.
async function seedDemoAccess(tx: Prisma.TransactionClient) {
  const marker = await tx.auditoria.findUnique({
    where: { id: demoAccessMarkerId },
  });
  if (marker) {
    if (
      marker.entidade !== 'fixture_demo_access' ||
      typeof marker.depois !== 'object' ||
      marker.depois === null ||
      Array.isArray(marker.depois) ||
      marker.depois.sha256 !== demoAccessHash
    ) {
      throw new Error(
        'Marcador de acesso fictício incompatível; nenhum acesso foi alterado.',
      );
    }
    return;
  }
  const usuario = await tx.usuario.findUnique({
    where: { id: acessoDemo.usuarioId },
    include: { credencial: true },
  });
  if (
    !usuario ||
    usuario.email !== acessoDemo.email ||
    usuario.perfil !== 'administrador' ||
    !usuario.ativo
  ) {
    throw new Error(
      'Administrador fictício ausente ou alterado; nenhum acesso foi criado.',
    );
  }
  if (
    usuario.credencial ||
    (await tx.ativacaoConta.count({ where: { usuarioId: usuario.id } }))
  ) {
    throw new Error(
      'O acesso do administrador fictício já foi gerenciado; o seed não substitui credenciais ou recuperação.',
    );
  }
  await tx.credencialLocal.create({
    data: {
      usuarioId: usuario.id,
      senhaHash: await hashSenha(acessoDemo.senha),
    },
  });
  await tx.auditoria.create({
    data: {
      id: demoAccessMarkerId,
      usuarioId: usuario.id,
      entidade: 'fixture_demo_access',
      entidadeId: acessoDemo.version,
      acao: 'criar',
      em: scenario.metadata.referenceDate,
      depois: {
        synthetic: true,
        version: acessoDemo.version,
        sha256: demoAccessHash,
      },
    },
  });
}

// Contas fictícias dos demais perfis, inicializadas uma única vez (marcador próprio),
// como o administrador. Também libera o indicador de demonstração para os perfis de
// consulta, pois a visibilidade é restrita por padrão. Não restaura nada depois.
async function seedProfileAccess(tx: Prisma.TransactionClient) {
  const marker = await tx.auditoria.findUnique({
    where: { id: profileAccessMarkerId },
  });
  if (marker) {
    if (
      marker.entidade !== 'fixture_profile_access' ||
      typeof marker.depois !== 'object' ||
      marker.depois === null ||
      Array.isArray(marker.depois) ||
      marker.depois.sha256 !== profileAccessHash
    ) {
      throw new Error(
        'Marcador de acessos por perfil incompatível; nenhum acesso foi alterado.',
      );
    }
    return;
  }
  const usuarios = [];
  for (const acesso of acessosPerfis.acessos) {
    const usuario = await tx.usuario.findUnique({
      where: { id: acesso.usuarioId },
      include: { credencial: true },
    });
    if (
      !usuario ||
      usuario.email !== acesso.email ||
      usuario.perfil !== acesso.perfil ||
      !usuario.ativo
    ) {
      throw new Error(
        `Usuário fictício ${acesso.email} ausente ou alterado; nenhum acesso foi criado.`,
      );
    }
    if (
      usuario.credencial ||
      (await tx.ativacaoConta.count({ where: { usuarioId: usuario.id } }))
    ) {
      throw new Error(
        `O acesso de ${acesso.email} já foi gerenciado; o seed não substitui credenciais ou recuperação.`,
      );
    }
    usuarios.push({ usuario, acesso });
  }
  for (const { usuario, acesso } of usuarios) {
    await tx.credencialLocal.create({
      data: {
        usuarioId: usuario.id,
        senhaHash: await hashSenha(acesso.senha),
      },
    });
  }
  await tx.visibilidadeIndicadorPerfil.createMany({
    data: acessosPerfis.visibilidadeIndicadores.map((v) => ({
      ...v,
      permitido: true,
    })),
    skipDuplicates: true,
  });
  await tx.auditoria.create({
    data: {
      id: profileAccessMarkerId,
      usuarioId: scenario.usuarios[0].id,
      entidade: 'fixture_profile_access',
      entidadeId: acessosPerfis.version,
      acao: 'criar',
      em: scenario.metadata.referenceDate,
      depois: {
        synthetic: true,
        version: acessosPerfis.version,
        sha256: profileAccessHash,
      },
    },
  });
}
