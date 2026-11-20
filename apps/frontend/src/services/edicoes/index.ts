import {
  isDestinatarioLinha,
  isPesquisaDetalhe,
  isPesquisaLinha,
  type AlteracaoPesquisa,
  type EntradaPesquisa,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const caminho = endpoints.edicoes.pesquisas;
const detalhe = (value: unknown) =>
  lerDados(value, isPesquisaDetalhe, 'Resposta de pesquisa inesperada.');

/** Edições de pesquisa: rascunho, abertura, prazo, encerramento e acompanhamento. */
export const edicoesService = {
  listar(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(caminho, consulta, isPesquisaLinha, signal);
  },
  destinatarios(id: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminho}/${id}/destinatarios`,
      consulta,
      isDestinatarioLinha,
      signal,
    );
  },
  async detalhe(id: number, signal?: AbortSignal) {
    return detalhe(await apiClient.request(`${caminho}/${id}`, { signal }));
  },
  async criar(entrada: EntradaPesquisa) {
    return detalhe(
      await apiClient.request(caminho, { method: 'POST', body: entrada }),
    );
  },
  async alterar(id: number, alteracao: AlteracaoPesquisa) {
    return detalhe(
      await apiClient.request(`${caminho}/${id}`, {
        method: 'PUT',
        body: alteracao,
      }),
    );
  },
  async abrir(id: number) {
    return detalhe(
      await apiClient.request(`${caminho}/${id}/abertura`, { method: 'POST' }),
    );
  },
  async encerrar(id: number) {
    return detalhe(
      await apiClient.request(`${caminho}/${id}/encerramento`, {
        method: 'POST',
      }),
    );
  },
  async excluir(id: number) {
    await apiClient.request(`${caminho}/${id}`, { method: 'DELETE' });
  },
};
