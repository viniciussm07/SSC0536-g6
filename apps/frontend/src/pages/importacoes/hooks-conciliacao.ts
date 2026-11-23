import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EntradaConfirmacao,
  EntradaConflito,
  EntradaDecisao,
  EntradaDestino,
} from '@ssc0536/common';
import { cadastroService } from '@/services/cadastro';
import { edicoesService } from '@/services/edicoes';
import { importacoesService } from '@/services/importacoes';

export const chavePlano = (id: number) => ['importacoes', 'plano', id] as const;

export function usePlano(id: number) {
  return useQuery({
    queryKey: chavePlano(id),
    queryFn: ({ signal }) => importacoesService.plano(id, signal),
    retry: false,
  });
}

/** Edições consolidadas candidatas ao destino; a tabulação só alimenta o tipo consolidado. */
export function useEdicoesConsolidadas(habilitado: boolean) {
  return useQuery({
    queryKey: ['importacoes', 'edicoes-consolidadas'],
    enabled: habilitado,
    retry: false,
    queryFn: ({ signal }) =>
      edicoesService.listar(
        {
          top: 100,
          skip: 0,
          count: false,
          filter: "tipoColeta eq 'consolidado' and status ne 'rascunho'",
          orderby: 'abertura desc',
        },
        signal,
      ),
  });
}

export function useEdicaoPerguntas(pesquisaId: number | undefined) {
  return useQuery({
    queryKey: ['importacoes', 'edicao', pesquisaId],
    enabled: pesquisaId !== undefined,
    retry: false,
    queryFn: ({ signal }) =>
      edicoesService.detalhe(pesquisaId as number, signal),
  });
}

/** Catálogo de seleção do cadastro (até 100 por ordem alfabética; candidatos vêm do servidor). */
export function useEmpreendimentosOpcoes(habilitado: boolean) {
  return useQuery({
    queryKey: ['importacoes', 'empreendimentos-opcoes'],
    enabled: habilitado,
    retry: false,
    queryFn: ({ signal }) =>
      cadastroService.listar(
        { top: 100, skip: 0, count: false, orderby: 'nomeFantasia asc' },
        signal,
      ),
  });
}

/** Toda decisão altera plano, lote e lista; o servidor continua sendo a fonte do estado. */
export function useConciliacaoMutations(id: number) {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({ queryKey: ['importacoes'] });
  };
  return {
    destino: useMutation({
      mutationFn: (entrada: EntradaDestino) =>
        importacoesService.definirDestino(id, entrada),
      onSuccess: atualizar,
    }),
    decidir: useMutation({
      mutationFn: ({
        linhaId,
        entrada,
      }: {
        linhaId: number;
        entrada: EntradaDecisao;
      }) => importacoesService.decidir(id, linhaId, entrada),
      onSuccess: atualizar,
    }),
    remover: useMutation({
      mutationFn: (linhaId: number) =>
        importacoesService.removerDecisao(id, linhaId),
      onSuccess: atualizar,
    }),
    conflito: useMutation({
      mutationFn: ({
        linhaId,
        entrada,
      }: {
        linhaId: number;
        entrada: EntradaConflito;
      }) => importacoesService.resolverConflito(id, linhaId, entrada),
      onSuccess: atualizar,
    }),
    confirmar: useMutation({
      mutationFn: (entrada: EntradaConfirmacao) =>
        importacoesService.confirmar(id, entrada),
      // Falha de totais (409) também recarrega o plano para a pessoa rever o que mudou.
      onSettled: atualizar,
    }),
  };
}
