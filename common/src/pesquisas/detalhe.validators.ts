import { TIPOS_VALOR_CAMPO } from './pesquisa.constants.js';
import type {
  CampoModelo,
  ModeloPesquisaDetalhe,
  ModeloPesquisaLinha,
  OpcaoCampo,
  VersaoModeloLinha,
} from './pesquisa.types.js';

type Objeto = Record<string, unknown>;

const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0;
const textoOuNulo = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

export function isOpcaoCampo(v: unknown): v is OpcaoCampo {
  return (
    objeto(v) && texto(v.chave) && texto(v.rotulo) && Number.isInteger(v.ordem)
  );
}

export function isCampoModelo(v: unknown): v is CampoModelo {
  return (
    objeto(v) &&
    texto(v.chave) &&
    texto(v.rotulo) &&
    typeof v.tipoValor === 'string' &&
    (TIPOS_VALOR_CAMPO as readonly string[]).includes(v.tipoValor) &&
    typeof v.obrigatorio === 'boolean' &&
    Number.isInteger(v.ordem) &&
    Array.isArray(v.opcoes) &&
    v.opcoes.every(isOpcaoCampo)
  );
}

export function isModeloPesquisaLinha(v: unknown): v is ModeloPesquisaLinha {
  return (
    objeto(v) &&
    Number.isInteger(v.id) &&
    texto(v.nome) &&
    texto(v.publicoAlvo) &&
    Number.isInteger(v.versao) &&
    typeof v.criadaEm === 'string' &&
    !Number.isNaN(Date.parse(v.criadaEm))
  );
}

export function isVersaoModeloLinha(v: unknown): v is VersaoModeloLinha {
  return (
    objeto(v) &&
    Number.isInteger(v.numero) &&
    texto(v.nome) &&
    texto(v.publicoAlvo) &&
    typeof v.criadaEm === 'string' &&
    !Number.isNaN(Date.parse(v.criadaEm)) &&
    textoOuNulo(v.motivo)
  );
}

export function isModeloPesquisaDetalhe(
  v: unknown,
): v is ModeloPesquisaDetalhe {
  const campos = (v as unknown as Objeto).campos;
  return (
    isModeloPesquisaLinha(v) &&
    Array.isArray(campos) &&
    (campos as unknown[]).every(
      (c) => objeto(c) && Number.isInteger(c.id) && isCampoModelo(c),
    )
  );
}
