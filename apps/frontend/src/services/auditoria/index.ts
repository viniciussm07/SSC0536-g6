import {
  isEventoAuditoriaResumo,
  isEventoAuditoriaDetalhe,
} from '@ssc0536/common';
import { endpoints } from '@/services/endpoints';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';
export const auditoriaService = {
  listar: (consulta: ConsultaColecao, signal?: AbortSignal) =>
    consultarColecao(
      endpoints.auditoria.eventos,
      consulta,
      isEventoAuditoriaResumo,
      signal,
    ),
  async detalhe(id: number, signal?: AbortSignal) {
    return lerDados(
      await apiClient.request(
        `${endpoints.auditoria.eventos}/${encodeURIComponent(id)}`,
        { signal },
      ),
      isEventoAuditoriaDetalhe,
      'Resposta de auditoria inesperada.',
    );
  },
};
