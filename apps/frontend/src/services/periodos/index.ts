import {
  isPeriodoDetalhe,
  isPeriodoLinha,
  type AlteracaoPeriodo,
  type EntradaPeriodo,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const caminhos = endpoints.periodos;
const dados = <T>(value: unknown, validar: (value: unknown) => value is T) =>
  lerDados(value, validar, 'Resposta de períodos inesperada.');

export const periodosService = {
  listar(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhos.periodos,
      consulta,
      isPeriodoLinha,
      signal,
    );
  },
  async detalhe(id: number, signal?: AbortSignal) {
    return dados(
      await apiClient.request(`${caminhos.periodos}/${id}`, { signal }),
      isPeriodoDetalhe,
    );
  },
  async criar(entrada: EntradaPeriodo) {
    return dados(
      await apiClient.request(caminhos.periodos, {
        method: 'POST',
        body: entrada,
      }),
      isPeriodoLinha,
    );
  },
  async alterar(id: number, alteracao: AlteracaoPeriodo) {
    return dados(
      await apiClient.request(`${caminhos.periodos}/${id}`, {
        method: 'PUT',
        body: alteracao,
      }),
      isPeriodoDetalhe,
    );
  },
};
