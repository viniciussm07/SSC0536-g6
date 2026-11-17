import { useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-form';
import {
  ESQUEMA_INDICADORES,
  montarFiltro,
  type CondicaoColuna,
  type IndicadorConsulta,
  type TipoPeriodo,
} from '@ssc0536/common';
import { useAppForm } from '@/hooks/use-app-form';
import { indicadoresService } from '@/services/indicadores';
import {
  indicadoresDisponiveis,
  metodosDisponiveis,
  periodosDasLinhas,
  recortesDoPeriodo,
  serieDoRecorte,
} from '@/utils/indicadores';

export interface FiltrosPainel {
  indicadorId: string;
  metodo: string;
  tipoColeta: 'ambos' | 'consolidado' | 'expectativa';
  recorte: string;
  periodoTipo: TipoPeriodo;
  inicio: string;
  fim: string;
  referencia: string;
}

const FILTROS_INICIAIS: FiltrosPainel = {
  indicadorId: '',
  metodo: '',
  tipoColeta: 'ambos',
  recorte: 'total',
  periodoTipo: 'mes',
  inicio: '',
  fim: '',
  referencia: '',
};

/** Erro do intervalo de datas; vazio significa sem limite naquele lado. */
export function erroIntervalo(inicio: string, fim: string) {
  return inicio && fim && fim < inicio
    ? 'A data final deve ser igual ou posterior à inicial.'
    : undefined;
}

/** `$filter` do servidor: tipo de período e intervalo (início e fim do período dentro dele). */
export function filtroDoServidor(
  f: Pick<FiltrosPainel, 'periodoTipo' | 'inicio' | 'fim'>,
) {
  const condicoes: CondicaoColuna[] = [
    { campo: 'periodoTipo', operador: 'igual', valor: f.periodoTipo },
  ];
  if (f.inicio)
    condicoes.push({
      campo: 'periodoInicio',
      operador: 'maiorOuIgual',
      valor: f.inicio,
    });
  if (f.fim)
    condicoes.push({
      campo: 'periodoFim',
      operador: 'menorOuIgual',
      valor: f.fim,
    });
  const filtro = montarFiltro(condicoes, ESQUEMA_INDICADORES);
  return filtro.valido ? filtro.data : null;
}

export function useFiltrosPainel() {
  return useAppForm({ defaultValues: FILTROS_INICIAIS });
}
export type FormFiltrosPainel = ReturnType<typeof useFiltrosPainel>;

/**
 * Busca os resultados liberados no intervalo e seleciona indicador, método, recorte e período
 * de referência. Seleções inválidas (fora das opções recebidas) voltam ao padrão.
 */
export function usePainelIndicadores(
  form: FormFiltrosPainel,
  identidade: { usuarioId: number; revisao: number },
  habilitado: boolean,
) {
  const f = useStore(form.store, (s) => s.values);
  const intervaloInvalido = Boolean(erroIntervalo(f.inicio, f.fim));
  const filtro = intervaloInvalido ? null : filtroDoServidor(f);
  const consulta = useQuery({
    queryKey: [
      'indicadores',
      'painel',
      identidade.usuarioId,
      identidade.revisao,
      filtro,
    ],
    queryFn: ({ signal }) =>
      indicadoresService.serie(filtro ?? undefined, signal),
    enabled: habilitado && filtro !== null,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const linhas: IndicadorConsulta[] = consulta.data?.linhas ?? [];
  const indicadores = indicadoresDisponiveis(linhas);
  const indicador =
    indicadores.find((i) => String(i.id) === f.indicadorId) ?? indicadores[0];
  const doIndicador = indicador
    ? linhas.filter((l) => l.indicadorId === indicador.id)
    : [];
  const metodos = metodosDisponiveis(doIndicador);
  const metodo = metodos.includes(f.metodo) ? f.metodo : metodos[0];
  const selecionadas = doIndicador.filter((l) => l.metodo === metodo);
  const periodos = periodosDasLinhas(selecionadas);
  const referencia =
    periodos.find((p) => String(p.id) === f.referencia) ?? periodos.at(-1);

  // Mantém os campos do formulário iguais à seleção efetiva quando as opções mudam.
  const efetivos = {
    indicadorId: indicador ? String(indicador.id) : '',
    metodo: metodo ?? '',
    referencia: referencia ? String(referencia.id) : '',
  };
  useEffect(() => {
    for (const [campo, valor] of Object.entries(efetivos) as [
      'indicadorId' | 'metodo' | 'referencia',
      string,
    ][])
      if (form.getFieldValue(campo) !== valor) form.setFieldValue(campo, valor);
  });

  return {
    filtros: f,
    consulta,
    intervaloInvalido,
    indicadores,
    indicador,
    metodos,
    metodo,
    periodos,
    referencia,
    serie: serieDoRecorte(selecionadas, periodos, f.recorte),
    recortes: referencia ? recortesDoPeriodo(selecionadas, referencia.id) : [],
  };
}
