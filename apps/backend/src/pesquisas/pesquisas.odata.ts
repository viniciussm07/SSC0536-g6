import type { MapeamentoRecurso } from '../odata/prisma-where';

/** Mapeamento de `GET /modelos-pesquisa` para o esquema OData do common. */
export const MAPA_MODELOS_PESQUISA: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  nome: { caminho: ['nome'] },
  publicoAlvo: { caminho: ['publicoAlvo'] },
  versao: { caminho: ['versaoAtual'] },
  criadaEm: { caminho: ['criadaEm'] },
};

/** Mapeamento de `GET /modelos-pesquisa/:id/versoes` (histórico imutável). */
export const MAPA_VERSOES_MODELO: MapeamentoRecurso = {
  numero: { caminho: ['numero'] },
  nome: { caminho: ['nome'] },
  publicoAlvo: { caminho: ['publicoAlvo'] },
  criadaEm: { caminho: ['criadaEm'] },
  motivo: { caminho: ['motivo'] },
};

/** Mapeamento de `GET /pesquisas` (edições). */
export const MAPA_PESQUISAS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  titulo: { caminho: ['titulo'] },
  tipoColeta: { caminho: ['tipoColeta'] },
  status: { caminho: ['status'] },
  abertura: { caminho: ['abertura'] },
  prazo: { caminho: ['prazo'] },
  modeloId: { caminho: ['modeloId'] },
  modeloVersao: { caminho: ['modeloVersao'] },
};

/**
 * Mapeamento de `GET /pesquisas/:id/destinatarios`. `situacaoResposta` é virtual: o
 * destinatário respondeu quando há resposta da mesma edição para o empreendimento.
 */
export const mapaDestinatarios = (pesquisaId: number): MapeamentoRecurso => ({
  empreendimentoId: { caminho: ['empreendimentoId'] },
  nomeFantasia: { caminho: ['empreendimento', 'nomeFantasia'] },
  situacaoResposta: {
    construir: (operacao) => {
      if (operacao.tipo !== 'comparacao' || operacao.valor.tipo === 'nulo')
        return false;
      const respondeu = {
        empreendimento: { respostas: { some: { pesquisaId } } },
      };
      const querRespondeu = operacao.valor.valor === 'respondeu';
      if (!querRespondeu && operacao.valor.valor !== 'pendente') return false;
      return (operacao.operador === 'eq') === querRespondeu
        ? respondeu
        : { NOT: respondeu };
    },
  },
  respondidaEm: {
    // Sem resposta, o valor é nulo; comparações com valor seguem o SQL (nulo não casa).
    construir: (operacao) => {
      if (operacao.tipo !== 'comparacao') return false;
      const resposta = (filtro: Record<string, unknown> = {}) => ({
        empreendimento: {
          respostas: { some: { pesquisaId, ...filtro } },
        },
      });
      if (operacao.valor.tipo === 'nulo') {
        if (operacao.operador === 'eq') return { NOT: resposta() };
        if (operacao.operador === 'ne') return resposta();
        return false;
      }
      if (operacao.valor.tipo !== 'datahora') return false;
      const valor = new Date(operacao.valor.valor);
      const prisma = {
        eq: { equals: valor },
        ne: { not: valor },
        gt: { gt: valor },
        ge: { gte: valor },
        lt: { lt: valor },
        le: { lte: valor },
      }[operacao.operador];
      return resposta({ respondidaEm: prisma });
    },
  },
});
