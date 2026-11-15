import {
  CAMPOS_RESERVADOS_EQUIPE,
  type AlteracaoEmpreendimento,
  type CadasturEntrada,
  type ContatoEntrada,
  type EmpreendimentoDetalhe,
  type EntradaEmpreendimento,
  type ErroCampo,
  type FinalidadeContato,
  type PendenciaCadastro,
  type SituacaoCadastur,
  type SituacaoEmpreendimento,
  type TipoContato,
  type Zona,
} from '@ssc0536/common';

export const ROTULOS_PENDENCIA: Record<PendenciaCadastro, string> = {
  sem_cnpj: 'CNPJ não informado',
  sem_razao_social: 'Razão social não informada',
  sem_tipo_hospedagem: 'Tipo de hospedagem não informado',
  sem_categoria_indicador: 'Categoria do indicador não definida',
  sem_endereco: 'Endereço não informado',
  sem_segmento: 'Sem segmento',
  sem_contato: 'Sem contatos',
  sem_cadastur: 'Cadastur não informado',
};
export const ROTULOS_TIPO_CONTATO: Record<TipoContato, string> = {
  telefone: 'Telefone',
  email: 'E-mail',
  site: 'Site',
  rede_social: 'Rede social',
};
export const ROTULOS_FINALIDADE: Record<FinalidadeContato, string> = {
  publico: 'Público',
  interno: 'Interno',
};
export const ROTULOS_SITUACAO_CADASTUR: Record<SituacaoCadastur, string> = {
  nao_possui: 'Não possui Cadastur',
  igual_cnpj: 'Cadastur igual ao CNPJ',
  numero_proprio: 'Número próprio',
};
export const ROTULOS_SITUACAO: Record<SituacaoEmpreendimento, string> = {
  ativo: 'Ativo',
  encerrado: 'Encerrado',
};
export const ROTULOS_MOTIVO_DUPLICIDADE = {
  nome_igual: 'mesmo nome',
  cnpj_igual: 'mesmo CNPJ',
  id_origem_igual: 'mesmo ID de origem',
} as const;

export interface ContatoFormulario {
  /** Vazio para contato novo. */
  id: string;
  tipo: TipoContato;
  valor: string;
  finalidade: FinalidadeContato;
  responsavelNome: string;
  responsavelCargo: string;
}
/** Valores do formulário: campos de texto como string (vazio = não informado). */
export interface ValoresCadastro {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  idOrigem: string;
  tipoHospedagem: string;
  categoriaIndicador: string;
  endereco: string;
  zona: '' | Zona;
  longitude: string;
  latitude: string;
  dataInicioAtividades: string;
  situacao: SituacaoEmpreendimento;
  dataEncerramento: string;
  segmentoIds: string[];
  contatos: ContatoFormulario[];
  cadasturId: string;
  cadasturSituacao: '' | SituacaoCadastur;
  cadasturNumero: string;
  cadasturVencimento: string;
}

export const contatoVazio = (): ContatoFormulario => ({
  id: '',
  tipo: 'email',
  valor: '',
  finalidade: 'publico',
  responsavelNome: '',
  responsavelCargo: '',
});

export function valoresIniciais(
  detalhe?: EmpreendimentoDetalhe,
): ValoresCadastro {
  const cadastur = detalhe?.cadastur[0];
  return {
    nomeFantasia: detalhe?.nomeFantasia ?? '',
    razaoSocial: detalhe?.razaoSocial ?? '',
    cnpj: detalhe?.cnpj ?? '',
    idOrigem: detalhe?.idOrigem ?? '',
    tipoHospedagem: detalhe?.tipoHospedagem ?? '',
    categoriaIndicador: detalhe?.categoriaIndicador ?? '',
    endereco: detalhe?.endereco ?? '',
    zona: detalhe?.zona ?? '',
    longitude: detalhe?.localizacao
      ? String(detalhe.localizacao.longitude)
      : '',
    latitude: detalhe?.localizacao ? String(detalhe.localizacao.latitude) : '',
    dataInicioAtividades: detalhe?.dataInicioAtividades ?? '',
    situacao: (detalhe?.situacao as SituacaoEmpreendimento) ?? 'ativo',
    dataEncerramento: detalhe?.dataEncerramento ?? '',
    segmentoIds: detalhe?.segmentos.map((s) => String(s.id)) ?? [],
    contatos:
      detalhe?.contatos.map((c) => ({
        id: String(c.id),
        tipo: c.tipo,
        valor: c.valor,
        finalidade: c.finalidade,
        responsavelNome: c.responsavelNome ?? '',
        responsavelCargo: c.responsavelCargo ?? '',
      })) ?? [],
    cadasturId: cadastur ? String(cadastur.id) : '',
    cadasturSituacao: cadastur?.situacao ?? '',
    cadasturNumero: cadastur?.numero ?? '',
    cadasturVencimento: cadastur?.vencimento ?? '',
  };
}

const numero = (texto: string) =>
  texto.trim() === '' ? NaN : Number(texto.trim().replace(',', '.'));

/**
 * Converte os valores do formulário na entrada da API. Na criação, vazio = omitido; na
 * atualização, vazio = `null` (limpa) e campos reservados à equipe são omitidos para o
 * empresário. Cadastur extras do cadastro (além do primeiro) são preservados.
 */
export function paraEntrada(
  v: ValoresCadastro,
  modo: 'criar',
  detalhe?: undefined,
  restrito?: boolean,
): EntradaEmpreendimento;
export function paraEntrada(
  v: ValoresCadastro,
  modo: 'alterar',
  detalhe: EmpreendimentoDetalhe,
  restrito: boolean,
): AlteracaoEmpreendimento;
export function paraEntrada(
  v: ValoresCadastro,
  modo: 'criar' | 'alterar',
  detalhe?: EmpreendimentoDetalhe,
  restrito = false,
): EntradaEmpreendimento | AlteracaoEmpreendimento {
  const texto = (valor: string) => {
    const limpo = valor.trim();
    return limpo === '' ? (modo === 'alterar' ? null : undefined) : limpo;
  };
  const saida: Record<string, unknown> = {
    razaoSocial: texto(v.razaoSocial),
    endereco: texto(v.endereco),
    zona: v.zona === '' ? (modo === 'alterar' ? null : undefined) : v.zona,
    dataInicioAtividades: texto(v.dataInicioAtividades),
  };
  const temLocal = v.longitude.trim() !== '' || v.latitude.trim() !== '';
  saida.localizacao = temLocal
    ? { longitude: numero(v.longitude), latitude: numero(v.latitude) }
    : modo === 'alterar'
      ? null
      : undefined;

  const contatos: ContatoEntrada[] = v.contatos
    .filter((c) => c.valor.trim() !== '' || c.id !== '')
    .map((c) => ({
      ...(c.id ? { id: Number(c.id) } : {}),
      tipo: c.tipo,
      valor: c.valor.trim(),
      finalidade: c.finalidade,
      responsavelNome: texto(c.responsavelNome),
      responsavelCargo: texto(c.responsavelCargo),
    }));
  if (modo === 'alterar' || contatos.length) saida.contatos = contatos;

  const editado: CadasturEntrada | null =
    v.cadasturSituacao === ''
      ? null
      : {
          ...(v.cadasturId ? { id: Number(v.cadasturId) } : {}),
          situacao: v.cadasturSituacao,
          numero: v.cadasturNumero.trim() || null,
          vencimento: v.cadasturVencimento.trim() || null,
        };
  if (modo === 'criar') {
    if (editado) saida.cadastur = [editado];
  } else {
    const demais = (detalhe?.cadastur ?? []).slice(1).map((c) => ({
      id: c.id,
      situacao: c.situacao,
      numero: c.numero,
      vencimento: c.vencimento,
    }));
    saida.cadastur = [...(editado ? [editado] : []), ...demais];
  }

  if (!restrito) {
    saida.nomeFantasia = v.nomeFantasia.trim();
    saida.cnpj = texto(v.cnpj);
    saida.idOrigem = texto(v.idOrigem);
    saida.tipoHospedagem = texto(v.tipoHospedagem);
    saida.categoriaIndicador = texto(v.categoriaIndicador);
    saida.situacao = v.situacao;
    saida.dataEncerramento =
      v.situacao === 'encerrado'
        ? texto(v.dataEncerramento)
        : modo === 'alterar'
          ? null
          : undefined;
    saida.segmentoIds = v.segmentoIds.map(Number);
  } else {
    for (const campo of CAMPOS_RESERVADOS_EQUIPE) delete saida[campo];
  }
  for (const chave of Object.keys(saida))
    if (saida[chave] === undefined) delete saida[chave];
  return saida as unknown as EntradaEmpreendimento;
}

/** Traduz o caminho de campo da API para o nome do campo do formulário. */
export function campoDoFormulario(field: string) {
  if (field.startsWith('localizacao.'))
    return field.slice('localizacao.'.length);
  if (field === 'localizacao') return 'longitude';
  const cadastur = field.match(/^cadastur(?:\[\d+\])?(?:\.(\w+))?$/);
  if (cadastur) {
    const parte = cadastur[1];
    return parte === 'numero'
      ? 'cadasturNumero'
      : parte === 'vencimento'
        ? 'cadasturVencimento'
        : 'cadasturSituacao';
  }
  return field;
}
export function errosPorCampo(erros: readonly ErroCampo[]) {
  const mapa: Record<string, string> = {};
  for (const e of erros) {
    const campo = campoDoFormulario(e.field);
    mapa[campo] = mapa[campo] ? `${mapa[campo]} ${e.message}` : e.message;
  }
  return mapa;
}
