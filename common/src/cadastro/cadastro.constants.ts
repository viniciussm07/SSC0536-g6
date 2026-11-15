/** Caminhos sob /api; a listagem e o detalhe compartilham o recurso `empreendimentos`. */
export const CADASTRO_RECURSOS = {
  empreendimentos: '/empreendimentos',
  segmentos: '/segmentos',
} as const;

export const TIPOS_CONTATO = [
  'telefone',
  'email',
  'site',
  'rede_social',
] as const;
export const FINALIDADES_CONTATO = ['publico', 'interno'] as const;
export const SITUACOES_EMPREENDIMENTO = ['ativo', 'encerrado'] as const;
export const SITUACOES_CADASTUR = [
  'nao_possui',
  'igual_cnpj',
  'numero_proprio',
] as const;
export const ZONAS = ['urbana', 'rural'] as const;

/** Informações cadastrais opcionais cuja ausência é sinalizada (não bloqueia o cadastro). */
export const PENDENCIAS_CADASTRO = [
  'sem_cnpj',
  'sem_razao_social',
  'sem_tipo_hospedagem',
  'sem_categoria_indicador',
  'sem_endereco',
  'sem_segmento',
  'sem_contato',
  'sem_cadastur',
] as const;

export const LIMITES_CADASTRO = {
  nome: 200,
  tipoOuCategoria: 60,
  endereco: 300,
  idOrigem: 100,
  contatoValor: 300,
  responsavelNome: 200,
  responsavelCargo: 100,
  cadasturNumero: 40,
  contatos: 20,
  cadastur: 5,
  segmentos: 20,
} as const;

/** Campos que somente quem tem escopo global altera (a identificação e a classificação). */
export const CAMPOS_RESERVADOS_EQUIPE = [
  'nomeFantasia',
  'cnpj',
  'idOrigem',
  'tipoHospedagem',
  'categoriaIndicador',
  'situacao',
  'dataEncerramento',
  'segmentoIds',
] as const;
