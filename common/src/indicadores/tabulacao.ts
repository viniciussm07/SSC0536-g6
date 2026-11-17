import {
  INDICADORES_ESCALA_SAIDA,
  INDICADORES_TABULACAO,
  INDICADORES_VERSAO_FORMULA,
} from './indicadores.constants.js';
import type {
  CodigoIndicadorTabulacao,
  EntradaLeitosMedia,
  EntradaTabulacao,
  FaixaOcupacao,
  MeioHospedagemTabulado,
  ResultadoFaixasOcupacao,
  ResultadoOcupacaoTipo,
  ResultadoTabulacao,
  ValorIndicador,
} from './indicadores.types.js';
import {
  CEM,
  ZERO,
  comparar,
  dividir,
  ehNegativo,
  ehZero,
  formatar,
  lerDecimal,
  lerInteiro,
  multiplicar,
  somar,
  subtrair,
  type Racional,
} from './racional.js';
import {
  ausente,
  combinar,
  indisponivel,
  publicar,
  type Interno,
} from './resultado.js';
import { validarEntradaTabulacao } from './tabulacao.validators.js';

const DOIS: Racional = { n: 2n, d: 1n };
const inteiro = (valor: number): Racional => lerInteiro(valor)!;
const decimal = (valor: string): Racional => lerDecimal(valor)!;
const fracao = (percentual: Racional): Racional => dividir(percentual, CEM);
const ids = (meios: MeioHospedagemTabulado[]) =>
  meios.map((meio) => meio.id).join(', ');

/** Soma um campo de capacidade; qualquer ausência impede o total (nunca conta como zero). */
function somarCampo(
  meios: MeioHospedagemTabulado[],
  campo: 'uhs' | 'leitos' | 'leitosMedia',
): Interno {
  const faltando = meios.filter((meio) => ausente(meio[campo]));
  if (faltando.length > 0) {
    return indisponivel(
      'dado_ausente',
      `${campo} ausente em: ${ids(faltando)}`,
    );
  }
  return meios.reduce(
    (total, meio) =>
      somar(
        total,
        campo === 'leitosMedia'
          ? decimal(meio.leitosMedia!)
          : inteiro(meio[campo]!),
      ),
    ZERO,
  );
}

/** Σ(taxa × UH) / Σ(UH) dos respondentes (TABULAÇÃO!J48; por tipo em MH!I145/O145/I182). */
function taxaPonderadaPorUh(respondentes: MeioHospedagemTabulado[]): Interno {
  if (respondentes.length === 0) {
    return indisponivel('sem_respondentes', 'Nenhum respondente no recorte.');
  }
  return combinar([somarCampo(respondentes, 'uhs')], (uhs) =>
    ehZero(uhs)
      ? indisponivel('capacidade_zero', 'Respondentes somam zero UH.')
      : dividir(
          respondentes.reduce(
            (total, meio) =>
              somar(
                total,
                multiplicar(decimal(meio.taxaOcupacao!), inteiro(meio.uhs!)),
              ),
            ZERO,
          ),
          uhs,
        ),
  );
}

const percentual = (
  parte: Interno,
  base: Interno,
  baseZero: () => Interno,
): Interno =>
  combinar([parte, base], (p, b) =>
    ehZero(b) ? baseZero() : multiplicar(dividir(p, b), CEM),
  );

function calcularFaixas(
  respondentes: MeioHospedagemTabulado[],
  faixas: FaixaOcupacao[] | null,
): ResultadoFaixasOcupacao {
  if (ausente(faixas)) {
    return indisponivel(
      'parametro_ausente',
      'parametros.faixasOcupacao não informado.',
    );
  }
  if (respondentes.length === 0) {
    return indisponivel('sem_respondentes', 'Nenhum respondente no período.');
  }
  const grupos = faixas.map((faixa) => ({
    codigo: faixa.codigo,
    meios: respondentes.filter((meio) => {
      const taxa = decimal(meio.taxaOcupacao!);
      return (
        comparar(taxa, decimal(faixa.minimo)) >= 0 &&
        comparar(taxa, decimal(faixa.maximo)) <= 0
      );
    }),
  }));
  const classificados = grupos.flatMap((grupo) => grupo.meios);
  if (classificados.length === 0) {
    return indisponivel(
      'base_zero',
      'Nenhum respondente dentro das faixas informadas.',
    );
  }
  const totalLeitos = somarCampo(classificados, 'leitos');
  return {
    estado: 'disponivel',
    meiosSemFaixa: respondentes.length - classificados.length,
    faixas: grupos.map((grupo) => {
      const leitos = combinar([totalLeitos], () =>
        somarCampo(grupo.meios, 'leitos'),
      );
      return {
        codigo: grupo.codigo,
        meios: grupo.meios.length,
        percentualMeios: formatar(
          multiplicar(
            dividir(inteiro(grupo.meios.length), inteiro(classificados.length)),
            CEM,
          ),
          INDICADORES_ESCALA_SAIDA,
        ),
        leitos: publicar(leitos),
        percentualLeitos: publicar(
          percentual(leitos, totalLeitos, () =>
            indisponivel(
              'capacidade_zero',
              'Respondentes classificados somam zero leitos.',
            ),
          ),
        ),
      };
    }),
  };
}

function calcularPorTipo(
  meios: MeioHospedagemTabulado[],
  respondentes: MeioHospedagemTabulado[],
): ResultadoOcupacaoTipo[] {
  const tipos = [
    ...new Set(
      meios.flatMap((meio) => (ausente(meio.tipo) ? [] : [meio.tipo])),
    ),
  ];
  return tipos.map((tipo) => {
    const doTipo = respondentes.filter((meio) => meio.tipo === tipo);
    return {
      tipo,
      respondentes: doTipo.length,
      taxaOcupacao: publicar(taxaPonderadaPorUh(doTipo)),
    };
  });
}

/**
 * Reproduz a aba TABULAÇÃO (Consolidado e Expectativa 2026), fórmula v1, pendente de
 * homologação. `meios` é a população elegível com a capacidade vigente; respondente é
 * quem tem `taxaOcupacao`. Não respondentes são estimados pela taxa geral, como na planilha.
 */
export function calcularTabulacaoOcupacao(
  entrada: EntradaTabulacao,
): ResultadoTabulacao {
  const erros = validarEntradaTabulacao(entrada);
  if (erros.length > 0) {
    const bloqueio = indisponivel(
      'entrada_invalida',
      'Corrija os erros da entrada antes de calcular.',
    );
    return {
      versaoFormula: INDICADORES_VERSAO_FORMULA,
      erros,
      respondentes: 0,
      indicadores: Object.fromEntries(
        INDICADORES_TABULACAO.map(({ codigo }) => [codigo, bloqueio]),
      ) as Record<CodigoIndicadorTabulacao, ValorIndicador>,
      faixasOcupacao: bloqueio,
      ocupacaoPorTipo: [],
    };
  }

  const { meios, rhc, parametros } = entrada;
  const respondentes = meios.filter((meio) => !ausente(meio.taxaOcupacao));
  const semRespondentes = indisponivel(
    'sem_respondentes',
    'Nenhum respondente no período.',
  );
  const capacidadeZero = (detalhe: string) => () =>
    indisponivel('capacidade_zero', detalhe);

  const dias: Interno = ausente(entrada.diasPeriodo)
    ? indisponivel('dado_ausente', 'diasPeriodo não informado.')
    : inteiro(entrada.diasPeriodo);
  const porDia = (total: Interno) => combinar([total, dias], dividir);

  const rhcCampo = (campo: 'leitos' | 'leitosMedia'): Interno => {
    const valor = rhc?.[campo];
    if (ausente(valor)) {
      return indisponivel('dado_ausente', `rhc.${campo} não informado.`);
    }
    return typeof valor === 'number' ? inteiro(valor) : decimal(valor);
  };

  const taxa = taxaPonderadaPorUh(respondentes);
  const leitosMediaTotal = somarCampo(meios, 'leitosMedia');
  const leitosMediaRespondentes = somarCampo(respondentes, 'leitosMedia');
  const leitosMediaNaoRespondentes = combinar(
    [leitosMediaTotal, leitosMediaRespondentes],
    subtrair,
  );

  // Turistas = leitos média × taxa × diárias (TABULAÇÃO!M5:M44, J86 e J91).
  const turistas = (leitosMedia: Interno) =>
    combinar([leitosMedia, taxa, dias], (leitos, ocupacao, diarias) =>
      multiplicar(multiplicar(leitos, fracao(ocupacao)), diarias),
    );
  const turistasRespondentes =
    respondentes.length === 0
      ? semRespondentes
      : combinar([leitosMediaRespondentes, dias], (_, diarias) =>
          multiplicar(
            respondentes.reduce(
              (total, meio) =>
                somar(
                  total,
                  multiplicar(
                    decimal(meio.leitosMedia!),
                    fracao(decimal(meio.taxaOcupacao!)),
                  ),
                ),
              ZERO,
            ),
            diarias,
          ),
        );
  const turistasNaoRespondentes = turistas(leitosMediaNaoRespondentes);
  const turistasMh = combinar(
    [turistasRespondentes, turistasNaoRespondentes],
    somar,
  );
  const turistasRhc = turistas(rhcCampo('leitosMedia'));
  const hospedados = combinar([turistasMh, turistasRhc], somar);
  const hospedadosDia = porDia(hospedados);

  // Total/dia = hospedados/dia × fator ÷ (1 − day use) (TABULAÇÃO!J103, J97 e L102).
  const parametro = (campo: 'percentualDayUse' | 'fatorHospedadosDayUse') =>
    ausente(parametros[campo])
      ? indisponivel('parametro_ausente', `parametros.${campo} não informado.`)
      : decimal(parametros[campo]);
  const totalDia = combinar(
    [
      hospedadosDia,
      parametro('percentualDayUse'),
      parametro('fatorHospedadosDayUse'),
    ],
    (porDiaHospedados, dayUse, fator) => {
      const complemento = subtrair(CEM, dayUse);
      return ehZero(complemento)
        ? indisponivel(
            'base_zero',
            'percentualDayUse de 100 zera a base da estimativa.',
          )
        : dividir(multiplicar(porDiaHospedados, fator), fracao(complemento));
    },
  );
  const dayUseDia = combinar([totalDia, hospedadosDia], (total, porDiaHosp) => {
    const diferenca = subtrair(total, porDiaHosp);
    return ehNegativo(diferenca)
      ? indisponivel(
          'entrada_invalida',
          'fatorHospedadosDayUse e percentualDayUse resultam em day use negativo.',
        )
      : diferenca;
  });
  const dayUse = combinar([dayUseDia, dias], multiplicar);
  const total = combinar([hospedados, dayUse], somar);

  const leitosComRhc = (campo: 'leitos' | 'leitosMedia') =>
    combinar([somarCampo(meios, campo), rhcCampo(campo)], somar);

  const indicadores: Record<CodigoIndicadorTabulacao, Interno> = {
    taxa_ocupacao_uh: taxa,
    cobertura_meios: percentual(
      inteiro(respondentes.length),
      inteiro(meios.length),
      () =>
        indisponivel('base_zero', 'Nenhum meio de hospedagem na população.'),
    ),
    cobertura_uhs: percentual(
      somarCampo(respondentes, 'uhs'),
      somarCampo(meios, 'uhs'),
      capacidadeZero('População soma zero UH.'),
    ),
    cobertura_leitos: percentual(
      somarCampo(respondentes, 'leitos'),
      leitosComRhc('leitos'),
      capacidadeZero('MH + RHC somam zero leitos.'),
    ),
    cobertura_leitos_media: percentual(
      leitosMediaRespondentes,
      leitosComRhc('leitosMedia'),
      capacidadeZero('MH + RHC somam zero leitos média.'),
    ),
    leitos_media_nao_respondentes: leitosMediaNaoRespondentes,
    turistas_mh_respondentes: turistasRespondentes,
    turistas_mh_nao_respondentes: turistasNaoRespondentes,
    turistas_mh: turistasMh,
    turistas_mh_dia: porDia(turistasMh),
    turistas_rhc: turistasRhc,
    turistas_rhc_dia: porDia(turistasRhc),
    turistas_hospedados: hospedados,
    turistas_hospedados_dia: hospedadosDia,
    turistas_day_use: dayUse,
    turistas_day_use_dia: dayUseDia,
    turistas_total: total,
    turistas_total_dia: combinar([total, dayUseDia], () => totalDia),
  };

  return {
    versaoFormula: INDICADORES_VERSAO_FORMULA,
    erros: [],
    respondentes: respondentes.length,
    indicadores: Object.fromEntries(
      Object.entries(indicadores).map(([codigo, valor]) => [
        codigo,
        publicar(valor),
      ]),
    ) as Record<CodigoIndicadorTabulacao, ValorIndicador>,
    faixasOcupacao: calcularFaixas(respondentes, parametros.faixasOcupacao),
    ocupacaoPorTipo: calcularPorTipo(meios, respondentes),
  };
}

/** UH × (mínimo + máximo de leitos por UH) ÷ 2 (MH!J e MH!K), sem arredondar. */
export function calcularLeitosMedia(
  entrada: EntradaLeitosMedia,
): ValorIndicador {
  const minimo = lerDecimal(entrada?.leitosMinimoPorUh);
  if (
    (!ausente(entrada?.uhs) && lerInteiro(entrada.uhs) === undefined) ||
    (!ausente(entrada?.leitosMaximoPorUh) &&
      lerInteiro(entrada.leitosMaximoPorUh) === undefined) ||
    (!ausente(entrada?.leitosMinimoPorUh) && minimo === undefined)
  ) {
    return indisponivel(
      'entrada_invalida',
      'Informe inteiros não negativos e o mínimo como decimal em texto.',
    );
  }
  if (minimo === undefined) {
    return indisponivel(
      'parametro_ausente',
      'leitosMinimoPorUh não informado.',
    );
  }
  if (ausente(entrada.uhs) || ausente(entrada.leitosMaximoPorUh)) {
    return indisponivel(
      'dado_ausente',
      'uhs e leitosMaximoPorUh são necessários.',
    );
  }
  const maximo = inteiro(entrada.leitosMaximoPorUh);
  if (comparar(minimo, maximo) > 0) {
    return indisponivel(
      'entrada_invalida',
      'leitosMinimoPorUh maior que leitosMaximoPorUh.',
    );
  }
  const media = dividir(somar(minimo, maximo), DOIS);
  return publicar(multiplicar(inteiro(entrada.uhs), media));
}
