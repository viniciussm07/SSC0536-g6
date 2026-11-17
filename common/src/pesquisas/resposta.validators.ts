import {
  SITUACOES_DESTINATARIO,
  SITUACOES_PESQUISA,
  STATUS_PESQUISA,
  TIPOS_COLETA,
} from './edicao.constants.js';
import { TIPOS_VALOR_CAMPO } from './pesquisa.constants.js';
import { LIMITES_RESPOSTAS } from './resposta.constants.js';
import type {
  EnvioResposta,
  FormularioResposta,
  ItemNormalizado,
  ItemResposta,
  PerguntaResposta,
  PesquisaRespondenteLinha,
} from './resposta.types.js';
import { normalizarPercentualColetado } from '../coleta/valor-coletado.validators.js';
import { isPeriodoLinha } from '../periodos/detalhe.validators.js';
import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';

type Objeto = Record<string, unknown>;

const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const idValido = (v: unknown): v is number =>
  typeof v === 'number' &&
  Number.isSafeInteger(v) &&
  v >= 1 &&
  v <= 2_147_483_647;
const instante = (v: unknown): v is string =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v));
const instanteOuNulo = (v: unknown) => v === null || instante(v);

/** Campo de erro de uma pergunta, usado pelo servidor e pelo formulário. */
export const campoPergunta = (perguntaId: number) => `perguntas.${perguntaId}`;

/**
 * Forma do corpo de `PUT .../resposta`: só `itens`, cada um com `perguntaId` inteiro único
 * e `valor` texto. Não confere pertença nem tipo das perguntas; isso exige a edição.
 */
export function validarEnvioResposta(
  corpo: unknown,
): ResultadoEntrada<EnvioResposta> {
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: 'itens', message: 'Envie um objeto com itens.' }],
    };
  const extras = Object.keys(corpo).filter((k) => k !== 'itens');
  const erros: ErroCampo[] = extras.map((k) => ({
    field: k,
    message: 'Campo não permitido.',
  }));
  const itens = corpo.itens;
  if (!Array.isArray(itens)) {
    erros.push({ field: 'itens', message: 'Informe a lista de itens.' });
    return { valido: false, erros };
  }
  if (itens.length > LIMITES_RESPOSTAS.itensMaximo) {
    erros.push({
      field: 'itens',
      message: `No máximo ${LIMITES_RESPOSTAS.itensMaximo} itens.`,
    });
    return { valido: false, erros };
  }
  const vistos = new Set<number>();
  const dados: ItemResposta[] = [];
  itens.forEach((item, i) => {
    const campo = `itens[${i}]`;
    if (
      !objeto(item) ||
      Object.keys(item).some((k) => k !== 'perguntaId' && k !== 'valor')
    ) {
      erros.push({ field: campo, message: 'Use { perguntaId, valor }.' });
      return;
    }
    if (!idValido(item.perguntaId)) {
      erros.push({
        field: `${campo}.perguntaId`,
        message: 'Pergunta inválida.',
      });
      return;
    }
    if (vistos.has(item.perguntaId)) {
      erros.push({
        field: campoPergunta(item.perguntaId),
        message: 'Pergunta repetida.',
      });
      return;
    }
    vistos.add(item.perguntaId);
    if (typeof item.valor !== 'string') {
      erros.push({
        field: campoPergunta(item.perguntaId),
        message: 'Envie o valor como texto.',
      });
      return;
    }
    if (item.valor.length > LIMITES_RESPOSTAS.texto) {
      erros.push({
        field: campoPergunta(item.perguntaId),
        message: `No máximo ${LIMITES_RESPOSTAS.texto} caracteres.`,
      });
      return;
    }
    dados.push({ perguntaId: item.perguntaId, valor: item.valor });
  });
  return erros.length
    ? { valido: false, erros }
    : { valido: true, data: { itens: dados } };
}

/**
 * Confere os itens contra as perguntas da edição (versão congelada do modelo).
 * Percentual: decimal de 0 a 100 (vírgula ou ponto), sem escala fracionária. Texto
 * vazio equivale a não responder; obrigatórias precisam de valor. Estados como
 * “desconhecido” e “não se aplica” ainda não têm admissibilidade definida pelo OTO.
 */
export function conferirItensResposta(
  perguntas: readonly PerguntaResposta[],
  itens: readonly ItemResposta[],
): ResultadoEntrada<ItemNormalizado[]> {
  const porId = new Map(perguntas.map((p) => [p.id, p]));
  const valores = new Map<number, string>();
  const erros: ErroCampo[] = [];
  for (const item of itens) {
    if (!porId.has(item.perguntaId))
      erros.push({
        field: campoPergunta(item.perguntaId),
        message: 'A pergunta não pertence a esta pesquisa.',
      });
    else valores.set(item.perguntaId, item.valor.trim());
  }
  const dados: ItemNormalizado[] = [];
  for (const pergunta of perguntas) {
    const field = campoPergunta(pergunta.id);
    const valor = valores.get(pergunta.id) ?? '';
    if (valor === '') {
      if (pergunta.obrigatorio)
        erros.push({ field, message: 'Resposta obrigatória.' });
      continue;
    }
    if (pergunta.tipoValor === 'percentual') {
      const r = normalizarPercentualColetado(valor, 'percentual');
      if (!r.valido || r.data.estado !== 'informado')
        erros.push({ field, message: 'Informe um percentual de 0 a 100.' });
      else
        dados.push({
          perguntaId: pergunta.id,
          valorNumerico: r.data.valor,
          valorTexto: null,
        });
    } else if (pergunta.tipoValor === 'escolha') {
      if (!pergunta.opcoes?.some((o) => o.chave === valor))
        erros.push({ field, message: 'Escolha uma das opções.' });
      else
        dados.push({
          perguntaId: pergunta.id,
          valorNumerico: null,
          valorTexto: valor,
        });
    } else {
      dados.push({
        perguntaId: pergunta.id,
        valorNumerico: null,
        valorTexto: valor,
      });
    }
  }
  return erros.length
    ? { valido: false, erros }
    : { valido: true, data: dados };
}

export function isPesquisaRespondenteLinha(
  v: unknown,
): v is PesquisaRespondenteLinha {
  return (
    objeto(v) &&
    idValido(v.pesquisaId) &&
    typeof v.titulo === 'string' &&
    (TIPOS_COLETA as readonly unknown[]).includes(v.tipoColeta) &&
    (STATUS_PESQUISA as readonly unknown[]).includes(v.status) &&
    instante(v.abertura) &&
    instante(v.prazo) &&
    (SITUACOES_DESTINATARIO as readonly unknown[]).includes(
      v.situacaoResposta,
    ) &&
    instanteOuNulo(v.respondidaEm)
  );
}

const isItemResposta = (v: unknown): v is ItemResposta =>
  objeto(v) && idValido(v.perguntaId) && typeof v.valor === 'string';

const isPerguntaResposta = (v: unknown): v is PerguntaResposta =>
  objeto(v) &&
  idValido(v.id) &&
  idValido(v.periodoId) &&
  typeof v.chave === 'string' &&
  typeof v.rotulo === 'string' &&
  (TIPOS_VALOR_CAMPO as readonly unknown[]).includes(v.tipoValor) &&
  typeof v.obrigatorio === 'boolean' &&
  (v.opcoes === null ||
    (Array.isArray(v.opcoes) &&
      v.opcoes.every(
        (o) =>
          objeto(o) &&
          typeof o.chave === 'string' &&
          typeof o.rotulo === 'string',
      )));

export function isFormularioResposta(v: unknown): v is FormularioResposta {
  if (!objeto(v)) return false;
  const r = v.resposta;
  return (
    idValido(v.pesquisaId) &&
    typeof v.titulo === 'string' &&
    (TIPOS_COLETA as readonly unknown[]).includes(v.tipoColeta) &&
    instante(v.abertura) &&
    instante(v.prazo) &&
    (SITUACOES_PESQUISA as readonly unknown[]).includes(v.situacao) &&
    Array.isArray(v.periodos) &&
    v.periodos.every(isPeriodoLinha) &&
    Array.isArray(v.perguntas) &&
    v.perguntas.every(isPerguntaResposta) &&
    (r === null ||
      (objeto(r) &&
        idValido(r.id) &&
        instante(r.respondidaEm) &&
        instanteOuNulo(r.atualizadaEm) &&
        typeof r.canal === 'string' &&
        Array.isArray(r.itens) &&
        r.itens.every(isItemResposta)))
  );
}
