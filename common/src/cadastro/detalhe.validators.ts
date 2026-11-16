import { isEmpreendimentoResumo } from '../acesso/consultas.validators.js';
import {
  FINALIDADES_CONTATO,
  PENDENCIAS_CADASTRO,
  SITUACOES_CADASTUR,
  TIPOS_CONTATO,
  ZONAS,
} from './cadastro.constants.js';
import type {
  CadasturCadastro,
  ContatoCadastro,
  EmpreendimentoDetalhe,
  EmpreendimentoListado,
  SegmentoResumo,
} from './cadastro.types.js';

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const id = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const textoOuNulo = (v: unknown) => v === null || typeof v === 'string';
const incluido = (lista: readonly string[], v: unknown) =>
  typeof v === 'string' && lista.includes(v);

export function isSegmentoResumo(value: unknown): value is SegmentoResumo {
  return (
    objeto(value) &&
    id(value.id) &&
    typeof value.chave === 'string' &&
    typeof value.nome === 'string' &&
    typeof value.nivelCadastro === 'string'
  );
}
export function isContatoCadastro(value: unknown): value is ContatoCadastro {
  return (
    objeto(value) &&
    id(value.id) &&
    incluido(TIPOS_CONTATO, value.tipo) &&
    typeof value.valor === 'string' &&
    incluido(FINALIDADES_CONTATO, value.finalidade) &&
    textoOuNulo(value.responsavelNome) &&
    textoOuNulo(value.responsavelCargo)
  );
}
export function isCadasturCadastro(value: unknown): value is CadasturCadastro {
  return (
    objeto(value) &&
    id(value.id) &&
    incluido(SITUACOES_CADASTUR, value.situacao) &&
    textoOuNulo(value.numero) &&
    textoOuNulo(value.vencimento)
  );
}
export function isEmpreendimentoListado(
  value: unknown,
): value is EmpreendimentoListado {
  return (
    isEmpreendimentoResumo(value) &&
    ['totalUh', 'leitos', 'funcFixos', 'funcTemporarios'].every((campo) => {
      const v = (value as unknown as Objeto)[campo];
      return (
        v === undefined ||
        v === null ||
        (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0)
      );
    }) &&
    ((value as unknown as Objeto).zona === undefined ||
      (value as unknown as Objeto).zona === null ||
      incluido(ZONAS, (value as unknown as Objeto).zona)) &&
    ((value as unknown as Objeto).endereco === undefined ||
      textoOuNulo((value as unknown as Objeto).endereco)) &&
    textoOuNulo((value as unknown as Objeto).tipoHospedagem) &&
    Array.isArray((value as unknown as Objeto).pendencias) &&
    ((value as unknown as Objeto).pendencias as unknown[]).every((p) =>
      incluido(PENDENCIAS_CADASTRO, p),
    )
  );
}
export function isEmpreendimentoDetalhe(
  value: unknown,
): value is EmpreendimentoDetalhe {
  if (!isEmpreendimentoListado(value)) return false;
  const v = value as unknown as Objeto;
  const localizacao = v.localizacao;
  return (
    textoOuNulo(v.razaoSocial) &&
    textoOuNulo(v.idOrigem) &&
    textoOuNulo(v.categoriaIndicador) &&
    textoOuNulo(v.endereco) &&
    (v.zona === null || incluido(ZONAS, v.zona)) &&
    (localizacao === null ||
      (objeto(localizacao) &&
        typeof localizacao.longitude === 'number' &&
        typeof localizacao.latitude === 'number')) &&
    textoOuNulo(v.dataInicioAtividades) &&
    textoOuNulo(v.dataEncerramento) &&
    Array.isArray(v.segmentos) &&
    v.segmentos.every(isSegmentoResumo) &&
    Array.isArray(v.contatos) &&
    v.contatos.every(isContatoCadastro) &&
    Array.isArray(v.cadastur) &&
    v.cadastur.every(isCadasturCadastro)
  );
}
