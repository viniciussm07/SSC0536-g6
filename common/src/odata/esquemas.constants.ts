import {
  ACOES_ACESSO,
  ESCOPOS_ACESSO,
  PERFIS,
  RECURSOS_ACESSO,
} from '../acesso/permissoes.constants.js';
import {
  FINALIDADES_CONTATO,
  PENDENCIAS_CADASTRO,
  SITUACOES_CADASTUR,
  SITUACOES_EMPREENDIMENTO,
  TIPOS_CONTATO,
  ZONAS,
} from '../cadastro/cadastro.constants.js';
import { TIPOS_PERIODO } from '../periodos/periodo.constants.js';
import {
  SITUACOES_DESTINATARIO,
  STATUS_PESQUISA,
  TIPOS_COLETA,
} from '../pesquisas/edicao.constants.js';
import type {
  CampoOData,
  EsquemaOData,
  TipoCampoOData,
} from './odata.types.js';

const campo = (
  nome: string,
  tipo: TipoCampoOData,
  opcoes: Partial<Omit<CampoOData, 'nome' | 'tipo'>> = {},
): CampoOData => ({
  nome,
  tipo,
  anulavel: false,
  filtravel: true,
  ordenavel: true,
  virtual: false,
  ...opcoes,
});
const asc = (c: string) => ({ campo: c, direcao: 'asc' as const });
const desc = (c: string) => ({ campo: c, direcao: 'desc' as const });

export const SITUACOES_CONFERENCIA_INVENTARIO = [
  'completo',
  'parcial',
  'pendente',
] as const;

/** Colunas devolvidas por `GET /contas`. */
export const ESQUEMA_CONTAS: EsquemaOData = {
  recurso: 'contas',
  campos: [
    campo('id', 'inteiro'),
    campo('nome', 'texto'),
    campo('email', 'texto'),
    campo('perfil', 'enum', { valores: PERFIS }),
    campo('ativo', 'booleano'),
  ],
  ordenacaoPadrao: [asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /contas/:id/vinculos`. */
export const ESQUEMA_VINCULOS_CONTA: EsquemaOData = {
  recurso: 'vinculos',
  campos: [
    campo('empreendimentoId', 'inteiro'),
    campo('nomeFantasia', 'texto'),
    campo('ativo', 'booleano'),
  ],
  ordenacaoPadrao: [asc('empreendimentoId')],
  desempate: ['empreendimentoId'],
};

/** Colunas de `GET /perfis/:perfil/visibilidades`. */
export const ESQUEMA_VISIBILIDADES: EsquemaOData = {
  recurso: 'visibilidades',
  campos: [
    campo('indicadorId', 'inteiro'),
    campo('nome', 'texto'),
    // Calculado pelo vínculo do perfil (ausência = falso): filtrável, mas não ordenável.
    campo('permitido', 'booleano', {
      virtual: true,
      ordenavel: false,
      operadores: ['eq', 'ne'],
    }),
  ],
  ordenacaoPadrao: [asc('indicadorId')],
  desempate: ['indicadorId'],
};

/** Colunas de `GET /perfis/:perfil/permissoes`. */
export const ESQUEMA_PERMISSOES: EsquemaOData = {
  recurso: 'permissoes',
  campos: [
    campo('recurso', 'enum', { valores: RECURSOS_ACESSO }),
    campo('acao', 'enum', { valores: ACOES_ACESSO }),
    campo('escopo', 'enum', { valores: ESCOPOS_ACESSO }),
  ],
  ordenacaoPadrao: [asc('recurso'), asc('acao')],
  desempate: ['recurso', 'acao'],
};

/**
 * Colunas de `GET /empreendimentos`. `identificacao` (CNPJ ou ID) e `pendencia` (informação
 * faltante, múltipla por linha) são virtuais: filtráveis, mas não ordenáveis.
 */
export const ESQUEMA_EMPREENDIMENTOS: EsquemaOData = {
  recurso: 'empreendimentos',
  campos: [
    campo('id', 'inteiro'),
    campo('nomeFantasia', 'texto'),
    campo('cnpj', 'texto', { anulavel: true }),
    campo('identificacao', 'texto', {
      virtual: true,
      ordenavel: false,
      operadores: ['eq', 'contains'],
    }),
    campo('situacao', 'enum', { valores: SITUACOES_EMPREENDIMENTO }),
    campo('tipoHospedagem', 'texto', { anulavel: true }),
    campo('zona', 'enum', { anulavel: true, valores: ZONAS }),
    campo('endereco', 'texto', { anulavel: true }),
    campo('leitos', 'inteiro', {
      anulavel: true,
      virtual: true,
      ordenavel: false,
    }),
    campo('totalUh', 'inteiro', {
      anulavel: true,
      virtual: true,
      ordenavel: false,
    }),
    campo('funcFixos', 'inteiro', {
      anulavel: true,
      virtual: true,
      ordenavel: false,
    }),
    campo('funcTemporarios', 'inteiro', {
      anulavel: true,
      virtual: true,
      ordenavel: false,
    }),
    campo('pendencia', 'enum', {
      valores: PENDENCIAS_CADASTRO,
      virtual: true,
      ordenavel: false,
      operadores: ['eq', 'ne', 'in'],
    }),
  ],
  ordenacaoPadrao: [asc('nomeFantasia'), asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /empreendimentos/:id/contatos`. */
export const ESQUEMA_CONTATOS: EsquemaOData = {
  recurso: 'contatos',
  campos: [
    campo('id', 'inteiro'),
    campo('tipo', 'enum', { valores: TIPOS_CONTATO }),
    campo('valor', 'texto'),
    campo('finalidade', 'enum', { valores: FINALIDADES_CONTATO }),
    campo('responsavelNome', 'texto', { anulavel: true }),
    campo('responsavelCargo', 'texto', { anulavel: true }),
  ],
  ordenacaoPadrao: [asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /empreendimentos/:id/cadastur`. */
export const ESQUEMA_CADASTUR: EsquemaOData = {
  recurso: 'cadastur',
  campos: [
    campo('id', 'inteiro'),
    campo('situacao', 'enum', { valores: SITUACOES_CADASTUR }),
    campo('numero', 'texto', { anulavel: true }),
    campo('vencimento', 'data', { anulavel: true }),
  ],
  ordenacaoPadrao: [asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /empreendimentos/:id/inventarios`. */
export const ESQUEMA_INVENTARIOS: EsquemaOData = {
  recurso: 'inventarios',
  campos: [
    campo('id', 'inteiro'),
    campo('vigenciaInicio', 'data'),
    campo('vigenciaFim', 'data', { anulavel: true }),
    campo('totalUh', 'inteiro', { anulavel: true }),
    campo('leitos', 'inteiro', { anulavel: true }),
    campo('situacaoConferencia', 'enum', {
      valores: SITUACOES_CONFERENCIA_INVENTARIO,
    }),
    campo('tipoAlteracao', 'enum', {
      valores: ['correcao', 'mudanca_real'],
    }),
    campo('criadaEm', 'datahora'),
    campo('autor', 'texto'),
    campo('substituidaPorId', 'inteiro', { anulavel: true }),
  ],
  ordenacaoPadrao: [desc('vigenciaInicio'), desc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /empreendimentos/:id/respostas`. */
export const ESQUEMA_RESPOSTAS: EsquemaOData = {
  recurso: 'respostas',
  campos: [
    campo('id', 'inteiro'),
    campo('pesquisaId', 'inteiro'),
    campo('titulo', 'texto'),
    campo('respondidaEm', 'datahora'),
    campo('canal', 'texto'),
  ],
  ordenacaoPadrao: [asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /indicadores`. */
export const ESQUEMA_INDICADORES: EsquemaOData = {
  recurso: 'indicadores',
  campos: [
    campo('id', 'inteiro'),
    campo('indicadorId', 'inteiro'),
    campo('nome', 'texto'),
    campo('unidade', 'texto'),
    campo('periodo', 'texto'),
    campo('tipoColeta', 'texto'),
    campo('recorte', 'texto'),
    campo('metodo', 'texto'),
    campo('valor', 'decimal'),
  ],
  ordenacaoPadrao: [asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /catalogos/grupos` (gestão dos catálogos do formulário). */
export const ESQUEMA_CATALOGO_GRUPOS: EsquemaOData = {
  recurso: 'catalogoGrupos',
  campos: [
    campo('id', 'inteiro'),
    campo('segmentoId', 'inteiro'),
    campo('chave', 'texto'),
    campo('pergunta', 'texto'),
    campo('secao', 'texto', { anulavel: true }),
    campo('selecao', 'enum', { valores: ['unica', 'multipla'] }),
    campo('permiteOutro', 'booleano'),
    campo('ordem', 'inteiro'),
    campo('ativo', 'booleano'),
  ],
  ordenacaoPadrao: [asc('ordem'), asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /catalogos/itens`. */
export const ESQUEMA_CATALOGO_ITENS: EsquemaOData = {
  recurso: 'catalogoItens',
  campos: [
    campo('id', 'inteiro'),
    campo('grupoId', 'inteiro'),
    campo('grupoChave', 'texto'),
    campo('chave', 'texto'),
    campo('rotulo', 'texto'),
    campo('exclusivo', 'booleano'),
    campo('outro', 'booleano'),
    campo('aceitaQuantidade', 'booleano'),
    campo('ordem', 'inteiro'),
    campo('ativo', 'booleano'),
    campo('versao', 'inteiro'),
  ],
  ordenacaoPadrao: [asc('grupoId'), asc('ordem'), asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /catalogos/itens/:id/versoes` (histórico imutável do item). */
export const ESQUEMA_CATALOGO_VERSOES: EsquemaOData = {
  recurso: 'catalogoVersoes',
  campos: [
    campo('numero', 'inteiro'),
    campo('rotulo', 'texto'),
    campo('pergunta', 'texto'),
    campo('selecao', 'enum', { valores: ['unica', 'multipla'] }),
    campo('exclusivo', 'booleano'),
    campo('outro', 'booleano'),
    campo('aceitaQuantidade', 'booleano'),
    campo('criadaEm', 'datahora'),
    campo('motivo', 'texto', { anulavel: true }),
  ],
  ordenacaoPadrao: [desc('numero')],
  desempate: ['numero'],
};

/** Colunas de GET /auditorias; snapshots só aparecem no detalhe autorizado. */
export const ESQUEMA_AUDITORIAS: EsquemaOData = {
  recurso: 'auditorias',
  campos: [
    campo('id', 'inteiro'),
    campo('entidade', 'texto'),
    campo('entidadeId', 'inteiro'),
    campo('acao', 'texto'),
    campo('em', 'datahora'),
    campo('usuarioId', 'inteiro', { anulavel: true }),
    campo('autor', 'texto'),
    campo('origem', 'enum', { valores: ['manual', 'automatica'] }),
    campo('processo', 'texto', { anulavel: true }),
    campo('correlacaoId', 'texto', { anulavel: true }),
  ],
  ordenacaoPadrao: [desc('em'), desc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /modelos-pesquisa/:id/versoes` (histórico imutável do modelo). */
export const ESQUEMA_VERSOES_MODELO: EsquemaOData = {
  recurso: 'versoesModelo',
  campos: [
    campo('numero', 'inteiro'),
    campo('nome', 'texto'),
    campo('publicoAlvo', 'texto'),
    campo('criadaEm', 'datahora'),
    campo('motivo', 'texto', { anulavel: true }),
  ],
  ordenacaoPadrao: [desc('numero')],
  desempate: ['numero'],
};

/** Colunas de `GET /modelos-pesquisa`. */
export const ESQUEMA_MODELOS_PESQUISA: EsquemaOData = {
  recurso: 'modelosPesquisa',
  campos: [
    campo('id', 'inteiro'),
    campo('nome', 'texto'),
    campo('publicoAlvo', 'texto'),
    campo('versao', 'inteiro'),
    campo('criadaEm', 'datahora'),
  ],
  ordenacaoPadrao: [asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /periodos`. */
export const ESQUEMA_PERIODOS: EsquemaOData = {
  recurso: 'periodos',
  campos: [
    campo('id', 'inteiro'),
    campo('tipo', 'enum', { valores: TIPOS_PERIODO }),
    campo('rotulo', 'texto'),
    campo('dataInicio', 'data'),
    campo('dataFim', 'data'),
  ],
  ordenacaoPadrao: [desc('dataInicio'), asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /pesquisas` (edições). */
export const ESQUEMA_PESQUISAS: EsquemaOData = {
  recurso: 'pesquisas',
  campos: [
    campo('id', 'inteiro'),
    campo('titulo', 'texto'),
    campo('tipoColeta', 'enum', { valores: TIPOS_COLETA }),
    campo('status', 'enum', { valores: STATUS_PESQUISA }),
    campo('abertura', 'datahora'),
    campo('prazo', 'datahora'),
    campo('modeloId', 'inteiro'),
    campo('modeloVersao', 'inteiro'),
  ],
  ordenacaoPadrao: [desc('abertura'), desc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /pesquisas/:id/destinatarios` (público congelado na abertura). */
export const ESQUEMA_DESTINATARIOS: EsquemaOData = {
  recurso: 'destinatarios',
  campos: [
    campo('empreendimentoId', 'inteiro'),
    campo('nomeFantasia', 'texto'),
    // Derivada da existência de resposta da edição: filtrável, não ordenável.
    campo('situacaoResposta', 'enum', {
      valores: SITUACOES_DESTINATARIO,
      virtual: true,
      ordenavel: false,
      operadores: ['eq', 'ne'],
    }),
    campo('respondidaEm', 'datahora', {
      anulavel: true,
      virtual: true,
      ordenavel: false,
      operadores: ['eq', 'ne', 'gt', 'ge', 'lt', 'le'],
    }),
  ],
  ordenacaoPadrao: [asc('nomeFantasia'), asc('empreendimentoId')],
  desempate: ['empreendimentoId'],
};

/** Colunas de `GET /empreendimentos/:id/pesquisas` (edições destinadas ao empreendimento). */
export const ESQUEMA_PESQUISAS_RESPONDENTE: EsquemaOData = {
  recurso: 'pesquisasRespondente',
  campos: [
    campo('pesquisaId', 'inteiro'),
    campo('titulo', 'texto'),
    campo('tipoColeta', 'enum', { valores: TIPOS_COLETA }),
    campo('status', 'enum', { valores: STATUS_PESQUISA }),
    campo('abertura', 'datahora'),
    campo('prazo', 'datahora'),
    // Derivadas da resposta do próprio empreendimento: filtráveis, não ordenáveis.
    campo('situacaoResposta', 'enum', {
      valores: SITUACOES_DESTINATARIO,
      virtual: true,
      ordenavel: false,
      operadores: ['eq', 'ne'],
    }),
    campo('respondidaEm', 'datahora', {
      anulavel: true,
      virtual: true,
      ordenavel: false,
      operadores: ['eq', 'ne', 'gt', 'ge', 'lt', 'le'],
    }),
  ],
  ordenacaoPadrao: [desc('prazo'), desc('pesquisaId')],
  desempate: ['pesquisaId'],
};

export const ESQUEMAS_ODATA = {
  auditorias: ESQUEMA_AUDITORIAS,
  contas: ESQUEMA_CONTAS,
  vinculos: ESQUEMA_VINCULOS_CONTA,
  visibilidades: ESQUEMA_VISIBILIDADES,
  permissoes: ESQUEMA_PERMISSOES,
  empreendimentos: ESQUEMA_EMPREENDIMENTOS,
  contatos: ESQUEMA_CONTATOS,
  cadastur: ESQUEMA_CADASTUR,
  inventarios: ESQUEMA_INVENTARIOS,
  respostas: ESQUEMA_RESPOSTAS,
  indicadores: ESQUEMA_INDICADORES,
  catalogoGrupos: ESQUEMA_CATALOGO_GRUPOS,
  catalogoItens: ESQUEMA_CATALOGO_ITENS,
  catalogoVersoes: ESQUEMA_CATALOGO_VERSOES,
  periodos: ESQUEMA_PERIODOS,
  modelosPesquisa: ESQUEMA_MODELOS_PESQUISA,
  versoesModelo: ESQUEMA_VERSOES_MODELO,
  pesquisas: ESQUEMA_PESQUISAS,
  destinatarios: ESQUEMA_DESTINATARIOS,
  pesquisasRespondente: ESQUEMA_PESQUISAS_RESPONDENTE,
} as const;
