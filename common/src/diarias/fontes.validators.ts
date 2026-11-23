import type { ErroCampo } from '../cadastro/cadastro.types.js';
import { dataCivilValida } from '../cadastro/entrada.validators.js';
import { LIMITES_DIARIAS, PADRAO_MOEDA } from './fontes.constants.js';

export type Objeto = Record<string, unknown>;

export const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const inteiroPositivo = (v: unknown): v is number =>
  typeof v === 'number' &&
  Number.isSafeInteger(v) &&
  v > 0 &&
  v <= 2_147_483_647;

export const inteiroNaoNegativo = (v: unknown, maximo: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= maximo;

export function dataValida(valor: unknown): valor is string {
  return dataCivilValida(valor);
}

/**
 * Decimal positivo em texto (aceita vírgula como separador e normaliza para ponto).
 * Não há arredondamento: o valor só é aceito dentro da escala declarada.
 */
export function lerDecimal(
  valor: unknown,
  opcoes: { permitirZero?: boolean } = {},
): string | null {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(limpo)) return null;
  const [inteiro, fracao = ''] = limpo.replace(',', '.').split('.');
  if (fracao.length > LIMITES_DIARIAS.casasDecimais) return null;
  const numero = Number(`${inteiro}.${fracao || '0'}`);
  if (
    !Number.isFinite(numero) ||
    numero < 0 ||
    numero > LIMITES_DIARIAS.valorMaximo
  )
    return null;
  if (!opcoes.permitirZero && numero === 0) return null;
  return fracao ? `${inteiro}.${fracao}` : inteiro;
}

/** Texto opcional: omitido ignora; null limpa; vazio é erro. */
export function textoOpcional(
  origem: Objeto,
  chave: string,
  maximo: number,
  destino: Objeto,
  erros: ErroCampo[],
  campo = chave,
) {
  if (!(chave in origem) || origem[chave] === undefined) return;
  const valor = origem[chave];
  if (valor === null) {
    destino[chave] = null;
    return;
  }
  if (typeof valor !== 'string' || !valor.trim()) {
    erros.push({
      field: campo,
      message: 'Informe um texto ou null para limpar.',
    });
    return;
  }
  if (valor.trim().length > maximo)
    erros.push({ field: campo, message: `Use até ${maximo} caracteres.` });
  else destino[chave] = valor.trim();
}

/** Rejeita campos não previstos para não ampliar o contrato por acidente. */
export function recusarDesconhecidos(
  origem: Objeto,
  permitidos: readonly string[],
  erros: ErroCampo[],
) {
  for (const chave of Object.keys(origem))
    if (!permitidos.includes(chave))
      erros.push({ field: chave, message: 'Campo não permitido.' });
}

export function validarMoeda(
  valor: unknown,
  erros: ErroCampo[],
): string | null {
  if (typeof valor !== 'string' || !PADRAO_MOEDA.test(valor.trim())) {
    erros.push({
      field: 'moeda',
      message: 'Use um código de moeda ISO 4217 com 3 letras maiúsculas.',
    });
    return null;
  }
  return valor.trim();
}
