import { useState } from 'react';
import {
  COLECOES,
  ESQUEMA_DESTINATARIOS,
  type PesquisaDetalhe,
} from '@ssc0536/common';
import { Badge } from '@/components/badge';
import { GradeColecao } from '@/components/grade-colecao';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { edicoesService } from '@/services/edicoes';
import { formatarInstante } from '@/utils/data-hora';
import {
  CORES_SITUACAO_PESQUISA,
  ROTULOS_SITUACAO_PESQUISA,
  ROTULOS_TIPO_COLETA,
} from '@/utils/pesquisa';
import { colunasDestinatarios } from '../../colunas';

type Confirmacao = 'abrir' | 'encerrar' | 'excluir' | null;

const TEXTO_CONFIRMACAO: Record<Exclude<Confirmacao, null>, string> = {
  abrir:
    'Ao abrir, os empreendimentos elegíveis agora passam a ser o público fixo desta edição. Tipo, modelo, períodos e público não poderão mais mudar.',
  encerrar:
    'Encerrar impede novos envios e correções. A reabertura depende de regra a definir com o OTO.',
  excluir: 'O rascunho será excluído. Edições abertas nunca são excluídas.',
};
const ROTULO_CONFIRMAR: Record<Exclude<Confirmacao, null>, string> = {
  abrir: 'Confirmar abertura',
  encerrar: 'Confirmar encerramento',
  excluir: 'Confirmar exclusão',
};

function Contagem({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-2xl font-semibold tabular-nums">
        {valor === null ? '—' : valor}
      </dd>
    </div>
  );
}

/**
 * Revisão antes de abrir e acompanhamento: situação, janela, períodos, contagens de
 * participação (separadas de taxas de ocupação) e destinatários.
 */
export function AcompanhamentoEdicao({
  detalhe,
  podeAlterar,
  pendente,
  onAbrir,
  onEncerrar,
  onExcluir,
  onEditar,
}: {
  detalhe: PesquisaDetalhe;
  podeAlterar: boolean;
  pendente: boolean;
  onAbrir: () => Promise<unknown>;
  onEncerrar: () => Promise<unknown>;
  onExcluir: () => Promise<unknown>;
  onEditar: () => void;
}) {
  const acesso = useAcessoAtual();
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const { participacao: p } = detalhe;
  const rascunho = detalhe.status === 'rascunho';
  const aberta = detalhe.status === 'aberta';
  const executar = async (acao: Exclude<Confirmacao, null>) => {
    try {
      if (acao === 'abrir') await onAbrir();
      if (acao === 'encerrar') await onEncerrar();
      if (acao === 'excluir') await onExcluir();
      setConfirmacao(null);
    } catch {
      /* Erro apresentado pela página. */
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge cor={CORES_SITUACAO_PESQUISA[detalhe.situacao]}>
          {ROTULOS_SITUACAO_PESQUISA[detalhe.situacao]}
        </Badge>
        <Badge cor="cinza" ponto={false}>
          {ROTULOS_TIPO_COLETA[detalhe.tipoColeta]}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {detalhe.modeloNome} · versão {detalhe.modeloVersao}
        </span>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Abertura</dt>
          <dd>{formatarInstante(detalhe.abertura)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Prazo</dt>
          <dd>{formatarInstante(detalhe.prazo)}</dd>
        </div>
        {detalhe.encerradaEm && (
          <div>
            <dt className="text-muted-foreground">Encerrada em</dt>
            <dd>{formatarInstante(detalhe.encerradaEm)}</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Períodos</dt>
          <dd>
            {detalhe.periodos
              .map((x) => `${x.rotulo} (${x.dataInicio} a ${x.dataFim})`)
              .join('; ')}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Perguntas</dt>
          <dd>
            {detalhe.perguntas.length} (
            {new Set(detalhe.perguntas.map((q) => q.campoId)).size} campos ×{' '}
            {detalhe.periodos.length} períodos)
          </dd>
        </div>
      </dl>

      <section aria-label="Participação" className="space-y-2">
        <h3 className="text-sm font-medium">Participação</h3>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Contagem
            rotulo={rascunho ? 'Elegíveis agora' : 'Elegíveis'}
            valor={p.elegiveis}
          />
          <Contagem rotulo="Destinatários" valor={p.destinatarios} />
          <Contagem rotulo="Respondentes" valor={p.respondentes} />
          <Contagem rotulo="Pendentes" valor={p.pendentes} />
        </dl>
        {!rascunho && p.destinatarios === null && (
          <p className="text-sm text-muted-foreground">
            Edição anterior ao registro de público: só os respondentes são
            conhecidos.
          </p>
        )}
      </section>

      {podeAlterar && (rascunho || aberta) && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onEditar} disabled={pendente}>
            Editar
          </Button>
          {rascunho && (
            <>
              <Button
                onClick={() => setConfirmacao('abrir')}
                disabled={pendente}
              >
                Revisar e abrir
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmacao('excluir')}
                disabled={pendente}
              >
                Excluir rascunho
              </Button>
            </>
          )}
          {aberta && (
            <Button
              variant="outline"
              onClick={() => setConfirmacao('encerrar')}
              disabled={pendente}
            >
              Encerrar edição
            </Button>
          )}
        </div>
      )}

      {confirmacao && (
        <div
          role="alertdialog"
          aria-label={ROTULO_CONFIRMAR[confirmacao]}
          className="space-y-3 rounded-lg border border-warning bg-warning/10 p-4"
        >
          <p className="text-sm">
            {TEXTO_CONFIRMACAO[confirmacao]}
            {confirmacao === 'abrir' &&
              ` Elegíveis agora: ${p.elegiveis ?? 0}.`}
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => void executar(confirmacao)}
              disabled={pendente}
            >
              {ROTULO_CONFIRMAR[confirmacao]}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmacao(null)}
              disabled={pendente}
            >
              Voltar
            </Button>
          </div>
        </div>
      )}

      {p.destinatarios !== null && (
        <GradeColecao
          id="destinatarios"
          parametros={{ id: detalhe.id }}
          rotulo="Destinatários"
          esquema={ESQUEMA_DESTINATARIOS}
          colunas={colunasDestinatarios}
          getRowId={(d) => String(d.empreendimentoId)}
          chave={[
            'pesquisas',
            'destinatarios',
            acesso.usuarioId,
            acesso.revisao,
            detalhe.id,
          ]}
          colecao={COLECOES.destinatariosPesquisa}
          buscar={(consulta, signal) =>
            edicoesService.destinatarios(detalhe.id, consulta, signal)
          }
          mensagemVazia="Nenhum destinatário encontrado."
        />
      )}
    </div>
  );
}
