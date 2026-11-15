import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as esm from '@ssc0536/common';
const cjs = createRequire(import.meta.url)('@ssc0536/common');
for (const [formato, api] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  test(`${formato}: matriz inicial tem regras válidas e não amplia escopo de empresário ou visualizador`, () => {
    assert.equal(
      new Set(
        api.PERMISSOES_INICIAIS.map(
          (p) => `${p.perfil}:${p.recurso}:${p.acao}`,
        ),
      ).size,
      api.PERMISSOES_INICIAIS.length,
    );
    for (const regra of api.PERMISSOES_INICIAIS) {
      assert.equal(api.isPerfil(regra.perfil), true);
      assert.equal(api.isPermissaoAcesso(regra), true);
      assert.equal(api.permissaoCompativel(regra.perfil, regra), true);
      if (regra.perfil === 'empresario')
        assert.equal(regra.escopo, 'vinculados');
      if (regra.perfil === 'visualizador') {
        assert.equal(regra.recurso, 'indicadores');
        assert.equal(regra.acao, 'consultar');
      }
    }
    assert.equal(
      api.permissaoCompativel('empresario', {
        recurso: 'empreendimentos',
        acao: 'alterar',
        escopo: 'todos',
      }),
      false,
    );
    assert.equal(
      api.permissaoCompativel('gestor', {
        recurso: 'permissoes',
        acao: 'alterar',
        escopo: 'todos',
      }),
      false,
    );
    assert.equal(
      api.permissaoCompativel('visualizador', {
        recurso: 'indicadores',
        acao: 'alterar',
        escopo: 'todos',
      }),
      false,
    );
    assert.equal(
      api.permissaoCompativel('estagiario', {
        recurso: 'publicacoes',
        acao: 'publicar',
        escopo: 'todos',
      }),
      false,
    );
  });
  test(`${formato}: contratos rejeitam dados de acesso e paginação incompatíveis`, () => {
    assert.equal(
      api.isAcessoAtual({
        usuarioId: 1,
        perfil: 'empresario',
        revisao: 1,
        permissoes: [],
        vinculos: [],
      }),
      true,
    );
    for (const value of [
      null,
      {},
      {
        usuarioId: 1,
        perfil: 'inventado',
        revisao: 1,
        permissoes: [],
        vinculos: [],
      },
    ])
      assert.equal(api.isAcessoAtual(value), false);
    const pagina = {
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    };
    assert.equal(api.isPaginatedResponse(pagina, api.isContaResumo), true);
    assert.equal(
      api.isPaginatedResponse(
        { ...pagina, meta: { ...pagina.meta, pageSize: 101 } },
        api.isContaResumo,
      ),
      false,
    );
    assert.equal(
      api.isPaginatedResponse(
        { ...pagina, data: [{ senhaHash: 'não é contrato' }] },
        api.isContaResumo,
      ),
      false,
    );
    assert.equal(
      api.isPermissaoAcesso({
        recurso: 'contas',
        acao: 'alterar',
        escopo: 'desconhecido',
      }),
      false,
    );
    assert.equal(
      api.isIndicadorConsulta({
        id: 1,
        indicadorId: 1,
        nome: 'Teste',
        unidade: '%',
        periodo: 'Mês fictício',
        tipoColeta: 'consolidado',
        recorte: 'total',
        metodo: 'aritmetica',
        valor: 75,
      }),
      false,
    );
  });
}
