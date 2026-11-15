import { vi } from 'vitest';
import {
  PERMISSOES_INICIAIS,
  type AcessoAtual,
  type Perfil,
  type VinculoAcesso,
} from '@ssc0536/common';

export function acessoDoPerfil(
  perfil: Perfil,
  usuarioId = 1,
  vinculos: AcessoAtual['vinculos'] = [],
): AcessoAtual {
  return {
    usuarioId,
    perfil,
    revisao: 1,
    vinculos,
    permissoes: PERMISSOES_INICIAIS.filter((p) => p.perfil === perfil).map(
      ({ recurso, acao, escopo }) => ({ recurso, acao, escopo }),
    ),
  };
}

export const usuarioFicticio = {
  id: 1,
  nome: 'Pessoa fictícia',
  email: 'pessoa@example.test',
  perfil: 'empresario',
};

export function sessaoFicticia(perfil: Perfil = 'empresario') {
  return Response.json({
    data: {
      usuario: { ...usuarioFicticio, perfil },
      expiraEm: '2099-01-01T00:00:00.000Z',
    },
  });
}

export function colecao(data: object[]) {
  return Response.json({
    data,
    meta: {
      page: 1,
      pageSize: 20,
      total: data.length,
      totalPages: data.length ? 1 : 0,
    },
  });
}

export function mockHttp(
  handler: (path: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const mock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input).split('/api')[1], init),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

export const HOTEL_A: VinculoAcesso = {
  empreendimentoId: 10,
  nomeFantasia: 'Hotel A',
  cnpj: '11222333000181',
};
export const HOTEL_A2: VinculoAcesso = {
  empreendimentoId: 11,
  nomeFantasia: 'Hotel A2',
  cnpj: null,
};

/** Cabeçalho de contexto enviado em cada chamada a `caminho` (parte da URL). */
export function contextosEnviados(
  mock: ReturnType<typeof mockHttp>,
  caminho: string,
) {
  return mock.mock.calls
    .filter(([url]) => String(url).includes(caminho))
    .map(
      ([, init]) =>
        (init?.headers as Record<string, string> | undefined)?.[
          'x-identification'
        ],
    );
}
