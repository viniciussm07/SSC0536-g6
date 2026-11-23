import { useMemo, useState } from 'react';
import { COLECOES, ESQUEMA_LOTES_IMPORTACAO } from '@ssc0536/common';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { GradeColecao } from '@/components/grade-colecao';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { HttpError } from '@/services/http';
import { importacoesService } from '@/services/importacoes';
import { permite } from '@/utils/acesso';
import { colunasLotes } from './colunas';
import { DetalheLote } from './components/detalhe-lote';
import { FormularioEnvio } from './components/formulario-envio';
import { useImportacaoMutations } from './hooks';

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpError && erro.code === 'ARQUIVO_JA_RECEBIDO')
    return 'Este arquivo já foi recebido. Localize-o na lista e use "Ver leitura" ou "Refazer leitura".';
  return erro instanceof Error
    ? erro.message
    : 'Não foi possível enviar a planilha.';
}

export function ImportacoesPage() {
  const acesso = useAcessoAtual();
  const mutacoes = useImportacaoMutations();
  const [aberto, setAberto] = useState<number | null>(null);
  const podeCriar = permite(acesso, 'importacoes', 'criar');
  const podeAlterar = permite(acesso, 'importacoes', 'alterar');
  const colunas = useMemo(
    () => colunasLotes({ onVer: (lote) => setAberto(lote.id) }),
    [],
  );
  return (
    <section className="space-y-6" aria-label="Importação de planilhas">
      <CabecalhoPagina
        titulo="Importação de planilhas"
        descricao="Envie as planilhas oficiais para leitura. Cada arquivo gera uma prévia com erros e avisos; a leitura não grava respostas nem indicadores. A conciliação com os empreendimentos é a etapa seguinte."
      />
      {podeCriar && (
        <FormularioEnvio
          enviando={mutacoes.enviar.isPending}
          onEnviar={async (entrada) => {
            try {
              const lote = await mutacoes.enviar.mutateAsync(entrada);
              setAberto(lote.id);
            } catch {
              /* O erro aparece abaixo; o arquivo escolhido é mantido. */
            }
          }}
        />
      )}
      {mutacoes.enviar.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mensagemDeErro(mutacoes.enviar.error)}
        </p>
      )}
      <GradeColecao
        id="importacoes"
        rotulo="Lotes de importação"
        esquema={ESQUEMA_LOTES_IMPORTACAO}
        colunas={colunas}
        getRowId={(lote) => String(lote.id)}
        chave={['importacoes', 'lotes', acesso.usuarioId, acesso.revisao]}
        colecao={COLECOES.importacoes}
        buscar={(consulta, signal) =>
          importacoesService.listar(consulta, signal)
        }
        colunasADireita={['acoes']}
        mensagemVazia="Nenhuma planilha recebida ainda. Envie a primeira acima."
      />
      <Dialog
        open={aberto !== null}
        onOpenChange={(estado) => {
          if (!estado) {
            setAberto(null);
            mutacoes.enviar.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Leitura da planilha</DialogTitle>
            <DialogDescription>
              Prévia, erros e avisos do arquivo enviado.
            </DialogDescription>
          </DialogHeader>
          {aberto !== null && (
            <DetalheLote id={aberto} podeReler={podeAlterar} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
