import type { ColecaoOData } from './odata.types.js';

const inteiroNaoNegativo = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;

/** Valida o envelope de coleção no limite HTTP, sem expor modelos internos do servidor. */
export function isColecaoOData<T>(
  valor: unknown,
  validarLinha: (valor: unknown) => valor is T,
): valor is ColecaoOData<T> {
  if (typeof valor !== 'object' || valor === null) return false;
  const envelope = valor as Record<string, unknown>;
  if (!Array.isArray(envelope.data) || !envelope.data.every(validarLinha))
    return false;
  if (typeof envelope.meta !== 'object' || envelope.meta === null) return false;
  const meta = envelope.meta as Record<string, unknown>;
  return (
    inteiroNaoNegativo(meta.top) &&
    inteiroNaoNegativo(meta.skip) &&
    (meta.total === undefined || inteiroNaoNegativo(meta.total))
  );
}
