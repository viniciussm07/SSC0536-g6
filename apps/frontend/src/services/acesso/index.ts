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
  isPermissaoAcesso,
  isPerfil,
  type CriarConta,
  type AlterarConta,
  type Perfil,
  type PermissaoAcesso,
} from '@ssc0536/common';
import { apiClient } from '@/services/http';
import { lerDados } from '@/services/http/envelope';
import { endpoints } from '@/services/endpoints';
import { consultarColecao, type ConsultaColecao } from '@/services/odata';

const dados = <T>(value: unknown, validar: (value: unknown) => value is T) =>
  lerDados(value, validar, 'Resposta de acesso inesperada.');
// Dados de uma entidade informam ao servidor o empreendimento contextualizado.
const cabecalhoContexto = (empreendimentoId: number) => ({
  [CABECALHO_CONTEXTO]: String(empreendimentoId),
});
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
  contas(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(caminhos.contas, consulta, isContaResumo, signal);
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
  vinculos(id: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.contas}/${id}/vinculos`,
      consulta,
      isVinculoConta,
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
  permissoes(perfil: Perfil, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${perfilPath(perfil)}/permissoes`,
      consulta,
      isPermissaoAcesso,
      signal,
    );
  },
  /** Matriz completa do perfil: o PUT substitui tudo, então nunca pode vir truncada. */
  async permissoesCompletas(perfil: Perfil, signal?: AbortSignal) {
    const regras: PermissaoAcesso[] = [];
    for (;;) {
      const pagina = await consultarColecao(
        `${perfilPath(perfil)}/permissoes`,
        { top: 100, skip: regras.length, count: true },
        isPermissaoAcesso,
        signal,
      );
      regras.push(...pagina.data);
      if (!pagina.data.length || regras.length >= (pagina.meta.total ?? 0))
        return regras;
    }
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
  visibilidades(
    perfil: Perfil,
    consulta: ConsultaColecao,
    signal?: AbortSignal,
  ) {
    return consultarColecao(
      `${perfilPath(perfil)}/visibilidades`,
      consulta,
      isVisibilidadeIndicador,
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
  empreendimentos(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhos.empreendimentos,
      consulta,
      isEmpreendimentoResumo,
      signal,
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
  respostas(id: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.empreendimentos}/${id}/respostas`,
      consulta,
      isRespostaResumo,
      signal,
      id,
    );
  },
  inventarios(id: number, consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.empreendimentos}/${id}/inventarios`,
      consulta,
      isInventarioResumo,
      signal,
      id,
    );
  },
  indicadores(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      caminhos.indicadores,
      consulta,
      isIndicadorConsulta,
      signal,
    );
  },
  exportarIndicadores(consulta: ConsultaColecao, signal?: AbortSignal) {
    return consultarColecao(
      `${caminhos.indicadores}/exportacoes`,
      consulta,
      isIndicadorConsulta,
      signal,
    );
  },
};
