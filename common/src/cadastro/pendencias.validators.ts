import type { PendenciaCadastro } from './cadastro.types.js';

export interface DadosPendencias {
  cnpj: string | null;
  razaoSocial: string | null;
  tipoHospedagem: string | null;
  categoriaIndicador: string | null;
  endereco: string | null;
  segmentos: number;
  contatos: number;
  cadastur: number;
}

/**
 * Informações cadastrais faltantes. São avisos: campos opcionais ausentes nunca bloqueiam o
 * cadastro, e a localização geográfica não é cobrada (o cadastro não depende de mapa).
 */
export function calcularPendencias(
  dados: DadosPendencias,
): PendenciaCadastro[] {
  const faltas: PendenciaCadastro[] = [];
  if (!dados.cnpj) faltas.push('sem_cnpj');
  if (!dados.razaoSocial) faltas.push('sem_razao_social');
  if (!dados.tipoHospedagem) faltas.push('sem_tipo_hospedagem');
  if (!dados.categoriaIndicador) faltas.push('sem_categoria_indicador');
  if (!dados.endereco) faltas.push('sem_endereco');
  if (!dados.segmentos) faltas.push('sem_segmento');
  if (!dados.contatos) faltas.push('sem_contato');
  if (!dados.cadastur) faltas.push('sem_cadastur');
  return faltas;
}
