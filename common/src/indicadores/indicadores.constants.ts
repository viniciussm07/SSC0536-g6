/**
 * Versão das fórmulas transcritas das tabulações 2026. Mudar o significado de qualquer
 * cálculo exige nova versão; resultados antigos continuam reproduzíveis pela anterior.
 */
export const INDICADORES_VERSAO_FORMULA = 1;

/** Casas decimais da saída (meio para cima). Não há arredondamento intermediário. */
export const INDICADORES_ESCALA_SAIDA = 12;

/** Nenhuma fórmula ou parâmetro deste domínio foi homologado pelo OTO. */
export const INDICADORES_SITUACAO_METODOLOGIA = 'pendente_homologacao';

export const MOTIVOS_INDISPONIBILIDADE = [
  'sem_respondentes',
  'capacidade_zero',
  'base_zero',
  'dado_ausente',
  'parametro_ausente',
  'entrada_invalida',
] as const;

const definicao = <C extends string>(
  codigo: C,
  nome: string,
  unidade: string,
  origem: string,
) => ({
  codigo,
  nome,
  unidade,
  origem,
  versaoFormula: INDICADORES_VERSAO_FORMULA,
});

/**
 * Indicadores devolvidos por `calcularTabulacaoOcupacao`. `origem` aponta as células da
 * tabulação Consolidado 2026 (a Expectativa 2026 usa as mesmas posições).
 */
export const INDICADORES_TABULACAO = [
  definicao(
    'taxa_ocupacao_uh',
    'Taxa de ocupação ponderada por UH',
    'percentual_0_100',
    'TABULAÇÃO!J48',
  ),
  definicao(
    'cobertura_meios',
    'Meios de hospedagem respondentes',
    'percentual_0_100',
    'TABULAÇÃO!K75 (G55)',
  ),
  definicao(
    'cobertura_uhs',
    'UHs dos respondentes',
    'percentual_0_100',
    'TABULAÇÃO!K76',
  ),
  definicao(
    'cobertura_leitos',
    'Leitos dos respondentes sobre leitos MH + RHC',
    'percentual_0_100',
    'TABULAÇÃO!K77 (G56)',
  ),
  definicao(
    'cobertura_leitos_media',
    'Leitos média dos respondentes sobre leitos média MH + RHC',
    'percentual_0_100',
    'TABULAÇÃO!K81 (G57)',
  ),
  definicao(
    'leitos_media_nao_respondentes',
    'Leitos média dos meios não respondentes',
    'leitos',
    'TABULAÇÃO!J82',
  ),
  definicao(
    'turistas_mh_respondentes',
    'Turistas em MH respondentes',
    'turistas_no_periodo',
    'TABULAÇÃO!M5:M45 (J85)',
  ),
  definicao(
    'turistas_mh_nao_respondentes',
    'Turistas em MH não respondentes',
    'turistas_no_periodo',
    'TABULAÇÃO!J86',
  ),
  definicao(
    'turistas_mh',
    'Turistas em MH regulares',
    'turistas_no_periodo',
    'TABULAÇÃO!J87 (J49)',
  ),
  definicao(
    'turistas_mh_dia',
    'Turistas em MH regulares por dia',
    'turistas_por_dia',
    'TABULAÇÃO!J88',
  ),
  definicao(
    'turistas_rhc',
    'Turistas em RHC',
    'turistas_no_periodo',
    'TABULAÇÃO!J91 (J50)',
  ),
  definicao(
    'turistas_rhc_dia',
    'Turistas em RHC por dia',
    'turistas_por_dia',
    'TABULAÇÃO!J92',
  ),
  definicao(
    'turistas_hospedados',
    'Turistas hospedados (MH + RHC)',
    'turistas_no_periodo',
    'TABULAÇÃO!J100',
  ),
  definicao(
    'turistas_hospedados_dia',
    'Turistas hospedados (MH + RHC) por dia',
    'turistas_por_dia',
    'TABULAÇÃO!J102',
  ),
  definicao(
    'turistas_day_use',
    'Turistas day use',
    'turistas_no_periodo',
    'TABULAÇÃO!J95 (J51)',
  ),
  definicao(
    'turistas_day_use_dia',
    'Turistas day use por dia',
    'turistas_por_dia',
    'TABULAÇÃO!J96',
  ),
  definicao(
    'turistas_total',
    'Total de turistas (MH + RHC + day use)',
    'turistas_no_periodo',
    'TABULAÇÃO!J101 (J52)',
  ),
  definicao(
    'turistas_total_dia',
    'Total de turistas por dia',
    'turistas_por_dia',
    'TABULAÇÃO!J103 (J53)',
  ),
] as const;

/** Indicadores devolvidos em estruturas próprias (por faixa, tipo ou função dedicada). */
export const INDICADORES_COMPLEMENTARES = [
  definicao(
    'faixa_ocupacao_meios',
    'Meios respondentes por faixa de ocupação',
    'percentual_0_100',
    'TABULAÇÃO!R5:R10 e T5:T10',
  ),
  definicao(
    'faixa_ocupacao_leitos',
    'Leitos respondentes por faixa de ocupação',
    'percentual_0_100',
    'TABULAÇÃO!S5:S10 e U5:U10',
  ),
  definicao(
    'taxa_ocupacao_tipo',
    'Taxa de ocupação por tipo de hospedagem',
    'percentual_0_100',
    'MH!I145, MH!O145 e MH!I182',
  ),
  definicao(
    'leitos_media',
    'Leitos ajustados pela média mínimo × máximo',
    'leitos',
    'MH!J2:K85 e MH!K88',
  ),
  definicao(
    'diaria_media_aritmetica',
    'Diária média aritmética',
    'reais_por_diaria',
    'Diária EVOLUÇÃO MENSAL - 2026!E22; TABULAÇÃO!C114:C116',
  ),
  definicao(
    'diaria_media_ponderada',
    'Diária média ponderada por leitos',
    'reais_por_diaria',
    'Diária EVOLUÇÃO MENSAL - 2026!E23; TABULAÇÃO!C121:C123',
  ),
  definicao(
    'revpar',
    'RevPAR (diária média × taxa de ocupação)',
    'reais_por_uh_dia',
    'TABULAÇÃO!D114:D116 e D121:D123',
  ),
] as const;

const hipotese = <C extends string>(
  chave: C,
  unidade: string,
  origem: string,
  descricao: string,
) => ({
  chave,
  unidade,
  origem,
  descricao,
  situacao: 'hipotese_pendente_homologacao',
});

/**
 * Parâmetros exigidos pelos cálculos. Os valores não ficam no código: chegam na entrada,
 * com origem e vigência registradas por quem chama (futuro `ParametroCalculo`).
 */
export const PARAMETROS_INDICADORES = [
  hipotese(
    'day_use.percentual',
    'percentual_0_100',
    'TABULAÇÃO!B97 e J97',
    'Participação do day use no total diário de turistas (hospedados + day use).',
  ),
  hipotese(
    'day_use.fator_hospedados',
    'fator',
    'TABULAÇÃO!L102',
    'Multiplicador dos hospedados por dia antes do ajuste de day use; significado não documentado.',
  ),
  hipotese(
    'leitos_media.minimo_por_uh',
    'leitos_por_uh',
    'MH!H2:H85 e MH!H88',
    'Ocupação mínima considerada por UH na média mínimo × máximo.',
  ),
  hipotese(
    'faixas_ocupacao.limites',
    'percentual_0_100',
    'TABULAÇÃO!O5:R9',
    'Limites inclusivos das faixas de ocupação dos respondentes.',
  ),
] as const;
