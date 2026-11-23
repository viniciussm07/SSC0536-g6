import { useState } from 'react';
import type { ConsultaPainel } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { permite } from '@/utils/acesso';
import { ExportarPainel } from './exportar-painel';
import {
  usePainel,
  usePainelOpcoes,
  usePainelParticipacao,
  usePainelSerie,
} from './hooks';
import { ResultadoPainel } from './resultado-painel';
import { SeletorPainel } from './seletor-painel';

/**
 * Painel dos indicadores publicados (parte 18), exibido na visão geral. Mostra o período
 * mais recente por padrão; filtros, comparação e boletim usam a mesma resposta da API.
 */
export function PainelIndicadores() {
  const acesso = useAcessoAtual();
  const opcoes = usePainelOpcoes();
  const [escolha, setEscolha] = useState<ConsultaPainel | null>(null);
  const lista = opcoes.data;
  const padrao: ConsultaPainel | null =
    lista && lista.length > 0
      ? { periodoId: lista[0].periodoId, tipoColeta: lista[0].tipoColeta }
      : null;
  const consulta = escolha ?? padrao;
  const painel = usePainel(consulta);
  const serie = usePainelSerie(consulta?.tipoColeta);
  const participacao = usePainelParticipacao(
    consulta?.tipoColeta,
    permite(acesso, 'pesquisas', 'consultar'),
  );
  const podeExportar = permite(acesso, 'indicadores', 'exportar');

  return (
    <section className="space-y-6" aria-labelledby="painel-titulo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2
            id="painel-titulo"
            className="font-heading text-xl font-extrabold"
          >
            Painel de indicadores
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Resultados publicados para o seu perfil, com período, coleta,
            revisão e cobertura identificados.
          </p>
        </div>
        {podeExportar && consulta && painel.data?.situacao === 'disponivel' && (
          <ExportarPainel consulta={consulta} />
        )}
      </div>

      {opcoes.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando períodos…
        </p>
      )}
      {opcoes.isError && (
        <div role="alert" className="space-y-2 rounded-lg border p-4 text-sm">
          <p>Não foi possível carregar os períodos disponíveis.</p>
          <Button variant="outline" onClick={() => void opcoes.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {lista && lista.length === 0 && (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Nenhum resultado publicado está disponível para o seu perfil.
        </p>
      )}
      {lista && lista.length > 0 && consulta && (
        <>
          <SeletorPainel
            opcoes={lista}
            consulta={consulta}
            onChange={setEscolha}
          />
          {painel.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              Carregando indicadores…
            </p>
          )}
          {painel.isError && (
            <div
              role="alert"
              className="space-y-2 rounded-lg border p-4 text-sm"
            >
              <p>Não foi possível carregar o painel.</p>
              <Button variant="outline" onClick={() => void painel.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}
          {painel.data && (
            <ResultadoPainel
              painel={painel.data}
              serie={serie.data}
              participacao={participacao.data}
            />
          )}
        </>
      )}
    </section>
  );
}
