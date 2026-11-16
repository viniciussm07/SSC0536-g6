import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  COLECOES,
  type DefinicaoColecao,
  type EsquemaOData,
} from '@ssc0536/common';
import { Button } from '@/components/ui/button';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { permite } from '@/utils/acesso';
import { baixarColecao } from '@/services/colecoes';
import type { ConsultaColecao } from '@/services/odata';

export function ExportarColecao({
  esquema,
  colecao = COLECOES[esquema.recurso],
  parametros = {},
  contexto,
  consulta,
}: {
  esquema: EsquemaOData;
  colecao?: DefinicaoColecao;
  parametros?: Readonly<Record<string, string | number>>;
  contexto?: number;
  consulta: Pick<ConsultaColecao, 'filter' | 'orderby'>;
}) {
  const acesso = useAcessoAtual();
  const controller = useRef<AbortController | null>(null);
  const identidade = JSON.stringify([
    acesso.usuarioId,
    acesso.revisao,
    contexto,
    parametros,
  ]);
  useEffect(() => () => controller.current?.abort(), [identidade]);
  const download = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async () => {
      controller.current?.abort();
      const atual = new AbortController();
      controller.current = atual;
      try {
        const { arquivo, nome } = await baixarColecao(
          colecao,
          parametros,
          consulta,
          atual.signal,
          contexto,
        );
        atual.signal.throwIfAborted();
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
      } catch (erro) {
        if (!atual.signal.aborted) throw erro;
      }
    },
  });
  if (
    !colecao?.exportacao ||
    !permite(acesso, colecao.recursoAcesso, 'consultar') ||
    !permite(acesso, colecao.recursoAcesso, 'exportar')
  )
    return null;
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        disabled={download.isPending}
        onClick={() => download.mutate()}
      >
        {download.isPending ? 'Exportando…' : 'Exportar CSV'}
      </Button>
      {download.isError && <p role="alert">{download.error.message}</p>}
    </div>
  );
}
