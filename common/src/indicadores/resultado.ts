import { INDICADORES_ESCALA_SAIDA } from './indicadores.constants.js';
import type {
  MotivoIndisponibilidade,
  ValorIndicador,
} from './indicadores.types.js';
import { formatar, type Racional } from './racional.js';

export type Indisponivel = Extract<ValorIndicador, { estado: 'indisponivel' }>;

/** Valor exato em cálculo ou a causa raiz que o impede. */
export type Interno = Racional | Indisponivel;

export const indisponivel = (
  motivo: MotivoIndisponibilidade,
  detalhe: string,
): Indisponivel => ({ estado: 'indisponivel', motivo, detalhe });

export const ehIndisponivel = (valor: Interno): valor is Indisponivel =>
  'estado' in valor;

/** Aplica `operacao` quando tudo está disponível; senão propaga a primeira causa raiz. */
export function combinar(
  valores: Interno[],
  operacao: (...exatos: Racional[]) => Interno,
): Interno {
  const causa = valores.find(ehIndisponivel);
  return causa ?? operacao(...(valores as Racional[]));
}

export const publicar = (valor: Interno): ValorIndicador =>
  ehIndisponivel(valor)
    ? valor
    : {
        estado: 'disponivel',
        valor: formatar(valor, INDICADORES_ESCALA_SAIDA),
      };

export const ausente = (valor: unknown): valor is null | undefined =>
  valor === null || valor === undefined;
