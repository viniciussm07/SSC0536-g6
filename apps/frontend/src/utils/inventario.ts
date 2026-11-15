import type {
  InventarioResumo,
  CampoCapacidade,
  CapacidadeInventario,
  DiferencaCampo,
  ValorCapacidade,
} from '@ssc0536/common';

type TipoCampo = 'inteiro' | 'booleano' | 'horario';
export interface MetaCampoCapacidade {
  campo: CampoCapacidade;
  rotulo: string;
  tipo: TipoCampo;
  unidade?: string;
  ajuda?: string;
}

/** Campos da capacidade na ordem do formulário (nomes e unidades do dicionário do inventário). */
export const CAMPOS_FORMULARIO: readonly MetaCampoCapacidade[] = [
  { campo: 'totalUh', rotulo: 'UH', tipo: 'inteiro', unidade: 'unidades' },
  { campo: 'leitos', rotulo: 'Leitos', tipo: 'inteiro', unidade: 'leitos' },
  {
    campo: 'maxLeitosPorUh',
    rotulo: 'Máximo de leitos por UH',
    tipo: 'inteiro',
    unidade: 'leitos/UH',
  },
  {
    campo: 'uhsPcd',
    rotulo: 'UH acessíveis (PCD)',
    tipo: 'inteiro',
    unidade: 'unidades',
  },
  {
    campo: 'funcFixos',
    rotulo: 'Funcionários fixos',
    tipo: 'inteiro',
    unidade: 'pessoas',
  },
  {
    campo: 'funcTemporarios',
    rotulo: 'Funcionários temporários',
    tipo: 'inteiro',
    unidade: 'pessoas',
  },
  { campo: 'funciona24h', rotulo: 'Funciona 24 horas', tipo: 'booleano' },
  { campo: 'checkin', rotulo: 'Horário de check-in', tipo: 'horario' },
  { campo: 'checkout', rotulo: 'Horário de check-out', tipo: 'horario' },
];
export const ROTULO_CAMPO = Object.fromEntries(
  CAMPOS_FORMULARIO.map((c) => [c.campo, c.rotulo]),
) as Record<CampoCapacidade, string>;

export const ROTULOS_TIPO_ALTERACAO = {
  mudanca_real: 'Mudança real',
  correcao: 'Correção',
} as const;
export const ROTULOS_CONFERENCIA = {
  completo: 'Completo',
  parcial: 'Parcial',
  pendente: 'Pendente',
} as const;

export const OPCOES_ESTADO_CAMPO = [
  { value: 'informado', label: 'Informado' },
  { value: 'nao_se_aplica', label: 'Não se aplica' },
  { value: 'desconhecido', label: 'Desconhecido' },
];
export const chaveEstadoCampo = (campo: CampoCapacidade) => `c_${campo}_estado`;
export const chaveValorCampo = (campo: CampoCapacidade) => `c_${campo}_valor`;

/** Texto de um valor; zero e "não" são valores, "não se aplica" e "desconhecido" são estados. */
export function formatarValorCapacidade(
  v: ValorCapacidade<number | boolean | string>,
): string {
  if (v.estado === 'nao_se_aplica') return 'Não se aplica';
  if (v.estado === 'desconhecido') return 'Desconhecido';
  if (v.estado === 'vazio') return 'Em branco';
  return typeof v.valor === 'boolean'
    ? v.valor
      ? 'Sim'
      : 'Não'
    : String(v.valor);
}

/** Campos do formulário preenchidos a partir da versão-base (ou desconhecidos, sem base). */
export function valoresIniciaisCapacidade(
  base?: CapacidadeInventario | null,
): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const { campo, tipo } of CAMPOS_FORMULARIO) {
    const atual = base?.[campo];
    valores[chaveEstadoCampo(campo)] =
      atual && atual.estado !== 'vazio' ? atual.estado : 'desconhecido';
    valores[chaveValorCampo(campo)] =
      atual?.estado === 'informado'
        ? tipo === 'booleano'
          ? atual.valor
            ? 'sim'
            : 'nao'
          : String(atual.valor)
        : tipo === 'booleano'
          ? 'nao'
          : '';
  }
  return valores;
}

/** Converte os campos do formulário no contrato da API (null = desconhecido). */
export function montarCapacidade(
  valores: Record<string, string>,
): Record<string, unknown> {
  const capacidade: Record<string, unknown> = {};
  for (const { campo, tipo } of CAMPOS_FORMULARIO) {
    const estado = valores[chaveEstadoCampo(campo)];
    const texto = (valores[chaveValorCampo(campo)] ?? '').trim();
    if (estado === 'nao_se_aplica') capacidade[campo] = { estado };
    else if (estado === 'desconhecido') capacidade[campo] = null;
    else if (tipo === 'booleano') capacidade[campo] = texto === 'sim';
    else if (tipo === 'inteiro')
      capacidade[campo] = /^\d+$/.test(texto) ? Number(texto) : texto || '';
    else capacidade[campo] = texto;
  }
  return capacidade;
}

export const descreverDiferenca = (d: DiferencaCampo) =>
  `${formatarValorCapacidade(d.antes)} → ${formatarValorCapacidade(d.depois)}`;

export function dataBr(data: string | null) {
  return data ? data.split('-').reverse().join('/') : '—';
}
/** Data de hoje no fuso operacional (America/Sao_Paulo), como AAAA-MM-DD. */
export const hojeOperacional = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );

/** Versão imediatamente anterior na linha do tempo (ou a corrigida, quando esta é uma correção). */
export function anteriorDe(
  versao: Pick<InventarioResumo, 'id' | 'vigenciaInicio' | 'tipoAlteracao'>,
  linhas: readonly InventarioResumo[],
) {
  if (versao.tipoAlteracao === 'correcao')
    return linhas.find((l) => l.substituidaPorId === versao.id) ?? null;
  return (
    [...linhas]
      .filter(
        (l) =>
          l.substituidaPorId === null &&
          l.vigenciaInicio < versao.vigenciaInicio,
      )
      .sort((a, b) => b.vigenciaInicio.localeCompare(a.vigenciaInicio))[0] ??
    null
  );
}
