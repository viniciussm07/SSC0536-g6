import {
  normalizarBooleanoColetado,
  normalizarHorarioColetado,
  normalizarQuantidadeColetada,
} from '../coleta/valor-coletado.validators.js';
import type { ResultadoCapacidadeInventario } from './capacidade.types.js';

/** Recebe nomes canônicos após o mapeamento da fonte; não lê planilhas nem grava dados. */
export function normalizarCapacidadeInventario(
  entrada: unknown,
): ResultadoCapacidadeInventario {
  if (
    typeof entrada !== 'object' ||
    entrada === null ||
    Array.isArray(entrada)
  ) {
    return {
      valido: false,
      erros: [{ field: '', message: 'Informe um objeto de capacidade.' }],
    };
  }
  const objeto = entrada as Record<string, unknown>;
  const resultados = {
    totalUh: normalizarQuantidadeColetada(objeto.totalUh),
    leitos: normalizarQuantidadeColetada(objeto.leitos),
    maxLeitosPorUh: normalizarQuantidadeColetada(objeto.maxLeitosPorUh),
    uhsPcd: normalizarQuantidadeColetada(objeto.uhsPcd),
    funcFixos: normalizarQuantidadeColetada(objeto.funcFixos),
    funcTemporarios: normalizarQuantidadeColetada(objeto.funcTemporarios),
    funciona24h: normalizarBooleanoColetado(objeto.funciona24h),
    checkin: normalizarHorarioColetado(objeto.checkin),
    checkout: normalizarHorarioColetado(objeto.checkout),
  };
  const erros = Object.keys(objeto)
    .filter((field) => !Object.hasOwn(resultados, field))
    .map((field) => ({
      field,
      message: 'Campo não previsto no contrato de capacidade.',
    }));
  for (const [field, resultado] of Object.entries(resultados)) {
    if (!resultado.valido)
      erros.push({ field, message: resultado.erro.message });
  }
  if (
    erros.length ||
    !resultados.totalUh.valido ||
    !resultados.leitos.valido ||
    !resultados.maxLeitosPorUh.valido ||
    !resultados.uhsPcd.valido ||
    !resultados.funcFixos.valido ||
    !resultados.funcTemporarios.valido ||
    !resultados.funciona24h.valido ||
    !resultados.checkin.valido ||
    !resultados.checkout.valido
  )
    return { valido: false, erros };
  return {
    valido: true,
    data: {
      totalUh: resultados.totalUh.data,
      leitos: resultados.leitos.data,
      maxLeitosPorUh: resultados.maxLeitosPorUh.data,
      uhsPcd: resultados.uhsPcd.data,
      funcFixos: resultados.funcFixos.data,
      funcTemporarios: resultados.funcTemporarios.data,
      funciona24h: resultados.funciona24h.data,
      checkin: resultados.checkin.data,
      checkout: resultados.checkout.data,
    },
  };
}
