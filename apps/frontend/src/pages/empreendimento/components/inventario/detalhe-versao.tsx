import { useQuery } from '@tanstack/react-query';
import {
  compararVersoesInventario,
  type VersaoInventarioDetalhe,
} from '@ssc0536/common';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { inventarioService } from '@/services/inventario';
import { ROTULOS_ESTADO_ITEM } from '@/utils/catalogo';
import {
  CAMPOS_FORMULARIO,
  ROTULOS_CONFERENCIA,
  ROTULOS_TIPO_ALTERACAO,
  ROTULO_CAMPO,
  dataBr,
  descreverDiferenca,
  formatarValorCapacidade,
} from '@/utils/inventario';

const estadoDoItem = (i: VersaoInventarioDetalhe['itens'][number]) =>
  [
    ROTULOS_ESTADO_ITEM[i.estado],
    i.detalhe ? `(${i.detalhe})` : '',
    i.quantidade !== null ? `· ${i.quantidade}` : '',
  ]
    .filter(Boolean)
    .join(' ');

function Diferencas({
  antes,
  depois,
}: {
  antes: VersaoInventarioDetalhe;
  depois: VersaoInventarioDetalhe;
}) {
  const d = compararVersoesInventario(antes, depois);
  const rotuloItem = (itemId: number) =>
    (depois.itens.find((i) => i.itemId === itemId) ??
      antes.itens.find((i) => i.itemId === itemId))!.rotulo;
  if (!d.campos.length && !d.itens.length && !d.vigencia)
    return <p>Nenhuma diferença em relação à versão anterior.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {d.vigencia && (
        <li>
          Vigência: {dataBr(d.vigencia.antes[0])} a{' '}
          {d.vigencia.antes[1] ? dataBr(d.vigencia.antes[1]) : 'sem fim'} →{' '}
          {dataBr(d.vigencia.depois[0])} a{' '}
          {d.vigencia.depois[1] ? dataBr(d.vigencia.depois[1]) : 'sem fim'}
        </li>
      )}
      {d.campos.map((c) => (
        <li key={c.campo}>
          <span className="font-medium">{ROTULO_CAMPO[c.campo]}:</span>{' '}
          {descreverDiferenca(c)}
        </li>
      ))}
      {d.itens.map((i) => (
        <li key={i.itemId}>
          <span className="font-medium">{rotuloItem(i.itemId)}:</span>{' '}
          {i.tipo === 'adicionado'
            ? `adicionado (${estadoDoItem(i.depois!)})`
            : i.tipo === 'removido'
              ? 'removido'
              : `${estadoDoItem(i.antes!)} → ${estadoDoItem(i.depois!)}`}
        </li>
      ))}
    </ul>
  );
}

/** Detalhe de uma versão com a leitura histórica dos itens e as diferenças para a anterior. */
export function DetalheVersao({
  id,
  versaoId,
  anteriorId,
}: {
  id: number;
  versaoId: number;
  anteriorId: number | null;
}) {
  const acesso = useAcessoAtual();
  const chave = (v: number) => [
    'inventarios',
    acesso.usuarioId,
    acesso.revisao,
    id,
    'detalhe',
    v,
  ];
  const atual = useQuery({
    queryKey: chave(versaoId),
    queryFn: ({ signal }) => inventarioService.detalhe(id, versaoId, signal),
    retry: false,
  });
  const anterior = useQuery({
    queryKey: chave(anteriorId ?? 0),
    queryFn: ({ signal }) => inventarioService.detalhe(id, anteriorId!, signal),
    enabled: anteriorId !== null,
    retry: false,
  });
  if (atual.isPending) return <p role="status">Carregando versão…</p>;
  if (atual.isError) return <p role="alert">{atual.error.message}</p>;
  const v = atual.data;
  const grupos = new Map<string, typeof v.itens>();
  for (const item of v.itens)
    grupos.set(item.pergunta, [...(grupos.get(item.pergunta) ?? []), item]);
  return (
    <div className="space-y-5">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Vigência</dt>
          <dd>
            {dataBr(v.vigenciaInicio)} a{' '}
            {v.vigenciaFim ? dataBr(v.vigenciaFim) : 'sem fim'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tipo</dt>
          <dd>{ROTULOS_TIPO_ALTERACAO[v.tipoAlteracao]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Conferência</dt>
          <dd>{ROTULOS_CONFERENCIA[v.situacaoConferencia]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Registrada por</dt>
          <dd>
            {v.autor} em {new Date(v.criadaEm).toLocaleString('pt-BR')}
          </dd>
        </div>
        {v.motivo && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Motivo</dt>
            <dd>{v.motivo}</dd>
          </div>
        )}
        {v.substituidaPorId !== null && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Situação</dt>
            <dd>
              Substituída por correção (versão {v.substituidaPorId}); mantida
              como histórico.
            </dd>
          </div>
        )}
      </dl>

      <section aria-label="Diferenças" className="space-y-2">
        <h3 className="font-semibold">Diferenças em relação à anterior</h3>
        {anteriorId === null ? (
          <p className="text-sm">Primeira versão: não há anterior.</p>
        ) : anterior.isPending ? (
          <p role="status">Comparando…</p>
        ) : anterior.isError ? (
          <p role="alert">{anterior.error.message}</p>
        ) : (
          <Diferencas antes={anterior.data} depois={v} />
        )}
      </section>

      <section aria-label="Capacidade da versão" className="space-y-2">
        <h3 className="font-semibold">Capacidade e funcionamento</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {CAMPOS_FORMULARIO.map(({ campo, rotulo }) => (
            <div key={campo}>
              <dt className="text-muted-foreground">{rotulo}</dt>
              <dd>{formatarValorCapacidade(v.capacidade[campo])}</dd>
            </div>
          ))}
        </dl>
      </section>

      {v.itens.length > 0 && (
        <section aria-label="Itens da versão" className="space-y-2">
          <h3 className="font-semibold">
            Serviços, equipamentos e acessibilidade
          </h3>
          {[...grupos].map(([pergunta, itens]) => (
            <div key={pergunta} className="text-sm">
              <p className="font-medium">{pergunta}</p>
              <ul className="ml-4 list-disc">
                {itens.map((i) => (
                  <li key={i.itemId}>
                    {i.rotulo}: {estadoDoItem(i)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
