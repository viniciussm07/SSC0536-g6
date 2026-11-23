import { useQuery } from '@tanstack/react-query';
import type { ConsultaPainel, TipoColeta } from '@ssc0536/common';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { painelService } from '@/services/painel';

/** O consumo muda quando o perfil, a revisão do acesso ou um cálculo é publicado. */
export function usePainelOpcoes() {
  const acesso = useAcessoAtual();
  return useQuery({
    queryKey: [
      'indicadores',
      'painel',
      'opcoes',
      acesso.usuarioId,
      acesso.revisao,
    ],
    queryFn: ({ signal }) => painelService.opcoes(signal),
    retry: false,
  });
}

export function usePainel(consulta: ConsultaPainel | null) {
  const acesso = useAcessoAtual();
  return useQuery({
    queryKey: [
      'indicadores',
      'painel',
      acesso.usuarioId,
      acesso.revisao,
      consulta?.periodoId,
      consulta?.tipoColeta,
      consulta?.comparacaoPeriodoId ?? null,
    ],
    queryFn: ({ signal }) =>
      painelService.consultar(consulta as ConsultaPainel, signal),
    enabled: consulta !== null,
    retry: false,
  });
}

/** Evolução nos períodos recentes; alimenta os gráficos de tendência. */
export function usePainelSerie(tipoColeta: TipoColeta | undefined) {
  const acesso = useAcessoAtual();
  return useQuery({
    queryKey: [
      'indicadores',
      'painel',
      'serie',
      acesso.usuarioId,
      acesso.revisao,
      tipoColeta,
    ],
    queryFn: ({ signal }) =>
      painelService.serie(tipoColeta as TipoColeta, signal),
    enabled: tipoColeta !== undefined,
    retry: false,
  });
}

/** Participação por edição; só para quem pode consultar pesquisas. */
export function usePainelParticipacao(
  tipoColeta: TipoColeta | undefined,
  habilitado: boolean,
) {
  const acesso = useAcessoAtual();
  return useQuery({
    queryKey: [
      'indicadores',
      'painel',
      'participacao',
      acesso.usuarioId,
      acesso.revisao,
      tipoColeta,
    ],
    queryFn: ({ signal }) =>
      painelService.participacao(tipoColeta as TipoColeta, signal),
    enabled: habilitado && tipoColeta !== undefined,
    retry: false,
  });
}
