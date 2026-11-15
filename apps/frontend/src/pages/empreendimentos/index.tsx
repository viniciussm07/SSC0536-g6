import { Plus } from 'lucide-react';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { Link } from '@tanstack/react-router';
import {
  ESQUEMA_EMPREENDIMENTOS,
  montarOrdenacao,
  type EmpreendimentoListado,
} from '@ssc0536/common';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useGradeNaUrl } from '@/hooks/use-grade-na-url';
import { permite } from '@/utils/acesso';
import {
  TAMANHO_PAGINA_GRADE,
  condicoesEditaveis,
  consultaDaGrade,
  ordenacaoDaGrade,
} from '@/utils/grade';
import { colunasEmpreendimentos } from './colunas';
import { useListaEmpreendimentos } from './hooks';

const idDaLinha = (e: EmpreendimentoListado) => String(e.id);

export function EmpreendimentosPage() {
  const acesso = useAcessoAtual();
  const grade = useGradeNaUrl('empreendimentos');
  const consulta = consultaDaGrade(grade);
  const lista = useListaEmpreendimentos(acesso, consulta);
  const condicoes = condicoesEditaveis(grade.filter, ESQUEMA_EMPREENDIMENTOS);
  const ordenacao = ordenacaoDaGrade(grade.orderby, ESQUEMA_EMPREENDIMENTOS);

  return (
    <section className="space-y-6" aria-label="Cadastro de empreendimentos">
      <CabecalhoPagina
        titulo="Empreendimentos"
        descricao="Consulte e mantenha o inventário dos meios de hospedagem de Olímpia. Use os filtros de cada coluna para encontrar um cadastro."
      >
        {permite(acesso, 'empreendimentos', 'criar') && (
          <Button asChild>
            <Link to="/empreendimentos/novo">
              <Plus aria-hidden="true" />
              Novo empreendimento
            </Link>
          </Button>
        )}
      </CabecalhoPagina>
      {lista.isPending ? (
        <p role="status">Carregando empreendimentos…</p>
      ) : lista.isError ? (
        <>
          <p role="alert">{lista.error.message}</p>
          <Button onClick={() => void lista.refetch()}>Tentar novamente</Button>
        </>
      ) : (
        <DataTable
          rotulo="Empreendimentos"
          colunas={colunasEmpreendimentos}
          dados={lista.data.data}
          getRowId={idDaLinha}
          colunasADireita={['acoes']}
          mensagemVazia="Nenhum empreendimento encontrado com estes filtros."
          controle={{
            esquema: ESQUEMA_EMPREENDIMENTOS,
            filter: grade.filter,
            condicoes,
            ordenacao,
            page: grade.page,
            pageSize: TAMANHO_PAGINA_GRADE,
            total: lista.data.meta.total ?? lista.data.data.length,
            onFilterChange: grade.setFilter,
            onOrderbyChange: (proxima) =>
              grade.setOrderby(montarOrdenacao(proxima)),
            onPageChange: grade.setPage,
          }}
        />
      )}
    </section>
  );
}
