import {
  CABECALHO_NOME_ARQUIVO,
  COLECOES,
  caminhoColecao,
  isLinhaImportacaoLinha,
  isLoteImportacaoDetalhe,
  isLoteImportacaoLinha,
  isOcorrenciaImportacaoLinha,
  isPlanoImportacao,
  isResultadoConfirmacao,
  type EntradaConfirmacao,
  type EntradaConflito,
  type EntradaDecisao,
  type EntradaDestino,
  type FonteImportacao,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const caminho = endpoints.importacoes.importacoes;
const dados = <T>(valor: unknown, validar: (valor: unknown) => valor is T) =>
  lerDados(valor, validar, 'Resposta de importação inesperada.');

export const importacoesService = {
  listar(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(caminho, consulta, isLoteImportacaoLinha, signal);
  },
  async detalhe(id: number, signal?: AbortSignal) {
    return dados(
      await apiClient.request(`${caminho}/${id}`, { signal }),
      isLoteImportacaoDetalhe,
    );
  },
  ocorrencias(id: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhoColecao(COLECOES.ocorrenciasImportacao, { id }),
      consulta,
      isOcorrenciaImportacaoLinha,
      signal,
    );
  },
  linhas(id: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhoColecao(COLECOES.linhasImportacao, { id }),
      consulta,
      isLinhaImportacaoLinha,
      signal,
    );
  },
  /** Envia o arquivo como corpo binário; o servidor o lê e devolve o lote com a prévia. */
  async enviar(entrada: { fonte: FonteImportacao; arquivo: File }) {
    return dados(
      await apiClient.request(
        `${caminho}?fonte=${encodeURIComponent(entrada.fonte)}`,
        {
          method: 'POST',
          body: entrada.arquivo,
          headers: {
            [CABECALHO_NOME_ARQUIVO]: encodeURIComponent(entrada.arquivo.name),
          },
          timeoutMs: 60000,
        },
      ),
      isLoteImportacaoDetalhe,
    );
  },
  /** Exclui o lote enquanto só há leitura; 409 `LOTE_CONFIRMADO` se já gravou respostas. */
  async excluir(id: number) {
    await apiClient.request(`${caminho}/${id}`, { method: 'DELETE' });
  },
  async reler(id: number) {
    return dados(
      await apiClient.request(`${caminho}/${id}/leituras`, { method: 'POST' }),
      isLoteImportacaoDetalhe,
    );
  },
  async definirDestino(id: number, entrada: EntradaDestino) {
    return dados(
      await apiClient.request(`${caminho}/${id}/destino`, {
        method: 'PUT',
        body: entrada,
      }),
      isPlanoImportacao,
    );
  },
  async plano(id: number, signal?: AbortSignal) {
    return dados(
      await apiClient.request(`${caminho}/${id}/plano`, { signal }),
      isPlanoImportacao,
    );
  },
  async decidir(id: number, linhaId: number, entrada: EntradaDecisao) {
    return dados(
      await apiClient.request(`${caminho}/${id}/linhas/${linhaId}/decisao`, {
        method: 'PUT',
        body: entrada,
      }),
      isPlanoImportacao,
    );
  },
  async removerDecisao(id: number, linhaId: number) {
    await apiClient.request(`${caminho}/${id}/linhas/${linhaId}/decisao`, {
      method: 'DELETE',
    });
  },
  async resolverConflito(
    id: number,
    linhaId: number,
    entrada: EntradaConflito,
  ) {
    return dados(
      await apiClient.request(`${caminho}/${id}/linhas/${linhaId}/conflito`, {
        method: 'PUT',
        body: entrada,
      }),
      isPlanoImportacao,
    );
  },
  async confirmar(id: number, entrada: EntradaConfirmacao) {
    return dados(
      await apiClient.request(`${caminho}/${id}/confirmacoes`, {
        method: 'POST',
        body: entrada,
      }),
      isResultadoConfirmacao,
    );
  },
  rejeicoes(id: number, signal: AbortSignal) {
    return apiClient.baixar(`${caminho}/${id}/rejeicoes`, { signal });
  },
};
