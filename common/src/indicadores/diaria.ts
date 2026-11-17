import { INDICADORES_VERSAO_FORMULA } from './indicadores.constants.js';
import type {
  EntradaDiariaMedia,
  EntradaRevpar,
  ErroEntradaIndicador,
  ResultadoDiariaMedia,
  ValorIndicador,
} from './indicadores.types.js';
import {
  CEM,
  ZERO,
  dividir,
  ehZero,
  lerDecimal,
  lerInteiro,
  multiplicar,
  somar,
  type Racional,
} from './racional.js';
import {
  ausente,
  ehIndisponivel,
  indisponivel,
  publicar,
  type Interno,
} from './resultado.js';
import { percentualValido } from './tabulacao.validators.js';

function validar(entrada: EntradaDiariaMedia): ErroEntradaIndicador[] {
  if (!Array.isArray(entrada?.empreendimentos)) {
    return [
      {
        field: 'empreendimentos',
        message: 'Informe a lista de empreendimentos.',
      },
    ];
  }
  const erros: ErroEntradaIndicador[] = [];
  const ids = new Set<string>();
  entrada.empreendimentos.forEach((item, i) => {
    const campo = `empreendimentos[${i}]`;
    if (typeof item?.id !== 'string' || item.id === '' || ids.has(item.id)) {
      erros.push({
        field: `${campo}.id`,
        message: 'Informe um identificador único e não vazio.',
      });
    } else ids.add(item.id);
    if (!ausente(item?.leitos) && lerInteiro(item.leitos) === undefined) {
      erros.push({
        field: `${campo}.leitos`,
        message: 'Informe um inteiro não negativo ou null.',
      });
    }
    if (
      !Array.isArray(item?.diarias) ||
      item.diarias.some(
        (diaria) => !ausente(diaria) && lerDecimal(diaria) === undefined,
      )
    ) {
      erros.push({
        field: `${campo}.diarias`,
        message: 'Informe preços como decimais em texto ou null.',
      });
    }
  });
  return erros;
}

const media = (valores: Racional[]): Racional =>
  dividir(valores.reduce(somar, ZERO), {
    n: BigInt(valores.length),
    d: 1n,
  });

/**
 * Diária média de um recorte (pesquisa de diária média, fórmula v1 pendente de homologação).
 * Por empreendimento: média dos preços observados. Aritmética: média dessas médias.
 * Ponderada: Σ(média × leitos) ÷ Σ(leitos). Empreendimento sem preço fica fora das duas
 * médias e do peso: ausência não entra como diária zero.
 */
export function calcularDiariaMedia(
  entrada: EntradaDiariaMedia,
): ResultadoDiariaMedia {
  const erros = validar(entrada);
  if (erros.length > 0) {
    const bloqueio = indisponivel(
      'entrada_invalida',
      'Corrija os erros da entrada antes de calcular.',
    );
    return {
      versaoFormula: INDICADORES_VERSAO_FORMULA,
      erros,
      porEmpreendimento: [],
      aritmetica: bloqueio,
      ponderada: bloqueio,
    };
  }

  const medias = entrada.empreendimentos.map((item) => {
    const precos = item.diarias.flatMap((diaria) =>
      ausente(diaria) ? [] : [lerDecimal(diaria)!],
    );
    const valor: Interno =
      precos.length === 0
        ? indisponivel('dado_ausente', `Sem preço observado em ${item.id}.`)
        : media(precos);
    return { item, valor };
  });
  const comPreco = medias.flatMap(({ item, valor }) =>
    ehIndisponivel(valor) ? [] : [{ item, valor }],
  );

  let aritmetica: Interno;
  let ponderada: Interno;
  if (comPreco.length === 0) {
    aritmetica = ponderada = indisponivel(
      'dado_ausente',
      'Nenhum empreendimento com preço observado.',
    );
  } else {
    aritmetica = media(comPreco.map(({ valor }) => valor));
    const semPeso = comPreco.filter(({ item }) => ausente(item.leitos));
    const pesoTotal = comPreco.reduce(
      (total, { item }) => somar(total, lerInteiro(item.leitos ?? 0)!),
      ZERO,
    );
    if (semPeso.length > 0) {
      ponderada = indisponivel(
        'dado_ausente',
        `leitos ausente em: ${semPeso.map(({ item }) => item.id).join(', ')}`,
      );
    } else if (ehZero(pesoTotal)) {
      ponderada = indisponivel(
        'base_zero',
        'Empreendimentos com preço somam zero leitos.',
      );
    } else {
      ponderada = dividir(
        comPreco.reduce(
          (total, { item, valor }) =>
            somar(total, multiplicar(valor, lerInteiro(item.leitos)!)),
          ZERO,
        ),
        pesoTotal,
      );
    }
  }

  return {
    versaoFormula: INDICADORES_VERSAO_FORMULA,
    erros: [],
    porEmpreendimento: medias.map(({ item, valor }) => ({
      id: item.id,
      diariaMedia: publicar(valor),
    })),
    aritmetica: publicar(aritmetica),
    ponderada: publicar(ponderada),
  };
}

/** RevPAR = diária média × taxa de ocupação do mesmo recorte (TABULAÇÃO!D114:D116). */
export function calcularRevpar(entrada: EntradaRevpar): ValorIndicador {
  const diaria = entrada?.diariaMedia;
  const taxa = entrada?.taxaOcupacao;
  if (
    (!ausente(diaria) && lerDecimal(diaria) === undefined) ||
    (!ausente(taxa) && !percentualValido(taxa))
  ) {
    return indisponivel(
      'entrada_invalida',
      'Informe a diária como decimal em texto e a taxa de 0 a 100 em texto.',
    );
  }
  if (ausente(diaria) || ausente(taxa)) {
    return indisponivel(
      'dado_ausente',
      `${ausente(diaria) ? 'diariaMedia' : 'taxaOcupacao'} não informada.`,
    );
  }
  return publicar(
    multiplicar(lerDecimal(diaria)!, dividir(lerDecimal(taxa)!, CEM)),
  );
}
