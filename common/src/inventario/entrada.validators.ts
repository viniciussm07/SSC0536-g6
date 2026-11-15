import { normalizarCapacidadeInventario } from './capacidade.validators.js';
import { dataCivilValida } from '../cadastro/entrada.validators.js';
import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';
import { SITUACOES_CONFERENCIA_INVENTARIO } from '../odata/esquemas.constants.js';
import {
  CAMPOS_CAPACIDADE,
  LIMITES_INVENTARIO,
  TIPOS_ALTERACAO_INVENTARIO,
} from './versao.constants.js';
import type {
  CampoCapacidade,
  EntradaConferenciaInventario,
  EntradaVersaoInventario,
  SituacaoConferenciaInventario,
  TipoAlteracaoInventario,
} from './versao.types.js';

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const corpoInvalido = (): ResultadoEntrada<never> => ({
  valido: false,
  erros: [{ field: 'corpo', message: 'Objeto esperado.' }],
});

function motivoValido(
  origem: Objeto,
  erros: ErroCampo[],
  obrigatorio: boolean,
) {
  const v = origem.motivo;
  if (v === undefined || v === null) {
    if (obrigatorio)
      erros.push({ field: 'motivo', message: 'Informe o motivo da correção.' });
    return undefined;
  }
  if (
    typeof v !== 'string' ||
    v.trim() === '' ||
    v.trim().length > LIMITES_INVENTARIO.motivo
  ) {
    erros.push({
      field: 'motivo',
      message: `Use de 1 a ${LIMITES_INVENTARIO.motivo} caracteres.`,
    });
    return undefined;
  }
  return v.trim();
}

/**
 * Estrutura da entrada de uma nova versão. A capacidade segue os estados do contrato: valor
 * informado, `null` (desconhecido), `{ estado: 'nao_se_aplica' }`; campo omitido herda da
 * versão-base. Respostas de catálogo são validadas contra o catálogo no servidor.
 */
export function validarEntradaVersaoInventario(
  corpo: unknown,
): ResultadoEntrada<EntradaVersaoInventario> {
  if (!objeto(corpo)) return corpoInvalido();
  const erros: ErroCampo[] = [];
  for (const chave of Object.keys(corpo))
    if (
      ![
        'tipoAlteracao',
        'vigenciaInicio',
        'vigenciaFim',
        'corrigeId',
        'motivo',
        'capacidade',
        'itens',
      ].includes(chave)
    )
      erros.push({ field: chave, message: 'Campo não reconhecido.' });

  const tipo = corpo.tipoAlteracao;
  if (
    typeof tipo !== 'string' ||
    !(TIPOS_ALTERACAO_INVENTARIO as readonly string[]).includes(tipo)
  )
    erros.push({
      field: 'tipoAlteracao',
      message: `Use: ${TIPOS_ALTERACAO_INVENTARIO.join(', ')}.`,
    });
  const data: Partial<EntradaVersaoInventario> = {
    tipoAlteracao: tipo as TipoAlteracaoInventario,
  };

  if (tipo === 'mudanca_real') {
    if (corpo.corrigeId !== undefined)
      erros.push({
        field: 'corrigeId',
        message: 'Só a correção indica a versão corrigida.',
      });
    if (!dataCivilValida(corpo.vigenciaInicio))
      erros.push({
        field: 'vigenciaInicio',
        message: 'Informe a data de início (AAAA-MM-DD).',
      });
    else data.vigenciaInicio = corpo.vigenciaInicio;
    if (corpo.vigenciaFim !== undefined && corpo.vigenciaFim !== null) {
      if (!dataCivilValida(corpo.vigenciaFim))
        erros.push({
          field: 'vigenciaFim',
          message:
            'Informe uma data de fim válida (AAAA-MM-DD) ou deixe em branco.',
        });
      else data.vigenciaFim = corpo.vigenciaFim;
    } else if (corpo.vigenciaFim === null) data.vigenciaFim = null;
  } else if (tipo === 'correcao') {
    if (
      typeof corpo.corrigeId !== 'number' ||
      !Number.isSafeInteger(corpo.corrigeId) ||
      corpo.corrigeId < 1
    )
      erros.push({
        field: 'corrigeId',
        message: 'Informe a versão que será corrigida.',
      });
    else data.corrigeId = corpo.corrigeId;
    for (const campo of ['vigenciaInicio', 'vigenciaFim'])
      if (corpo[campo] !== undefined)
        erros.push({
          field: campo,
          message: 'A correção mantém a vigência da versão corrigida.',
        });
  }
  const motivo = motivoValido(corpo, erros, tipo === 'correcao');
  if (motivo) data.motivo = motivo;

  // Capacidade: reaproveita o normalizador do contrato e acrescenta o prefixo do campo.
  if (corpo.capacidade !== undefined && !objeto(corpo.capacidade))
    erros.push({ field: 'capacidade', message: 'Objeto esperado.' });
  const capacidade = normalizarCapacidadeInventario(
    objeto(corpo.capacidade) ? corpo.capacidade : {},
  );
  if (!capacidade.valido)
    for (const erro of capacidade.erros)
      erros.push({
        field: erro.field ? `capacidade.${erro.field}` : 'capacidade',
        message: erro.message,
      });
  else
    data.capacidade = capacidade.data as EntradaVersaoInventario['capacidade'];

  if (corpo.itens !== undefined && !Array.isArray(corpo.itens))
    erros.push({ field: 'itens', message: 'Informe uma lista de respostas.' });
  data.itens = Array.isArray(corpo.itens) ? corpo.itens : [];

  return erros.length
    ? { valido: false, erros }
    : { valido: true, data: data as EntradaVersaoInventario };
}

export function validarEntradaConferenciaInventario(
  corpo: unknown,
): ResultadoEntrada<EntradaConferenciaInventario> {
  if (!objeto(corpo)) return corpoInvalido();
  const erros: ErroCampo[] = [];
  for (const chave of Object.keys(corpo))
    if (!['situacaoConferencia', 'motivo'].includes(chave))
      erros.push({ field: chave, message: 'Campo não reconhecido.' });
  const situacao = corpo.situacaoConferencia;
  if (
    typeof situacao !== 'string' ||
    !(SITUACOES_CONFERENCIA_INVENTARIO as readonly string[]).includes(situacao)
  )
    erros.push({
      field: 'situacaoConferencia',
      message: `Use: ${SITUACOES_CONFERENCIA_INVENTARIO.join(', ')}.`,
    });
  const motivo = motivoValido(corpo, erros, false);
  return erros.length
    ? { valido: false, erros }
    : {
        valido: true,
        data: {
          situacaoConferencia: situacao as SituacaoConferenciaInventario,
          ...(motivo ? { motivo } : {}),
        },
      };
}

export const camposCapacidade: readonly CampoCapacidade[] = CAMPOS_CAPACIDADE;
