import {
  isSessaoAtual,
  type EntradaLogin,
  type EntradaAtivacao,
} from '@ssc0536/common';
import { apiClient, HttpError } from '@/services/http';
import { endpoints } from '@/services/endpoints';

function sessao(value: unknown) {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('data' in value) ||
    !isSessaoAtual(value.data)
  )
    throw new Error('Resposta de sessão inesperada.');
  return value.data;
}
export const autenticacaoService = {
  async atual(signal?: AbortSignal) {
    try {
      return sessao(
        await apiClient.request(endpoints.autenticacao.atual, { signal }),
      );
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) return null;
      throw error;
    }
  },
  async entrar(entrada: EntradaLogin) {
    return sessao(
      await apiClient.request(endpoints.autenticacao.sessoes, {
        method: 'POST',
        body: entrada,
      }),
    );
  },
  async sair() {
    await apiClient.request(endpoints.autenticacao.atual, { method: 'DELETE' });
  },
  async ativar(entrada: EntradaAtivacao) {
    await apiClient.request(endpoints.autenticacao.ativacoes, {
      method: 'POST',
      body: entrada,
    });
  },
};
