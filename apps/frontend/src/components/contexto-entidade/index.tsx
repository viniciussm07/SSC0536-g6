import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AcessoAtual } from '@ssc0536/common';
import { acessoService } from '@/services/acesso';
import { HttpError } from '@/services/http';
import { escopo } from '@/utils/acesso';
import {
  resolverEntidade,
  type EntidadeContexto,
} from '@/utils/contexto-entidade';
import { gravarContexto, lerContexto } from './armazenamento';
import { ContextoEntidadeContext, type ContextoEntidadeValor } from './context';

export function ContextoEntidadeProvider({
  usuarioId,
  acesso,
  children,
}: {
  usuarioId: number;
  acesso: AcessoAtual;
  children: ReactNode;
}) {
  const escopoLeitura = escopo(acesso, 'empreendimentos', 'consultar');
  const [escolha, setEscolha] = useState<EntidadeContexto | null>(() =>
    lerContexto(usuarioId),
  );
  // Escolhas restauradas (ou de outra aba) são conferidas no servidor antes de valerem.
  const validacao = useQuery({
    queryKey: [
      'empreendimentos',
      usuarioId,
      acesso.revisao,
      'contexto',
      escolha?.id ?? 0,
    ],
    queryFn: ({ signal }) => acessoService.empreendimento(escolha!.id, signal),
    enabled: escopoLeitura === 'todos' && escolha !== null,
    retry: false,
    staleTime: 60_000,
  });
  const invalida =
    validacao.error instanceof HttpError &&
    [403, 404, 409].includes(validacao.error.status);
  const resolvida = resolverEntidade({
    escopoLeitura,
    vinculos: acesso.vinculos,
    escolha,
    invalida,
  });
  const atual = validacao.data;
  const valor: ContextoEntidadeValor = {
    entidade:
      resolvida && atual && escopoLeitura === 'todos'
        ? { ...resolvida, nome: atual.nomeFantasia, cnpj: atual.cnpj }
        : resolvida,
    selecionar: (entidade) => {
      setEscolha(entidade);
      gravarContexto(usuarioId, entidade);
    },
    podeSelecionar: escopoLeitura !== 'nenhum',
    podeVisaoGeral: escopoLeitura === 'todos',
  };
  return (
    <ContextoEntidadeContext.Provider value={valor}>
      {children}
    </ContextoEntidadeContext.Provider>
  );
}
