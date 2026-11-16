import { exportacaoAtual } from '../colecoes/csv';
import type { EsquemaOData } from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { compilarOrdenacao } from './prisma-order';
import {
  compilarFiltro,
  type MapeamentoRecurso,
  type Where,
} from './prisma-where';
import type { ConsultaColecao } from './odata.decorators';

export interface MetaColecao {
  top: number;
  skip: number;
  /** Só com `$count=true`. */
  total?: number;
}

export function metaColecao(
  consulta: ConsultaColecao,
  total?: number,
): MetaColecao {
  const meta: MetaColecao = { top: consulta.top, skip: consulta.skip };
  if (total !== undefined) meta.total = total;
  return meta;
}

/**
 * Executa uma coleção OData: combina o filtro do usuário DENTRO do escopo de autorização
 * (`escopo`, nunca substituído), ordena de forma estável, pagina e, quando pedido, conta na
 * mesma transação.
 */
export async function executarColecao<L, R>(opcoes: {
  prisma: PrismaService;
  consulta: ConsultaColecao;
  esquema: EsquemaOData;
  mapa: MapeamentoRecurso;
  /** Restrições de autorização e contexto; sempre aplicadas. */
  escopo: readonly Where[];
  buscar: (args: {
    where: Where;
    orderBy: Record<string, unknown>[];
    skip: number;
    take: number;
    db: Prisma.TransactionClient;
  }) => Prisma.PrismaPromise<L[]>;
  contar: (
    where: Where,
    db: Prisma.TransactionClient,
  ) => Prisma.PrismaPromise<number>;
  mapear: (linha: L) => R;
}): Promise<{ data: R[]; meta: MetaColecao }> {
  const { consulta, esquema, mapa } = opcoes;
  const filtro = consulta.filtro
    ? [compilarFiltro(consulta.filtro, esquema, mapa)]
    : [];
  const where: Where = { AND: [...opcoes.escopo, ...filtro] };
  const pagina = {
    where,
    orderBy: compilarOrdenacao(consulta.ordenacao, esquema, mapa),
    skip: consulta.skip,
    take: consulta.top,
  };
  const exportacao = exportacaoAtual.getStore();
  if (exportacao) {
    await opcoes.prisma.$transaction(
      async (db) => {
        const tamanhoLote = 1000;
        for (let skip = 0; ; skip += tamanhoLote) {
          exportacao.signal.throwIfAborted();
          const lote = await opcoes.buscar({
            ...pagina,
            skip,
            take: tamanhoLote,
            db,
          });
          await exportacao.escrever(lote.map(opcoes.mapear));
          if (lote.length < tamanhoLote) break;
        }
      },
      { isolationLevel: 'RepeatableRead', timeout: 120000 },
    );
    return { data: [], meta: metaColecao(consulta) };
  }
  let linhas: L[];
  let total: number | undefined;
  if (consulta.contar)
    [linhas, total] = await opcoes.prisma.$transaction([
      opcoes.buscar({ ...pagina, db: opcoes.prisma }),
      opcoes.contar(where, opcoes.prisma),
    ]);
  else linhas = await opcoes.buscar({ ...pagina, db: opcoes.prisma });

  return {
    data: linhas.map(opcoes.mapear),
    meta: metaColecao(consulta, total),
  };
}
