import { TriangleAlert } from 'lucide-react';
import { ESQUEMA_INDICADORES } from '@ssc0536/common';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { GradeColecao } from '@/components/grade-colecao';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { acessoService } from '@/services/acesso';
import { permite } from '@/utils/acesso';
import {
  rotuloMetodo,
  rotuloRecorte,
  rotuloTipoPeriodo,
  type TipoColetaPainel,
} from '@/utils/indicadores';
import { colunasIndicadores } from './colunas';
import { FiltrosPainel } from './components/filtros-painel';
import { GraficoComparativo } from './components/grafico-comparativo';
import { GraficoRecortes } from './components/grafico-recortes';
import { GraficoTendencia } from './components/grafico-tendencia';
import { ResumoReferencia } from './components/resumo-referencia';
import { useFiltrosPainel, usePainelIndicadores } from './hooks';

export function IndicadoresPage() {
  const acesso = useAcessoAtual();
  const podeConsultar = permite(acesso, 'indicadores', 'consultar');
  const form = useFiltrosPainel();
  const painel = usePainelIndicadores(form, acesso, podeConsultar);

  if (!podeConsultar)
    return (
      <section className="space-y-3" aria-label="Painel de indicadores">
        <h1>Painel de indicadores</h1>
        <p role="alert">
          Seu perfil não tem permissão para consultar indicadores.
        </p>
      </section>
    );

  return (
    <section className="space-y-6" aria-label="Painel de indicadores">
      <CabecalhoPagina
        titulo="Painel de indicadores"
        descricao="Resultados liberados para seu perfil, por período, tipo de coleta e recorte. O painel exibe os valores publicados pela API e não recalcula fórmulas."
      />
      <div
        role="note"
        className="flex gap-3 rounded-[14px] border border-warning-foreground/20 bg-warning p-4 text-sm text-warning-foreground"
      >
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>
            Dados fictícios de demonstração, não homologados pelo OTO.
          </strong>{' '}
          Os resultados não representam a ocupação real de Olímpia nem
          metodologia aprovada.
        </p>
      </div>
      <FiltrosPainel
        form={form}
        indicadores={painel.indicadores}
        metodos={painel.metodos}
        periodos={painel.periodos}
      />
      <ConteudoPainel painel={painel} />

      <section className="space-y-3" aria-labelledby="tabela-indicadores">
        <h2 id="tabela-indicadores" className="text-lg font-bold">
          Tabela de resultados
        </h2>
        <p className="text-sm text-muted-foreground">
          Alternativa acessível aos gráficos, com todos os resultados liberados,
          filtros e ordenação por coluna.
        </p>
        <GradeColecao
          id="indicadores"
          rotulo="Indicadores"
          esquema={ESQUEMA_INDICADORES}
          colunas={colunasIndicadores}
          getRowId={(i) => String(i.id)}
          chave={['indicadores', acesso.usuarioId, acesso.revisao]}
          buscar={(c, signal) => acessoService.indicadores(c, signal)}
          habilitado={podeConsultar}
          mensagemVazia="Nenhum indicador encontrado para seu perfil e filtros."
        />
      </section>
    </section>
  );
}

function ConteudoPainel({
  painel,
}: {
  painel: ReturnType<typeof usePainelIndicadores>;
}) {
  const { consulta, indicador, referencia, filtros } = painel;
  if (painel.intervaloInvalido)
    return (
      <p className="text-sm text-muted-foreground">
        Corrija o intervalo de datas para atualizar os gráficos.
      </p>
    );
  if (consulta.isPending)
    return <p role="status">Carregando painel de indicadores…</p>;
  if (consulta.isError)
    return (
      <div className="space-y-2">
        <p role="alert">Painel indisponível: {consulta.error.message}</p>
        <Button variant="outline" onClick={() => void consulta.refetch()}>
          Recarregar painel
        </Button>
      </div>
    );
  if (!indicador || !referencia)
    return (
      <p className="rounded-[14px] border bg-card p-4">
        Nenhum resultado liberado para seu perfil nos filtros do painel.
      </p>
    );

  const tipos: TipoColetaPainel[] =
    filtros.tipoColeta === 'ambos'
      ? ['consolidado', 'expectativa']
      : [filtros.tipoColeta];
  const recorte = rotuloRecorte(filtros.recorte);
  const conflitos = painel.serie.filter(
    (p) =>
      p.consolidado.situacao === 'conflito' ||
      p.expectativa.situacao === 'conflito',
  ).length;
  return (
    <div className="space-y-4" aria-busy={consulta.isFetching}>
      <h2 className="text-xl font-bold">
        {indicador.nome}{' '}
        <span className="text-muted-foreground">({indicador.unidade})</span>
      </h2>
      <p className="text-sm text-muted-foreground">
        Método {rotuloMetodo(painel.metodo ?? '')} · períodos do tipo{' '}
        {rotuloTipoPeriodo(filtros.periodoTipo).toLowerCase()}
      </p>
      {consulta.data.truncada && (
        <p role="status" className="text-sm text-warning-foreground">
          Exibindo {consulta.data.linhas.length} de {consulta.data.total}{' '}
          resultados; restrinja o intervalo para ver a série completa.
        </p>
      )}
      {conflitos > 0 && (
        <p role="status" className="text-sm text-warning-foreground">
          {conflitos} período(s) têm mais de um resultado para a mesma
          combinação; eles não são plotados. Confira-os na tabela.
        </p>
      )}
      <ResumoReferencia
        ponto={painel.serie.find((p) => p.periodo.id === referencia.id)}
        periodo={referencia}
        recorte={recorte}
        unidade={indicador.unidade}
      />
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <GraficoTendencia
          serie={painel.serie}
          tipos={tipos}
          unidade={indicador.unidade}
          recorte={recorte}
        />
        <GraficoRecortes
          recortes={painel.recortes}
          periodo={referencia}
          tipo={tipos[0]}
          unidade={indicador.unidade}
        />
      </div>
      <GraficoComparativo
        recortes={painel.recortes}
        periodo={referencia}
        unidade={indicador.unidade}
      />
    </div>
  );
}
