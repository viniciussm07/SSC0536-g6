import {
  LIMITES_PESQUISAS,
  PADRAO_CHAVE_CAMPO,
  TIPOS_VALOR_CAMPO,
} from './pesquisa.constants.js';
import type {
  AlteracaoModeloPesquisa,
  CampoModelo,
  EntradaModeloPesquisa,
  OpcaoCampo,
} from './pesquisa.types.js';
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

function lerOpcoes(
  origem: Objeto,
  tipoValor: string,
  erros: ErroCampo[],
  prefixo: string,
): OpcaoCampo[] {
  const v = origem.opcoes;
  const lista = v === undefined ? [] : v;
  if (!Array.isArray(lista)) {
    erros.push({
      field: `${prefixo}opcoes`,
      message: 'Informe uma lista de opções.',
    });
    return [];
  }
  if (tipoValor !== 'escolha') {
    if (lista.length) {
      erros.push({
        field: `${prefixo}opcoes`,
        message: 'Só o tipo "escolha" possui opções.',
      });
    }
    return [];
  }
  if (
    lista.length < LIMITES_PESQUISAS.opcoesMinimo ||
    lista.length > LIMITES_PESQUISAS.opcoesMaximo
  ) {
    erros.push({
      field: `${prefixo}opcoes`,
      message: `Informe de ${LIMITES_PESQUISAS.opcoesMinimo} a ${LIMITES_PESQUISAS.opcoesMaximo} opções.`,
    });
    return [];
  }
  const opcoes: OpcaoCampo[] = [];
  const chaves = new Set<string>();
  const ordens = new Set<number>();
  for (let i = 0; i < lista.length; i += 1) {
    const bruta = lista[i];
    const campo = `${prefixo}opcoes[${i}]`;
    if (!objeto(bruta)) {
      erros.push({ field: campo, message: 'Opção deve ser um objeto.' });
      continue;
    }
    const { chave, rotulo, ordem } = bruta;
    let ok = true;
    if (typeof chave !== 'string' || !PADRAO_CHAVE_CAMPO.test(chave)) {
      erros.push({
        field: `${campo}.chave`,
        message:
          'Chave inválida: use minúsculas, dígitos e separadores ., -, _.',
      });
      ok = false;
    } else if (chaves.has(chave)) {
      erros.push({ field: `${campo}.chave`, message: 'Chave repetida.' });
      ok = false;
    }
    if (
      typeof rotulo !== 'string' ||
      rotulo.trim() === '' ||
      rotulo.trim().length > LIMITES_PESQUISAS.rotuloOpcao
    ) {
      erros.push({
        field: `${campo}.rotulo`,
        message: `Informe um rótulo de 1 a ${LIMITES_PESQUISAS.rotuloOpcao} caracteres.`,
      });
      ok = false;
    }
    if (!inteiro(ordem, 0, LIMITES_PESQUISAS.ordemMaxima)) {
      erros.push({ field: `${campo}.ordem`, message: 'Ordem inválida.' });
      ok = false;
    } else if (ordens.has(ordem)) {
      erros.push({ field: `${campo}.ordem`, message: 'Ordem repetida.' });
      ok = false;
    }
    if (ok) {
      chaves.add(chave as string);
      ordens.add(ordem as number);
      opcoes.push({
        chave: chave as string,
        rotulo: (rotulo as string).trim(),
        ordem: ordem as number,
      });
    }
  }
  return opcoes;
}

function lerCampos(
  origem: Objeto,
  erros: ErroCampo[],
): CampoModelo[] | undefined {
  const v = origem.campos;
  if (v === undefined) return undefined;
  if (
    !Array.isArray(v) ||
    v.length < LIMITES_PESQUISAS.camposMinimo ||
    v.length > LIMITES_PESQUISAS.camposMaximo
  ) {
    erros.push({
      field: 'campos',
      message: `Informe de ${LIMITES_PESQUISAS.camposMinimo} a ${LIMITES_PESQUISAS.camposMaximo} campos.`,
    });
    return undefined;
  }
  const campos: CampoModelo[] = [];
  const chaves = new Set<string>();
  const ordens = new Set<number>();
  for (let i = 0; i < v.length; i += 1) {
    const bruto = v[i];
    const prefixo = `campos[${i}].`;
    if (!objeto(bruto)) {
      erros.push({
        field: `campos[${i}]`,
        message: 'Campo deve ser um objeto.',
      });
      continue;
    }
    const errosAntes = erros.length;
    const { chave, rotulo, tipoValor, obrigatorio, ordem } = bruto;
    if (typeof chave !== 'string' || !PADRAO_CHAVE_CAMPO.test(chave)) {
      erros.push({
        field: `${prefixo}chave`,
        message:
          'Chave inválida: use minúsculas, dígitos e separadores ., -, _.',
      });
    } else if (chaves.has(chave)) {
      erros.push({ field: `${prefixo}chave`, message: 'Chave repetida.' });
    }
    if (
      typeof rotulo !== 'string' ||
      rotulo.trim() === '' ||
      rotulo.trim().length > LIMITES_PESQUISAS.rotuloCampo
    ) {
      erros.push({
        field: `${prefixo}rotulo`,
        message: `Informe um rótulo de 1 a ${LIMITES_PESQUISAS.rotuloCampo} caracteres.`,
      });
    }
    if (
      typeof tipoValor !== 'string' ||
      !(TIPOS_VALOR_CAMPO as readonly string[]).includes(tipoValor)
    ) {
      erros.push({
        field: `${prefixo}tipoValor`,
        message: `Use um de: ${TIPOS_VALOR_CAMPO.join(', ')}.`,
      });
    }
    if (typeof obrigatorio !== 'boolean') {
      erros.push({
        field: `${prefixo}obrigatorio`,
        message: 'Informe verdadeiro ou falso.',
      });
    }
    if (!inteiro(ordem, 0, LIMITES_PESQUISAS.ordemMaxima)) {
      erros.push({ field: `${prefixo}ordem`, message: 'Ordem inválida.' });
    } else if (ordens.has(ordem)) {
      erros.push({ field: `${prefixo}ordem`, message: 'Ordem repetida.' });
    }
    const opcoes = lerOpcoes(bruto, tipoValor as string, erros, prefixo);
    if (erros.length === errosAntes) {
      chaves.add(chave as string);
      ordens.add(ordem as number);
      campos.push({
        chave: chave as string,
        rotulo: (rotulo as string).trim(),
        tipoValor: tipoValor as CampoModelo['tipoValor'],
        obrigatorio: obrigatorio as boolean,
        ordem: ordem as number,
        opcoes,
      });
    }
  }
  return campos;
}

function lerTexto(
  origem: Objeto,
  campo: string,
  maximo: number,
  erros: ErroCampo[],
): string | undefined {
  const v = origem[campo];
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || v.trim() === '' || v.trim().length > maximo) {
    erros.push({
      field: campo,
      message: `Informe um texto de 1 a ${maximo} caracteres.`,
    });
    return undefined;
  }
  return v.trim();
}

export function validarEntradaModelo(
  corpo: unknown,
): ResultadoEntrada<EntradaModeloPesquisa> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo)) {
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo deve ser um objeto.' }],
    };
  }
  const nome = lerTexto(corpo, 'nome', LIMITES_PESQUISAS.nome, erros);
  const publicoAlvo = lerTexto(
    corpo,
    'publicoAlvo',
    LIMITES_PESQUISAS.publicoAlvo,
    erros,
  );
  const campos = lerCampos(corpo, erros);
  if (nome === undefined && corpo.nome === undefined) {
    erros.push({ field: 'nome', message: 'Campo obrigatório.' });
  }
  if (publicoAlvo === undefined && corpo.publicoAlvo === undefined) {
    erros.push({ field: 'publicoAlvo', message: 'Campo obrigatório.' });
  }
  if (campos === undefined && corpo.campos === undefined) {
    erros.push({ field: 'campos', message: 'Campo obrigatório.' });
  }
  if (erros.length || campos === undefined) {
    return { valido: false, erros };
  }
  return {
    valido: true,
    data: {
      nome: nome as string,
      publicoAlvo: publicoAlvo as string,
      campos,
    },
  };
}

export function validarAlteracaoModelo(
  corpo: unknown,
): ResultadoEntrada<AlteracaoModeloPesquisa> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo)) {
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo deve ser um objeto.' }],
    };
  }
  const alteracao: AlteracaoModeloPesquisa = {};
  const nome = lerTexto(corpo, 'nome', LIMITES_PESQUISAS.nome, erros);
  if (nome !== undefined) alteracao.nome = nome;
  const publicoAlvo = lerTexto(
    corpo,
    'publicoAlvo',
    LIMITES_PESQUISAS.publicoAlvo,
    erros,
  );
  if (publicoAlvo !== undefined) alteracao.publicoAlvo = publicoAlvo;
  const campos = lerCampos(corpo, erros);
  if (campos !== undefined) alteracao.campos = campos;
  const motivo = corpo.motivo;
  if (motivo !== undefined) {
    if (
      typeof motivo !== 'string' ||
      motivo.trim() === '' ||
      motivo.trim().length > LIMITES_PESQUISAS.motivo
    ) {
      erros.push({
        field: 'motivo',
        message: `Informe um motivo de 1 a ${LIMITES_PESQUISAS.motivo} caracteres.`,
      });
    } else {
      alteracao.motivo = motivo.trim();
    }
  }
  if (erros.length) return { valido: false, erros };
  return { valido: true, data: alteracao };
}
