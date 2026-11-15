import type { AcessoAtual } from '@ssc0536/common';
import { acessoService } from '@/services/acesso';
import { cadastroService } from '@/services/cadastro';
import type { ConsultaColecao } from '@/services/odata';

/** Fontes das grades do empreendimento contextualizado (query keys por usuário, revisão e entidade). */
export function fontesDoEmpreendimento(acesso: AcessoAtual, id: number) {
  const base = (recurso: string) =>
    [recurso, acesso.usuarioId, acesso.revisao, id] as const;
  return {
    inventarios: {
      parametros: { id },
      contexto: id,
      chave: base('inventarios'),
      buscar: (c: ConsultaColecao, s: AbortSignal) =>
        acessoService.inventarios(id, c, s),
    },
    respostas: {
      parametros: { id },
      contexto: id,
      chave: base('respostas'),
      buscar: (c: ConsultaColecao, s: AbortSignal) =>
        acessoService.respostas(id, c, s),
    },
    contatos: {
      parametros: { id },
      contexto: id,
      chave: [
        'empreendimentos',
        acesso.usuarioId,
        acesso.revisao,
        id,
        'contatos',
      ] as const,
      buscar: (c: ConsultaColecao, s: AbortSignal) =>
        cadastroService.contatos(id, c, s),
    },
    cadastur: {
      parametros: { id },
      contexto: id,
      chave: [
        'empreendimentos',
        acesso.usuarioId,
        acesso.revisao,
        id,
        'cadastur',
      ] as const,
      buscar: (c: ConsultaColecao, s: AbortSignal) =>
        cadastroService.cadastur(id, c, s),
    },
  };
}
