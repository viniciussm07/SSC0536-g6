import {
  CABECALHO_CONTEXTO,
  isAcessoAtual,
  isContaResumo,
  isCodigoAtivacaoConta,
  isEmpreendimentoResumo,
  isRespostaResumo,
  isInventarioResumo,
  isIndicadorConsulta,
  isVinculoConta,
  isVisibilidadeIndicador,
  isPaginatedResponse,
  isPermissaoAcesso,
  isPerfil,
  type CriarConta,
  type AlterarConta,
  type Perfil,
  type PermissaoAcesso,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { endpoints } from '@/services/endpoints';

function dados<T>(value: unknown, validar: (value: unknown) => value is T): T {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('data' in value) ||
    !validar(value.data)
  )
    throw new Error('Resposta de acesso inesperada.');
  return value.data;
}
// Dados de uma entidade informam ao servidor o empreendimento contextualizado.
const cabecalhoContexto = (empreendimentoId: number) => ({
  [CABECALHO_CONTEXTO]: String(empreendimentoId),
});
async function colecao<T>(
  path: string,
  validar: (value: unknown) => value is T,
  page: number,
  signal?: AbortSignal,
  { busca, contexto }: { busca?: string; contexto?: number } = {},
) {
  const consulta = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (busca) consulta.set('busca', busca);
  const value = await apiClient.request(`${path}?${consulta}`, {
    signal,
    headers: contexto === undefined ? undefined : cabecalhoContexto(contexto),
  });
  if (!isPaginatedResponse(value, validar))
    throw new Error('Resposta de coleção inesperada.');
  return value;
}
const caminhos = endpoints.acesso;
const perfilPath = (perfil: Perfil) =>
  `${caminhos.perfis}/${encodeURIComponent(perfil)}`;
export const acessoService = {
  async atual(signal?: AbortSignal) {
    return dados(
      await apiClient.request(caminhos.atual, { signal }),
      isAcessoAtual,
    );
  },
  contas(page: number, signal?: AbortSignal) {
    return colecao(caminhos.contas, isContaResumo, page, signal);
  },
  async criarConta(body: CriarConta) {
    return dados(
      await apiClient.request(caminhos.contas, { method: 'POST', body }),
      isCodigoAtivacaoConta,
    );
  },
  async alterarConta(id: number, body: AlterarConta) {
    return dados(
      await apiClient.request(`${caminhos.contas}/${id}`, {
        method: 'PUT',
        body,
      }),
      isContaResumo,
    );
  },
  async recuperar(id: number) {
    return dados(
      await apiClient.request(`${caminhos.contas}/${id}/ativacoes`, {
        method: 'POST',
      }),
      isCodigoAtivacaoConta,
    );
  },
  vinculos(id: number, page: number, signal?: AbortSignal) {
    return colecao(
      `${caminhos.contas}/${id}/vinculos`,
      isVinculoConta,
      page,
      signal,
    );
  },
  async vincular(id: number, empreendimentoId: number, ativo: boolean) {
    dados(
      await apiClient.request(
        `${caminhos.contas}/${id}/vinculos/${empreendimentoId}`,
        { method: 'PUT', body: { ativo } },
      ),
      (v): v is { empreendimentoId: number; ativo: boolean } =>
        typeof v === 'object' &&
        v !== null &&
        'empreendimentoId' in v &&
        v.empreendimentoId === empreendimentoId &&
        'ativo' in v &&
        v.ativo === ativo,
    );
  },
  async permissoes(perfil: Perfil, signal?: AbortSignal) {
    return dados(
      await apiClient.request(`${perfilPath(perfil)}/permissoes`, { signal }),
      (v): v is PermissaoAcesso[] =>
        Array.isArray(v) && v.every(isPermissaoAcesso),
    );
  },
  async alterarPermissoes(perfil: Perfil, permissoes: PermissaoAcesso[]) {
    dados(
      await apiClient.request(`${perfilPath(perfil)}/permissoes`, {
        method: 'PUT',
        body: { permissoes },
      }),
      (v): v is { perfil: Perfil; permissoes: PermissaoAcesso[] } =>
        typeof v === 'object' &&
        v !== null &&
        'perfil' in v &&
        isPerfil(v.perfil) &&
        'permissoes' in v &&
        Array.isArray(v.permissoes) &&
        v.permissoes.every(isPermissaoAcesso),
    );
  },
  visibilidades(perfil: Perfil, page: number, signal?: AbortSignal) {
    return colecao(
      `${perfilPath(perfil)}/visibilidades`,
      isVisibilidadeIndicador,
      page,
      signal,
    );
  },
  async alterarVisibilidade(
    perfil: Perfil,
    indicadorId: number,
    permitido: boolean,
  ) {
    dados(
      await apiClient.request(
        `${perfilPath(perfil)}/visibilidades/${indicadorId}`,
        { method: 'PUT', body: { permitido } },
      ),
      (v): v is { permitido: boolean } =>
        typeof v === 'object' &&
        v !== null &&
        'permitido' in v &&
        v.permitido === permitido,
    );
  },
  // Catálogo de seleção: ignora o contexto e traz somente o que o acesso permite escolher.
  empreendimentos(page: number, signal?: AbortSignal, busca?: string) {
    return colecao(
      caminhos.empreendimentos,
      isEmpreendimentoResumo,
      page,
      signal,
      { busca },
    );
  },
  async empreendimento(id: number, signal?: AbortSignal) {
    return dados(
      await apiClient.request(`${caminhos.empreendimentos}/${id}`, {
        signal,
        headers: cabecalhoContexto(id),
      }),
      isEmpreendimentoResumo,
    );
  },
  respostas(id: number, page: number, signal?: AbortSignal) {
    return colecao(
      `${caminhos.empreendimentos}/${id}/respostas`,
      isRespostaResumo,
      page,
      signal,
      { contexto: id },
    );
  },
  inventarios(id: number, page: number, signal?: AbortSignal) {
    return colecao(
      `${caminhos.empreendimentos}/${id}/inventarios`,
      isInventarioResumo,
      page,
      signal,
      { contexto: id },
    );
  },
  indicadores(page: number, signal?: AbortSignal) {
    return colecao(caminhos.indicadores, isIndicadorConsulta, page, signal);
  },
  exportarIndicadores(page: number, signal?: AbortSignal) {
    return colecao(
      `${caminhos.indicadores}/exportacoes`,
      isIndicadorConsulta,
      page,
      signal,
    );
  },
};
