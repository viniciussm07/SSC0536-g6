import type { TipoValorCampo } from './pesquisa.constants.js';

export type { TipoValorCampo };

/** Opção de um campo de escolha. */
export interface OpcaoCampo {
  chave: string;
  rotulo: string;
  ordem: number;
}

/** Campo do formulário do modelo. `opcoes` só existe em `tipoValor: 'escolha'`. */
export interface CampoModelo {
  chave: string;
  rotulo: string;
  tipoValor: TipoValorCampo;
  obrigatorio: boolean;
  ordem: number;
  opcoes: OpcaoCampo[];
}

export interface EntradaModeloPesquisa {
  nome: string;
  publicoAlvo: string;
  campos: CampoModelo[];
}

/**
 * Alteração parcial do modelo. `campos`, quando presente, substitui o conjunto
 * inteiro preservando a identidade pela `chave`; mudanças semânticas geram nova versão.
 */
export interface AlteracaoModeloPesquisa {
  nome?: string;
  publicoAlvo?: string;
  campos?: CampoModelo[];
  motivo?: string;
}

/** Linha de `GET /modelos-pesquisa`. */
export interface ModeloPesquisaLinha {
  id: number;
  nome: string;
  publicoAlvo: string;
  versao: number;
  criadaEm: string;
}

/** Linha de `GET /modelos-pesquisa/:id/versoes` (histórico imutável). */
export interface VersaoModeloLinha {
  numero: number;
  nome: string;
  publicoAlvo: string;
  criadaEm: string;
  motivo: string | null;
}

export interface ModeloPesquisaDetalhe extends ModeloPesquisaLinha {
  campos: (CampoModelo & { id: number })[];
}
