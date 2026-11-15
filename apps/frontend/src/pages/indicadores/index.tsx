import { permite } from '@/utils/acesso';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { useIndicadores } from './hooks';

export function IndicadoresPage() {
  const acesso = useAcessoAtual();
  const [page, setPage] = useState(1);
  const { indicadores, exportar } = useIndicadores(acesso, page);
  return (
    <section className="space-y-3" aria-label="Indicadores liberados">
      <h1 className="text-2xl font-semibold">Indicadores liberados</h1>
      <p className="text-sm text-muted-foreground">
        Somente dados liberados para seu perfil. Valores fictícios de
        demonstração não representam metodologia homologada.
      </p>
      {indicadores.isPending ? (
        <p role="status">Carregando indicadores…</p>
      ) : indicadores.isError ? (
        <>
          <p role="alert">{indicadores.error.message}</p>
          <Button onClick={() => void indicadores.refetch()}>
            Tentar novamente
          </Button>
        </>
      ) : !indicadores.data?.data.length ? (
        <p>Nenhum indicador foi liberado para seu perfil.</p>
      ) : (
        <>
          <ul>
            {indicadores.data.data.map((i) => (
              <li key={i.id}>
                {i.nome}: {i.valor} {i.unidade} — {i.periodo} ({i.recorte},{' '}
                {i.metodo})
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                exportar.reset();
                setPage(page - 1);
              }}
            >
              Anterior
            </Button>
            <span>Página {page}</span>
            <Button
              variant="outline"
              disabled={page >= indicadores.data.meta.totalPages}
              onClick={() => {
                exportar.reset();
                setPage(page + 1);
              }}
            >
              Próxima
            </Button>
          </div>
          {permite(acesso, 'indicadores', 'exportar') && (
            <Button
              disabled={exportar.isPending}
              onClick={() => exportar.mutate()}
            >
              Exportar esta página em JSON
            </Button>
          )}
          {exportar.isSuccess && (
            <a
              className="block underline"
              download="indicadores.json"
              href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportar.data))}`}
            >
              Baixar indicadores autorizados
            </a>
          )}
          {exportar.isError && <p role="alert">{exportar.error.message}</p>}
        </>
      )}
    </section>
  );
}
