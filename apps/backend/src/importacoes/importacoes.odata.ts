import type { MapeamentoRecurso } from '../odata/prisma-where';

export const MAPA_LOTES: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  fonte: { caminho: ['fonte'] },
  nomeArquivo: { caminho: ['nomeArquivo'] },
  tamanhoBytes: { caminho: ['tamanhoBytes'] },
  versaoParser: { caminho: ['versaoParser'] },
  estado: { caminho: ['estado'] },
  criadoEm: { caminho: ['criadoEm'] },
  lidoEm: { caminho: ['lidoEm'] },
};
export const MAPA_LINHAS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  aba: { caminho: ['aba'] },
  linha: { caminho: ['linha'] },
  tipo: { caminho: ['tipo'] },
  situacao: { caminho: ['situacao'] },
};
export const MAPA_OCORRENCIAS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  aba: { caminho: ['aba'] },
  linha: { caminho: ['linha'] },
  coluna: { caminho: ['coluna'] },
  severidade: { caminho: ['severidade'] },
  codigo: { caminho: ['codigo'] },
  mensagem: { caminho: ['mensagem'] },
  orientacao: { caminho: ['orientacao'] },
};
