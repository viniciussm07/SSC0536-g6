import { colunasAuditoria } from '@/pages/auditoria/colunas';
import { describe, expect, it } from 'vitest';
import {
  ESQUEMA_CADASTUR,
  ESQUEMA_AUDITORIAS,
  ESQUEMA_CATALOGO_GRUPOS,
  ESQUEMA_CATALOGO_ITENS,
  ESQUEMA_CATALOGO_VERSOES,
  ESQUEMA_CONTAS,
  ESQUEMA_CONTATOS,
  ESQUEMA_EMPREENDIMENTOS,
  ESQUEMA_INDICADORES,
  ESQUEMA_INVENTARIOS,
  ESQUEMA_PERMISSOES,
  ESQUEMA_PESQUISAS_RESPONDENTE,
  ESQUEMA_RESPOSTAS,
  ESQUEMA_VINCULOS_CONTA,
  ESQUEMA_VISIBILIDADES,
  type EsquemaOData,
} from '@ssc0536/common';
import {
  colunasContas,
  colunasPermissoes,
  colunasVinculos,
  colunasVisibilidades,
} from '@/pages/administracao/colunas';
import { colunasEmpreendimentos } from '@/pages/empreendimentos/colunas';
import {
  colunasCadastur,
  colunasContatos,
  colunasInventarios,
  colunasPesquisasRespondente,
  colunasRespostas,
} from '@/pages/empreendimento/colunas';
import { colunasIndicadores } from '@/pages/indicadores/colunas';
import {
  colunasGrupos,
  colunasItens,
  colunasVersoes,
} from '@/pages/catalogos/colunas';

const grades: [string, EsquemaOData, readonly unknown[]][] = [
  ['auditoria', ESQUEMA_AUDITORIAS, colunasAuditoria(() => undefined)],
  [
    'contas',
    ESQUEMA_CONTAS,
    colunasContas({ usuarioId: 1, onGerenciar: () => undefined }),
  ],
  ['vínculos', ESQUEMA_VINCULOS_CONTA, colunasVinculos],
  ['permissões', ESQUEMA_PERMISSOES, colunasPermissoes],
  [
    'visibilidades',
    ESQUEMA_VISIBILIDADES,
    colunasVisibilidades({ pendente: false, onAlternar: () => undefined }),
  ],
  ['empreendimentos', ESQUEMA_EMPREENDIMENTOS, colunasEmpreendimentos],
  ['contatos', ESQUEMA_CONTATOS, colunasContatos],
  ['cadastur', ESQUEMA_CADASTUR, colunasCadastur],
  [
    'inventários',
    ESQUEMA_INVENTARIOS,
    colunasInventarios({
      podeCriar: true,
      podeConferir: true,
      onDetalhe: () => undefined,
      onCorrigir: () => undefined,
      onConferir: () => undefined,
    }),
  ],
  [
    'pesquisas do empreendimento',
    ESQUEMA_PESQUISAS_RESPONDENTE,
    colunasPesquisasRespondente({ onAbrir: () => undefined }),
  ],
  ['respostas', ESQUEMA_RESPOSTAS, colunasRespostas],
  ['indicadores', ESQUEMA_INDICADORES, colunasIndicadores],
  [
    'grupos do catálogo',
    ESQUEMA_CATALOGO_GRUPOS,
    colunasGrupos({ onEditar: () => undefined, onAlternar: () => undefined }),
  ],
  [
    'itens do catálogo',
    ESQUEMA_CATALOGO_ITENS,
    colunasItens({
      onEditar: () => undefined,
      onHistorico: () => undefined,
      onAlternar: () => undefined,
    }),
  ],
  ['versões do item', ESQUEMA_CATALOGO_VERSOES, colunasVersoes],
];

describe('cobertura de colunas das grades', () => {
  it.each(grades)(
    'toda coluna de dados de %s tem campo filtrável no esquema; só a coluna de ações é isenta',
    (_nome, esquema, colunas) => {
      for (const coluna of colunas as {
        id?: string;
        accessorKey?: string;
        meta?: { campo?: string };
      }[]) {
        const id = coluna.id ?? coluna.accessorKey;
        const campo = coluna.meta?.campo;
        if (!campo) {
          expect(id, `coluna ${id} sem campo OData`).toBe('acoes');
          continue;
        }
        const definicao = esquema.campos.find((item) => item.nome === campo);
        expect(definicao, `campo ${campo} ausente do esquema`).toBeDefined();
        expect(definicao?.filtravel, `campo ${campo} não filtrável`).toBe(true);
      }
    },
  );
});
