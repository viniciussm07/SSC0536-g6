import {
  ESTADOS_LOTE,
  FONTES_IMPORTACAO,
  LIMITES_IMPORTACAO,
  SEVERIDADES_OCORRENCIA,
  SITUACOES_LINHA_IMPORTACAO,
  TIPOS_LINHA_IMPORTACAO,
  type FonteImportacao,
} from './importacao.constants.js';
import type {
  LinhaImportacaoLinha,
  LoteImportacaoDetalhe,
  LoteImportacaoLinha,
  OcorrenciaImportacaoLinha,
} from './importacao.types.js';

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const em = (lista: readonly string[], v: unknown) =>
  typeof v === 'string' && lista.includes(v);
const instante = (v: unknown) =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v));

export const isFonteImportacao = (v: unknown): v is FonteImportacao =>
  em(FONTES_IMPORTACAO, v);

export function isLoteImportacaoLinha(v: unknown): v is LoteImportacaoLinha {
  return (
    objeto(v) &&
    Number.isInteger(v.id) &&
    em(FONTES_IMPORTACAO, v.fonte) &&
    typeof v.nomeArquivo === 'string' &&
    Number.isInteger(v.tamanhoBytes) &&
    typeof v.versaoParser === 'string' &&
    em(ESTADOS_LOTE, v.estado) &&
    instante(v.criadoEm) &&
    (v.lidoEm === null || instante(v.lidoEm))
  );
}

export function isLoteImportacaoDetalhe(
  v: unknown,
): v is LoteImportacaoDetalhe {
  if (!isLoteImportacaoLinha(v)) return false;
  const d = v as unknown as Objeto;
  const t = d.totais;
  return (
    typeof d.sha256 === 'string' &&
    (d.erroMensagem === null || typeof d.erroMensagem === 'string') &&
    (d.resumo === null || objeto(d.resumo)) &&
    objeto(t) &&
    Number.isInteger(t.linhas) &&
    Number.isInteger(t.erros) &&
    Number.isInteger(t.avisos)
  );
}

export function isLinhaImportacaoLinha(v: unknown): v is LinhaImportacaoLinha {
  return (
    objeto(v) &&
    Number.isInteger(v.id) &&
    typeof v.aba === 'string' &&
    Number.isInteger(v.linha) &&
    em(TIPOS_LINHA_IMPORTACAO, v.tipo) &&
    em(SITUACOES_LINHA_IMPORTACAO, v.situacao) &&
    objeto(v.celulas) &&
    (v.canonico === null || objeto(v.canonico))
  );
}

export function isOcorrenciaImportacaoLinha(
  v: unknown,
): v is OcorrenciaImportacaoLinha {
  return (
    objeto(v) &&
    Number.isInteger(v.id) &&
    (v.aba === null || typeof v.aba === 'string') &&
    (v.linha === null || Number.isInteger(v.linha)) &&
    (v.coluna === null || typeof v.coluna === 'string') &&
    em(SEVERIDADES_OCORRENCIA, v.severidade) &&
    typeof v.codigo === 'string' &&
    typeof v.mensagem === 'string' &&
    typeof v.orientacao === 'string'
  );
}

/** Controles (C0, DEL) e separadores de caminho não pertencem a um nome de arquivo. */
function temCaractereInvalido(nome: string): boolean {
  for (const c of nome) {
    const codigo = c.codePointAt(0)!;
    if (codigo < 0x20 || codigo === 0x7f || c === '/' || c === '\\')
      return true;
  }
  return false;
}

export type ResultadoNomeArquivo =
  { valido: true; nome: string } | { valido: false; message: string };

/** Nome informado pelo cliente: apenas rótulo de exibição, nunca caminho de armazenamento. */
export function normalizarNomeArquivo(
  bruto: string | undefined,
): ResultadoNomeArquivo {
  if (bruto === undefined || bruto.trim() === '')
    return { valido: false, message: 'Informe o nome do arquivo.' };
  let nome: string;
  try {
    nome = decodeURIComponent(bruto);
  } catch {
    return {
      valido: false,
      message: 'Nome do arquivo codificado de forma inválida.',
    };
  }
  nome = nome.normalize('NFC').trim();
  if (
    temCaractereInvalido(nome) ||
    nome === '' ||
    nome === '.' ||
    nome === '..'
  )
    return {
      valido: false,
      message: 'Nome do arquivo contém caracteres inválidos.',
    };
  if (nome.length > LIMITES_IMPORTACAO.nomeArquivo)
    return {
      valido: false,
      message: `Use até ${LIMITES_IMPORTACAO.nomeArquivo} caracteres no nome do arquivo.`,
    };
  return { valido: true, nome };
}
