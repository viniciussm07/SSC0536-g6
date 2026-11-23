import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { COLECOES, ESQUEMA_LOTES_IMPORTACAO } from '@ssc0536/common';
import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { GradeColecao } from '@/components/grade-colecao';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { HttpError } from '@/services/http';
import { importacoesService } from '@/services/importacoes';
import { permite } from '@/utils/acesso';
import { colunasLotes } from './colunas';
import { FormularioEnvio } from './components/formulario-envio';
import { useEnviarImportacao } from './hooks';

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpError && erro.code === 'ARQUIVO_JA_RECEBIDO')
    return 'Este arquivo já foi recebido. Localize-o na lista e abra a leitura.';
  return erro instanceof Error
    ? erro.message
    : 'Não foi possível enviar a planilha.';
}

export function ImportacoesPage() {
  const acesso = useAcessoAtual();
  const navegar = useNavigate();
  const enviar = useEnviarImportacao();
  const podeCriar = permite(acesso, 'importacoes', 'criar');
  const abrir = (loteId: number) =>
    void navegar({
      to: '/importacoes/$loteId',
      params: { loteId: String(loteId) },
    });
  const colunas = useMemo(
    () => colunasLotes({ onVer: (lote) => abrir(lote.id) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <section className="space-y-6" aria-label="Importação de planilhas">
      <CabecalhoPagina
        titulo="Importação de planilhas"
        descricao="Envie as planilhas oficiais para leitura. Cada arquivo abre uma página própria com a prévia, os erros e a conciliação; a leitura não grava respostas nem indicadores."
      />
      {podeCriar && (
        <FormularioEnvio
          enviando={enviar.isPending}
          onEnviar={async (entrada) => {
            try {
              const lote = await enviar.mutateAsync(entrada);
              abrir(lote.id);
            } catch {
              /* O erro aparece abaixo; o arquivo escolhido é mantido. */
            }
          }}
        />
      )}
      {enviar.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mensagemDeErro(enviar.error)}
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
    </section>
  );
}
