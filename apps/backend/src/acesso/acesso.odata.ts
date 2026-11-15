import type { MapeamentoRecurso } from '../odata/prisma-where';

/** Mapeamentos das coleções administrativas para os campos públicos dos esquemas OData. */
export const MAPA_VINCULOS: MapeamentoRecurso = {
  empreendimentoId: { caminho: ['empreendimentoId'] },
  nomeFantasia: { caminho: ['empreendimento', 'nomeFantasia'] },
  ativo: { caminho: ['ativo'] },
};

export const MAPA_PERMISSOES: MapeamentoRecurso = {
  recurso: { caminho: ['recurso'] },
  acao: { caminho: ['acao'] },
  escopo: { caminho: ['escopo'] },
};

/**
 * `permitido` é virtual: a ausência de linha de visibilidade equivale a `false`. O mapeamento
 * depende do perfil consultado, por isso é uma função.
 */
export const mapaVisibilidades = (perfil: string): MapeamentoRecurso => ({
  indicadorId: { caminho: ['id'] },
  nome: { caminho: ['nome'] },
  permitido: {
    construir: (operacao) => {
      if (operacao.tipo !== 'comparacao' || operacao.valor.tipo !== 'booleano')
        return false;
      const liberado = {
        visibilidades: { some: { perfil, permitido: true } },
      };
      // eq true / ne false = liberados; eq false / ne true = restritos (inclui sem linha).
      return (operacao.operador === 'eq') === operacao.valor.valor
        ? liberado
        : { NOT: liberado };
    },
  },
});
