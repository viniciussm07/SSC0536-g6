import type {
  DestinatarioLinha,
  PesquisaLinha,
  StatusPesquisa,
  TipoColeta,
} from '@ssc0536/common';

export type PesquisaBanco = {
  id: number;
  titulo: string;
  tipoColeta: string;
  status: string;
  abertura: Date;
  prazo: Date;
  modeloId: number;
  modeloVersao: number;
};

export const paraLinhaPesquisa = (row: PesquisaBanco): PesquisaLinha => ({
  id: row.id,
  titulo: row.titulo,
  tipoColeta: row.tipoColeta as TipoColeta,
  status: row.status as StatusPesquisa,
  abertura: row.abertura.toISOString(),
  prazo: row.prazo.toISOString(),
  modeloId: row.modeloId,
  modeloVersao: row.modeloVersao,
});

export type DestinatarioBanco = {
  empreendimentoId: number;
  empreendimento: {
    nomeFantasia: string;
    respostas: { respondidaEm: Date }[];
  };
};

export const paraLinhaDestinatario = (
  row: DestinatarioBanco,
): DestinatarioLinha => {
  const resposta = row.empreendimento.respostas[0];
  return {
    empreendimentoId: row.empreendimentoId,
    nomeFantasia: row.empreendimento.nomeFantasia,
    situacaoResposta: resposta ? 'respondeu' : 'pendente',
    respondidaEm: resposta ? resposta.respondidaEm.toISOString() : null,
  };
};

/** Estado auditado da edição: campos de negócio, sem metadados derivados. */
export const estadoAuditado = (
  row: PesquisaBanco & { segmentoIds: number[] },
  periodoIds: number[],
) => ({
  titulo: row.titulo,
  tipoColeta: row.tipoColeta,
  status: row.status,
  abertura: row.abertura.toISOString(),
  prazo: row.prazo.toISOString(),
  modeloId: row.modeloId,
  modeloVersao: row.modeloVersao,
  segmentoIds: row.segmentoIds,
  periodoIds,
});
