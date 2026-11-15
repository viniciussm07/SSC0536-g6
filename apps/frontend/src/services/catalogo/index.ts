import {
  isFormularioCatalogo,
  isGrupoCatalogo,
  isGrupoCatalogoLinha,
  isItemCatalogo,
  isItemCatalogoLinha,
  isVersaoItemCatalogo,
  type AlteracaoGrupoCatalogo,
  type AlteracaoItemCatalogo,
  type EntradaGrupoCatalogo,
  type EntradaItemCatalogo,
  type RespostaItemInventario,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const caminhos = endpoints.catalogo;
const dados = <T>(value: unknown, validar: (value: unknown) => value is T) =>
  lerDados(value, validar, 'Resposta de catálogo inesperada.');
const isItensValidados = (
  v: unknown,
): v is { itens: RespostaItemInventario[] } =>
  typeof v === 'object' && v !== null && 'itens' in v && Array.isArray(v.itens);

export const catalogoService = {
  /** Definição do formulário; `incluirInativos` só vale para quem gere catálogos. */
  async formulario(
    segmentoId: number,
    signal?: AbortSignal,
    incluirInativos = false,
  ) {
    return dados(
      await apiClient.request(
        `${caminhos.segmentos}/${segmentoId}/catalogo${incluirInativos ? '?incluirInativos=true' : ''}`,
        { signal },
      ),
      isFormularioCatalogo,
    );
  },
  /** Validação no servidor com as mesmas regras do inventário e da importação. */
  async validar(segmentoId: number, itens: RespostaItemInventario[]) {
    return dados(
      await apiClient.request(
        `${caminhos.segmentos}/${segmentoId}/catalogo/validacoes`,
        { method: 'POST', body: { itens } },
      ),
      isItensValidados,
    );
  },
  grupos(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.catalogos}/grupos`,
      consulta,
      isGrupoCatalogoLinha,
      signal,
    );
  },
  itens(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.catalogos}/itens`,
      consulta,
      isItemCatalogoLinha,
      signal,
    );
  },
  versoes(itemId: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.catalogos}/itens/${itemId}/versoes`,
      consulta,
      isVersaoItemCatalogo,
      signal,
    );
  },
  async criarGrupo(entrada: EntradaGrupoCatalogo) {
    return dados(
      await apiClient.request(`${caminhos.catalogos}/grupos`, {
        method: 'POST',
        body: entrada,
      }),
      isGrupoCatalogo,
    );
  },
  async alterarGrupo(id: number, alteracao: AlteracaoGrupoCatalogo) {
    return dados(
      await apiClient.request(`${caminhos.catalogos}/grupos/${id}`, {
        method: 'PUT',
        body: alteracao,
      }),
      isGrupoCatalogo,
    );
  },
  async criarItem(entrada: EntradaItemCatalogo) {
    return dados(
      await apiClient.request(`${caminhos.catalogos}/itens`, {
        method: 'POST',
        body: entrada,
      }),
      isItemCatalogo,
    );
  },
  async alterarItem(id: number, alteracao: AlteracaoItemCatalogo) {
    return dados(
      await apiClient.request(`${caminhos.catalogos}/itens/${id}`, {
        method: 'PUT',
        body: alteracao,
      }),
      isItemCatalogo,
    );
  },
};
