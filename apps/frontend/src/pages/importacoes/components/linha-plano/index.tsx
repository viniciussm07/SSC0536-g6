import type {
  EntradaConflito,
  EntradaDecisao,
  ItemPlano,
} from '@ssc0536/common';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { useAppForm } from '@/hooks/use-app-form';
import {
  CORES_SITUACAO_PLANO,
  ROTULOS_MOTIVO_PLANO,
  ROTULOS_SITUACAO_PLANO,
  formatarPercentual,
} from '../../rotulos-plano';

export interface OpcaoEmpreendimento {
  id: number;
  nomeFantasia: string;
}

/** Uma linha do plano com as ações que a situação permite; só o servidor decide o resultado. */
export function LinhaPlano({
  item,
  opcoes,
  podeEditar,
  ocupado,
  onDecidir,
  onRemover,
  onConflito,
}: {
  item: ItemPlano;
  opcoes: readonly OpcaoEmpreendimento[];
  podeEditar: boolean;
  ocupado: boolean;
  onDecidir: (entrada: EntradaDecisao) => Promise<unknown>;
  onRemover: () => Promise<unknown>;
  onConflito: (entrada: EntradaConflito) => Promise<unknown>;
}) {
  const aplicada = item.situacao === 'aplicado';
  const editavel = podeEditar && !aplicada;
  return (
    <TableRow>
      <TableCell>{item.linha}</TableCell>
      <TableCell className="whitespace-normal">
        {item.nomeInformado ?? '—'}
      </TableCell>
      <TableCell>{formatarPercentual(item.ocupacaoPercentual)}</TableCell>
      <TableCell className="whitespace-normal">
        <div className="space-y-1">
          <Badge cor={CORES_SITUACAO_PLANO[item.situacao]}>
            {ROTULOS_SITUACAO_PLANO[item.situacao]}
          </Badge>
          {item.motivo && (
            <p className="text-xs text-muted-foreground">
              {ROTULOS_MOTIVO_PLANO[item.motivo]}
            </p>
          )}
          {aplicada && item.acaoAplicada && (
            <p className="text-xs text-muted-foreground">
              {
                {
                  criar: 'Resposta criada',
                  atualizar: 'Resposta atualizada',
                  sem_mudanca: 'Já estava igual',
                }[item.acaoAplicada]
              }
            </p>
          )}
        </div>
      </TableCell>
      <TableCell className="whitespace-normal">
        {item.empreendimento ? (
          <div className="space-y-1">
            <p className="font-medium">{item.empreendimento.nomeFantasia}</p>
            {item.origemDecisao === 'correspondencia_salva' && (
              <p className="text-xs text-muted-foreground">
                Correspondência decidida antes por uma pessoa.
              </p>
            )}
            {item.valorAtual !== null && (
              <p className="text-xs text-muted-foreground">
                Já gravado: {formatarPercentual(item.valorAtual)}
              </p>
            )}
          </div>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="whitespace-normal">
        {editavel && (
          <div className="flex flex-wrap items-start gap-2">
            {item.situacao === 'conflito' && (
              <>
                <Button
                  size="sm"
                  disabled={ocupado}
                  onClick={() => void onConflito({ resolucao: 'substituir' })}
                >
                  Substituir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={ocupado}
                  onClick={() => void onConflito({ resolucao: 'manter' })}
                >
                  Manter existente
                </Button>
              </>
            )}
            {(item.situacao === 'pendente' ||
              item.motivo === 'EMPREENDIMENTO_DUPLICADO_NO_LOTE') && (
              <FormVinculo
                item={item}
                opcoes={opcoes}
                ocupado={ocupado}
                onDecidir={onDecidir}
              />
            )}
            {item.situacao !== 'conflito' &&
              item.situacao !== 'rejeitado' &&
              item.motivo !== 'SEM_OCUPACAO' &&
              item.motivo !== 'ERRO_DE_LEITURA' &&
              item.situacao !== 'sem_mudanca' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={ocupado}
                  onClick={() => void onDecidir({ tipo: 'rejeitar' })}
                >
                  Rejeitar
                </Button>
              )}
            {item.motivo === 'REJEITADO_MANUALMENTE' ||
            item.origemDecisao === 'manual' ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={ocupado}
                onClick={() => void onRemover()}
              >
                Desfazer decisão
              </Button>
            ) : null}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function FormVinculo({
  item,
  opcoes,
  ocupado,
  onDecidir,
}: {
  item: ItemPlano;
  opcoes: readonly OpcaoEmpreendimento[];
  ocupado: boolean;
  onDecidir: (entrada: EntradaDecisao) => Promise<unknown>;
}) {
  const candidatos = item.candidatos;
  const ids = new Set(candidatos.map((c) => c.id));
  const form = useAppForm({
    defaultValues: { empreendimentoId: '' },
    validators: {
      onSubmit: ({ value }) =>
        value.empreendimentoId ? undefined : 'Escolha o empreendimento.',
    },
    onSubmit: async ({ value }) => {
      await onDecidir({
        tipo: 'vincular',
        empreendimentoId: Number(value.empreendimentoId),
      });
    },
  });
  return (
    <form
      noValidate
      aria-label={`Vincular linha ${item.linha}`}
      className="flex items-end gap-2"
      onSubmit={(evento) => {
        evento.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="empreendimentoId">
        {(campo) => (
          <campo.Select
            label={`Empreendimento da linha ${item.linha}`}
            options={[
              {
                value: '',
                label: candidatos.length
                  ? 'Escolha (sugestões primeiro)'
                  : 'Escolha o empreendimento',
              },
              ...candidatos.map((c) => ({
                value: String(c.id),
                label: `Sugestão: ${c.nomeFantasia}`,
              })),
              ...opcoes
                .filter((o) => !ids.has(o.id))
                .map((o) => ({ value: String(o.id), label: o.nomeFantasia })),
            ]}
          />
        )}
      </form.AppField>
      <Button type="submit" size="sm" disabled={ocupado}>
        Vincular
      </Button>
    </form>
  );
}
