import {
  LIMITES_EDICOES,
  SITUACOES_DESTINATARIO,
  SITUACOES_PESQUISA,
  STATUS_PESQUISA,
  TIPOS_COLETA,
  type TipoColeta,
} from './edicao.constants.js';
import { TIPOS_VALOR_CAMPO } from './pesquisa.constants.js';
import type {
  AlteracaoPesquisa,
  DestinatarioLinha,
  EntradaPesquisa,
  PesquisaDetalhe,
  PesquisaLinha,
} from './edicao.types.js';
import { isPeriodoLinha } from '../periodos/detalhe.validators.js';
import { dataCivilValida } from '../cadastro/entrada.validators.js';
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
const PADRAO_INSTANTE =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/;

/**
 * Timestamp ISO 8601 com fuso explícito; devolvido normalizado em UTC. Data e hora são
 * conferidas no calendário (sem a rolagem do `Date.parse`, que aceitaria 30/02).
 */
export function lerInstante(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = PADRAO_INSTANTE.exec(v);
  if (!m || !dataCivilValida(m[1])) return null;
  const [hora, minuto, segundo, fusoH, fusoM] = [
    m[2],
    m[3],
    m[4],
    m[6],
    m[7],
  ].map((x) => (x === undefined ? 0 : Number(x)));
  if (hora > 23 || minuto > 59 || segundo > 59 || fusoH > 14 || fusoM > 59)
    return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const CAMPOS_ENTRADA = [
  'titulo',
  'tipoColeta',
  'modeloId',
  'periodoIds',
  'abertura',
  'prazo',
  'segmentoIds',
] as const;

function lerIds(
  v: unknown,
  campo: 'periodoIds' | 'segmentoIds',
  minimo: number,
  maximo: number,
  erros: ErroCampo[],
): number[] | undefined {
  if (!Array.isArray(v) || v.length < minimo || v.length > maximo) {
    erros.push({
      field: campo,
      message: `Informe de ${minimo} a ${maximo} identificadores.`,
    });
    return undefined;
  }
  if (!v.every(idValido)) {
    erros.push({ field: campo, message: 'Identificador inválido.' });
    return undefined;
  }
  if (new Set(v).size !== v.length) {
    erros.push({ field: campo, message: 'Identificador repetido.' });
    return undefined;
  }
  return [...v].sort((a, b) => a - b);
}

function lerCampos(
  origem: Objeto,
  erros: ErroCampo[],
  permitidos: readonly string[],
): AlteracaoPesquisa {
  for (const chave of Object.keys(origem))
    if (!permitidos.includes(chave))
      erros.push({ field: chave, message: 'Campo não permitido.' });
  const saida: AlteracaoPesquisa = {};
  if (origem.titulo !== undefined) {
    const t = typeof origem.titulo === 'string' ? origem.titulo.trim() : '';
    if (!t || t.length > LIMITES_EDICOES.titulo)
      erros.push({
        field: 'titulo',
        message: `Informe um título de 1 a ${LIMITES_EDICOES.titulo} caracteres.`,
      });
    else saida.titulo = t;
  }
  if (origem.tipoColeta !== undefined) {
    if (
      typeof origem.tipoColeta !== 'string' ||
      !(TIPOS_COLETA as readonly string[]).includes(origem.tipoColeta)
    )
      erros.push({
        field: 'tipoColeta',
        message: 'Use expectativa ou consolidado.',
      });
    else saida.tipoColeta = origem.tipoColeta as TipoColeta;
  }
  if (origem.modeloId !== undefined) {
    if (!idValido(origem.modeloId))
      erros.push({ field: 'modeloId', message: 'Modelo inválido.' });
    else saida.modeloId = origem.modeloId;
  }
  if (origem.periodoIds !== undefined) {
    const ids = lerIds(
      origem.periodoIds,
      'periodoIds',
      LIMITES_EDICOES.periodosMinimo,
      LIMITES_EDICOES.periodosMaximo,
      erros,
    );
    if (ids) saida.periodoIds = ids;
  }
  if (origem.segmentoIds !== undefined) {
    const ids = lerIds(
      origem.segmentoIds,
      'segmentoIds',
      0,
      LIMITES_EDICOES.segmentosMaximo,
      erros,
    );
    if (ids) saida.segmentoIds = ids;
  }
  for (const campo of ['abertura', 'prazo'] as const) {
    if (origem[campo] === undefined) continue;
    const valor = lerInstante(origem[campo]);
    if (!valor)
      erros.push({
        field: campo,
        message:
          'Use data e hora ISO 8601 com fuso (ex.: 2026-12-01T03:00:00Z).',
      });
    else saida[campo] = valor;
  }
  if (origem.motivo !== undefined) {
    const m = typeof origem.motivo === 'string' ? origem.motivo.trim() : null;
    if (m === null || m.length > LIMITES_EDICOES.motivo)
      erros.push({
        field: 'motivo',
        message: `O motivo tem até ${LIMITES_EDICOES.motivo} caracteres.`,
      });
    else if (m) saida.motivo = m;
  }
  return saida;
}

function conferirJanela(
  abertura: string | undefined,
  prazo: string | undefined,
  erros: ErroCampo[],
) {
  if (abertura && prazo && Date.parse(prazo) <= Date.parse(abertura))
    erros.push({
      field: 'prazo',
      message: 'O prazo deve ser posterior à abertura.',
    });
}

/** Entrada de `POST /pesquisas` (rascunho). */
export function validarEntradaPesquisa(
  corpo: unknown,
): ResultadoEntrada<EntradaPesquisa> {
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: 'corpo', message: 'Envie um objeto JSON.' }],
    };
  const erros: ErroCampo[] = [];
  const dados = lerCampos(corpo, erros, CAMPOS_ENTRADA);
  for (const campo of CAMPOS_ENTRADA)
    if (corpo[campo] === undefined && campo !== 'segmentoIds')
      erros.push({ field: campo, message: 'Campo obrigatório.' });
  conferirJanela(dados.abertura, dados.prazo, erros);
  if (erros.length) return { valido: false, erros };
  return {
    valido: true,
    data: {
      titulo: dados.titulo!,
      tipoColeta: dados.tipoColeta!,
      modeloId: dados.modeloId!,
      periodoIds: dados.periodoIds!,
      abertura: dados.abertura!,
      prazo: dados.prazo!,
      segmentoIds: dados.segmentoIds ?? [],
    },
  };
}

/** Entrada de `PUT /pesquisas/:id`; as regras por estado ficam no servidor. */
export function validarAlteracaoPesquisa(
  corpo: unknown,
): ResultadoEntrada<AlteracaoPesquisa> {
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: 'corpo', message: 'Envie um objeto JSON.' }],
    };
  const erros: ErroCampo[] = [];
  const dados = lerCampos(corpo, erros, [...CAMPOS_ENTRADA, 'motivo']);
  conferirJanela(dados.abertura, dados.prazo, erros);
  if (!erros.length && Object.keys(dados).length === 0)
    erros.push({ field: 'corpo', message: 'Nada a alterar.' });
  return erros.length
    ? { valido: false, erros }
    : { valido: true, data: dados };
}

const instanteOuNulo = (v: unknown) =>
  v === null || (typeof v === 'string' && !Number.isNaN(Date.parse(v)));
const contagem = (v: unknown) =>
  v === null || (Number.isInteger(v) && (v as number) >= 0);

export function isPesquisaLinha(v: unknown): v is PesquisaLinha {
  return (
    objeto(v) &&
    idValido(v.id) &&
    typeof v.titulo === 'string' &&
    (TIPOS_COLETA as readonly unknown[]).includes(v.tipoColeta) &&
    (STATUS_PESQUISA as readonly unknown[]).includes(v.status) &&
    typeof v.abertura === 'string' &&
    !Number.isNaN(Date.parse(v.abertura)) &&
    typeof v.prazo === 'string' &&
    !Number.isNaN(Date.parse(v.prazo)) &&
    idValido(v.modeloId) &&
    Number.isInteger(v.modeloVersao)
  );
}

export function isPesquisaDetalhe(v: unknown): v is PesquisaDetalhe {
  if (!isPesquisaLinha(v)) return false;
  const d = v as unknown as Objeto;
  const p = d.participacao;
  return (
    (SITUACOES_PESQUISA as readonly unknown[]).includes(d.situacao) &&
    typeof d.modeloNome === 'string' &&
    Array.isArray(d.segmentoIds) &&
    d.segmentoIds.every(idValido) &&
    typeof d.criadaEm === 'string' &&
    instanteOuNulo(d.abertaEm) &&
    instanteOuNulo(d.encerradaEm) &&
    Array.isArray(d.periodos) &&
    d.periodos.every(isPeriodoLinha) &&
    Array.isArray(d.perguntas) &&
    d.perguntas.every(
      (q) =>
        objeto(q) &&
        idValido(q.id) &&
        idValido(q.periodoId) &&
        idValido(q.campoId) &&
        typeof q.chave === 'string' &&
        typeof q.rotulo === 'string' &&
        (TIPOS_VALOR_CAMPO as readonly unknown[]).includes(q.tipoValor) &&
        typeof q.obrigatorio === 'boolean',
    ) &&
    objeto(p) &&
    contagem(p.elegiveis) &&
    contagem(p.destinatarios) &&
    contagem(p.respondentes) &&
    p.respondentes !== null &&
    contagem(p.pendentes)
  );
}

export function isDestinatarioLinha(v: unknown): v is DestinatarioLinha {
  return (
    objeto(v) &&
    idValido(v.empreendimentoId) &&
    typeof v.nomeFantasia === 'string' &&
    (SITUACOES_DESTINATARIO as readonly unknown[]).includes(
      v.situacaoResposta,
    ) &&
    instanteOuNulo(v.respondidaEm)
  );
}
