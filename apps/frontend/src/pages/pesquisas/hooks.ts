import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcessoAtual,
  AlteracaoPesquisa,
  EntradaPesquisa,
} from '@ssc0536/common';
import { edicoesService } from '@/services/edicoes';
import { modelosPesquisaService } from '@/services/pesquisas';
import { periodosService } from '@/services/periodos';

const RAIZ = 'pesquisas';

/** Mutações do ciclo; todas invalidam grade, detalhe e destinatários das edições. */
export function useEdicaoMutations() {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({ queryKey: [RAIZ] });
  };
  const criar = useMutation({
    mutationFn: (entrada: EntradaPesquisa) => edicoesService.criar(entrada),
    onSuccess: atualizar,
  });
  const alterar = useMutation({
    mutationFn: ({
      id,
      alteracao,
    }: {
      id: number;
      alteracao: AlteracaoPesquisa;
    }) => edicoesService.alterar(id, alteracao),
    onSuccess: atualizar,
  });
  const abrir = useMutation({
    mutationFn: (id: number) => edicoesService.abrir(id),
    onSuccess: atualizar,
  });
  const encerrar = useMutation({
    mutationFn: (id: number) => edicoesService.encerrar(id),
    onSuccess: atualizar,
  });
  const excluir = useMutation({
    mutationFn: (id: number) => edicoesService.excluir(id),
    onSuccess: atualizar,
  });
  return { criar, alterar, abrir, encerrar, excluir };
}

/** Detalhe com situação no relógio do servidor e contagens de participação. */
export function useEdicaoDetalhe(acesso: AcessoAtual, id?: number) {
  return useQuery({
    queryKey: [RAIZ, 'detalhe', acesso.usuarioId, acesso.revisao, id],
    queryFn: ({ signal }) => edicoesService.detalhe(id as number, signal),
    enabled: id !== undefined,
    retry: false,
  });
}

/** Opções do formulário: modelos e períodos (até 100, os mais recentes primeiro). */
export function useOpcoesEdicao(acesso: AcessoAtual) {
  const modelos = useQuery({
    queryKey: ['modelos', 'opcoes', acesso.usuarioId, acesso.revisao],
    queryFn: ({ signal }) =>
      modelosPesquisaService.listar(
        { top: 100, skip: 0, orderby: 'nome asc', count: false },
        signal,
      ),
    retry: false,
  });
  const periodos = useQuery({
    queryKey: ['periodos', 'opcoes', acesso.usuarioId, acesso.revisao],
    queryFn: ({ signal }) =>
      periodosService.listar(
        { top: 100, skip: 0, orderby: 'dataInicio desc', count: false },
        signal,
      ),
    retry: false,
  });
  return { modelos, periodos };
}
