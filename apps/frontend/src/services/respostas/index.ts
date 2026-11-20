import {
  CABECALHO_CONTEXTO,
  isFormularioResposta,
  isPesquisaRespondenteLinha,
  type ItemResposta,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const caminhos = endpoints.respostas;
const preencher = (modelo: string, id: number, pesquisaId?: number) =>
  modelo
    .replace(':id', String(id))
    .replace(':pesquisaId', String(pesquisaId ?? ''));
const contexto = (id: number) => ({ [CABECALHO_CONTEXTO]: String(id) });
const formulario = (value: unknown) =>
  lerDados(value, isFormularioResposta, 'Resposta de pesquisa inesperada.');

/** Respostas do empreendimento contextualizado; o contexto vai em todas as chamadas. */
export const respostasService = {
  painel(id: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      preencher(caminhos.pesquisas, id),
      consulta,
      isPesquisaRespondenteLinha,
      signal,
      id,
    );
  },
  async formulario(id: number, pesquisaId: number, signal?: AbortSignal) {
    return formulario(
      await apiClient.request(preencher(caminhos.formulario, id, pesquisaId), {
        signal,
        headers: contexto(id),
      }),
    );
  },
  /** Idempotente: reenviar o mesmo conteúdo não grava de novo. */
  async enviar(id: number, pesquisaId: number, itens: ItemResposta[]) {
    return formulario(
      await apiClient.request(preencher(caminhos.resposta, id, pesquisaId), {
        method: 'PUT',
        body: { itens },
        headers: contexto(id),
      }),
    );
  },
};
