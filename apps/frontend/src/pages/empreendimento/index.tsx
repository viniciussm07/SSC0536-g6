import { permite } from '@/utils/acesso';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import type { EntidadeContexto } from '@/utils/contexto-entidade';
import {
  ESQUEMA_CADASTUR,
  ESQUEMA_CONTATOS,
  ESQUEMA_RESPOSTAS,
  type AcessoAtual,
} from '@ssc0536/common';
import { GradeColecao } from '@/components/grade-colecao';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useDetalheEmpreendimento } from '@/hooks/use-detalhe-empreendimento';
import { SecaoInventario } from './components/inventario';
import { FichaCadastral } from './components/ficha';
import { colunasCadastur, colunasContatos, colunasRespostas } from './colunas';
import { fontesDoEmpreendimento } from './hooks';

function Detalhes({
  acesso,
  empreendimento,
}: {
  acesso: AcessoAtual;
  empreendimento: EntidadeContexto;
}) {
  const fontes = fontesDoEmpreendimento(acesso, empreendimento.id);
  return (
    <section aria-label="Dados do empreendimento" className="space-y-6">
      {permite(acesso, 'empreendimentos', 'consultar') && (
        <>
          <section aria-label="Contatos" className="space-y-2">
            <h2 className="text-lg font-semibold">Contatos</h2>
            <GradeColecao
              id="contatos"
              rotulo="Contatos"
              esquema={ESQUEMA_CONTATOS}
              colunas={colunasContatos}
              getRowId={(c) => String(c.id)}
              mensagemVazia="Nenhum contato encontrado."
              {...fontes.contatos}
            />
          </section>
          <section aria-label="Cadastur" className="space-y-2">
            <h2 className="text-lg font-semibold">Cadastur</h2>
            <GradeColecao
              id="cadastur"
              rotulo="Cadastur"
              esquema={ESQUEMA_CADASTUR}
              colunas={colunasCadastur}
              getRowId={(c) => String(c.id)}
              mensagemVazia="Nenhum registro de Cadastur encontrado."
              {...fontes.cadastur}
            />
          </section>
        </>
      )}
      {permite(acesso, 'inventarios', 'consultar') && (
        <SecaoInventario acesso={acesso} id={empreendimento.id} />
      )}
      {permite(acesso, 'respostas', 'consultar') && (
        <section aria-label="Respostas" className="space-y-2">
          <h2 className="text-lg font-semibold">Respostas</h2>
          <GradeColecao
            id="respostas"
            rotulo="Respostas"
            esquema={ESQUEMA_RESPOSTAS}
            colunas={colunasRespostas}
            getRowId={(r) => String(r.id)}
            mensagemVazia="Nenhuma resposta disponível."
            {...fontes.respostas}
          />
        </section>
      )}
    </section>
  );
}
export function EmpreendimentoPage() {
  const acesso = useAcessoAtual();
  const { entidade } = useContextoEntidade();
  if (!entidade) return null;
  return <Ficha acesso={acesso} entidade={entidade} />;
}

function Ficha({
  acesso,
  entidade,
}: {
  acesso: AcessoAtual;
  entidade: EntidadeContexto;
}) {
  const detalhe = useDetalheEmpreendimento(acesso, entidade.id);
  return (
    <div className="space-y-8">
      {detalhe.isPending ? (
        <p role="status">Carregando cadastro…</p>
      ) : detalhe.isError ? (
        <section className="space-y-3" aria-label="Cadastro">
          <h1 className="font-heading text-[22px] font-extrabold sm:text-[26px]">
            {entidade.nome}
          </h1>
          <p role="alert">{detalhe.error.message}</p>
          <Button onClick={() => void detalhe.refetch()}>
            Tentar novamente
          </Button>
        </section>
      ) : (
        <FichaCadastral
          detalhe={detalhe.data}
          podeEditar={permite(acesso, 'empreendimentos', 'alterar')}
        />
      )}
      <Detalhes
        key={`${acesso.revisao}:${entidade.id}`}
        acesso={acesso}
        empreendimento={entidade}
      />
    </div>
  );
}
