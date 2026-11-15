import type {
  CapacidadeInventario,
  InventarioResumo,
  VersaoInventarioDetalhe,
} from '@ssc0536/common';

const informado = <T>(valor: T) => ({ estado: 'informado' as const, valor });
const desconhecido = { estado: 'desconhecido' as const, valor: null };

export function capacidadeFicticia(
  extra: Partial<CapacidadeInventario> = {},
): CapacidadeInventario {
  return {
    totalUh: informado(10),
    leitos: informado(20),
    maxLeitosPorUh: desconhecido,
    uhsPcd: { estado: 'nao_se_aplica', valor: null },
    funcFixos: informado(0),
    funcTemporarios: desconhecido,
    funciona24h: informado(false),
    checkin: informado('14:00'),
    checkout: informado('11:00'),
    ...extra,
  };
}

export function versaoFicticia(
  extra: Partial<VersaoInventarioDetalhe> = {},
): VersaoInventarioDetalhe {
  return {
    id: 5,
    empreendimentoId: 10,
    vigenciaInicio: '2026-04-01',
    vigenciaFim: null,
    tipoAlteracao: 'mudanca_real',
    situacaoConferencia: 'pendente',
    motivo: null,
    criadaEm: '2026-04-01T12:00:00.000Z',
    autor: 'Pessoa fictícia',
    substituidaPorId: null,
    capacidade: capacidadeFicticia(),
    itens: [],
    ...extra,
  };
}

export function linhaFicticia(
  extra: Partial<InventarioResumo> = {},
): InventarioResumo {
  return {
    id: 5,
    vigenciaInicio: '2026-04-01',
    vigenciaFim: null,
    totalUh: 10,
    leitos: 20,
    situacaoConferencia: 'pendente',
    tipoAlteracao: 'mudanca_real',
    criadaEm: '2026-04-01T12:00:00.000Z',
    autor: 'Pessoa fictícia',
    substituidaPorId: null,
    ...extra,
  };
}
