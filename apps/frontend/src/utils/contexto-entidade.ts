import type { EscopoAcesso, VinculoAcesso } from '@ssc0536/common';

export interface EntidadeContexto {
  id: number;
  nome: string;
  cnpj: string | null;
}

/**
 * Decide a entidade contextualizada. Escopo `vinculados` só admite empreendimentos vinculados
 * (e escolhe o primeiro quando não há escolha válida); escopo `todos` aceita a escolha, que pode
 * ser nenhuma (visão geral) e é descartada quando o servidor a considerou inválida.
 */
export function resolverEntidade({
  escopoLeitura,
  vinculos,
  escolha,
  invalida,
}: {
  escopoLeitura: EscopoAcesso;
  vinculos: readonly VinculoAcesso[];
  escolha: EntidadeContexto | null;
  invalida: boolean;
}): EntidadeContexto | null {
  if (escopoLeitura === 'nenhum') return null;
  if (escopoLeitura === 'vinculados') {
    const vinculo =
      vinculos.find((v) => v.empreendimentoId === escolha?.id) ?? vinculos[0];
    return vinculo
      ? {
          id: vinculo.empreendimentoId,
          nome: vinculo.nomeFantasia,
          cnpj: vinculo.cnpj,
        }
      : null;
  }
  return escolha && !invalida ? escolha : null;
}

// Valores gravados antes do CNPJ existir (sem a chave) continuam válidos como null.
export function entidadeValida(value: unknown): value is EntidadeContexto {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'nome' in value &&
    typeof value.nome === 'string' &&
    value.nome.length > 0 &&
    value.nome.length <= 200 &&
    (!('cnpj' in value) ||
      value.cnpj === null ||
      typeof value.cnpj === 'string')
  );
}
