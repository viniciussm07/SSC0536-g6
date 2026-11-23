import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';
import { LIMITES_CALCULO } from './calculo.constants.js';
import type {
  EntradaExecucaoCalculo,
  EntradaPublicacaoCalculo,
} from './calculo.types.js';

type Objeto = Record<string, unknown>;

const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const corpoInvalido = <T>(): ResultadoEntrada<T> => ({
  valido: false,
  erros: [{ field: '', message: 'Corpo deve ser um objeto.' }],
});

function camposDesconhecidos(
  corpo: Objeto,
  permitidos: readonly string[],
  erros: ErroCampo[],
) {
  for (const chave of Object.keys(corpo))
    if (!permitidos.includes(chave))
      erros.push({ field: chave, message: 'Campo não permitido.' });
}

/** Motivo opcional: ausente ou vazio vira `undefined`; texto aparado de até 500 caracteres. */
function lerMotivo(corpo: Objeto, erros: ErroCampo[]): string | undefined {
  const v = corpo.motivo;
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string' || v.trim().length > LIMITES_CALCULO.motivo) {
    erros.push({
      field: 'motivo',
      message: `Informe um texto de até ${LIMITES_CALCULO.motivo} caracteres.`,
    });
    return undefined;
  }
  return v.trim() === '' ? undefined : v.trim();
}

export function validarEntradaExecucaoCalculo(
  corpo: unknown,
): ResultadoEntrada<EntradaExecucaoCalculo> {
  if (!objeto(corpo)) return corpoInvalido();
  const erros: ErroCampo[] = [];
  camposDesconhecidos(corpo, ['perguntaId', 'motivo'], erros);
  const perguntaId = corpo.perguntaId;
  const idValido =
    typeof perguntaId === 'number' &&
    Number.isInteger(perguntaId) &&
    perguntaId >= 1 &&
    perguntaId <= 2147483647;
  if (!idValido)
    erros.push({
      field: 'perguntaId',
      message: 'Informe a pergunta de taxa de ocupação (inteiro positivo).',
    });
  const motivo = lerMotivo(corpo, erros);
  if (erros.length) return { valido: false, erros };
  return {
    valido: true,
    data: {
      perguntaId: perguntaId as number,
      ...(motivo === undefined ? {} : { motivo }),
    },
  };
}

export function validarEntradaPublicacaoCalculo(
  corpo: unknown,
): ResultadoEntrada<EntradaPublicacaoCalculo> {
  if (corpo === undefined || corpo === null) return { valido: true, data: {} };
  if (!objeto(corpo)) return corpoInvalido();
  const erros: ErroCampo[] = [];
  camposDesconhecidos(corpo, ['motivo'], erros);
  const motivo = lerMotivo(corpo, erros);
  if (erros.length) return { valido: false, erros };
  return { valido: true, data: motivo === undefined ? {} : { motivo } };
}
