import {
  CABECALHO_CONTEXTO,
  isCadasturCadastro,
  isContatoCadastro,
  isEmpreendimentoDetalhe,
  isEmpreendimentoListado,
  isSegmentoResumo,
  type AlteracaoEmpreendimento,
  type CandidatoDuplicidade,
  type EntradaEmpreendimento,
  type ErroCampo,
  type SegmentoResumo,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const caminhos = endpoints.cadastro;
const dados = <T>(value: unknown, validar: (value: unknown) => value is T) =>
  lerDados(value, validar, 'Resposta de cadastro inesperada.');

export const cadastroService = {
  /** Listagem do cadastro (também é o catálogo de seleção; ignora o contexto). */
  async listar(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhos.empreendimentos,
      consulta,
      isEmpreendimentoListado,
      signal,
    );
  },
  async detalhe(id: number, signal?: AbortSignal) {
    return dados(
      await apiClient.request(`${caminhos.empreendimentos}/${id}`, {
        signal,
        headers: { [CABECALHO_CONTEXTO]: String(id) },
      }),
      isEmpreendimentoDetalhe,
    );
  },
  contatos(id: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.empreendimentos}/${id}/contatos`,
      consulta,
      isContatoCadastro,
      signal,
      id,
    );
  },
  cadastur(id: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.empreendimentos}/${id}/cadastur`,
      consulta,
      isCadasturCadastro,
      signal,
      id,
    );
  },
  async segmentos(signal?: AbortSignal) {
    return dados(
      await apiClient.request(caminhos.segmentos, { signal }),
      (v): v is SegmentoResumo[] =>
        Array.isArray(v) && v.every(isSegmentoResumo),
    );
  },
  async criar(entrada: EntradaEmpreendimento) {
    return dados(
      await apiClient.request(caminhos.empreendimentos, {
        method: 'POST',
        body: entrada,
      }),
      isEmpreendimentoDetalhe,
    );
  },
  async alterar(id: number, entrada: AlteracaoEmpreendimento) {
    return dados(
      await apiClient.request(`${caminhos.empreendimentos}/${id}`, {
        method: 'PUT',
        body: entrada,
        headers: { [CABECALHO_CONTEXTO]: String(id) },
      }),
      isEmpreendimentoDetalhe,
    );
  },
};

/** Erros por campo do envelope (`details: [{ field, message }]`), já validados. */
export function errosDeCampo(details: unknown): ErroCampo[] {
  return Array.isArray(details)
    ? details.filter(
        (d): d is ErroCampo =>
          typeof d === 'object' &&
          d !== null &&
          typeof d.field === 'string' &&
          typeof d.message === 'string',
      )
    : [];
}
/** Candidatos de `DUPLICIDADE_POTENCIAL`, já validados. */
export function candidatosDeDuplicidade(
  details: unknown,
): CandidatoDuplicidade[] {
  return Array.isArray(details)
    ? details.filter(
        (d): d is CandidatoDuplicidade =>
          typeof d === 'object' &&
          d !== null &&
          typeof d.id === 'number' &&
          typeof d.nomeFantasia === 'string' &&
          Array.isArray(d.motivos),
      )
    : [];
}
