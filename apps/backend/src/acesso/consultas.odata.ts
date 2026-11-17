import type { MapeamentoRecurso } from '../odata/prisma-where';

export const MAPA_RESPOSTAS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  pesquisaId: { caminho: ['pesquisaId'] },
  titulo: { caminho: ['pesquisa', 'titulo'] },
  respondidaEm: { caminho: ['respondidaEm'] },
  canal: { caminho: ['canal'] },
};

export const MAPA_INVENTARIOS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  vigenciaInicio: { caminho: ['vigenciaInicio'] },
  vigenciaFim: { caminho: ['vigenciaFim'] },
  totalUh: { caminho: ['totalUh'] },
  leitos: { caminho: ['leitos'] },
  situacaoConferencia: { caminho: ['situacaoConferencia'] },
  tipoAlteracao: { caminho: ['tipoAlteracao'] },
  criadaEm: { caminho: ['criadaEm'] },
  autor: { caminho: ['criador', 'nome'] },
  substituidaPorId: { caminho: ['substituidaPorId'] },
};

export const MAPA_INDICADORES: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  indicadorId: { caminho: ['definicaoId'] },
  nome: { caminho: ['definicao', 'nome'] },
  unidade: { caminho: ['definicao', 'unidade'] },
  periodo: { caminho: ['periodo', 'rotulo'] },
  periodoId: { caminho: ['periodoId'] },
  periodoTipo: { caminho: ['periodo', 'tipo'] },
  periodoInicio: { caminho: ['periodo', 'dataInicio'] },
  periodoFim: { caminho: ['periodo', 'dataFim'] },
  tipoColeta: { caminho: ['tipoColeta'] },
  recorte: { caminho: ['recorte'] },
  metodo: { caminho: ['metodo'] },
  valor: { caminho: ['valor'] },
};
