import type {
  AcaoAplicacao,
  CandidatoEmpreendimento,
  ItemPlano,
  MotivoPlano,
  OrigemDecisao,
  ResolucaoConflito,
  SituacaoPlano,
  TotaisPlano,
} from '@ssc0536/common';

/** Chave estável de comparação de nomes: sem acento, caixa ou espaços repetidos. */
export const chaveNome = (nome: string): string =>
  nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('pt-BR');

/** Decimais comparados sem zeros à direita: "75.50" e "75.5" são o mesmo valor. */
export const decimalCanonico = (valor: string): string =>
  valor.includes('.') ? valor.replace(/0+$/, '').replace(/\.$/, '') : valor;

export interface LinhaPlano {
  id: number;
  linha: number;
  situacaoLeitura: 'valida' | 'aviso' | 'erro';
  nomeInformado: string | null;
  ocupacao: string | null;
}
export interface DecisaoPlano {
  tipo: 'vincular' | 'rejeitar';
  empreendimentoId: number | null;
  conflito: ResolucaoConflito | null;
}
export interface EmpreendimentoRef {
  id: number;
  nomeFantasia: string;
}
export interface EntradaPlano {
  linhas: readonly LinhaPlano[];
  decisoes: ReadonlyMap<number, DecisaoPlano>;
  /** Correspondências decididas antes por pessoa: chave de nome -> empreendimento. */
  salvas: ReadonlyMap<string, number>;
  empreendimentos: ReadonlyMap<number, EmpreendimentoRef>;
  /** Público congelado da edição; `null` quando a edição não registrou público. */
  publico: ReadonlySet<number> | null;
  /** Valor já gravado para a pergunta, por empreendimento (`null`: resposta sem o item). */
  existentes: ReadonlyMap<number, string | null>;
  aplicadas: ReadonlyMap<number, AcaoAplicacao>;
  temDestino: boolean;
  candidatos: (nome: string) => CandidatoEmpreendimento[];
}

const vazio = (): TotaisPlano => ({
  lidas: 0,
  novos: 0,
  atualizados: 0,
  semMudanca: 0,
  conflitos: 0,
  rejeitados: 0,
  pendentes: 0,
  aplicados: 0,
});
const CAMPO_TOTAL: Record<SituacaoPlano, keyof TotaisPlano> = {
  novo: 'novos',
  atualizar: 'atualizados',
  sem_mudanca: 'semMudanca',
  conflito: 'conflitos',
  rejeitado: 'rejeitados',
  pendente: 'pendentes',
  aplicado: 'aplicados',
};

/**
 * Plano de alterações determinístico: mesmo lote, decisões e estado da edição produzem o mesmo plano.
 * Nome isolado nunca vincula um empreendimento sozinho: sem decisão (manual ou salva por pessoa),
 * a linha fica pendente e os candidatos servem apenas de sugestão.
 */
export function planejar(entrada: EntradaPlano): {
  itens: ItemPlano[];
  totais: TotaisPlano;
} {
  const vinculos = new Map<number, number[]>();
  const resolvido = entrada.linhas.map((linha) => {
    const decisao = entrada.decisoes.get(linha.id) ?? null;
    let origem: OrigemDecisao | null = decisao ? 'manual' : null;
    let empId = decisao?.tipo === 'vincular' ? decisao.empreendimentoId : null;
    if (!decisao && linha.nomeInformado) {
      const salvo = entrada.salvas.get(chaveNome(linha.nomeInformado));
      if (salvo !== undefined && entrada.empreendimentos.has(salvo)) {
        empId = salvo;
        origem = 'correspondencia_salva';
      }
    }
    return { linha, decisao, empId, origem };
  });
  for (const r of resolvido) {
    const elegivel =
      r.empId !== null &&
      !entrada.aplicadas.has(r.linha.id) &&
      r.linha.situacaoLeitura !== 'erro' &&
      r.linha.ocupacao !== null;
    if (elegivel)
      vinculos.set(r.empId!, [...(vinculos.get(r.empId!) ?? []), r.linha.id]);
  }

  const itens: ItemPlano[] = resolvido.map(
    ({ linha, decisao, empId, origem }) => {
      const emp =
        empId === null ? null : (entrada.empreendimentos.get(empId) ?? null);
      const base: ItemPlano = {
        linhaId: linha.id,
        linha: linha.linha,
        nomeInformado: linha.nomeInformado,
        ocupacaoPercentual: linha.ocupacao,
        situacao: 'pendente',
        motivo: null,
        empreendimento: emp
          ? { id: emp.id, nomeFantasia: emp.nomeFantasia }
          : null,
        origemDecisao: emp ? origem : null,
        valorAtual: null,
        candidatos: [],
        resolucao: decisao?.conflito ?? null,
        acaoAplicada: entrada.aplicadas.get(linha.id) ?? null,
      };
      const como = (
        situacao: SituacaoPlano,
        motivo: MotivoPlano | null = null,
      ) => ({
        ...base,
        situacao,
        motivo,
      });
      if (base.acaoAplicada !== null) return como('aplicado');
      if (linha.situacaoLeitura === 'erro')
        return como('rejeitado', 'ERRO_DE_LEITURA');
      if (linha.ocupacao === null) return como('rejeitado', 'SEM_OCUPACAO');
      if (decisao?.tipo === 'rejeitar')
        return como('rejeitado', 'REJEITADO_MANUALMENTE');
      if (emp === null)
        return {
          ...como('pendente', 'SEM_CORRESPONDENCIA'),
          candidatos: linha.nomeInformado
            ? entrada.candidatos(linha.nomeInformado)
            : [],
        };
      if (!entrada.temDestino) return como('pendente', 'SEM_DESTINO');
      if (entrada.publico !== null && !entrada.publico.has(emp.id))
        return como('rejeitado', 'FORA_DO_PUBLICO');
      if ((vinculos.get(emp.id)?.length ?? 0) > 1)
        return como('pendente', 'EMPREENDIMENTO_DUPLICADO_NO_LOTE');
      if (!entrada.existentes.has(emp.id)) return como('novo');
      const atual = entrada.existentes.get(emp.id) ?? null;
      if (atual === null) return como('atualizar');
      const comAtual = { ...base, valorAtual: atual };
      if (decimalCanonico(atual) === decimalCanonico(linha.ocupacao))
        return { ...comAtual, situacao: 'sem_mudanca' };
      if (decisao?.conflito === 'substituir')
        return { ...comAtual, situacao: 'atualizar' };
      if (decisao?.conflito === 'manter')
        return {
          ...comAtual,
          situacao: 'rejeitado',
          motivo: 'MANTIDA_EXISTENTE',
        };
      return {
        ...comAtual,
        situacao: 'conflito',
        motivo: 'DIVERGE_DA_EXISTENTE',
      };
    },
  );

  const totais = vazio();
  for (const i of itens) {
    totais.lidas += 1;
    totais[CAMPO_TOTAL[i.situacao]] += 1;
  }
  return { itens, totais };
}
