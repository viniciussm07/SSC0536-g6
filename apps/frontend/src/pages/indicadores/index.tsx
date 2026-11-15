import { ESQUEMA_INDICADORES } from '@ssc0536/common';
import { GradeColecao } from '@/components/grade-colecao';
import { useConsultaDaGrade } from '@/hooks/use-consulta-da-grade';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { acessoService } from '@/services/acesso';
import { permite } from '@/utils/acesso';
import { colunasIndicadores } from './colunas';
import { useExportarIndicadores } from './hooks';

export function IndicadoresPage() {
  const acesso = useAcessoAtual();
  const consulta = useConsultaDaGrade('indicadores');
  const exportar = useExportarIndicadores(consulta);
  return (
    <section className="space-y-3" aria-label="Indicadores liberados">
      <h1 className="text-2xl font-semibold">Indicadores liberados</h1>
      <p className="text-sm text-muted-foreground">
        Somente dados liberados para seu perfil. Valores fictícios de
        demonstração não representam metodologia homologada.
      </p>
      <GradeColecao
        id="indicadores"
        rotulo="Indicadores"
        esquema={ESQUEMA_INDICADORES}
        colunas={colunasIndicadores}
        getRowId={(i) => String(i.id)}
        chave={['indicadores', acesso.usuarioId, acesso.revisao]}
        buscar={(c, signal) => acessoService.indicadores(c, signal)}
        habilitado={permite(acesso, 'indicadores', 'consultar')}
        mensagemVazia="Nenhum indicador encontrado para seu perfil e filtros."
      />
      {permite(acesso, 'indicadores', 'exportar') && (
        <Button disabled={exportar.isPending} onClick={() => exportar.mutate()}>
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
    </section>
  );
}
