import {
  CABECALHO_CONTEXTO,
  isVersaoInventarioDetalhe,
  type EntradaConferenciaInventario,
  type SituacaoConferenciaInventario,
  type VersaoInventarioDetalhe,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';

const caminhoBase = (id: number) =>
  `${endpoints.acesso.empreendimentos}/${id}/inventarios`;
const contexto = (id: number) => ({ [CABECALHO_CONTEXTO]: String(id) });
const dados = <T>(value: unknown, validar: (value: unknown) => value is T) =>
  lerDados(value, validar, 'Resposta de inventário inesperada.');
const isDetalheOuNulo = (v: unknown): v is VersaoInventarioDetalhe | null =>
  v === null || isVersaoInventarioDetalhe(v);

/** Corpo de uma nova versão; os campos seguem o contrato da API (ver `docs/contratos/inventario.md`). */
export interface CorpoNovaVersao {
  tipoAlteracao: 'mudanca_real' | 'correcao';
  vigenciaInicio?: string;
  vigenciaFim?: string | null;
  corrigeId?: number;
  motivo?: string;
  capacidade: Record<string, unknown>;
  itens: unknown[];
}

export const inventarioService = {
  /** Versão válida na data (padrão: hoje) ou `null` quando nenhuma cobre a data. */
  async vigente(id: number, data?: string, signal?: AbortSignal) {
    return dados(
      await apiClient.request(
        `${caminhoBase(id)}/vigente${data ? `?data=${data}` : ''}`,
        { signal, headers: contexto(id) },
      ),
      isDetalheOuNulo,
    );
  },
  async detalhe(id: number, versaoId: number, signal?: AbortSignal) {
    return dados(
      await apiClient.request(`${caminhoBase(id)}/${versaoId}`, {
        signal,
        headers: contexto(id),
      }),
      isVersaoInventarioDetalhe,
    );
  },
  async criar(id: number, corpo: CorpoNovaVersao) {
    return dados(
      await apiClient.request(caminhoBase(id), {
        method: 'POST',
        body: corpo,
        headers: contexto(id),
      }),
      isVersaoInventarioDetalhe,
    );
  },
  async conferir(
    id: number,
    versaoId: number,
    situacaoConferencia: SituacaoConferenciaInventario,
    motivo?: string,
  ) {
    const corpo: EntradaConferenciaInventario = {
      situacaoConferencia,
      ...(motivo ? { motivo } : {}),
    };
    return dados(
      await apiClient.request(`${caminhoBase(id)}/${versaoId}/conferencia`, {
        method: 'PUT',
        body: corpo,
        headers: contexto(id),
      }),
      isVersaoInventarioDetalhe,
    );
  },
};
