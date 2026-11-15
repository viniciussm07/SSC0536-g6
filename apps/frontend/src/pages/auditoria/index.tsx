import { useMemo, useState } from 'react';
import {
  ESQUEMA_AUDITORIAS,
  type EventoAuditoriaResumo,
} from '@ssc0536/common';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { GradeColecao } from '@/components/grade-colecao';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { auditoriaService } from '@/services/auditoria';
import { colunasAuditoria } from './colunas';
import { DetalheEvento } from './components/detalhe-evento';
export function AuditoriaPage() {
  const acesso = useAcessoAtual();
  const [selecionado, setSelecionado] = useState<EventoAuditoriaResumo | null>(
    null,
  );
  const colunas = useMemo(() => colunasAuditoria(setSelecionado), []);
  return (
    <section className="space-y-6" aria-label="Auditoria de alterações">
      <CabecalhoPagina
        titulo="Auditoria de alterações"
        descricao="Consulte quem alterou cada registro e quando. Filtre por entidade, registro, período, autor, ação ou origem nos cabeçalhos da tabela."
      />
      <GradeColecao
        id="auditorias"
        staleTime={0}
        rotulo="Eventos de auditoria"
        esquema={ESQUEMA_AUDITORIAS}
        colunas={colunas}
        getRowId={(e) => String(e.id)}
        chave={['auditoria', acesso.usuarioId, acesso.revisao]}
        buscar={(consulta, signal) => auditoriaService.listar(consulta, signal)}
        colunasADireita={['acoes']}
        mensagemVazia="Nenhum evento encontrado para os filtros informados."
      />
      <Dialog
        open={selecionado !== null}
        onOpenChange={(a) => !a && setSelecionado(null)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Evento {selecionado?.id}</DialogTitle>
            <DialogDescription>
              Registro histórico de alterações, disponível somente para
              consulta.
            </DialogDescription>
          </DialogHeader>
          {selecionado && (
            <DetalheEvento key={selecionado.id} id={selecionado.id} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
