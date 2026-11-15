export type OrigemAuditoria = 'manual' | 'automatica';
export type ValorAuditoria =
  | string
  | number
  | boolean
  | null
  | ValorAuditoria[]
  | { [chave: string]: ValorAuditoria };
export type SnapshotAuditoria = { [chave: string]: ValorAuditoria };
export interface EventoAuditoriaResumo {
  id: number;
  entidade: string;
  entidadeId: number;
  acao: string;
  em: string;
  usuarioId: number | null;
  autor: string;
  origem: OrigemAuditoria;
  processo: string | null;
  correlacaoId: string | null;
}
export interface DiferencaAuditoria {
  campo: string;
  antes: ValorAuditoria;
  depois: ValorAuditoria;
  antesPresente: boolean;
  depoisPresente: boolean;
}
export interface EventoAuditoriaDetalhe extends EventoAuditoriaResumo {
  antes: SnapshotAuditoria | null;
  depois: SnapshotAuditoria | null;
  diferencas: DiferencaAuditoria[];
}
