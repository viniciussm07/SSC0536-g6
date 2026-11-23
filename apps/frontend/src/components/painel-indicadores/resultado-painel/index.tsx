import type { ParticipacaoPainel, Painel, SeriePainel } from '@ssc0536/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/badge';
import {
  CODIGOS_DIARIA,
  CODIGOS_OCUPACAO,
  temFaixas,
} from '@/utils/painel-series';
import { ROTULO_COLETA, formatarInstante, formatarValor } from '@/utils/painel';
import { CartoesKpi } from '../cartoes-kpi';
import { GraficoEvolucao } from '../grafico-evolucao';
import { GraficoDiarias } from '../grafico-diarias';
import { GraficoFaixas } from '../grafico-faixas';
import { GraficoParticipacao } from '../grafico-participacao';
import { GraficoSazonalidade } from '../grafico-sazonalidade';
import { GraficoPorTipo } from '../grafico-por-tipo';
import { GraficoTuristas } from '../grafico-turistas';
import { TabelaSerie } from '../tabela-serie';
import { TabelaPainel } from '../tabela-painel';

export function ResultadoPainel({
  painel,
  serie,
  participacao,
}: {
  painel: Painel;
  serie?: SeriePainel;
  participacao?: ParticipacaoPainel;
}) {
  const indicadores = painel.itens.filter((i) => i.grupo === 'indicador');
  const cobertura = painel.itens.filter((i) => i.grupo === 'cobertura');
  const meios = cobertura.find((i) => i.codigo === 'cobertura_meios');
  const revisoes = [
    ...new Set(
      painel.itens.map((i) =>
        i.fonte.origem === 'carga'
          ? 'carga histórica'
          : `cálculo #${i.fonte.execucaoId} (revisão ${i.fonte.revisao})`,
      ),
    ),
  ];
  const titulo = `${painel.periodo.rotulo} · ${ROTULO_COLETA[painel.tipoColeta]}`;

  if (painel.situacao === 'calculo_pendente')
    return (
      <div role="status" className="space-y-1 rounded-lg border p-4 text-sm">
        <Badge cor="amarelo">Cálculo pendente</Badge>
        <p>
          Há cálculo para {titulo}, mas ainda não foi publicado. Os valores não
          aparecem até a publicação autorizada.
        </p>
      </div>
    );
  if (painel.situacao === 'sem_dados')
    return (
      <div role="status" className="space-y-1 rounded-lg border p-4 text-sm">
        <Badge cor="cinza">Sem dados</Badge>
        <p>Nenhum resultado foi calculado ou carregado para {titulo}.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <section
        aria-label="Identificação do resultado"
        className="space-y-1 rounded-lg border bg-card p-4 text-sm"
      >
        <h2 className="font-heading text-lg font-bold">{titulo}</h2>
        {painel.comparacao && <p>Comparado com {painel.comparacao.rotulo}.</p>}
        <p>
          Origem: {revisoes.join('; ')}.{' '}
          {painel.atualizadoEm &&
            `Atualizado em ${formatarInstante(painel.atualizadoEm)}.`}
        </p>
        <p className="text-muted-foreground">{painel.aviso}</p>
      </section>

      {meios?.valor.estado === 'disponivel' && (
        <p
          role="note"
          className="rounded-lg border border-warning bg-warning/20 p-3 text-sm"
        >
          Resultado baseado em {formatarValor(meios.valor.valor, meios.unidade)}{' '}
          dos meios de hospedagem: não representa o total do município.
        </p>
      )}

      <CartoesKpi itens={painel.itens} />

      <div className="grid gap-4 min-[1181px]:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ocupação por tipo de hospedagem</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoPorTipo
              itens={painel.itens}
              codigos={CODIGOS_OCUPACAO}
              titulo="Taxa de ocupação"
              periodo={painel.periodo.rotulo}
              periodoBase={painel.comparacao?.rotulo ?? null}
            />
          </CardContent>
        </Card>
        {serie && (
          <Card>
            <CardHeader>
              <CardTitle>Evolução da taxa de ocupação</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoEvolucao serie={serie} periodoId={painel.periodo.id} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Diária média por tipo de hospedagem</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoPorTipo
              itens={painel.itens}
              codigos={CODIGOS_DIARIA}
              metodo="ponderada"
              titulo="Diária média (preço ofertado)"
              periodo={painel.periodo.rotulo}
              periodoBase={painel.comparacao?.rotulo ?? null}
            />
          </CardContent>
        </Card>
        {serie && (
          <Card>
            <CardHeader>
              <CardTitle>Diária média e RevPAR</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoDiarias serie={serie} periodoId={painel.periodo.id} />
            </CardContent>
          </Card>
        )}
        {temFaixas(painel.itens) && (
          <Card>
            <CardHeader>
              <CardTitle>Faixas de ocupação</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoFaixas
                itens={painel.itens}
                periodo={painel.periodo.rotulo}
              />
            </CardContent>
          </Card>
        )}
        {participacao && participacao.edicoes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Participação da pesquisa</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoParticipacao participacao={participacao} />
            </CardContent>
          </Card>
        )}
        {serie && serie.feriados.length > 0 && (
          <Card className="min-[1181px]:col-span-2">
            <CardHeader>
              <CardTitle>Sazonalidade</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoSazonalidade serie={serie} />
            </CardContent>
          </Card>
        )}
        {serie && (
          <Card className="min-[1181px]:col-span-2">
            <CardHeader>
              <CardTitle>Turistas por período</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoTuristas serie={serie} periodoId={painel.periodo.id} />
            </CardContent>
          </Card>
        )}
      </div>
      {serie && <TabelaSerie serie={serie} />}

      {indicadores.length > 0 && (
        <section aria-labelledby="painel-indicadores" className="space-y-4">
          <h2
            id="painel-indicadores"
            className="font-heading text-lg font-bold"
          >
            Indicadores
          </h2>
          <TabelaPainel
            itens={indicadores}
            legenda={`Indicadores de ${titulo}`}
            comComparacao={painel.comparacao !== null}
          />
        </section>
      )}

      {cobertura.length > 0 && (
        <section aria-labelledby="painel-cobertura" className="space-y-4">
          <h2 id="painel-cobertura" className="font-heading text-lg font-bold">
            Cobertura da amostra
          </h2>
          <TabelaPainel
            itens={cobertura}
            legenda={`Cobertura da amostra de ${titulo}`}
            comComparacao={painel.comparacao !== null}
          />
        </section>
      )}
    </div>
  );
}
