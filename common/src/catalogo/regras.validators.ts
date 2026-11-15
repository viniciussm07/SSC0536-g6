import {
  ESTADOS_ITEM_INVENTARIO,
  LIMITES_CATALOGO,
  PADRAO_CHAVE_CATALOGO,
  SELECOES_GRUPO,
} from './catalogo.constants.js';
import type {
  AlteracaoGrupoCatalogo,
  AlteracaoItemCatalogo,
  EntradaGrupoCatalogo,
  EntradaItemCatalogo,
  GrupoCatalogo,
  RespostaItemInventario,
} from './catalogo.types.js';
import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const inteiro = (v: unknown, minimo: number, maximo: number): v is number =>
  typeof v === 'number' &&
  Number.isSafeInteger(v) &&
  v >= minimo &&
  v <= maximo;
const idValido = (v: unknown): v is number => inteiro(v, 1, 2_147_483_647);

class Coletor {
  readonly erros: ErroCampo[] = [];
  erro(field: string, message: string) {
    this.erros.push({ field, message });
  }
  texto(
    origem: Objeto,
    campo: string,
    maximo: number,
    opcoes: { obrigatorio: boolean; anulavel?: boolean },
  ): string | null | undefined {
    const v = origem[campo];
    if (v === undefined) {
      if (opcoes.obrigatorio) this.erro(campo, 'Campo obrigatório.');
      return undefined;
    }
    if (v === null && opcoes.anulavel) return null;
    if (typeof v !== 'string' || v.trim() === '' || v.trim().length > maximo) {
      this.erro(campo, `Informe um texto de 1 a ${maximo} caracteres.`);
      return undefined;
    }
    return v.trim();
  }
  booleano(origem: Objeto, campo: string, obrigatorio: boolean) {
    const v = origem[campo];
    if (v === undefined) {
      if (obrigatorio) this.erro(campo, 'Campo obrigatório.');
      return undefined;
    }
    if (typeof v !== 'boolean') {
      this.erro(campo, 'Use true ou false.');
      return undefined;
    }
    return v;
  }
  ordem(origem: Objeto, campo: string, obrigatorio: boolean) {
    const v = origem[campo];
    if (v === undefined) {
      if (obrigatorio) this.erro(campo, 'Campo obrigatório.');
      return undefined;
    }
    if (!inteiro(v, 0, LIMITES_CATALOGO.ordemMaxima)) {
      this.erro(
        campo,
        `Use um inteiro de 0 a ${LIMITES_CATALOGO.ordemMaxima}.`,
      );
      return undefined;
    }
    return v;
  }
  chave(origem: Objeto) {
    const v = this.texto(origem, 'chave', LIMITES_CATALOGO.chave, {
      obrigatorio: true,
    });
    if (v && !PADRAO_CHAVE_CATALOGO.test(v)) {
      this.erro(
        'chave',
        'Use minúsculas, dígitos e separadores (. - _), sem espaços ou acentos.',
      );
      return undefined;
    }
    return v ?? undefined;
  }
  desconhecidos(origem: Objeto, permitidos: readonly string[]) {
    for (const chave of Object.keys(origem))
      if (!permitidos.includes(chave))
        this.erro(chave, 'Campo não reconhecido.');
  }
}
const resultado = <T>(c: Coletor, data: T): ResultadoEntrada<T> =>
  c.erros.length ? { valido: false, erros: c.erros } : { valido: true, data };

/** Combinações contraditórias de um item: valem na criação e na alteração (estado final). */
function consistenciaItem(
  c: Coletor,
  item: { exclusivo: boolean; outro: boolean; aceitaQuantidade: boolean },
) {
  if (item.exclusivo && item.outro)
    c.erro('exclusivo', 'Um item exclusivo não pode ser "outro".');
  if (item.exclusivo && item.aceitaQuantidade)
    c.erro('aceitaQuantidade', 'Um item exclusivo não aceita quantidade.');
}

export function validarEntradaGrupoCatalogo(
  corpo: unknown,
): ResultadoEntrada<EntradaGrupoCatalogo> {
  const c = new Coletor();
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: 'corpo', message: 'Objeto esperado.' }],
    };
  c.desconhecidos(corpo, [
    'segmentoId',
    'chave',
    'pergunta',
    'selecao',
    'permiteOutro',
    'secao',
    'ordem',
  ]);
  if (!idValido(corpo.segmentoId))
    c.erro('segmentoId', 'Informe o ID do segmento.');
  const chave = c.chave(corpo);
  const pergunta = c.texto(corpo, 'pergunta', LIMITES_CATALOGO.pergunta, {
    obrigatorio: true,
  });
  const selecao = corpo.selecao;
  if (
    typeof selecao !== 'string' ||
    !(SELECOES_GRUPO as readonly string[]).includes(selecao)
  )
    c.erro('selecao', `Use: ${SELECOES_GRUPO.join(', ')}.`);
  const permiteOutro = c.booleano(corpo, 'permiteOutro', true);
  const secao = c.texto(corpo, 'secao', LIMITES_CATALOGO.secao, {
    obrigatorio: false,
    anulavel: true,
  });
  const ordem = c.ordem(corpo, 'ordem', true);
  return resultado(c, {
    segmentoId: corpo.segmentoId as number,
    chave: chave as string,
    pergunta: pergunta as string,
    selecao: selecao as EntradaGrupoCatalogo['selecao'],
    permiteOutro: permiteOutro as boolean,
    ...(secao !== undefined ? { secao } : {}),
    ordem: ordem as number,
  });
}

export function validarAlteracaoGrupoCatalogo(
  corpo: unknown,
): ResultadoEntrada<AlteracaoGrupoCatalogo> {
  const c = new Coletor();
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: 'corpo', message: 'Objeto esperado.' }],
    };
  c.desconhecidos(corpo, ['pergunta', 'secao', 'ordem', 'ativo', 'motivo']);
  const data: AlteracaoGrupoCatalogo = {};
  const pergunta = c.texto(corpo, 'pergunta', LIMITES_CATALOGO.pergunta, {
    obrigatorio: false,
  });
  if (pergunta !== undefined && pergunta !== null) data.pergunta = pergunta;
  const secao = c.texto(corpo, 'secao', LIMITES_CATALOGO.secao, {
    obrigatorio: false,
    anulavel: true,
  });
  if (secao !== undefined) data.secao = secao;
  const ordem = c.ordem(corpo, 'ordem', false);
  if (ordem !== undefined) data.ordem = ordem;
  const ativo = c.booleano(corpo, 'ativo', false);
  if (ativo !== undefined) data.ativo = ativo;
  const motivo = c.texto(corpo, 'motivo', LIMITES_CATALOGO.motivo, {
    obrigatorio: false,
  });
  if (motivo) data.motivo = motivo;
  if (!c.erros.length && !Object.keys(data).some((k) => k !== 'motivo'))
    c.erro('corpo', 'Informe ao menos um campo para alterar.');
  return resultado(c, data);
}

export function validarEntradaItemCatalogo(
  corpo: unknown,
): ResultadoEntrada<EntradaItemCatalogo> {
  const c = new Coletor();
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: 'corpo', message: 'Objeto esperado.' }],
    };
  c.desconhecidos(corpo, [
    'grupoId',
    'chave',
    'rotulo',
    'exclusivo',
    'outro',
    'aceitaQuantidade',
    'ordem',
  ]);
  if (!idValido(corpo.grupoId)) c.erro('grupoId', 'Informe o ID do grupo.');
  const chave = c.chave(corpo);
  const rotulo = c.texto(corpo, 'rotulo', LIMITES_CATALOGO.rotulo, {
    obrigatorio: true,
  });
  const exclusivo = c.booleano(corpo, 'exclusivo', true);
  const outro = c.booleano(corpo, 'outro', true);
  const aceitaQuantidade = c.booleano(corpo, 'aceitaQuantidade', true);
  const ordem = c.ordem(corpo, 'ordem', true);
  if (
    exclusivo !== undefined &&
    outro !== undefined &&
    aceitaQuantidade !== undefined
  )
    consistenciaItem(c, { exclusivo, outro, aceitaQuantidade });
  return resultado(c, {
    grupoId: corpo.grupoId as number,
    chave: chave as string,
    rotulo: rotulo as string,
    exclusivo: exclusivo as boolean,
    outro: outro as boolean,
    aceitaQuantidade: aceitaQuantidade as boolean,
    ordem: ordem as number,
  });
}

/** Valida a alteração parcial; a consistência final (com o item atual) é conferida por `consistenciaItemFinal`. */
export function validarAlteracaoItemCatalogo(
  corpo: unknown,
): ResultadoEntrada<AlteracaoItemCatalogo> {
  const c = new Coletor();
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: 'corpo', message: 'Objeto esperado.' }],
    };
  c.desconhecidos(corpo, [
    'rotulo',
    'exclusivo',
    'outro',
    'aceitaQuantidade',
    'ordem',
    'ativo',
    'motivo',
  ]);
  const data: AlteracaoItemCatalogo = {};
  const rotulo = c.texto(corpo, 'rotulo', LIMITES_CATALOGO.rotulo, {
    obrigatorio: false,
  });
  if (rotulo) data.rotulo = rotulo;
  for (const campo of [
    'exclusivo',
    'outro',
    'aceitaQuantidade',
    'ativo',
  ] as const) {
    const v = c.booleano(corpo, campo, false);
    if (v !== undefined) data[campo] = v;
  }
  const ordem = c.ordem(corpo, 'ordem', false);
  if (ordem !== undefined) data.ordem = ordem;
  const motivo = c.texto(corpo, 'motivo', LIMITES_CATALOGO.motivo, {
    obrigatorio: false,
  });
  if (motivo) data.motivo = motivo;
  if (!c.erros.length && !Object.keys(data).some((k) => k !== 'motivo'))
    c.erro('corpo', 'Informe ao menos um campo para alterar.');
  return resultado(c, data);
}

/** Estado final de um item (atual + alteração) não pode ser contraditório. */
export function consistenciaItemFinal(
  item: { exclusivo: boolean; outro: boolean; aceitaQuantidade: boolean },
  permiteOutroDoGrupo: boolean,
): ErroCampo[] {
  const c = new Coletor();
  consistenciaItem(c, item);
  if (item.outro && !permiteOutroDoGrupo)
    c.erro('outro', 'O grupo não permite a opção "outro".');
  return c.erros;
}

export interface OpcoesRespostasCatalogo {
  /** Padrão `true`: itens/grupos inativos não aceitam novas respostas. */
  somenteAtivos?: boolean;
}

/**
 * Regras de seleção do formulário, compartilhadas por inventário, importação e API (nunca só
 * da interface): item/estado conhecidos, sem duplicidade, seleção única, item exclusivo sem
 * outro "sim", "outro" com detalhe, quantidade só onde se aplica e itens inativos recusados.
 * Item sem resposta continua desconhecido; nada é convertido em "não".
 */
export function validarRespostasCatalogo(
  grupos: readonly GrupoCatalogo[],
  respostas: unknown,
  { somenteAtivos = true }: OpcoesRespostasCatalogo = {},
): ResultadoEntrada<RespostaItemInventario[]> {
  const erros: ErroCampo[] = [];
  const erro = (field: string, message: string) =>
    erros.push({ field, message });
  if (!Array.isArray(respostas))
    return {
      valido: false,
      erros: [{ field: 'itens', message: 'Informe a lista de respostas.' }],
    };
  if (respostas.length > LIMITES_CATALOGO.respostas)
    return {
      valido: false,
      erros: [
        {
          field: 'itens',
          message: `No máximo ${LIMITES_CATALOGO.respostas} respostas.`,
        },
      ],
    };
  const itens = new Map(
    grupos.flatMap((g) =>
      g.itens.map((i) => [i.id, { item: i, grupo: g }] as const),
    ),
  );
  const vistos = new Set<number>();
  const validas: RespostaItemInventario[] = [];
  const simPorGrupo = new Map<number, number[]>();
  respostas.forEach((r, i) => {
    const campo = (nome: string) => `itens[${i}].${nome}`;
    if (!objeto(r)) return erro(`itens[${i}]`, 'Objeto esperado.');
    for (const chave of Object.keys(r))
      if (!['itemId', 'estado', 'detalhe', 'quantidade'].includes(chave))
        erro(campo(chave), 'Campo não reconhecido.');
    const alvo = idValido(r.itemId) ? itens.get(r.itemId) : undefined;
    if (!alvo)
      return erro(campo('itemId'), 'Item desconhecido neste formulário.');
    if (vistos.has(alvo.item.id))
      return erro(campo('itemId'), 'Item repetido na mesma resposta.');
    vistos.add(alvo.item.id);
    const estado = r.estado;
    if (
      typeof estado !== 'string' ||
      !(ESTADOS_ITEM_INVENTARIO as readonly string[]).includes(estado)
    )
      return erro(
        campo('estado'),
        `Use: ${ESTADOS_ITEM_INVENTARIO.join(', ')}.`,
      );
    if (somenteAtivos && (!alvo.item.ativo || !alvo.grupo.ativo))
      return erro(campo('itemId'), 'Item inativo não aceita novas respostas.');
    const detalhe = r.detalhe;
    if (detalhe !== undefined && detalhe !== null) {
      if (
        typeof detalhe !== 'string' ||
        detalhe.trim() === '' ||
        detalhe.trim().length > LIMITES_CATALOGO.detalhe
      )
        erro(
          campo('detalhe'),
          `Use de 1 a ${LIMITES_CATALOGO.detalhe} caracteres.`,
        );
      else if (!alvo.item.outro)
        erro(campo('detalhe'), 'Este item não admite detalhe.');
      else if (estado !== 'sim')
        erro(campo('detalhe'), 'O detalhe só vale quando a resposta é "sim".');
    }
    // Um erro por campo: texto em branco já foi apontado acima.
    if (
      alvo.item.outro &&
      estado === 'sim' &&
      (detalhe === undefined || detalhe === null)
    )
      erro(campo('detalhe'), 'Descreva a opção "outro".');
    const quantidade = r.quantidade;
    if (quantidade !== undefined && quantidade !== null) {
      if (!inteiro(quantidade, 0, LIMITES_CATALOGO.quantidadeMaxima))
        erro(campo('quantidade'), 'Use um inteiro não negativo.');
      else if (!alvo.item.aceitaQuantidade)
        erro(campo('quantidade'), 'Este item não admite quantidade.');
      else if (estado !== 'sim')
        erro(
          campo('quantidade'),
          'A quantidade só vale quando a resposta é "sim".',
        );
    }
    if (estado === 'sim')
      simPorGrupo.set(alvo.grupo.id, [
        ...(simPorGrupo.get(alvo.grupo.id) ?? []),
        alvo.item.id,
      ]);
    validas.push({
      itemId: alvo.item.id,
      estado: estado as RespostaItemInventario['estado'],
      ...(detalhe !== undefined ? { detalhe: detalhe as string | null } : {}),
      ...(quantidade !== undefined
        ? { quantidade: quantidade as number | null }
        : {}),
    });
  });
  for (const [grupoId, marcados] of simPorGrupo) {
    const grupo = grupos.find((g) => g.id === grupoId)!;
    const exclusivos = grupo.itens.filter(
      (i) => i.exclusivo && marcados.includes(i.id),
    );
    if (grupo.selecao === 'unica' && marcados.length > 1)
      erro(`grupos.${grupo.chave}`, 'Este grupo aceita apenas uma opção.');
    else if (exclusivos.length && marcados.length > exclusivos.length)
      erro(
        `grupos.${grupo.chave}`,
        `"${exclusivos[0].rotulo}" não pode ser combinado com outra opção.`,
      );
  }
  return erros.length
    ? { valido: false, erros }
    : { valido: true, data: validas };
}
