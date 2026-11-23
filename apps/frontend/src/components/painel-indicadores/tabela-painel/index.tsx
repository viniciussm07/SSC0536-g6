import type { ItemPainel } from '@ssc0536/common';
import { Badge } from '@/components/badge';
import {
  descricaoComparacao,
  formatarInstante,
  formatarValor,
  rotuloFonte,
  rotuloRecorte,
  ROTULO_MOTIVO,
  rotuloUnidade,
} from '@/utils/painel';

/** Tabela acessível equivalente aos gráficos; zero, indisponível e sem base são distintos. */
export function TabelaPainel({
  itens,
  legenda,
  comComparacao,
}: {
  itens: readonly ItemPainel[];
  legenda: string;
  comComparacao: boolean;
}) {
  return (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label={legenda}
    >
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Indicador
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Recorte
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">
              Valor
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Unidade
            </th>
            {comComparacao && (
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                Variação
              </th>
            )}
            <th scope="col" className="py-2 font-semibold">
              Origem
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => {
            const variacao = descricaoComparacao(item.comparacao, item.unidade);
            return (
              <tr
                key={`${item.indicadorId}|${item.recorte}|${item.metodo}`}
                className="border-b align-top last:border-0"
              >
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {item.nome}
                </th>
                <td className="py-2 pr-3">{rotuloRecorte(item.recorte)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {item.valor.estado === 'disponivel' ? (
                    <span title={`Valor exato: ${item.valor.valor}`}>
                      {formatarValor(item.valor.valor, item.unidade)}
                    </span>
                  ) : (
                    <Badge
                      cor="amarelo"
                      title={item.valor.detalhe ?? undefined}
                    >
                      Indisponível · {ROTULO_MOTIVO[item.valor.motivo]}
                    </Badge>
                  )}
                </td>
                <td className="py-2 pr-3">{rotuloUnidade(item.unidade)}</td>
                {comComparacao && (
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {variacao ?? '—'}
                  </td>
                )}
                <td className="py-2 text-xs text-muted-foreground">
                  {rotuloFonte(item)}
                  <br />
                  Atualizado em {formatarInstante(item.fonte.calculadoEm)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
