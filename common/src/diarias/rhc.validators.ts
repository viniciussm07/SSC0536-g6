import type {
  ErroCampo,
  ResultadoEntrada,
} from '../cadastro/cadastro.types.js';
import {
  LIMITES_DIARIAS,
  SITUACOES_CONFERENCIA_FONTE,
  type SituacaoConferenciaFonte,
} from './fontes.constants.js';
import {
  inteiroNaoNegativo,
  inteiroPositivo,
  objeto,
  recusarDesconhecidos,
  textoOpcional,
  type Objeto,
} from './fontes.validators.js';
import type { AlteracaoRhcPeriodo, EntradaRhcPeriodo } from './rhc.types.js';

const CAMPOS = ['periodoId', 'qtdRhc', 'leitos', 'observacao'] as const;
const CAMPOS_ALTERACAO = [...CAMPOS, 'situacaoConferencia'] as const;

function lerQuantidade(
  origem: Objeto,
  chave: 'qtdRhc' | 'leitos',
  erros: ErroCampo[],
): number | null {
  const valor = origem[chave];
  if (!inteiroNaoNegativo(valor, LIMITES_DIARIAS.leitosMaximo)) {
    erros.push({
      field: chave,
      message: `Informe um inteiro entre 0 e ${LIMITES_DIARIAS.leitosMaximo}.`,
    });
    return null;
  }
  return valor;
}

export function validarEntradaRhcPeriodo(
  corpo: unknown,
): ResultadoEntrada<EntradaRhcPeriodo> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo inválido.' }],
    };
  recusarDesconhecidos(corpo, CAMPOS, erros);
  if (!inteiroPositivo(corpo.periodoId))
    erros.push({ field: 'periodoId', message: 'Informe o período.' });
  const qtdRhc = lerQuantidade(corpo, 'qtdRhc', erros);
  const leitos = lerQuantidade(corpo, 'leitos', erros);
  const saida: Objeto = {};
  textoOpcional(corpo, 'observacao', LIMITES_DIARIAS.observacao, saida, erros);
  if (erros.length) return { valido: false, erros };
  return {
    valido: true,
    data: {
      periodoId: corpo.periodoId as number,
      qtdRhc: qtdRhc as number,
      leitos: leitos as number,
      ...(saida.observacao !== undefined
        ? { observacao: saida.observacao as string | null }
        : {}),
    },
  };
}

export function validarAlteracaoRhcPeriodo(
  corpo: unknown,
): ResultadoEntrada<AlteracaoRhcPeriodo> {
  const erros: ErroCampo[] = [];
  if (!objeto(corpo))
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo inválido.' }],
    };
  recusarDesconhecidos(corpo, CAMPOS_ALTERACAO, erros);
  const saida: Objeto = {};
  if (corpo.periodoId !== undefined) {
    if (!inteiroPositivo(corpo.periodoId))
      erros.push({ field: 'periodoId', message: 'Informe o período.' });
    else saida.periodoId = corpo.periodoId;
  }
  if (corpo.qtdRhc !== undefined) {
    const valor = lerQuantidade(corpo, 'qtdRhc', erros);
    if (valor !== null) saida.qtdRhc = valor;
  }
  if (corpo.leitos !== undefined) {
    const valor = lerQuantidade(corpo, 'leitos', erros);
    if (valor !== null) saida.leitos = valor;
  }
  textoOpcional(corpo, 'observacao', LIMITES_DIARIAS.observacao, saida, erros);
  if (corpo.situacaoConferencia !== undefined) {
    if (
      !(SITUACOES_CONFERENCIA_FONTE as readonly unknown[]).includes(
        corpo.situacaoConferencia,
      )
    )
      erros.push({
        field: 'situacaoConferencia',
        message: `Use: ${SITUACOES_CONFERENCIA_FONTE.join(', ')}.`,
      });
    else
      saida.situacaoConferencia =
        corpo.situacaoConferencia as SituacaoConferenciaFonte;
  }
  if (erros.length) return { valido: false, erros };
  if (!Object.keys(saida).length)
    return {
      valido: false,
      erros: [
        { field: '', message: 'Informe ao menos um campo para alterar.' },
      ],
    };
  return { valido: true, data: saida as AlteracaoRhcPeriodo };
}
