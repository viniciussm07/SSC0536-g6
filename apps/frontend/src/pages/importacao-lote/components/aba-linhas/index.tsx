import type { FonteImportacao } from '@ssc0536/common';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ROTULOS_OCUPACAO } from '@/utils/importacao';
import { useLinhasLidas } from '../../hooks';

const SITUACAO = {
  valida: 'Válida',
  aviso: 'Com aviso',
  erro: 'Com erro',
} as const;

/** Linhas de meios de hospedagem como lidas do arquivo, antes de qualquer conciliação. */
export function AbaLinhas({
  loteId,
  fonte,
}: {
  loteId: number;
  fonte: FonteImportacao;
}) {
  const linhas = useLinhasLidas(loteId);
  if (linhas.isPending) return <p role="status">Carregando…</p>;
  if (linhas.isError)
    return (
      <p role="alert" className="text-destructive">
        Não foi possível carregar as linhas lidas.
      </p>
    );
  if (linhas.data.data.length === 0)
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Nenhuma linha de meio de hospedagem foi lida.
      </p>
    );
  return (
    <Table aria-label="Prévia das linhas lidas">
      <TableHeader>
        <TableRow>
          <TableHead>Linha</TableHead>
          <TableHead>Meio de hospedagem (como informado)</TableHead>
          <TableHead>{ROTULOS_OCUPACAO[fonte]} (%)</TableHead>
          <TableHead>Situação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.data.data.map((l) => (
          <TableRow key={l.id}>
            <TableCell>{l.linha}</TableCell>
            <TableCell>
              {String(l.canonico?.nomeInformado ?? l.celulas.C?.bruto ?? '—')}
            </TableCell>
            <TableCell>
              {l.canonico
                ? l.canonico.ocupacaoPercentual === null
                  ? 'não informada'
                  : String(l.canonico.ocupacaoPercentual).replace('.', ',')
                : '—'}
            </TableCell>
            <TableCell>{SITUACAO[l.situacao]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
