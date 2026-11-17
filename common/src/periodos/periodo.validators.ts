import { LIMITES_PERIODOS, TIPOS_PERIODO } from './periodo.constants.js';
import type { AlteracaoPeriodo, EntradaPeriodo } from './periodo.types.js';
import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';
import { dataCivilValida } from '../cadastro/entrada.validators.js';

type Objeto = Record<string, unknown>;

const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Duração inclusiva em dias: `dataFim - dataInicio + 1`. */
export function duracaoDias(dataInicio: string, dataFim: string): number {
  const inicio = Date.parse(`${dataInicio}T00:00:00Z`);
  const fim = Date.parse(`${dataFim}T00:00:00Z`);
  return Math.round((fim - inicio) / 86_400_000) + 1;
}

function lerDatas(
  origem: Objeto,
  erros: ErroCampo[],
): { dataInicio?: string; dataFim?: string } {
  const saida: { dataInicio?: string; dataFim?: string } = {};
  for (const campo of ['dataInicio', 'dataFim'] as const) {
    const v = origem[campo];
    if (v === undefined) continue;
    if (!dataCivilValida(v)) {
      erros.push({
        field: campo,
        message: 'Informe uma data válida (YYYY-MM-DD).',
      });
      continue;
    }
    saida[campo] = v;
  }
  return saida;
}

function conferirIntervalo(
  dataInicio: string,
  dataFim: string,
  erros: ErroCampo[],
): void {
  if (dataInicio > dataFim) {
    erros.push({
      field: 'dataFim',
      message: 'O fim não pode ser anterior ao início.',
    });
    return;
  }
  if (duracaoDias(dataInicio, dataFim) > LIMITES_PERIODOS.duracaoMaximaDias) {
    erros.push({
      field: 'dataFim',
      message: `A duração não pode exceder ${LIMITES_PERIODOS.duracaoMaximaDias} dias.`,
    });
  }
}

export function validarEntradaPeriodo(
  corpo: unknown,
): ResultadoEntrada<EntradaPeriodo> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo)) {
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo deve ser um objeto.' }],
    };
  }
  const tipo = corpo.tipo;
  if (
    typeof tipo !== 'string' ||
    !(TIPOS_PERIODO as readonly string[]).includes(tipo)
  ) {
    erros.push({
      field: 'tipo',
      message: `Use um de: ${TIPOS_PERIODO.join(', ')}.`,
    });
  }
  let rotulo: string | undefined;
  if (
    typeof corpo.rotulo !== 'string' ||
    corpo.rotulo.trim() === '' ||
    corpo.rotulo.trim().length > LIMITES_PERIODOS.rotulo
  ) {
    erros.push({
      field: 'rotulo',
      message: `Informe um rótulo de 1 a ${LIMITES_PERIODOS.rotulo} caracteres.`,
    });
  } else {
    rotulo = corpo.rotulo.trim();
  }
  const datas = lerDatas(corpo, erros);
  if (datas.dataInicio === undefined && corpo.dataInicio === undefined) {
    erros.push({ field: 'dataInicio', message: 'Campo obrigatório.' });
  }
  if (datas.dataFim === undefined && corpo.dataFim === undefined) {
    erros.push({ field: 'dataFim', message: 'Campo obrigatório.' });
  }
  if (datas.dataInicio !== undefined && datas.dataFim !== undefined) {
    conferirIntervalo(datas.dataInicio, datas.dataFim, erros);
  }
  if (erros.length) return { valido: false, erros };
  return {
    valido: true,
    data: {
      tipo: tipo as EntradaPeriodo['tipo'],
      rotulo: rotulo as string,
      dataInicio: datas.dataInicio as string,
      dataFim: datas.dataFim as string,
    },
  };
}

export function validarAlteracaoPeriodo(
  corpo: unknown,
  atual: { tipo: string; dataInicio: string; dataFim: string },
): ResultadoEntrada<AlteracaoPeriodo> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo)) {
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo deve ser um objeto.' }],
    };
  }
  const alteracao: AlteracaoPeriodo = {};
  if (corpo.tipo !== undefined) {
    const tipo = corpo.tipo;
    if (
      typeof tipo !== 'string' ||
      !(TIPOS_PERIODO as readonly string[]).includes(tipo)
    ) {
      erros.push({
        field: 'tipo',
        message: `Use um de: ${TIPOS_PERIODO.join(', ')}.`,
      });
    } else {
      alteracao.tipo = tipo as AlteracaoPeriodo['tipo'];
    }
  }
  if (corpo.rotulo !== undefined) {
    if (
      typeof corpo.rotulo !== 'string' ||
      corpo.rotulo.trim() === '' ||
      corpo.rotulo.trim().length > LIMITES_PERIODOS.rotulo
    ) {
      erros.push({
        field: 'rotulo',
        message: `Informe um rótulo de 1 a ${LIMITES_PERIODOS.rotulo} caracteres.`,
      });
    } else {
      alteracao.rotulo = corpo.rotulo.trim();
    }
  }
  const datas = lerDatas(corpo, erros);
  Object.assign(alteracao, datas);
  const dataInicio = alteracao.dataInicio ?? atual.dataInicio;
  const dataFim = alteracao.dataFim ?? atual.dataFim;
  conferirIntervalo(dataInicio, dataFim, erros);
  if (erros.length) return { valido: false, erros };
  return { valido: true, data: alteracao };
}
