import { permite } from '@/utils/acesso';
import { useState } from 'react';
import type { AcessoAtual, EmpreendimentoResumo } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { Paginacao } from '@/components/paginacao';
import { useEmpreendimentos, useDetalhesEmpreendimento } from '../../hooks';

function Detalhes({
  acesso,
  empreendimento,
}: {
  acesso: AcessoAtual;
  empreendimento: EmpreendimentoResumo;
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
    <section
      aria-label="Empreendimento selecionado"
      className="space-y-3 rounded-md border p-4"
    >
      <h3 className="font-semibold">{empreendimento.nomeFantasia}</h3>
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
export function EmpreendimentosPainel({ acesso }: { acesso: AcessoAtual }) {
  const [page, setPage] = useState(1);
  const [selecionado, setSelecionado] = useState<EmpreendimentoResumo | null>(
    null,
  );
  const query = useEmpreendimentos(acesso, page);
  return (
    <section className="space-y-3" aria-label="Empreendimentos autorizados">
      <h2 className="text-xl font-semibold">Empreendimentos autorizados</h2>
      {query.isPending ? (
        <p role="status">Carregando empreendimentos…</p>
      ) : query.isError ? (
        <>
          <p role="alert">{query.error.message}</p>
          <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
        </>
      ) : !query.data?.data.length ? (
        <p>
          Nenhum empreendimento disponível no seu acesso. Solicite a conferência
          de seus vínculos ao administrador.
        </p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2">
            {query.data.data.map((e) => (
              <li key={e.id}>
                <Button
                  variant={selecionado?.id === e.id ? 'default' : 'outline'}
                  aria-pressed={selecionado?.id === e.id}
                  onClick={() => setSelecionado(e)}
                >
                  {e.nomeFantasia}
                </Button>
                {acesso.perfil === 'administrador' && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ID {e.id}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span>Página {page}</span>
            <Button
              variant="outline"
              disabled={page >= query.data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </>
      )}
      {selecionado && !query.isError && (
        <Detalhes
          key={`${acesso.revisao}:${selecionado.id}`}
          acesso={acesso}
          empreendimento={selecionado}
        />
      )}
    </section>
  );
}
