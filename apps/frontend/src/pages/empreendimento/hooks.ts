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
      chave: base('inventarios'),
      buscar: (c: ConsultaColecao, s: AbortSignal) =>
        acessoService.inventarios(id, c, s),
    },
    respostas: {
      chave: base('respostas'),
      buscar: (c: ConsultaColecao, s: AbortSignal) =>
        acessoService.respostas(id, c, s),
    },
    contatos: {
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
