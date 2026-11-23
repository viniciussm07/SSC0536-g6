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
import {
  ESTADOS_LOTE,
  FONTES_IMPORTACAO,
  SEVERIDADES_OCORRENCIA,
  SITUACOES_LINHA_IMPORTACAO,
  TIPOS_LINHA_IMPORTACAO,
} from '../importacao/importacao.constants.js';
import { TIPOS_PERIODO } from '../periodos/periodo.constants.js';
import {
  SITUACOES_EXECUCAO,
  SITUACOES_PUBLICACAO,
} from '../calculos/calculo.constants.js';
import {
  ORIGENS_COLETA,
  SITUACOES_CONFERENCIA_FONTE,
  SITUACOES_PARAMETRO,
  TIPOS_DIA,
  UNIDADES_PRECO,
} from '../diarias/fontes.constants.js';
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

/** Colunas de `GET /calculos` (execuções do cálculo de indicadores, parte 16). */
export const ESQUEMA_CALCULOS: EsquemaOData = {
  recurso: 'calculos',
  campos: [
    campo('id', 'inteiro'),
    campo('periodoId', 'inteiro'),
    campo('periodo', 'texto'),
    campo('tipoColeta', 'enum', { valores: TIPOS_COLETA }),
    campo('pesquisaId', 'inteiro'),
    campo('pesquisa', 'texto'),
    campo('perguntaId', 'inteiro'),
    campo('revisao', 'inteiro', { anulavel: true }),
    campo('versaoFormula', 'inteiro'),
    campo('situacao', 'enum', { valores: SITUACOES_EXECUCAO }),
    campo('publicacao', 'enum', { valores: SITUACOES_PUBLICACAO }),
    campo('motivo', 'texto', { anulavel: true }),
    campo('erro', 'texto', { anulavel: true }),
    campo('solicitadaEm', 'datahora'),
    campo('solicitadaPor', 'texto'),
    campo('concluidaEm', 'datahora', { anulavel: true }),
    campo('publicadaEm', 'datahora', { anulavel: true }),
    campo('publicadaPorId', 'inteiro', { anulavel: true }),
  ],
  ordenacaoPadrao: [desc('solicitadaEm'), desc('id')],
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

/** Colunas de `GET /coletas-diarias` (fonte complementar do plano 17). */
export const ESQUEMA_COLETAS_DIARIAS: EsquemaOData = {
  recurso: 'coletasDiarias',
  campos: [
    campo('id', 'inteiro'),
    campo('empreendimentoId', 'inteiro'),
    campo('empreendimentoNome', 'texto'),
    campo('periodoId', 'inteiro'),
    campo('periodoRotulo', 'texto'),
    campo('fonte', 'texto'),
    campo('dataColeta', 'data'),
    campo('dataEstadia', 'data'),
    campo('tipoDia', 'enum', { valores: TIPOS_DIA }),
    campo('valorDiaria', 'decimal'),
    campo('moeda', 'texto'),
    campo('unidadePreco', 'enum', { valores: UNIDADES_PRECO }),
    campo('origem', 'enum', { valores: ORIGENS_COLETA }),
    campo('situacaoConferencia', 'enum', {
      valores: SITUACOES_CONFERENCIA_FONTE,
    }),
    campo('referenciaOrigem', 'texto', { anulavel: true }),
    campo('observacao', 'texto', { anulavel: true }),
    campo('conferidoEm', 'datahora', { anulavel: true }),
    campo('conferidoPor', 'texto', { anulavel: true }),
  ],
  ordenacaoPadrao: [desc('dataEstadia'), desc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /rhc-periodos` (agregado de hospedagem caseira por período). */
export const ESQUEMA_RHC_PERIODOS: EsquemaOData = {
  recurso: 'rhcPeriodos',
  campos: [
    campo('id', 'inteiro'),
    campo('periodoId', 'inteiro'),
    campo('periodoRotulo', 'texto'),
    campo('qtdRhc', 'inteiro'),
    campo('leitos', 'inteiro'),
    campo('origem', 'enum', { valores: ORIGENS_COLETA }),
    campo('situacaoConferencia', 'enum', {
      valores: SITUACOES_CONFERENCIA_FONTE,
    }),
    campo('revisao', 'inteiro'),
    campo('observacao', 'texto', { anulavel: true }),
    campo('conferidoEm', 'datahora', { anulavel: true }),
    campo('conferidoPor', 'texto', { anulavel: true }),
  ],
  ordenacaoPadrao: [desc('periodoId'), desc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /parametros-calculo` (parâmetros com vigência e situação). */
export const ESQUEMA_PARAMETROS_CALCULO: EsquemaOData = {
  recurso: 'parametrosCalculo',
  campos: [
    campo('id', 'inteiro'),
    campo('chave', 'texto'),
    campo('valor', 'decimal'),
    campo('unidade', 'texto'),
    campo('vigenciaInicio', 'data'),
    campo('vigenciaFim', 'data', { anulavel: true }),
    campo('fonte', 'texto', { anulavel: true }),
    campo('situacao', 'enum', { valores: SITUACOES_PARAMETRO }),
    campo('observacao', 'texto', { anulavel: true }),
  ],
  ordenacaoPadrao: [asc('chave'), desc('vigenciaInicio')],
  desempate: ['id'],
};

/** Colunas de `GET /importacoes` (lotes de importação). */
export const ESQUEMA_LOTES_IMPORTACAO: EsquemaOData = {
  recurso: 'importacoes',
  campos: [
    campo('id', 'inteiro'),
    campo('fonte', 'enum', { valores: FONTES_IMPORTACAO }),
    campo('nomeArquivo', 'texto'),
    campo('tamanhoBytes', 'inteiro'),
    campo('versaoParser', 'texto'),
    campo('estado', 'enum', { valores: ESTADOS_LOTE }),
    campo('criadoEm', 'datahora'),
    campo('lidoEm', 'datahora', { anulavel: true }),
  ],
  ordenacaoPadrao: [desc('criadoEm'), desc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /importacoes/:id/linhas`; `celulas` e `canonico` acompanham a linha sem filtro. */
export const ESQUEMA_LINHAS_IMPORTACAO: EsquemaOData = {
  recurso: 'linhasImportacao',
  campos: [
    campo('id', 'inteiro'),
    campo('aba', 'texto'),
    campo('linha', 'inteiro'),
    campo('tipo', 'enum', { valores: TIPOS_LINHA_IMPORTACAO }),
    campo('situacao', 'enum', { valores: SITUACOES_LINHA_IMPORTACAO }),
  ],
  ordenacaoPadrao: [asc('aba'), asc('linha'), asc('id')],
  desempate: ['id'],
};

/** Colunas de `GET /importacoes/:id/ocorrencias`. */
export const ESQUEMA_OCORRENCIAS_IMPORTACAO: EsquemaOData = {
  recurso: 'ocorrenciasImportacao',
  campos: [
    campo('id', 'inteiro'),
    campo('aba', 'texto', { anulavel: true }),
    campo('linha', 'inteiro', { anulavel: true }),
    campo('coluna', 'texto', { anulavel: true }),
    campo('severidade', 'enum', { valores: SEVERIDADES_OCORRENCIA }),
    campo('codigo', 'texto'),
    campo('mensagem', 'texto'),
    campo('orientacao', 'texto'),
  ],
  ordenacaoPadrao: [asc('severidade'), asc('aba'), asc('linha'), asc('id')],
  desempate: ['id'],
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
  coletasDiarias: ESQUEMA_COLETAS_DIARIAS,
  rhcPeriodos: ESQUEMA_RHC_PERIODOS,
  parametrosCalculo: ESQUEMA_PARAMETROS_CALCULO,
  importacoes: ESQUEMA_LOTES_IMPORTACAO,
  linhasImportacao: ESQUEMA_LINHAS_IMPORTACAO,
  ocorrenciasImportacao: ESQUEMA_OCORRENCIAS_IMPORTACAO,
  calculos: ESQUEMA_CALCULOS,
} as const;
