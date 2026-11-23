import {
  isColetaDiariaLinha,
  isParametroCalculoLinha,
  isRhcPeriodoLinha,
  type AlteracaoColetaDiaria,
  type AlteracaoParametroCalculo,
  type AlteracaoRhcPeriodo,
  type EntradaColetaDiaria,
  type EntradaParametroCalculo,
  type EntradaRhcPeriodo,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const caminhos = endpoints.diarias;
const dados = <T>(value: unknown, validar: (value: unknown) => value is T) =>
  lerDados(value, validar, 'Resposta de fontes complementares inesperada.');

export const diariasService = {
  listarColetas(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhos.coletasDiarias,
      consulta,
      isColetaDiariaLinha,
      signal,
    );
  },
  async criarColeta(entrada: EntradaColetaDiaria) {
    return dados(
      await apiClient.request(caminhos.coletasDiarias, {
        method: 'POST',
        body: entrada,
      }),
      isColetaDiariaLinha,
    );
  },
  async alterarColeta(id: number, alteracao: AlteracaoColetaDiaria) {
    return dados(
      await apiClient.request(`${caminhos.coletasDiarias}/${id}`, {
        method: 'PUT',
        body: alteracao,
      }),
      isColetaDiariaLinha,
    );
  },
  listarRhc(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhos.rhcPeriodos,
      consulta,
      isRhcPeriodoLinha,
      signal,
    );
  },
  async criarRhc(entrada: EntradaRhcPeriodo) {
    return dados(
      await apiClient.request(caminhos.rhcPeriodos, {
        method: 'POST',
        body: entrada,
      }),
      isRhcPeriodoLinha,
    );
  },
  async alterarRhc(id: number, alteracao: AlteracaoRhcPeriodo) {
    return dados(
      await apiClient.request(`${caminhos.rhcPeriodos}/${id}`, {
        method: 'PUT',
        body: alteracao,
      }),
      isRhcPeriodoLinha,
    );
  },
  listarParametros(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhos.parametrosCalculo,
      consulta,
      isParametroCalculoLinha,
      signal,
    );
  },
  async criarParametro(entrada: EntradaParametroCalculo) {
    return dados(
      await apiClient.request(caminhos.parametrosCalculo, {
        method: 'POST',
        body: entrada,
      }),
      isParametroCalculoLinha,
    );
  },
  async alterarParametro(id: number, alteracao: AlteracaoParametroCalculo) {
    return dados(
      await apiClient.request(`${caminhos.parametrosCalculo}/${id}`, {
        method: 'PUT',
        body: alteracao,
      }),
      isParametroCalculoLinha,
    );
  },
};
