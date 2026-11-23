import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcessoAtual,
  AlteracaoColetaDiaria,
  AlteracaoParametroCalculo,
  AlteracaoRhcPeriodo,
  ColecaoOData,
} from '@ssc0536/common';
import { cadastroService } from '@/services/cadastro';
import { diariasService } from '@/services/diarias';
import type { ConsultaColecao } from '@/services/odata';
import { periodosService } from '@/services/periodos';

/** Catálogos de apoio podem passar de uma página; o seletor precisa da lista completa. */
async function carregarTudo<T>(
  buscar: (consulta: ConsultaColecao) => Promise<ColecaoOData<T>>,
): Promise<T[]> {
  const dados: T[] = [];
  for (;;) {
    const pagina = await buscar({
      top: 100,
      skip: dados.length,
      count: true,
    });
    dados.push(...pagina.data);
    if (
      !pagina.data.length ||
      (pagina.meta.total !== undefined && dados.length >= pagina.meta.total)
    )
      return dados;
  }
}

/** Qualquer mudança nas fontes invalida as três grades da página. */
export function useDiariasMutations() {
  const client = useQueryClient();
  const atualizar = async () => {
    await client.invalidateQueries({ queryKey: ['diarias'] });
  };
  const criarColeta = useMutation({
    mutationFn: diariasService.criarColeta,
    onSuccess: atualizar,
  });
  const alterarColeta = useMutation({
    mutationFn: ({
      id,
      alteracao,
    }: {
      id: number;
      alteracao: AlteracaoColetaDiaria;
    }) => diariasService.alterarColeta(id, alteracao),
    onSuccess: atualizar,
  });
  const criarRhc = useMutation({
    mutationFn: diariasService.criarRhc,
    onSuccess: atualizar,
  });
  const alterarRhc = useMutation({
    mutationFn: ({
      id,
      alteracao,
    }: {
      id: number;
      alteracao: AlteracaoRhcPeriodo;
    }) => diariasService.alterarRhc(id, alteracao),
    onSuccess: atualizar,
  });
  const criarParametro = useMutation({
    mutationFn: diariasService.criarParametro,
    onSuccess: atualizar,
  });
  const alterarParametro = useMutation({
    mutationFn: ({
      id,
      alteracao,
    }: {
      id: number;
      alteracao: AlteracaoParametroCalculo;
    }) => diariasService.alterarParametro(id, alteracao),
    onSuccess: atualizar,
  });
  return {
    criarColeta,
    alterarColeta,
    criarRhc,
    alterarRhc,
    criarParametro,
    alterarParametro,
  };
}

/** Catálogos de apoio para os formulários; consultas só quando há permissão. */
export function useApoioDiarias(acesso: AcessoAtual) {
  const empreendimentos = useQuery({
    queryKey: ['diarias', 'empreendimentos', acesso.usuarioId, acesso.revisao],
    queryFn: ({ signal }) =>
      carregarTudo((consulta) => cadastroService.listar(consulta, signal)),
    retry: false,
  });
  const periodos = useQuery({
    queryKey: ['diarias', 'periodos', acesso.usuarioId, acesso.revisao],
    queryFn: ({ signal }) =>
      carregarTudo((consulta) => periodosService.listar(consulta, signal)),
    retry: false,
  });
  return { empreendimentos, periodos };
}
