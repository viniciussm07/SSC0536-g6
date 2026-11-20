import type { Prisma } from '../src/generated/prisma/client';

type Db = Prisma.TransactionClient;

/** Modelo mínimo com o snapshot da v1 exigido pelas edições (parte 12). */
export const dadosModeloTeste = (nome: string, publicoAlvo: string) => ({
  nome,
  publicoAlvo,
  versoes: { create: { numero: 1, nome, publicoAlvo } },
});

/** Edição aberta coerente com o ciclo: versão 1, `abertaEm` e prazo após a abertura. */
export const dadosPesquisaTeste = (
  modeloId: number,
  titulo: string,
  abertura = new Date(),
) => ({
  modeloId,
  modeloVersao: 1,
  titulo,
  tipoColeta: 'consolidado',
  abertura,
  prazo: new Date(abertura.getTime() + 86_400_000),
  status: 'aberta',
  abertaEm: abertura,
});

/** Remove modelo de teste; os snapshots são imutáveis por gatilho, suspenso só aqui. */
export async function removerModeloTeste(db: Db, modeloId: number) {
  await db.$executeRaw`ALTER TABLE pesquisa_campo_versao DISABLE TRIGGER pesquisa_campo_versao_imutavel`;
  await db.$executeRaw`ALTER TABLE pesquisa_modelo_versao DISABLE TRIGGER pesquisa_modelo_versao_imutavel`;
  await db.pesquisaCampoVersao.deleteMany({ where: { modeloId } });
  await db.pesquisaModeloVersao.deleteMany({ where: { modeloId } });
  await db.$executeRaw`ALTER TABLE pesquisa_campo_versao ENABLE TRIGGER pesquisa_campo_versao_imutavel`;
  await db.$executeRaw`ALTER TABLE pesquisa_modelo_versao ENABLE TRIGGER pesquisa_modelo_versao_imutavel`;
  await db.pesquisaModelo.delete({ where: { id: modeloId } });
}
