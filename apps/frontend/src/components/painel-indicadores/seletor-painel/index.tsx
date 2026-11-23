import type { ConsultaPainel, OpcaoPainel } from '@ssc0536/common';
import { ROTULO_COLETA } from '@/utils/painel';

const campo =
  'h-10 w-full rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const chave = (o: Pick<OpcaoPainel, 'periodoId' | 'tipoColeta'>) =>
  `${o.periodoId}|${o.tipoColeta}`;

/**
 * Filtros do painel. Expectativa e consolidado nunca se misturam: a comparação só oferece
 * períodos do mesmo tipo de coleta e do mesmo tipo de período (mês com mês).
 */
export function SeletorPainel({
  opcoes,
  consulta,
  onChange,
}: {
  opcoes: readonly OpcaoPainel[];
  consulta: ConsultaPainel;
  onChange: (consulta: ConsultaPainel) => void;
}) {
  const atual = opcoes.find((o) => chave(o) === chave(consulta));
  const candidatas = opcoes.filter(
    (o) =>
      o.tipoColeta === consulta.tipoColeta &&
      o.periodoId !== consulta.periodoId &&
      o.periodoTipo === atual?.periodoTipo,
  );
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label htmlFor="painel-periodo" className="text-sm font-medium">
          Período e coleta
        </label>
        <select
          id="painel-periodo"
          className={campo}
          value={chave(consulta)}
          onChange={(e) => {
            const o = opcoes.find((x) => chave(x) === e.target.value);
            if (o)
              onChange({ periodoId: o.periodoId, tipoColeta: o.tipoColeta });
          }}
        >
          {opcoes.map((o) => (
            <option key={chave(o)} value={chave(o)}>
              {o.periodo} · {ROTULO_COLETA[o.tipoColeta]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="painel-comparacao" className="text-sm font-medium">
          Comparar com
        </label>
        <select
          id="painel-comparacao"
          className={campo}
          value={consulta.comparacaoPeriodoId ?? ''}
          onChange={(e) =>
            onChange({
              periodoId: consulta.periodoId,
              tipoColeta: consulta.tipoColeta,
              ...(e.target.value === ''
                ? {}
                : { comparacaoPeriodoId: Number(e.target.value) }),
            })
          }
        >
          <option value="">Sem comparação</option>
          {candidatas.map((o) => (
            <option key={o.periodoId} value={o.periodoId}>
              {o.periodo}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Só períodos do mesmo tipo e da mesma coleta podem ser comparados.
        </p>
      </div>
    </div>
  );
}
