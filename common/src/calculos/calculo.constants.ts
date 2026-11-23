/** Caminhos REST do cálculo de indicadores (parte 16), relativos a `/api`. */
export const CALCULO_RECURSOS = {
  execucoes: '/calculos',
} as const;

/**
 * Ciclo de uma execução. `pendente` = insumos congelados; `executando` = cálculo em curso;
 * `concluido` grava todos os resultados de uma vez; `falhou` não deixa resultado algum.
 */
export const SITUACOES_EXECUCAO = [
  'pendente',
  'executando',
  'concluido',
  'falhou',
] as const;

/**
 * Consumo dos resultados. Só uma execução por pergunta fica `publicado`; publicar outra
 * marca a anterior como `substituido`, sem apagá-la.
 */
export const SITUACOES_PUBLICACAO = [
  'calculado',
  'publicado',
  'substituido',
] as const;

/**
 * População elegível: público congelado na abertura (parte 12) ou, nas edições legadas
 * sem público registrado, os empreendimentos elegíveis no momento do cálculo.
 */
export const ORIGENS_POPULACAO = [
  'destinatarios',
  'elegiveis_no_calculo',
] as const;

/**
 * Capacidade do meio no período: uma única versão conferida cobre o período inteiro
 * (`vigente`), nenhuma cobre (`ausente`) ou a capacidade muda dentro dele
 * (`varia_no_periodo`, regra de segmentação temporal pendente de homologação).
 */
export const SITUACOES_CAPACIDADE = [
  'vigente',
  'ausente',
  'varia_no_periodo',
] as const;

/** Fonte única no período (`vigente`/`informado`), nenhuma (`ausente`) ou mais de uma (`ambiguo`). */
export const SITUACOES_INSUMO = ['vigente', 'ausente', 'ambiguo'] as const;

/** Comparação dos insumos congelados com os atuais, no detalhe da execução. */
export const COMPARACOES_INSUMOS = ['iguais', 'alterados'] as const;

/** Recorte dos indicadores agregados da tabulação. */
export const RECORTE_TOTAL = 'total';

/** Método gravado nos resultados: média ponderada por UH ou valor direto (contagens, razões). */
export const METODOS_RESULTADO = ['ponderada', 'nao_se_aplica'] as const;

export const LIMITES_CALCULO = {
  motivo: 500,
  /** Execução pendente/executando há mais tempo que isso é tratada como interrompida. */
  minutosExecucaoInterrompida: 10,
} as const;
