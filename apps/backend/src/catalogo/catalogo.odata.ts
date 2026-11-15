import type { MapeamentoRecurso } from '../odata/prisma-where';

/** Mapeamentos das coleções de gestão do catálogo para os esquemas OData do common. */
export const MAPA_CATALOGO_GRUPOS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  segmentoId: { caminho: ['segmentoId'] },
  chave: { caminho: ['chave'] },
  pergunta: { caminho: ['pergunta'] },
  secao: { caminho: ['secao'] },
  selecao: { caminho: ['selecao'] },
  permiteOutro: { caminho: ['permiteOutro'] },
  ordem: { caminho: ['ordem'] },
  ativo: { caminho: ['ativo'] },
};
export const MAPA_CATALOGO_ITENS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  grupoId: { caminho: ['grupoId'] },
  grupoChave: { caminho: ['grupo', 'chave'] },
  chave: { caminho: ['chave'] },
  rotulo: { caminho: ['rotulo'] },
  exclusivo: { caminho: ['exclusivo'] },
  outro: { caminho: ['outro'] },
  aceitaQuantidade: { caminho: ['aceitaQuantidade'] },
  ordem: { caminho: ['ordem'] },
  ativo: { caminho: ['ativo'] },
  versao: { caminho: ['versaoAtual'] },
};
export const MAPA_CATALOGO_VERSOES: MapeamentoRecurso = {
  numero: { caminho: ['numero'] },
  rotulo: { caminho: ['rotulo'] },
  pergunta: { caminho: ['pergunta'] },
  selecao: { caminho: ['selecao'] },
  exclusivo: { caminho: ['exclusivo'] },
  outro: { caminho: ['outro'] },
  aceitaQuantidade: { caminho: ['aceitaQuantidade'] },
  criadaEm: { caminho: ['criadaEm'] },
  motivo: { caminho: ['motivo'] },
};
