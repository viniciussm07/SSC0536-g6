import type {
  SituacaoDestinatario,
  SituacaoPesquisa,
  StatusPesquisa,
  TipoColeta,
} from './edicao.constants.js';
import type { TipoValorCampo } from './pesquisa.constants.js';
import type { PeriodoLinha } from '../periodos/periodo.types.js';

/** Linha de `GET /empreendimentos/:id/pesquisas`: edições destinadas ao empreendimento. */
export interface PesquisaRespondenteLinha {
  pesquisaId: number;
  titulo: string;
  tipoColeta: TipoColeta;
  status: StatusPesquisa;
  abertura: string;
  prazo: string;
  situacaoResposta: SituacaoDestinatario;
  respondidaEm: string | null;
}

export interface OpcaoPergunta {
  chave: string;
  rotulo: string;
}

/** Pergunta com tipo, obrigatoriedade e opções da versão congelada do modelo. */
export interface PerguntaResposta {
  id: number;
  periodoId: number;
  chave: string;
  rotulo: string;
  tipoValor: TipoValorCampo;
  obrigatorio: boolean;
  /** Opções da versão; `null` quando o campo não é de escolha. */
  opcoes: OpcaoPergunta[] | null;
}

/**
 * Valor respondido, sempre texto: percentual como decimal canônico de 0 a 100,
 * escolha como a chave da opção e texto livre aparado. Pergunta sem item = não respondida.
 */
export interface ItemResposta {
  perguntaId: number;
  valor: string;
}

/** Resposta registrada. `atualizadaEm` é nulo enquanto não houve correção. */
export interface RespostaRegistrada {
  id: number;
  respondidaEm: string;
  atualizadaEm: string | null;
  canal: string;
  itens: ItemResposta[];
}

/** `GET /empreendimentos/:id/pesquisas/:pesquisaId`: formulário e resposta atual. */
export interface FormularioResposta {
  pesquisaId: number;
  titulo: string;
  tipoColeta: TipoColeta;
  abertura: string;
  prazo: string;
  /** Calculada no relógio do servidor; só `recebendo` aceita envio ou correção. */
  situacao: SituacaoPesquisa;
  periodos: PeriodoLinha[];
  perguntas: PerguntaResposta[];
  resposta: RespostaRegistrada | null;
}

/** Corpo de `PUT .../resposta`: o conjunto completo de itens substitui o anterior. */
export interface EnvioResposta {
  itens: ItemResposta[];
}

/** Item normalizado para gravação em `resposta_item`. */
export interface ItemNormalizado {
  perguntaId: number;
  valorNumerico: string | null;
  valorTexto: string | null;
}
