import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ESQUEMA_EMPREENDIMENTOS,
  ESQUEMA_INDICADORES,
  ESQUEMA_INVENTARIOS,
  ESQUEMAS_ODATA,
  lerFiltro,
  validarFiltro,
  type EsquemaOData,
} from '@ssc0536/common';
import { MAPA_CONTAS } from '../src/acesso/contas.odata';
import {
  MAPA_PERMISSOES,
  MAPA_VINCULOS,
  mapaVisibilidades,
} from '../src/acesso/acesso.odata';
import {
  MAPA_INDICADORES,
  MAPA_INVENTARIOS,
  MAPA_RESPOSTAS,
} from '../src/acesso/consultas.odata';
import {
  MAPA_CADASTUR,
  MAPA_CONTATOS,
  MAPA_EMPREENDIMENTOS,
} from '../src/cadastro/empreendimentos.odata';
import { lerConsultaColecao } from '../src/odata/odata.decorators';
import { compilarOrdenacao } from '../src/odata/prisma-order';
import {
  compilarFiltro,
  type MapeamentoRecurso,
} from '../src/odata/prisma-where';

function compilar(
  texto: string,
  esquema: EsquemaOData,
  mapa: MapeamentoRecurso,
) {
  const lido = lerFiltro(texto);
  assert.ok(lido.valido, texto);
  assert.deepEqual(validarFiltro(lido.data, esquema), [], texto);
  return compilarFiltro(lido.data, esquema, mapa);
}
/** Nenhuma linha: `in: []` na chave do recurso. */
const FALSO = { id: { in: [] } };
const emp = (texto: string) =>
  compilar(texto, ESQUEMA_EMPREENDIMENTOS, MAPA_EMPREENDIMENTOS);

describe('OData → Prisma: filtro', () => {
  it('comparações simples, nulos e funções de texto', () => {
    assert.deepEqual(emp("situacao eq 'ativo'"), {
      situacao: { equals: 'ativo' },
    });
    assert.deepEqual(emp('id ge 5'), { id: { gte: 5 } });
    assert.deepEqual(emp('cnpj eq null'), { cnpj: null });
    assert.deepEqual(emp('cnpj ne null'), { cnpj: { not: null } });
    assert.deepEqual(emp("contains(nomeFantasia,'alfa')"), {
      nomeFantasia: { contains: 'alfa' },
    });
    assert.deepEqual(emp("startswith(nomeFantasia,'A')"), {
      nomeFantasia: { startsWith: 'A' },
    });
    assert.deepEqual(emp("endswith(nomeFantasia,'z')"), {
      nomeFantasia: { endsWith: 'z' },
    });
  });

  it('tolower usa modo insensível só com literal em minúsculas; com maiúsculas nada casa', () => {
    assert.deepEqual(emp("contains(tolower(nomeFantasia),'alfa')"), {
      nomeFantasia: { contains: 'alfa', mode: 'insensitive' },
    });
    assert.deepEqual(emp("tolower(nomeFantasia) eq 'ana'"), {
      nomeFantasia: { equals: 'ana', mode: 'insensitive' },
    });
    assert.deepEqual(emp("contains(tolower(nomeFantasia),'Alfa')"), FALSO);
    assert.deepEqual(emp("tolower(nomeFantasia) eq 'Ana'"), FALSO);
    assert.deepEqual(emp("tolower(nomeFantasia) in ('a','B')"), {
      nomeFantasia: { in: ['a'], mode: 'insensitive' },
    });
    assert.deepEqual(emp("tolower(nomeFantasia) in ('A')"), FALSO);
  });

  it('ne e negações excluem nulos de forma explícita só em colunas anuláveis', () => {
    assert.deepEqual(emp("nomeFantasia ne 'x'"), {
      nomeFantasia: { not: 'x' },
    });
    assert.deepEqual(emp("cnpj ne '1'"), {
      AND: [{ cnpj: { not: null } }, { cnpj: { not: '1' } }],
    });
    assert.deepEqual(emp("not contains(cnpj,'1')"), {
      AND: [{ cnpj: { not: null } }, { NOT: { cnpj: { contains: '1' } } }],
    });
    assert.deepEqual(emp("not (cnpj eq '1')"), emp("cnpj ne '1'"));
    assert.deepEqual(emp('not (id gt 3)'), { id: { lte: 3 } });
    assert.deepEqual(emp('not (id ge 3)'), { id: { lt: 3 } });
    assert.deepEqual(emp('not not id eq 3'), emp('id eq 3'));
    assert.deepEqual(emp('not (cnpj eq null)'), { cnpj: { not: null } });
  });

  it('a negação desce até as folhas (De Morgan)', () => {
    assert.deepEqual(emp("not (situacao eq 'ativo' and cnpj eq null)"), {
      OR: [{ situacao: { not: 'ativo' } }, { cnpj: { not: null } }],
    });
    assert.deepEqual(emp("not (situacao eq 'ativo' or id eq 1)"), {
      AND: [{ situacao: { not: 'ativo' } }, { id: { not: 1 } }],
    });
    assert.deepEqual(emp("situacao eq 'ativo' and (id eq 1 or id eq 2)"), {
      AND: [
        { situacao: { equals: 'ativo' } },
        { OR: [{ id: { equals: 1 } }, { id: { equals: 2 } }] },
      ],
    });
  });

  it('in, notIn, listas vazias e literais com aspas', () => {
    assert.deepEqual(emp("situacao in ('ativo','encerrado')"), {
      situacao: { in: ['ativo', 'encerrado'] },
    });
    assert.deepEqual(emp("not situacao in ('ativo')"), {
      situacao: { notIn: ['ativo'] },
    });
    assert.deepEqual(emp("nomeFantasia eq 'D''Angelo'"), {
      nomeFantasia: { equals: "D'Angelo" },
    });
  });

  it('datas, instantes, decimais e caminhos de relação', () => {
    const inv = (t: string) =>
      compilar(t, ESQUEMA_INVENTARIOS, MAPA_INVENTARIOS);
    assert.deepEqual(inv('vigenciaInicio ge 2026-10-01'), {
      vigenciaInicio: { gte: new Date('2026-10-01T00:00:00.000Z') },
    });
    assert.deepEqual(inv('vigenciaFim eq null'), { vigenciaFim: null });
    assert.deepEqual(inv('totalUh ne 10'), {
      AND: [{ totalUh: { not: null } }, { totalUh: { not: 10 } }],
    });
    const ind = (t: string) =>
      compilar(t, ESQUEMA_INDICADORES, MAPA_INDICADORES);
    assert.deepEqual(ind('valor gt 62.5'), { valor: { gt: '62.5' } });
    assert.deepEqual(ind("nome eq 'Taxa'"), {
      definicao: { nome: { equals: 'Taxa' } },
    });
    assert.deepEqual(ind("contains(tolower(periodo),'out')"), {
      periodo: { rotulo: { contains: 'out', mode: 'insensitive' } },
    });
  });

  it('campos virtuais: pendência e identificação (CNPJ com ou sem máscara, ID)', () => {
    assert.deepEqual(emp("pendencia eq 'sem_cnpj'"), { cnpj: null });
    assert.deepEqual(emp("pendencia ne 'sem_contato'"), {
      NOT: { contatos: { none: {} } },
    });
    assert.deepEqual(emp("pendencia in ('sem_cnpj','sem_endereco')"), {
      OR: [{ cnpj: null }, { endereco: null }],
    });
    assert.deepEqual(emp("not pendencia eq 'sem_cnpj'"), {
      NOT: { cnpj: null },
    });
    assert.deepEqual(emp("identificacao eq '900001'"), {
      OR: [
        {
          AND: [
            { cnpj: { not: null } },
            { OR: [{ cnpj: { equals: '900001' } }] },
          ],
        },
        { id: 900001 },
      ],
    });
    const comMascara = emp("contains(identificacao,'11.222.333')") as {
      OR: { AND: [unknown, { OR: unknown[] }] }[];
    };
    assert.equal(comMascara.OR[0].AND[1].OR.length, 2);
    assert.deepEqual(emp("contains(identificacao,'')"), { NOT: FALSO });
    assert.deepEqual(emp("identificacao eq ''"), FALSO);
  });

  it('todo campo de todo esquema tem mapeamento (ou construtor virtual) e a ordenação o usa', () => {
    for (const mapa of [
      ['contas', MAPA_CONTAS],
      ['vinculos', MAPA_VINCULOS],
      ['visibilidades', mapaVisibilidades('visualizador')],
      ['permissoes', MAPA_PERMISSOES],
      ['empreendimentos', MAPA_EMPREENDIMENTOS],
      ['contatos', MAPA_CONTATOS],
      ['cadastur', MAPA_CADASTUR],
      ['indicadores', MAPA_INDICADORES],
      ['inventarios', MAPA_INVENTARIOS],
      ['respostas', MAPA_RESPOSTAS],
    ] as const) {
      const esquema = ESQUEMAS_ODATA[mapa[0]];
      for (const campo of esquema.campos) {
        const m = mapa[1][campo.nome];
        assert.ok(m, `${mapa[0]}.${campo.nome}`);
        assert.ok(m.caminho || m.construir, `${mapa[0]}.${campo.nome}`);
        if (campo.ordenavel)
          assert.ok(m.caminho, `${mapa[0]}.${campo.nome} ordena`);
      }
    }
  });

  it('campo sem mapeamento é erro de programação, não filtro silencioso', () => {
    const lido = lerFiltro('id eq 1');
    assert.ok(lido.valido);
    assert.throws(
      () => compilarFiltro(lido.data, ESQUEMA_EMPREENDIMENTOS, {}),
      /sem (mapeamento|chave mapeada)/,
    );
  });
});

describe('OData → Prisma: ordenação', () => {
  it('desempate sempre; nulos por último em colunas opcionais; relações aninham', () => {
    assert.deepEqual(
      compilarOrdenacao([], ESQUEMA_EMPREENDIMENTOS, MAPA_EMPREENDIMENTOS),
      [{ id: 'asc' }],
    );
    assert.deepEqual(
      compilarOrdenacao(
        [{ campo: 'cnpj', direcao: 'desc' }],
        ESQUEMA_EMPREENDIMENTOS,
        MAPA_EMPREENDIMENTOS,
      ),
      [{ cnpj: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
    );
    assert.deepEqual(
      compilarOrdenacao(
        [
          { campo: 'nomeFantasia', direcao: 'asc' },
          { campo: 'id', direcao: 'desc' },
        ],
        ESQUEMA_EMPREENDIMENTOS,
        MAPA_EMPREENDIMENTOS,
      ),
      [{ nomeFantasia: 'asc' }, { id: 'desc' }],
    );
    assert.deepEqual(
      compilarOrdenacao(
        [{ campo: 'nome', direcao: 'desc' }],
        ESQUEMA_INDICADORES,
        MAPA_INDICADORES,
      ),
      [{ definicao: { nome: 'desc' } }, { id: 'asc' }],
    );
  });
});

describe('Parâmetros de coleção: OData', () => {
  const opcoes = {
    esquema: ESQUEMA_EMPREENDIMENTOS,
  };
  const ler = (q: Record<string, unknown>) => lerConsultaColecao(q, opcoes);
  const codigo = (q: Record<string, unknown>) => {
    try {
      ler(q);
      return null;
    } catch (e) {
      const r = (
        e as {
          getResponse: () => {
            error: { code: string; details: { field: string }[] };
          };
        }
      ).getResponse();
      return [r.error.code, ...r.error.details.map((d) => d.field)].join(':');
    }
  };

  it('sem parâmetros aplica os padrões: 20 itens, a partir de 0, sem total', () => {
    const c = ler({});
    assert.equal(c.top, 20);
    assert.equal(c.skip, 0);
    assert.equal(c.contar, false);
  });

  it('total só com $count; $top e $skip são aplicados', () => {
    const c = ler({ $filter: "situacao eq 'ativo'", $top: '5' });
    assert.equal(c.top, 5);
    assert.equal(c.contar, false);
    assert.equal(ler({ $count: 'true' }).contar, true);
    assert.equal(ler({ $top: '7', $skip: '14' }).skip, 14);
  });

  it('recusa parâmetros do formato antigo, desconhecidos e filtros fora do esquema', () => {
    assert.equal(codigo({ page: '2' }), 'FILTRO_INVALIDO:page');
    assert.equal(codigo({ pageSize: '10' }), 'FILTRO_INVALIDO:pageSize');
    assert.equal(
      codigo({ $filter: 'id eq 1', busca: 'x' }),
      'FILTRO_INVALIDO:busca',
    );
    assert.equal(codigo({ foo: '1' }), 'FILTRO_INVALIDO:foo');
    assert.equal(codigo({ $select: 'id' }), 'FILTRO_INVALIDO:$select');
    assert.equal(
      codigo({ $filter: "telefone eq 'x'" }),
      'FILTRO_INVALIDO:$filter',
    );
    // Endpoint sem filtros anteriores não aceita `busca`.
    assert.throws(() =>
      lerConsultaColecao({ busca: 'x' }, { esquema: ESQUEMA_EMPREENDIMENTOS }),
    );
  });
});
