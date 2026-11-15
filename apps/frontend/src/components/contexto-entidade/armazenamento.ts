import {
  entidadeValida,
  type EntidadeContexto,
} from '@/utils/contexto-entidade';

// Conveniência por pessoa: guarda a última escolha para sobreviver a recarregamentos.
// Nunca é autoridade: o servidor valida o cabeçalho em cada requisição.
const chave = (usuarioId: number) => `oto:contexto:${usuarioId}`;

export function lerContexto(usuarioId: number): EntidadeContexto | null {
  try {
    const bruto = localStorage.getItem(chave(usuarioId));
    const valor: unknown = bruto ? JSON.parse(bruto) : null;
    return entidadeValida(valor)
      ? { ...valor, cnpj: valor.cnpj ?? null }
      : null;
  } catch {
    return null;
  }
}

export function gravarContexto(
  usuarioId: number,
  entidade: EntidadeContexto | null,
) {
  try {
    if (entidade)
      localStorage.setItem(chave(usuarioId), JSON.stringify(entidade));
    else localStorage.removeItem(chave(usuarioId));
  } catch {
    // Armazenamento indisponível: o contexto vale somente nesta sessão de navegação.
  }
}
