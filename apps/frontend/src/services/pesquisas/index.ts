import {
  isModeloPesquisaDetalhe,
  isModeloPesquisaLinha,
  isVersaoModeloLinha,
  type AlteracaoModeloPesquisa,
  type EntradaModeloPesquisa,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const caminhos = endpoints.pesquisas;
const dados = <T>(value: unknown, validar: (value: unknown) => value is T) =>
  lerDados(value, validar, 'Resposta de modelos de pesquisa inesperada.');

export const modelosPesquisaService = {
  listar(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhos.modelosPesquisa,
      consulta,
      isModeloPesquisaLinha,
      signal,
    );
  },
  /** Histórico imutável do modelo: cada versão guarda nome, público-alvo e campos daquele momento. */
  versoes(modeloId: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.modelosPesquisa}/${modeloId}/versoes`,
      consulta,
      isVersaoModeloLinha,
      signal,
    );
  },
  async detalhe(id: number, signal?: AbortSignal) {
    return dados(
      await apiClient.request(`${caminhos.modelosPesquisa}/${id}`, { signal }),
      isModeloPesquisaDetalhe,
    );
  },
  async criar(entrada: EntradaModeloPesquisa) {
    return dados(
      await apiClient.request(caminhos.modelosPesquisa, {
        method: 'POST',
        body: entrada,
      }),
      isModeloPesquisaDetalhe,
    );
  },
  async alterar(id: number, alteracao: AlteracaoModeloPesquisa) {
    return dados(
      await apiClient.request(`${caminhos.modelosPesquisa}/${id}`, {
        method: 'PUT',
        body: alteracao,
      }),
      isModeloPesquisaDetalhe,
    );
  },
};
