import type { PendenciaCadastro } from '@ssc0536/common';
import {
  escaparLike,
  type MapeamentoRecurso,
  type OperacaoVirtual,
  type Where,
} from '../odata/prisma-where';
import { CONDICOES_PENDENCIA } from './cadastro.leitura';

const texto = (valor: { tipo: string; valor?: unknown } | undefined) =>
  valor?.tipo === 'texto' ? String(valor.valor) : null;

/** `pendencia eq|ne|in`: a linha tem (ou não) a informação faltante indicada. */
function pendencia(operacao: OperacaoVirtual): Where | boolean {
  if (operacao.tipo === 'em')
    return {
      OR: operacao.valores.flatMap((v) =>
        v.tipo === 'texto'
          ? [CONDICOES_PENDENCIA[v.valor as PendenciaCadastro]]
          : [],
      ),
    };
  if (operacao.tipo !== 'comparacao') return false;
  const codigo = texto(operacao.valor);
  if (!codigo) return false;
  const condicao = CONDICOES_PENDENCIA[codigo as PendenciaCadastro];
  return operacao.operador === 'ne' ? { NOT: condicao } : condicao;
}

/**
 * `identificacao eq|contains`: o CNPJ (com ou sem máscara) ou o ID do sistema, que é o que a
 * grade mostra como identificação. A condição do CNPJ exclui nulos, então a negação é limpa.
 */
function identificacao(operacao: OperacaoVirtual): Where | boolean {
  const exato = operacao.tipo === 'comparacao' && operacao.operador === 'eq';
  const valor =
    operacao.tipo === 'comparacao'
      ? texto(operacao.valor)
      : operacao.tipo === 'funcao'
        ? operacao.valor
        : null;
  if (valor === null) return false;
  if (valor === '') return !exato;
  const digitos = valor.replace(/\D/g, '');
  // CNPJ completo também casa com o armazenado com máscara (legado); parcial só como digitado.
  const mascarado = digitos.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
  const variantes = [
    ...new Set([
      valor,
      ...(digitos ? [digitos] : []),
      ...(mascarado !== digitos ? [mascarado] : []),
    ]),
  ];
  const cnpj: Where = {
    AND: [
      { cnpj: { not: null } },
      {
        OR: variantes.map((v) => ({
          cnpj: exato ? { equals: v } : { contains: escaparLike(v) },
        })),
      },
    ],
  };
  const id = /^\d{1,9}$/.test(valor) ? [{ id: Number(valor) }] : [];
  return { OR: [cnpj, ...id] };
}

/** Mapeamento Prisma do esquema `ESQUEMA_EMPREENDIMENTOS`. */
export const MAPA_EMPREENDIMENTOS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  nomeFantasia: { caminho: ['nomeFantasia'] },
  cnpj: { caminho: ['cnpj'] },
  situacao: { caminho: ['situacao'] },
  tipoHospedagem: { caminho: ['tipoHospedagem'] },
  identificacao: { construir: identificacao },
  pendencia: { construir: pendencia },
};

export const MAPA_CONTATOS: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  tipo: { caminho: ['tipo'] },
  valor: { caminho: ['valor'] },
  finalidade: { caminho: ['finalidade'] },
  responsavelNome: { caminho: ['responsavelNome'] },
  responsavelCargo: { caminho: ['responsavelCargo'] },
};

export const MAPA_CADASTUR: MapeamentoRecurso = {
  id: { caminho: ['id'] },
  situacao: { caminho: ['situacao'] },
  numero: { caminho: ['numero'] },
  vencimento: { caminho: ['vencimento'] },
};
