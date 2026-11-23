import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { ConsultaPainel, FormatoExportacaoPainel } from '@ssc0536/common';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { painelService } from '@/services/painel';

/** Exporta os indicadores exibidos (mesma seleção de período, coleta e comparação). */
export function ExportarPainel({ consulta }: { consulta: ConsultaPainel }) {
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const download = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (formato: FormatoExportacaoPainel) => {
      controller.current?.abort();
      const atual = new AbortController();
      controller.current = atual;
      try {
        const { arquivo, nome } = await painelService.exportar(
          consulta,
          formato,
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
      } catch (erro) {
        if (!atual.signal.aborted) throw erro;
      }
    },
  });
  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={download.isPending}>
            <Download aria-hidden="true" />
            {download.isPending ? 'Exportando…' : 'Exportar'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => download.mutate('pdf')}>
            <FileText aria-hidden="true" /> PDF (.pdf)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => download.mutate('xlsx')}>
            <FileSpreadsheet aria-hidden="true" /> Excel (.xlsx)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {download.isError && (
        <p role="alert" className="text-xs text-destructive">
          {download.error.message}
        </p>
      )}
    </div>
  );
}
