import { permite } from '@/utils/acesso';
import { useState } from 'react';
import { rotuloIdentificacao } from '@/utils/documento';
import { useContextoEntidade } from '@/hooks/use-contexto-entidade';
import type { EntidadeContexto } from '@/utils/contexto-entidade';
import type { AcessoAtual } from '@ssc0536/common';
import { Paginacao } from '@/components/paginacao';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useDetalhesEmpreendimento } from './hooks';

function Detalhes({
  acesso,
  empreendimento,
}: {
  acesso: AcessoAtual;
  empreendimento: EntidadeContexto;
}) {
  const [paginaInventarios, setPaginaInventarios] = useState(1);
  const [paginaRespostas, setPaginaRespostas] = useState(1);
  const { inventarios, respostas } = useDetalhesEmpreendimento(
    acesso,
    empreendimento.id,
    paginaInventarios,
    paginaRespostas,
  );
  return (
    <section aria-label="Dados do empreendimento" className="space-y-3">
      {permite(acesso, 'inventarios', 'consultar') && (
        <>
          <h4>Inventário</h4>
          {inventarios.isPending ? (
            <p role="status">Carregando inventário…</p>
          ) : inventarios.isError ? (
            <p role="alert">{inventarios.error.message}</p>
          ) : !inventarios.data?.data.length ? (
            <p>Nenhuma versão disponível.</p>
          ) : (
            <ul>
              {inventarios.data.data.map((v) => (
                <li key={v.id}>
                  Desde {v.vigenciaInicio}: {v.totalUh ?? 'desconhecido'} UH,{' '}
                  {v.leitos ?? 'desconhecido'} leitos.
                </li>
              ))}
            </ul>
          )}
          {inventarios.data && (
            <Paginacao
              label="Páginas do inventário"
              page={paginaInventarios}
              totalPages={inventarios.data.meta.totalPages}
              onChange={setPaginaInventarios}
            />
          )}
        </>
      )}
      {permite(acesso, 'respostas', 'consultar') && (
        <>
          <h4>Respostas</h4>
          {respostas.isPending ? (
            <p role="status">Carregando respostas…</p>
          ) : respostas.isError ? (
            <p role="alert">{respostas.error.message}</p>
          ) : !respostas.data?.data.length ? (
            <p>Nenhuma resposta disponível.</p>
          ) : (
            <ul>
              {respostas.data.data.map((r) => (
                <li key={r.id}>
                  {r.titulo} —{' '}
                  {new Date(r.respondidaEm).toLocaleDateString('pt-BR')}
                </li>
              ))}
            </ul>
          )}
          {respostas.data && (
            <Paginacao
              label="Páginas das respostas"
              page={paginaRespostas}
              totalPages={respostas.data.meta.totalPages}
              onChange={setPaginaRespostas}
            />
          )}
        </>
      )}
    </section>
  );
}
export function EmpreendimentoPage() {
  const acesso = useAcessoAtual();
  const { entidade } = useContextoEntidade();
  if (!entidade) return null;
  return (
    <section className="space-y-3" aria-label="Empreendimento selecionado">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{entidade.nome}</h1>
        <p className="text-muted-foreground">
          {rotuloIdentificacao(entidade.cnpj, entidade.id)}
        </p>
      </div>
      <Detalhes
        key={`${acesso.revisao}:${entidade.id}`}
        acesso={acesso}
        empreendimento={entidade}
      />
    </section>
  );
}
