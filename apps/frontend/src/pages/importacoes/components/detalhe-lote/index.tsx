import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CORES_ESTADO,
  ROTULOS_ESTADO,
  ROTULOS_FONTE,
  formatarInstante,
  formatarTamanho,
} from '../../colunas';
import { useImportacaoMutations, useLoteLeitura } from '../../hooks';

/** Prévia da leitura: nada aqui foi gravado como dado de negócio. */
export function DetalheLote({
  id,
  podeReler,
}: {
  id: number;
  podeReler: boolean;
}) {
  const { detalhe, ocorrencias, linhas } = useLoteLeitura(id);
  const { reler } = useImportacaoMutations();
  if (detalhe.isPending) return <p role="status">Carregando a leitura…</p>;
  if (detalhe.isError)
    return (
      <p role="alert" className="text-destructive">
        Não foi possível carregar este lote.
      </p>
    );
  const lote = detalhe.data;
  const resumo = lote.resumo;
  return (
    <div className="space-y-5">
      <div
        role="note"
        className="rounded-lg border bg-muted p-3 text-sm leading-relaxed"
      >
        <strong>Isto é uma leitura, não uma importação.</strong> As linhas
        abaixo ainda não foram conciliadas com empreendimentos nem gravadas como
        respostas; isso acontece na etapa de conciliação.
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Tipo</dt>
          <dd>{ROTULOS_FONTE[lote.fonte]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estado</dt>
          <dd>
            <Badge cor={CORES_ESTADO[lote.estado]}>
              {ROTULOS_ESTADO[lote.estado]}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Versão do mapeamento</dt>
          <dd>{lote.versaoParser}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tamanho</dt>
          <dd>{formatarTamanho(lote.tamanhoBytes)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Lido em</dt>
          <dd>{formatarInstante(lote.lidoEm)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Erros / avisos</dt>
          <dd>
            {lote.totais.erros} / {lote.totais.avisos}
          </dd>
        </div>
        {resumo && (
          <>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                Período informado no arquivo
              </dt>
              <dd>
                {resumo.rotuloPeriodo ?? '—'}
                {resumo.diarias !== null && ` · ${resumo.diarias} diárias`}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Abas</dt>
              <dd>
                {resumo.abas
                  .map(
                    (aba) =>
                      `${aba.nome}: ${aba.situacao}${aba.motivo ? ` (${aba.motivo})` : ''}`,
                  )
                  .join(' · ')}
              </dd>
            </div>
          </>
        )}
      </dl>

      {lote.erroMensagem && (
        <p role="alert" className="text-sm text-destructive">
          {lote.erroMensagem}
        </p>
      )}

      <section aria-label="Erros e avisos" className="space-y-2">
        <h3 className="font-heading font-bold">Erros e avisos</h3>
        {ocorrencias.isPending && <p role="status">Carregando…</p>}
        {ocorrencias.data && ocorrencias.data.data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum erro ou aviso nesta leitura.
          </p>
        )}
        {ocorrencias.data && ocorrencias.data.data.length > 0 && (
          <Table aria-label="Erros e avisos da leitura">
            <TableHeader>
              <TableRow>
                <TableHead>Gravidade</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead>Como corrigir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ocorrencias.data.data.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Badge
                      cor={o.severidade === 'erro' ? 'vermelho' : 'amarelo'}
                    >
                      {o.severidade === 'erro' ? 'Erro' : 'Aviso'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {[
                      o.aba,
                      o.coluna && o.linha
                        ? `${o.coluna}${o.linha}`
                        : o.linha
                          ? `linha ${o.linha}`
                          : o.coluna,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {o.mensagem}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {o.orientacao}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section aria-label="Prévia das linhas" className="space-y-2">
        <h3 className="font-heading font-bold">Prévia das linhas lidas</h3>
        {linhas.data && linhas.data.data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma linha de meio de hospedagem foi lida.
          </p>
        )}
        {linhas.data && linhas.data.data.length > 0 && (
          <Table aria-label="Prévia das linhas lidas">
            <TableHeader>
              <TableRow>
                <TableHead>Linha</TableHead>
                <TableHead>Meio de hospedagem (como informado)</TableHead>
                <TableHead>Ocupação (%)</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.data.data.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.linha}</TableCell>
                  <TableCell>
                    {String(
                      l.canonico?.nomeInformado ?? l.celulas.C?.bruto ?? '—',
                    )}
                  </TableCell>
                  <TableCell>
                    {l.canonico
                      ? l.canonico.ocupacaoPercentual === null
                        ? 'não informada'
                        : String(l.canonico.ocupacaoPercentual).replace(
                            '.',
                            ',',
                          )
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {
                      {
                        valida: 'Válida',
                        aviso: 'Com aviso',
                        erro: 'Com erro',
                      }[l.situacao]
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {podeReler && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            disabled={reler.isPending}
            onClick={() => reler.mutate(id)}
          >
            <RefreshCw aria-hidden="true" />
            Refazer leitura
          </Button>
        </div>
      )}
      {reler.isError && (
        <p role="alert" className="text-sm text-destructive">
          {reler.error instanceof Error
            ? reler.error.message
            : 'Não foi possível refazer a leitura.'}
        </p>
      )}
    </div>
  );
}
