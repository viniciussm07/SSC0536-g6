import type { Prisma } from '../generated/prisma/client';

/**
 * Resultados que o perfil pode consumir. É a única definição de visibilidade usada pela grade,
 * pela exportação e pelo painel, para que as três telas nunca divirjam (parte 18).
 *
 * Consumo (parte 16): resultados de carga e os da execução publicada; calculado e substituído
 * ficam no detalhe do cálculo. `incluirIndisponiveis` mostra o indicador sem valor (nunca zero)
 * apenas onde há alternativa visual para a lacuna.
 */
export function escopoIndicadoresConsumo(
  perfil: string,
  incluirIndisponiveis = false,
): Prisma.IndicadorResultadoWhereInput {
  return {
    definicao: {
      visibilidades: { some: { perfil, permitido: true } },
    },
    ...(incluirIndisponiveis ? {} : { valor: { not: null } }),
    OR: [{ execucaoId: null }, { execucao: { publicacao: 'publicado' } }],
  };
}
