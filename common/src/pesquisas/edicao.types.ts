import type {
  SituacaoDestinatario,
  SituacaoPesquisa,
  StatusPesquisa,
  TipoColeta,
} from './edicao.constants.js';
import type { TipoValorCampo } from './pesquisa.constants.js';
import type { PeriodoLinha } from '../periodos/periodo.types.js';

export type {
  SituacaoDestinatario,
  SituacaoPesquisa,
  StatusPesquisa,
  TipoColeta,
};

/** Linha de `GET /pesquisas`. `abertura` e `prazo` são timestamps ISO 8601 em UTC. */
export interface PesquisaLinha {
  id: number;
  titulo: string;
  tipoColeta: TipoColeta;
  status: StatusPesquisa;
  abertura: string;
  prazo: string;
  modeloId: number;
  modeloVersao: number;
}

/** Pergunta da edição: campo da versão do modelo aplicado a um período. */
export interface PerguntaEdicao {
  id: number;
  periodoId: number;
  campoId: number;
  chave: string;
  rotulo: string;
  tipoValor: TipoValorCampo;
  obrigatorio: boolean;
}

/**
 * Participação separada de taxas de ocupação. Em rascunho, `elegiveis` é a prévia
 * calculada agora; após a abertura, `destinatarios` é o público congelado.
 * `destinatarios`/`pendentes` são nulos quando o público não foi registrado (edição legada).
 */
export interface ParticipacaoEdicao {
  elegiveis: number | null;
  destinatarios: number | null;
  respondentes: number;
  pendentes: number | null;
}

/** Detalhe de `GET /pesquisas/:id`. `situacao` é calculada no relógio do servidor. */
export interface PesquisaDetalhe extends PesquisaLinha {
  situacao: SituacaoPesquisa;
  modeloNome: string;
  segmentoIds: number[];
  criadaEm: string;
  abertaEm: string | null;
  encerradaEm: string | null;
  periodos: PeriodoLinha[];
  perguntas: PerguntaEdicao[];
  participacao: ParticipacaoEdicao;
}

/** Criação de rascunho. A versão do modelo é sempre a vigente no momento da criação. */
export interface EntradaPesquisa {
  titulo: string;
  tipoColeta: TipoColeta;
  modeloId: number;
  periodoIds: number[];
  abertura: string;
  prazo: string;
  segmentoIds: number[];
}

/**
 * Alteração parcial. Em rascunho, tudo muda; aberta, só `titulo`, `prazo` e, enquanto
 * agendada, `abertura`. `motivo` acompanha a auditoria de mudança de prazo.
 */
export interface AlteracaoPesquisa extends Partial<EntradaPesquisa> {
  motivo?: string;
}

/** Linha de `GET /pesquisas/:id/destinatarios`. */
export interface DestinatarioLinha {
  empreendimentoId: number;
  nomeFantasia: string;
  situacaoResposta: SituacaoDestinatario;
  respondidaEm: string | null;
}
