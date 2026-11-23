import {
  isExecucaoCalculoDetalhe,
  isExecucaoCalculoLinha,
  isSolicitacaoCalculo,
  type EntradaExecucaoCalculo,
  type EntradaPublicacaoCalculo,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const caminho = endpoints.calculos.execucoes;
const mensagem = 'Resposta de cálculo inesperada.';

/** Execuções de cálculo: solicitação, retomada, detalhe com linhagem e publicação. */
export const calculosService = {
  listar(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(caminho, consulta, isExecucaoCalculoLinha, signal);
  },
  async detalhe(id: number, signal?: AbortSignal) {
    return lerDados(
      await apiClient.request(`${caminho}/${id}`, { signal }),
      isExecucaoCalculoDetalhe,
      mensagem,
    );
  },
  async executar(entrada: EntradaExecucaoCalculo) {
    return lerDados(
      await apiClient.request(caminho, { method: 'POST', body: entrada }),
      isSolicitacaoCalculo,
      mensagem,
    );
  },
  async retomar(id: number) {
    return lerDados(
      await apiClient.request(`${caminho}/${id}/retomada`, { method: 'POST' }),
      isExecucaoCalculoDetalhe,
      mensagem,
    );
  },
  async publicar(id: number, entrada: EntradaPublicacaoCalculo) {
    return lerDados(
      await apiClient.request(`${caminho}/${id}/publicacao`, {
        method: 'POST',
        body: entrada,
      }),
      isExecucaoCalculoDetalhe,
      mensagem,
    );
  },
};
