import type {
  EntradaTabulacao,
  ErroEntradaIndicador,
} from './indicadores.types.js';
import { CEM, comparar, ehZero, lerDecimal, lerInteiro } from './racional.js';
import { ausente } from './resultado.js';

const objeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/** Percentual 0–100 em texto. */
export function percentualValido(valor: unknown): boolean {
  const lido = lerDecimal(valor);
  return lido !== undefined && comparar(lido, CEM) <= 0;
}

/**
 * Valida forma e limites da entrada da tabulação. Ausências (`null`) são aceitas e
 * tratadas pelo cálculo como indisponibilidade; valores malformados são erros.
 */
export function validarEntradaTabulacao(
  entrada: EntradaTabulacao,
): ErroEntradaIndicador[] {
  const erros: ErroEntradaIndicador[] = [];
  const erro = (field: string, message: string) =>
    erros.push({ field, message });
  const inteiro = (field: string, valor: unknown) => {
    if (!ausente(valor) && lerInteiro(valor) === undefined) {
      erro(field, 'Informe um inteiro não negativo ou null.');
    }
  };
  const decimal = (field: string, valor: unknown) => {
    if (!ausente(valor) && lerDecimal(valor) === undefined) {
      erro(field, 'Informe um decimal não negativo em texto ou null.');
    }
  };

  if (!objeto(entrada)) return [{ field: '', message: 'Entrada inválida.' }];

  const dias = entrada.diasPeriodo;
  if (!ausente(dias) && (lerInteiro(dias) === undefined || dias < 1)) {
    erro('diasPeriodo', 'Informe um inteiro maior ou igual a 1 ou null.');
  }

  if (!Array.isArray(entrada.meios)) {
    erro('meios', 'Informe a lista de meios de hospedagem.');
  } else {
    const ids = new Set<string>();
    entrada.meios.forEach((meio, i) => {
      const campo = `meios[${i}]`;
      if (!objeto(meio)) return erro(campo, 'Meio de hospedagem inválido.');
      if (typeof meio.id !== 'string' || meio.id === '' || ids.has(meio.id)) {
        erro(`${campo}.id`, 'Informe um identificador único e não vazio.');
      } else ids.add(meio.id);
      if (
        !ausente(meio.tipo) &&
        (typeof meio.tipo !== 'string' || !meio.tipo)
      ) {
        erro(`${campo}.tipo`, 'Informe um tipo não vazio ou null.');
      }
      inteiro(`${campo}.uhs`, meio.uhs);
      inteiro(`${campo}.leitos`, meio.leitos);
      decimal(`${campo}.leitosMedia`, meio.leitosMedia);
      if (!ausente(meio.taxaOcupacao) && !percentualValido(meio.taxaOcupacao)) {
        erro(
          `${campo}.taxaOcupacao`,
          'Informe um percentual de 0 a 100 em texto ou null.',
        );
      }
    });
  }

  if (!ausente(entrada.rhc)) {
    if (!objeto(entrada.rhc)) erro('rhc', 'RHC inválido.');
    else {
      inteiro('rhc.leitos', entrada.rhc.leitos);
      decimal('rhc.leitosMedia', entrada.rhc.leitosMedia);
    }
  }

  const parametros = entrada.parametros;
  if (!objeto(parametros)) {
    erro('parametros', 'Informe os parâmetros do cálculo (valores ou null).');
    return erros;
  }
  if (
    !ausente(parametros.percentualDayUse) &&
    !percentualValido(parametros.percentualDayUse)
  ) {
    erro(
      'parametros.percentualDayUse',
      'Informe um percentual de 0 a 100 em texto ou null.',
    );
  }
  const fator = parametros.fatorHospedadosDayUse;
  if (!ausente(fator)) {
    const lido = lerDecimal(fator);
    if (lido === undefined || ehZero(lido)) {
      erro(
        'parametros.fatorHospedadosDayUse',
        'Informe um decimal maior que zero em texto ou null.',
      );
    }
  }
  const faixas = parametros.faixasOcupacao;
  if (!ausente(faixas)) {
    const campo = 'parametros.faixasOcupacao';
    const validas =
      Array.isArray(faixas) &&
      faixas.length > 0 &&
      faixas.every(
        (faixa) =>
          objeto(faixa) &&
          typeof faixa.codigo === 'string' &&
          faixa.codigo !== '' &&
          percentualValido(faixa.minimo) &&
          percentualValido(faixa.maximo) &&
          comparar(lerDecimal(faixa.minimo)!, lerDecimal(faixa.maximo)!) <= 0,
      );
    if (!validas) {
      erro(
        campo,
        'Cada faixa precisa de código e limites 0–100 com mínimo ≤ máximo.',
      );
    } else {
      const ordenadas = [...faixas].sort((a, b) =>
        comparar(lerDecimal(a.minimo)!, lerDecimal(b.minimo)!),
      );
      const sobrepostas = ordenadas.some(
        (faixa, i) =>
          i > 0 &&
          comparar(
            lerDecimal(faixa.minimo)!,
            lerDecimal(ordenadas[i - 1].maximo)!,
          ) <= 0,
      );
      const codigos = new Set(faixas.map((faixa) => faixa.codigo));
      if (sobrepostas || codigos.size !== faixas.length) {
        erro(campo, 'As faixas não podem se sobrepor nem repetir código.');
      }
    }
  }
  return erros;
}
