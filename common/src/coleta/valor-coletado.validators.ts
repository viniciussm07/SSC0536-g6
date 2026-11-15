import type {
  EscalaPercentual,
  ResultadoNormalizacao,
} from './valor-coletado.types.js';

function normalizar<T>(
  entrada: unknown,
  converter: (valor: unknown) => T | undefined,
  message: string,
): ResultadoNormalizacao<T> {
  const invalido: ResultadoNormalizacao<T> = {
    valido: false,
    erro: { code: 'VALOR_INVALIDO', message },
  };
  let valor = entrada;
  if (
    typeof entrada === 'object' &&
    entrada !== null &&
    !Array.isArray(entrada)
  ) {
    const objeto = entrada as Record<string, unknown>;
    const estado = objeto.estado;
    if (
      (estado === 'ausente' ||
        estado === 'vazio' ||
        estado === 'desconhecido' ||
        estado === 'nao_se_aplica') &&
      Object.keys(objeto).length === 1
    ) {
      return { valido: true, data: { estado } };
    }
    if (
      objeto.estado !== 'informado' ||
      !Object.hasOwn(objeto, 'valor') ||
      Object.keys(objeto).length !== 2
    ) {
      return invalido;
    }
    valor = objeto.valor;
  } else {
    if (entrada === undefined)
      return { valido: true, data: { estado: 'ausente' } };
    if (entrada === null)
      return { valido: true, data: { estado: 'desconhecido' } };
    if (typeof entrada === 'string' && entrada.trim() === '') {
      return { valido: true, data: { estado: 'vazio' } };
    }
  }
  const convertido = converter(valor);
  return convertido === undefined
    ? invalido
    : { valido: true, data: { estado: 'informado', valor: convertido } };
}

export function normalizarTextoColetado(
  entrada: unknown,
): ResultadoNormalizacao<string> {
  return normalizar(
    entrada,
    (valor) =>
      typeof valor === 'string' && valor.trim() !== ''
        ? valor.trim()
        : undefined,
    'Informe um texto não vazio.',
  );
}

/** Quantidades cabem no Int PostgreSQL; não impõe limiar de elegibilidade. */
export function normalizarQuantidadeColetada(
  entrada: unknown,
): ResultadoNormalizacao<number> {
  return normalizar(
    entrada,
    (valor) => {
      const numero =
        typeof valor === 'number'
          ? valor
          : typeof valor === 'string' && /^\d+$/.test(valor.trim())
            ? Number(valor.trim())
            : NaN;
      return Number.isInteger(numero) && numero >= 0 && numero <= 2147483647
        ? numero === 0
          ? 0
          : numero
        : undefined;
    },
    'Informe uma quantidade inteira entre 0 e 2147483647, sem separador de milhar.',
  );
}

/** Aplicar somente a campos cuja legenda confirma sim/não ou 1/0. */
export function normalizarBooleanoColetado(
  entrada: unknown,
): ResultadoNormalizacao<boolean> {
  return normalizar(
    entrada,
    (valor) => {
      if (valor === true || valor === 1) return true;
      if (valor === false || valor === 0) return false;
      if (typeof valor !== 'string') return undefined;
      const texto = valor.trim().toLocaleLowerCase('pt-BR');
      if (texto === 'sim' || texto === '1') return true;
      if (texto === 'não' || texto === 'nao' || texto === '0') return false;
      return undefined;
    },
    'Informe sim/não ou 1/0 conforme a legenda do campo.',
  );
}

/** Datas ISO, sem inferência de fuso, ordem dia/mês ou serial de planilha. */
export function normalizarDataColetada(
  entrada: unknown,
): ResultadoNormalizacao<string> {
  return normalizar(
    entrada,
    (valor) => {
      if (typeof valor !== 'string') return undefined;
      const texto = valor.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return undefined;
      const [ano, mes, dia] = texto.split('-').map(Number);
      const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
      const dias = [
        31,
        bissexto ? 29 : 28,
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
      ];
      return ano >= 1 &&
        mes >= 1 &&
        mes <= 12 &&
        dia >= 1 &&
        dia <= dias[mes - 1]
        ? texto
        : undefined;
    },
    'Informe uma data existente no formato YYYY-MM-DD.',
  );
}

export function normalizarHorarioColetado(
  entrada: unknown,
): ResultadoNormalizacao<string> {
  return normalizar(
    entrada,
    (valor) =>
      typeof valor === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(valor.trim())
        ? valor.trim()
        : undefined,
    'Informe um horário no formato HH:mm, entre 00:00 e 23:59.',
  );
}

function decimalExato(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined;
  const texto = valor.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(texto)) return undefined;
  const [inteiro, fracao = ''] = texto.replace(',', '.').split('.');
  const i = inteiro.replace(/^0+(?=\d)/, '');
  const f = fracao.replace(/0+$/, '');
  if (i.length > 35 || f.length > 30) return undefined;
  return f ? `${i}.${f}` : i;
}

/** Decimal não negativo exato. Números JS são recusados para evitar perda de precisão. */
export function normalizarDecimalColetado(
  entrada: unknown,
): ResultadoNormalizacao<string> {
  return normalizar(
    entrada,
    decimalExato,
    'Informe um decimal não negativo como texto, sem moeda ou milhar (até 35 dígitos inteiros e 30 decimais).',
  );
}

/** A escala da origem é obrigatória; a saída é string decimal de 0 a 100. */
export function normalizarPercentualColetado(
  entrada: unknown,
  escala: EscalaPercentual,
): ResultadoNormalizacao<string> {
  if (escala !== 'fracao' && escala !== 'percentual') {
    return {
      valido: false,
      erro: {
        code: 'VALOR_INVALIDO',
        message: 'Informe a escala de origem: fracao ou percentual.',
      },
    };
  }
  return normalizar(
    entrada,
    (valor) => {
      const decimal = decimalExato(valor);
      if (decimal === undefined) return undefined;
      const [inteiro, fracao = ''] = decimal.split('.');
      const convertido =
        escala === 'fracao'
          ? decimalExato(
              `${inteiro}${fracao.padEnd(2, '0').slice(0, 2)}.${fracao.slice(2) || '0'}`,
            )
          : decimal;
      if (convertido === undefined) return undefined;
      const [i, f = ''] = convertido.split('.');
      return i.length < 3 || (i === '100' && !f) ? convertido : undefined;
    },
    'Informe percentual de 0 a 100 ou fração de 0 a 1 como texto, com escala explícita.',
  );
}
