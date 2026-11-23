import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';
import {
  CONFIRMACOES_LOTE,
  LIMITES_CONCILIACAO,
  RESOLUCOES_CONFLITO,
  SITUACOES_PLANO,
  ESTADOS_LOTE,
  FONTES_IMPORTACAO,
  LIMITES_IMPORTACAO,
  SEVERIDADES_OCORRENCIA,
  SITUACOES_LINHA_IMPORTACAO,
  TIPOS_LINHA_IMPORTACAO,
  type FonteImportacao,
} from './importacao.constants.js';
import type {
  EntradaConfirmacao,
  EntradaConflito,
  EntradaDecisao,
  EntradaDestino,
  PlanoImportacao,
  ResultadoConfirmacao,
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
    em(CONFIRMACOES_LOTE, d.confirmacao) &&
    (d.destino === null || objeto(d.destino)) &&
    (d.confirmadoEm === null || instante(d.confirmadoEm)) &&
    typeof d.recalculoPendente === 'boolean' &&
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

const idPositivo = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 && v <= 2147483647;
const naoNegativo = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const corpo = (v: unknown): Objeto | null => (objeto(v) ? v : null);
const semCampos = (o: Objeto, permitidos: readonly string[]): ErroCampo[] =>
  Object.keys(o)
    .filter((k) => !permitidos.includes(k))
    .map((field) => ({ field, message: 'Campo não permitido.' }));
const falha = <T>(erros: ErroCampo[]): ResultadoEntrada<T> => ({
  valido: false,
  erros,
});

export function validarEntradaDestino(
  entrada: unknown,
): ResultadoEntrada<EntradaDestino> {
  const o = corpo(entrada);
  if (!o) return falha([{ field: '', message: 'Envie um objeto JSON.' }]);
  const erros = semCampos(o, ['pesquisaId', 'perguntaId']);
  if (!idPositivo(o.pesquisaId))
    erros.push({
      field: 'pesquisaId',
      message: 'Informe a edição de destino.',
    });
  if (!idPositivo(o.perguntaId))
    erros.push({
      field: 'perguntaId',
      message: 'Informe a pergunta de ocupação.',
    });
  return erros.length > 0
    ? falha(erros)
    : {
        valido: true,
        data: {
          pesquisaId: o.pesquisaId as number,
          perguntaId: o.perguntaId as number,
        },
      };
}

export function validarEntradaDecisao(
  entrada: unknown,
): ResultadoEntrada<EntradaDecisao> {
  const o = corpo(entrada);
  if (!o) return falha([{ field: '', message: 'Envie um objeto JSON.' }]);
  if (o.tipo === 'vincular') {
    const erros = semCampos(o, ['tipo', 'empreendimentoId']);
    if (!idPositivo(o.empreendimentoId))
      erros.push({
        field: 'empreendimentoId',
        message: 'Informe o empreendimento.',
      });
    return erros.length > 0
      ? falha(erros)
      : {
          valido: true,
          data: {
            tipo: 'vincular',
            empreendimentoId: o.empreendimentoId as number,
          },
        };
  }
  if (o.tipo === 'rejeitar') {
    const erros = semCampos(o, ['tipo', 'motivo']);
    let motivo: string | undefined;
    if (o.motivo !== undefined) {
      if (
        typeof o.motivo !== 'string' ||
        o.motivo.trim().length > LIMITES_CONCILIACAO.motivo
      )
        erros.push({
          field: 'motivo',
          message: `Use até ${LIMITES_CONCILIACAO.motivo} caracteres.`,
        });
      else if (o.motivo.trim() !== '') motivo = o.motivo.trim();
    }
    return erros.length > 0
      ? falha(erros)
      : {
          valido: true,
          data: motivo ? { tipo: 'rejeitar', motivo } : { tipo: 'rejeitar' },
        };
  }
  return falha([{ field: 'tipo', message: 'Escolha vincular ou rejeitar.' }]);
}

export function validarEntradaConflito(
  entrada: unknown,
): ResultadoEntrada<EntradaConflito> {
  const o = corpo(entrada);
  if (!o) return falha([{ field: '', message: 'Envie um objeto JSON.' }]);
  const erros = semCampos(o, ['resolucao']);
  if (!em(RESOLUCOES_CONFLITO, o.resolucao))
    erros.push({
      field: 'resolucao',
      message: 'Escolha substituir ou manter.',
    });
  return erros.length > 0
    ? falha(erros)
    : {
        valido: true,
        data: { resolucao: o.resolucao as EntradaConflito['resolucao'] },
      };
}

export function validarEntradaConfirmacao(
  entrada: unknown,
): ResultadoEntrada<EntradaConfirmacao> {
  const o = corpo(entrada);
  if (!o) return falha([{ field: '', message: 'Envie um objeto JSON.' }]);
  const erros = semCampos(o, ['novos', 'atualizados']);
  for (const campo of ['novos', 'atualizados'] as const)
    if (!naoNegativo(o[campo]))
      erros.push({
        field: campo,
        message: 'Informe o total exibido na conferência.',
      });
  return erros.length > 0
    ? falha(erros)
    : {
        valido: true,
        data: {
          novos: o.novos as number,
          atualizados: o.atualizados as number,
        },
      };
}

export function isPlanoImportacao(v: unknown): v is PlanoImportacao {
  if (
    !objeto(v) ||
    !Number.isInteger(v.loteId) ||
    !em(CONFIRMACOES_LOTE, v.confirmacao)
  )
    return false;
  const t = v.totais;
  return (
    Array.isArray(v.avisos) &&
    typeof v.podeConfirmar === 'boolean' &&
    objeto(t) &&
    [
      'lidas',
      'novos',
      'atualizados',
      'semMudanca',
      'conflitos',
      'rejeitados',
      'pendentes',
      'aplicados',
    ].every((k) => Number.isInteger(t[k])) &&
    Array.isArray(v.itens) &&
    v.itens.every(
      (i) =>
        objeto(i) &&
        Number.isInteger(i.linhaId) &&
        Number.isInteger(i.linha) &&
        em(SITUACOES_PLANO, i.situacao) &&
        Array.isArray(i.candidatos),
    )
  );
}

export function isResultadoConfirmacao(v: unknown): v is ResultadoConfirmacao {
  return (
    objeto(v) &&
    em(CONFIRMACOES_LOTE, v.confirmacao) &&
    [
      'criadas',
      'atualizadas',
      'semMudanca',
      'pendentes',
      'conflitos',
      'rejeitadas',
    ].every((k) => Number.isInteger(v[k])) &&
    typeof v.recalculoPendente === 'boolean'
  );
}
