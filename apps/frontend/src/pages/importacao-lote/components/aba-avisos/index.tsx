import { Badge } from '@/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOcorrencias } from '../../hooks';

/** Erros e avisos da leitura, com o local exato na planilha e como corrigir. */
export function AbaAvisos({ loteId }: { loteId: number }) {
  const ocorrencias = useOcorrencias(loteId);
  if (ocorrencias.isPending) return <p role="status">Carregando…</p>;
  if (ocorrencias.isError)
    return (
      <p role="alert" className="text-destructive">
        Não foi possível carregar os erros e avisos.
      </p>
    );
  const lista = ocorrencias.data.data;
  if (lista.length === 0)
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Nenhum erro ou aviso nesta leitura.
      </p>
    );
  return (
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
        {lista.map((o) => (
          <TableRow key={o.id}>
            <TableCell>
              <Badge cor={o.severidade === 'erro' ? 'vermelho' : 'amarelo'}>
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
            <TableCell className="whitespace-normal">{o.mensagem}</TableCell>
            <TableCell className="whitespace-normal">{o.orientacao}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
