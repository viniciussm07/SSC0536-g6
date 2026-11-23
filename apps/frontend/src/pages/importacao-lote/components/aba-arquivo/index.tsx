import type { LoteImportacaoDetalhe } from '@ssc0536/common';
import {
  ROTULOS_FONTE,
  formatarInstante,
  formatarTamanho,
} from '@/utils/importacao';

/** Metadados do arquivo e da leitura, para conferência e suporte. */
export function AbaArquivo({ lote }: { lote: LoteImportacaoDetalhe }) {
  const itens: Array<[string, string]> = [
    ['Arquivo', lote.nomeArquivo],
    ['Tipo de planilha', ROTULOS_FONTE[lote.fonte]],
    ['Versão do mapeamento', lote.versaoParser],
    ['Tamanho', formatarTamanho(lote.tamanhoBytes)],
    ['Recebido em', formatarInstante(lote.criadoEm)],
    ['Lido em', formatarInstante(lote.lidoEm)],
    ['Impressão digital (SHA-256)', lote.sha256],
  ];
  const resumo = lote.resumo;
  return (
    <div className="space-y-5">
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo} className="min-w-0">
            <dt className="text-muted-foreground">{rotulo}</dt>
            <dd className="break-all">{valor}</dd>
          </div>
        ))}
      </dl>
      {resumo && (
        <section aria-label="Abas da planilha" className="space-y-2">
          <h3 className="font-heading font-bold">Abas da planilha</h3>
          <ul className="space-y-1 text-sm">
            {resumo.abas.map((aba) => (
              <li key={aba.nome}>
                <strong>{aba.nome}</strong>:{' '}
                {aba.situacao === 'lida' ? 'lida' : 'ignorada'}
                {aba.motivo && (
                  <span className="text-muted-foreground"> — {aba.motivo}</span>
                )}
              </li>
            ))}
          </ul>
          {resumo.colunasIgnoradas.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Colunas calculadas não lidas: {resumo.colunasIgnoradas.join(', ')}
              .
            </p>
          )}
        </section>
      )}
    </div>
  );
}
