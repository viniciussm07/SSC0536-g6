import { situacaoPesquisa } from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { naoEncontrado } from '../acesso/acesso.errors';
import {
  empreendimentoNaoDestinatario,
  pesquisaNaoRecebe,
} from './pesquisas.errors';

/**
 * Guarda de recebimento para a parte 13: chamada dentro da transação do envio.
 * `FOR SHARE` serializa com o encerramento (`FOR UPDATE`): ou o envio termina antes,
 * ou enxerga a edição encerrada. Prazo e estado vêm do relógio do servidor, sem job.
 */
export async function exigirRecebimento(
  tx: Prisma.TransactionClient,
  pesquisaId: number,
  empreendimentoId: number,
  agora = new Date(),
) {
  await tx.$queryRaw`SELECT id FROM pesquisa WHERE id = ${pesquisaId} FOR SHARE`;
  const pesquisa = await tx.pesquisa.findUnique({ where: { id: pesquisaId } });
  if (!pesquisa) throw naoEncontrado();
  const situacao = situacaoPesquisa(pesquisa, agora);
  if (situacao !== 'recebendo') throw pesquisaNaoRecebe(situacao);
  if (pesquisa.destinatariosRegistradosEm !== null) {
    const destinatario = await tx.pesquisaDestinatario.findUnique({
      where: { pesquisaId_empreendimentoId: { pesquisaId, empreendimentoId } },
      select: { pesquisaId: true },
    });
    if (!destinatario) throw empreendimentoNaoDestinatario();
  }
  return pesquisa;
}
