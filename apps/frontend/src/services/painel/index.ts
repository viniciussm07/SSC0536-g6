import {
  isOpcaoPainel,
  isPainel,
  isParticipacaoPainel,
  isSeriePainel,
  type ConsultaPainel,
  type FormatoExportacaoPainel,
  type OpcaoPainel,
  type TipoColeta,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';

const mensagem = 'Resposta do painel inesperada.';
const listaOpcoes = (value: unknown): value is OpcaoPainel[] =>
  Array.isArray(value) && value.every(isOpcaoPainel);

/** Camada de consumo dos indicadores publicados (parte 18). */
export const painelService = {
  async opcoes(signal?: AbortSignal) {
    return lerDados(
      await apiClient.request(endpoints.painel.opcoes, { signal }),
      listaOpcoes,
      mensagem,
    );
  },
  async consultar(consulta: ConsultaPainel, signal?: AbortSignal) {
    const parametros = new URLSearchParams({
      periodoId: String(consulta.periodoId),
      tipoColeta: consulta.tipoColeta,
    });
    if (consulta.comparacaoPeriodoId !== undefined)
      parametros.set(
        'comparacaoPeriodoId',
        String(consulta.comparacaoPeriodoId),
      );
    return lerDados(
      await apiClient.request(`${endpoints.painel.painel}?${parametros}`, {
        signal,
      }),
      isPainel,
      mensagem,
    );
  },
  async participacao(tipoColeta: TipoColeta, signal?: AbortSignal) {
    return lerDados(
      await apiClient.request(
        `${endpoints.painel.participacao}?${new URLSearchParams({ tipoColeta })}`,
        { signal },
      ),
      isParticipacaoPainel,
      mensagem,
    );
  },
  async serie(tipoColeta: TipoColeta, signal?: AbortSignal) {
    return lerDados(
      await apiClient.request(
        `${endpoints.painel.serie}?${new URLSearchParams({ tipoColeta })}`,
        { signal },
      ),
      isSeriePainel,
      mensagem,
    );
  },
  /** Baixa o painel como PDF ou XLSX; a permissão de exportar é conferida no servidor. */
  exportar(
    consulta: ConsultaPainel,
    formato: FormatoExportacaoPainel,
    signal: AbortSignal,
  ) {
    const parametros = new URLSearchParams({
      periodoId: String(consulta.periodoId),
      tipoColeta: consulta.tipoColeta,
      formato,
    });
    if (consulta.comparacaoPeriodoId !== undefined)
      parametros.set(
        'comparacaoPeriodoId',
        String(consulta.comparacaoPeriodoId),
      );
    return apiClient.baixar(`${endpoints.painel.exportacao}?${parametros}`, {
      signal,
      tipo:
        formato === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  },
};
