import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { FONTE_TIPO_COLETA, type FonteImportacao } from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { HttpError } from '@/services/http';
import { importacoesService } from '@/services/importacoes';
import { permite } from '@/utils/acesso';
import { ROTULOS_OCUPACAO } from '@/utils/importacao';
import { DestinoForm } from '../destino-form';
import { LinhaPlano } from '../linha-plano';
import {
  useConciliacaoMutations,
  useEmpreendimentosOpcoes,
  usePlano,
} from '../../hooks';

function mensagem(erro: unknown): string {
  if (erro instanceof HttpError) {
    if (erro.code === 'PLANO_DESATUALIZADO')
      return 'O plano mudou desde a conferência. Revise os totais abaixo e confirme novamente.';
    if (erro.code === 'NADA_A_CONFIRMAR')
      return 'Não há linhas prontas para aplicar. Resolva as pendências primeiro.';
    if (erro.code === 'DESTINO_INCOMPATIVEL')
      return 'Esta edição ou pergunta não aceita a carga. Escolha uma edição do tipo da planilha, já aberta.';
    if (erro.code === 'DESTINO_TRAVADO')
      return 'O destino não muda depois que linhas foram aplicadas.';
  }
  return erro instanceof Error
    ? erro.message
    : 'Não foi possível concluir a ação.';
}

/** Conferência, resolução de correspondências e confirmação com totais (parte 09). */
export function Conciliacao({
  loteId,
  fonte,
}: {
  loteId: number;
  fonte: FonteImportacao;
}) {
  const acesso = useAcessoAtual();
  const podeEditar =
    permite(acesso, 'importacoes', 'alterar') &&
    permite(acesso, 'respostas', 'criar') &&
    permite(acesso, 'respostas', 'alterar');
  const podeExportar = permite(acesso, 'importacoes', 'exportar');
  const plano = usePlano(loteId);
  const opcoes = useEmpreendimentosOpcoes(podeEditar);
  const m = useConciliacaoMutations(loteId);
  const controller = useRef<AbortController | null>(null);
  const baixar = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async () => {
      controller.current?.abort();
      const atual = new AbortController();
      controller.current = atual;
      const { arquivo, nome } = await importacoesService.rejeicoes(
        loteId,
        atual.signal,
      );
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = url;
      link.download = nome;
      document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    },
  });
  if (plano.isPending)
    return <p role="status">Carregando o plano de alterações…</p>;
  if (plano.isError)
    return (
      <p role="alert" className="text-destructive">
        Não foi possível carregar o plano de alterações.
      </p>
    );
  const p = plano.data;
  const t = p.totais;
  const ocupado = [m.decidir, m.remover, m.conflito, m.confirmar].some(
    (x) => x.isPending,
  );
  const erro =
    m.destino.error ??
    m.decidir.error ??
    m.remover.error ??
    m.conflito.error ??
    m.confirmar.error;
  const resultado = m.confirmar.data;
  /** Erros aparecem no painel; a ação nunca vira rejeição não tratada. */
  const protegida =
    <A extends unknown[]>(acao: (...a: A) => Promise<unknown>) =>
    async (...a: A) => {
      try {
        return await acao(...a);
      } catch {
        return undefined;
      }
    };
  const travado = p.confirmacao !== 'nao_confirmado';

  return (
    <section aria-label="Conciliação e confirmação" className="space-y-5">
      {p.destino ? (
        <p className="text-sm">
          <strong>Destino:</strong> {p.destino.tituloPesquisa} — período{' '}
          {p.destino.rotuloPeriodo} ({p.destino.dataInicio} a{' '}
          {p.destino.dataFim}).
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Escolha a edição que receberá as taxas de ocupação.
        </p>
      )}
      {podeEditar && !travado && (
        <DestinoForm
          tipoColeta={FONTE_TIPO_COLETA[fonte]}
          salvando={m.destino.isPending}
          onDefinir={protegida((e) => m.destino.mutateAsync(e))}
        />
      )}
      {p.avisos.length > 0 && (
        <ul
          role="note"
          className="list-disc space-y-1 rounded-lg border bg-muted p-3 pl-7 text-sm"
        >
          {p.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <div
        role="group"
        aria-label="Totais do plano"
        className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"
      >
        {[
          ['Lidas', t.lidas],
          ['Novas respostas', t.novos],
          ['Atualizações', t.atualizados],
          ['Sem mudança', t.semMudanca],
          ['Conflitos', t.conflitos],
          ['Rejeitadas', t.rejeitados],
          ['Pendentes', t.pendentes],
          ['Já aplicadas', t.aplicados],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-lg border bg-card p-2">
            <div className="text-muted-foreground">{rotulo}</div>
            <div className="text-lg font-bold">{valor}</div>
          </div>
        ))}
      </div>

      <Table aria-label="Plano de alterações">
        <TableHeader>
          <TableRow>
            <TableHead>Linha</TableHead>
            <TableHead>Nome informado</TableHead>
            <TableHead>{ROTULOS_OCUPACAO[fonte]}</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Empreendimento</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {p.itens.map((item) => (
            <LinhaPlano
              key={item.linhaId}
              item={item}
              opcoes={
                opcoes.data?.data.map((e) => ({
                  id: e.id,
                  nomeFantasia: e.nomeFantasia,
                })) ?? []
              }
              podeEditar={podeEditar}
              ocupado={ocupado}
              onDecidir={protegida((entrada) =>
                m.decidir.mutateAsync({ linhaId: item.linhaId, entrada }),
              )}
              onRemover={protegida(() => m.remover.mutateAsync(item.linhaId))}
              onConflito={protegida((entrada) =>
                m.conflito.mutateAsync({ linhaId: item.linhaId, entrada }),
              )}
            />
          ))}
        </TableBody>
      </Table>

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {mensagem(erro)}
        </p>
      )}
      {resultado && (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          {resultado.confirmacao === 'concluido'
            ? 'Confirmação concluída: '
            : 'Confirmação parcial: '}
          {resultado.criadas} criadas, {resultado.atualizadas} atualizadas,{' '}
          {resultado.semMudanca} sem mudança.
          {resultado.pendentes + resultado.conflitos > 0 &&
            ` Ainda há ${resultado.pendentes} pendentes e ${resultado.conflitos} conflitos sem aplicar.`}
          {resultado.recalculoPendente &&
            ' Os indicadores desta edição precisam ser recalculados; nada foi publicado.'}
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur">
        {podeExportar ? (
          <Button
            variant="outline"
            disabled={baixar.isPending}
            onClick={() => baixar.mutate()}
          >
            <Download aria-hidden="true" />
            {baixar.isPending ? 'Baixando…' : 'Baixar rejeições (CSV)'}
          </Button>
        ) : (
          <span />
        )}
        {podeEditar && (
          <Button
            disabled={ocupado || !p.podeConfirmar}
            onClick={() =>
              m.confirmar.mutate({ novos: t.novos, atualizados: t.atualizados })
            }
          >
            {m.confirmar.isPending
              ? 'Confirmando…'
              : `Confirmar ${t.novos} novas e ${t.atualizados} atualizações`}
          </Button>
        )}
      </div>
      {baixar.isError && (
        <p role="alert" className="text-sm text-destructive">
          {baixar.error.message}
        </p>
      )}
    </section>
  );
}
