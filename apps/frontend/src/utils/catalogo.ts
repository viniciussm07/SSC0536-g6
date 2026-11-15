import {
  ESTADOS_ITEM_INVENTARIO,
  type ErroCampo,
  type FormularioCatalogo,
  type GrupoCatalogo,
  type ItemVersaoInventario,
  type RespostaItemInventario,
} from '@ssc0536/common';

export const OPCOES_SIM_NAO = [
  { value: 'nao', label: 'Não' },
  { value: 'sim', label: 'Sim' },
];
export const ROTULOS_SELECAO = {
  unica: 'Escolha única',
  multipla: 'Múltipla escolha',
} as const;
export const ROTULOS_ESTADO_ITEM = {
  sim: 'Sim',
  nao: 'Não',
  nao_se_aplica: 'Não se aplica',
  nao_informado: 'Não informado',
} as const;

export const simNao = (valor: boolean) => (valor ? 'Sim' : 'Não');

/**
 * Erros do validador compartilhado no formato do TanStack Form: por campo (`{ fields }`) ou,
 * quando o erro é do corpo inteiro (ex.: nada a alterar), uma mensagem do formulário.
 */
export function errosParaFormulario(erros: ErroCampo[]) {
  const geral = erros.find((e) => e.field === 'corpo');
  if (geral) return geral.message;
  const fields: Record<string, string> = {};
  for (const { field, message } of erros) fields[field] ??= message;
  return { fields };
}

// --- Formulário de catálogo (pré-visualização e inventário) ---

export const OPCOES_ESTADO_ITEM = ESTADOS_ITEM_INVENTARIO.map((valor) => ({
  value: valor,
  label: ROTULOS_ESTADO_ITEM[valor],
}));
/** Campos planos do formulário: estado, detalhe e quantidade por item do catálogo. */
export const chaveEstado = (id: number) => `e${id}`;
export const chaveDetalhe = (id: number) => `d${id}`;
export const chaveQuantidade = (id: number) => `q${id}`;

/** Itens sem resposta começam "não informado"; com base (versão anterior) herdam o que ela tinha. */
export function valoresIniciaisCatalogo(
  formulario: FormularioCatalogo,
  base: readonly ItemVersaoInventario[] = [],
) {
  const anteriores = new Map(base.map((i) => [i.itemId, i]));
  const valores: Record<string, string> = {};
  for (const grupo of formulario.grupos)
    for (const item of grupo.itens) {
      const anterior = anteriores.get(item.id);
      valores[chaveEstado(item.id)] = anterior?.estado ?? 'nao_informado';
      valores[chaveDetalhe(item.id)] = anterior?.detalhe ?? '';
      valores[chaveQuantidade(item.id)] =
        anterior?.quantidade !== null && anterior?.quantidade !== undefined
          ? String(anterior.quantidade)
          : '';
    }
  return valores;
}

/**
 * Itens "não informado" são omitidos, exceto os que a versão-base já tinha (para poder voltar a
 * "não informado" explicitamente). Desconhecido nunca vira "não".
 */
export function montarRespostas(
  formulario: FormularioCatalogo,
  valores: Record<string, string>,
  idsDaBase: ReadonlySet<number> = new Set(),
): RespostaItemInventario[] {
  const respostas: RespostaItemInventario[] = [];
  for (const grupo of formulario.grupos)
    for (const item of grupo.itens) {
      const estado = valores[chaveEstado(item.id)];
      if (estado === 'nao_informado' && !idsDaBase.has(item.id)) continue;
      const detalhe = (valores[chaveDetalhe(item.id)] ?? '').trim();
      const quantidade = (valores[chaveQuantidade(item.id)] ?? '').trim();
      respostas.push({
        itemId: item.id,
        estado: estado as RespostaItemInventario['estado'],
        ...(detalhe && estado === 'sim' ? { detalhe } : {}),
        ...(quantidade && estado === 'sim'
          ? {
              quantidade: /^\d+$/.test(quantidade)
                ? Number(quantidade)
                : (quantidade as unknown as number),
            }
          : {}),
      });
    }
  return respostas;
}

export function agruparPorSecao(grupos: readonly GrupoCatalogo[]) {
  const secoes = new Map<string, GrupoCatalogo[]>();
  for (const grupo of grupos)
    secoes.set(grupo.secao ?? 'Outros', [
      ...(secoes.get(grupo.secao ?? 'Outros') ?? []),
      grupo,
    ]);
  return [...secoes];
}

/** Separa erros do servidor em: por item (índice → ID da resposta), por grupo e demais. */
export function distribuirErros(
  erros: ErroCampo[],
  respostas: readonly RespostaItemInventario[],
) {
  const porItem: Record<number, string[]> = {};
  const porGrupo: Record<string, string> = {};
  const outros: ErroCampo[] = [];
  for (const erro of erros) {
    const m = /^itens\[(\d+)\]/.exec(erro.field);
    if (m) {
      const itemId = respostas[Number(m[1])]?.itemId;
      if (itemId !== undefined)
        porItem[itemId] = [...(porItem[itemId] ?? []), erro.message];
    } else if (erro.field.startsWith('grupos.'))
      porGrupo[erro.field.slice('grupos.'.length)] = erro.message;
    else outros.push(erro);
  }
  return { porItem, porGrupo, outros };
}
