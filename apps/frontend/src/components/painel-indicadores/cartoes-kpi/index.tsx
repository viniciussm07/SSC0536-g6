import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ItemPainel } from '@ssc0536/common';
import { Badge } from '@/components/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ROTULO_MOTIVO,
  descricaoComparacao,
  formatarValor,
  rotuloUnidade,
} from '@/utils/painel';

/** Indicadores-síntese: código, rótulo curto. Só aparecem os que existem para o perfil. */
const KPIS: readonly (readonly [string, string, string?])[] = [
  ['taxa_ocupacao_uh', 'Taxa de ocupação'],
  ['diaria_media_ponderada', 'Diária média', 'ponderada'],
  ['revpar', 'RevPAR', 'ponderada'],
  ['turistas_total', 'Turistas no período'],
  ['turistas_total_dia', 'Turistas por dia'],
  ['cobertura_meios', 'Meios respondentes'],
];

function Tendencia({ item }: { item: ItemPainel }) {
  const c = item.comparacao;
  if (c === null) return null;
  const texto = descricaoComparacao(c, item.unidade);
  const n = c.estado === 'disponivel' ? Number(c.variacao) : 0;
  const Icone = n > 0 ? ArrowUpRight : n < 0 ? ArrowDownRight : ArrowRight;
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      {c.estado === 'disponivel' && (
        <Icone className="size-3.5" aria-hidden="true" />
      )}
      <span>
        {texto}
        {c.estado === 'disponivel' && ' vs. período base'}
      </span>
    </p>
  );
}

export function CartoesKpi({ itens }: { itens: readonly ItemPainel[] }) {
  const cartoes = KPIS.flatMap(([codigo, rotulo]) => {
    const item = itens.find(
      (i) => i.codigo === codigo && i.recorte === 'total',
    );
    return item ? [{ item, rotulo }] : [];
  });
  if (cartoes.length === 0) return null;
  return (
    <ul
      aria-label="Resumo do período"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 min-[1181px]:grid-cols-6"
    >
      {cartoes.map(({ item, rotulo }) => (
        <li key={item.codigo}>
          <Card className="h-full">
            <CardContent className="space-y-1.5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {rotulo}
              </p>
              {item.valor.estado === 'disponivel' ? (
                <p className="font-heading text-xl font-extrabold tabular-nums sm:text-2xl">
                  {formatarValor(item.valor.valor, item.unidade)}
                  {item.unidade !== 'percentual_0_100' && (
                    <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                      {rotuloUnidade(item.unidade).replace('R$ ', '')}
                    </span>
                  )}
                </p>
              ) : (
                <Badge cor="amarelo">
                  Indisponível · {ROTULO_MOTIVO[item.valor.motivo]}
                </Badge>
              )}
              <Tendencia item={item} />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
