import { createHash } from 'node:crypto';
import indicadoresDemo from '../../../fixtures/oto/indicadores-demo.json';
import type { Prisma } from '../src/generated/prisma/client';
import { assertSeedTarget } from './demo-fixtures';

export { indicadoresDemo };
export const indicadoresDemoHash = createHash('sha256')
  .update(JSON.stringify(indicadoresDemo))
  .digest('hex');
export const indicadoresDemoMarkerId = 9_000_003;
const processo = 'db:indicadores-demo';

/**
 * Carrega a série fictícia do painel de indicadores. Executar dentro de uma transação: dados,
 * visibilidade e marcador são confirmados juntos. Não apaga nem sobrescreve nada: com o
 * marcador da mesma versão é no-op; qualquer conflito recusa a carga inteira.
 */
export async function carregarIndicadoresDemo(
  tx: Prisma.TransactionClient,
  databaseUrl: string | undefined,
  nodeEnv = process.env.NODE_ENV,
) {
  assertSeedTarget(databaseUrl, nodeEnv);
  const marker = await tx.auditoria.findUnique({
    where: { id: indicadoresDemoMarkerId },
  });
  if (marker) {
    const payload = marker.depois;
    if (
      marker.entidade !== 'fixture_indicadores_demo' ||
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload) ||
      payload.sha256 !== indicadoresDemoHash
    ) {
      throw new Error(
        'Marcador da massa de indicadores incompatível; nada foi alterado. Use outra base _dev/_test.',
      );
    }
    return 'already-loaded' as const;
  }

  const { definicoes, periodos, resultados, visibilidades } = indicadoresDemo;
  const conflitos = [
    await tx.indicadorDefinicao.count({
      where: {
        OR: [
          { id: { in: definicoes.map((d) => d.id) } },
          { codigo: { in: definicoes.map((d) => d.codigo) } },
        ],
      },
    }),
    await tx.periodo.count({
      where: { id: { in: periodos.map((p) => p.id) } },
    }),
    await tx.indicadorResultado.count({
      where: { id: { in: resultados.map((r) => r.id) } },
    }),
  ];
  if (conflitos.some((n) => n > 0))
    throw new Error(
      'IDs ou códigos da massa de indicadores já existem nesta base; nada foi alterado.',
    );
  // Período equivalente (mesmo tipo e datas) já cadastrado: não duplicar a identidade.
  const equivalentes = await tx.periodo.count({
    where: {
      OR: periodos.map((p) => ({
        tipo: p.tipo,
        dataInicio: new Date(p.dataInicio),
        dataFim: new Date(p.dataFim),
      })),
    },
  });
  if (equivalentes > 0)
    throw new Error(
      'A base já tem períodos com o mesmo tipo e datas da massa de indicadores; nada foi alterado.',
    );

  await tx.indicadorDefinicao.createMany({ data: definicoes });
  await tx.periodo.createMany({ data: periodos });
  await tx.indicadorResultado.createMany({ data: resultados });
  // Mesma liberação do indicador demo do seed (gestor e visualizador); não altera linhas existentes.
  await tx.visibilidadeIndicadorPerfil.createMany({
    data: visibilidades.map((v) => ({ ...v, permitido: true })),
    skipDuplicates: true,
  });
  await tx.auditoria.create({
    data: {
      id: indicadoresDemoMarkerId,
      usuarioId: null,
      origem: 'automatica',
      processo,
      entidade: 'fixture_indicadores_demo',
      entidadeId: indicadoresDemo.metadata.version,
      acao: 'criar',
      em: indicadoresDemo.metadata.referenceDate,
      depois: {
        synthetic: true,
        version: indicadoresDemo.metadata.version,
        sha256: indicadoresDemoHash,
      },
    },
  });
  return 'loaded' as const;
}
