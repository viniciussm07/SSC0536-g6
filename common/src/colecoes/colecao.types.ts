import type { EsquemaOData } from '../odata/odata.types.js';
import type { RecursoAcesso } from '../acesso/permissoes.types.js';

export interface ColunaCsv {
  campo: string;
  rotulo: string;
}
export interface DefinicaoColecao {
  caminho: string;
  esquema: EsquemaOData;
  recursoAcesso: RecursoAcesso;
  contexto?: boolean;
  exportacao?:
    boolean | { nomeArquivo?: string; colunas?: readonly ColunaCsv[] };
}
