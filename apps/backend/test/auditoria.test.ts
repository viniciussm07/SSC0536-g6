import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ESQUEMA_AUDITORIAS } from '@ssc0536/common';
import { snapshotSeguro } from '../src/auditoria/snapshots';
import { registrarAuditoria } from '../src/auditoria/registrar-auditoria';
import type { Prisma } from '../src/generated/prisma/client';
import { lerConsultaColecao } from '../src/odata/odata.decorators';
import { compilarFiltro } from '../src/odata/prisma-where';
import { compilarOrdenacao } from '../src/odata/prisma-order';
import { MAPA_AUDITORIAS } from '../src/auditoria/auditoria.odata';

describe('Auditoria: snapshots, proveniência e filtros', () => {
  it('seleciona os campos do domínio e remove segredos em qualquer profundidade', () => {
    assert.deepEqual(
      snapshotSeguro('conta', {
        nome: 'Pessoa fictícia',
        senha: 'nao-expor',
        token: 'nao-expor',
        perfil: 'gestor',
        extra: 'omitido',
      }),
      { nome: 'Pessoa fictícia', perfil: 'gestor' },
    );
    assert.deepEqual(
      snapshotSeguro('empreendimento', {
        contatos: [
          {
            valor: 'contato@example.test',
            tokenHash: 'segredo',
            extra: { password: 'segredo', ativo: false },
          },
        ],
        leitos: 100,
      }),
      {
        contatos: [{ valor: 'contato@example.test', extra: { ativo: false } }],
      },
    );
    assert.deepEqual(
      snapshotSeguro('dominio-desconhecido', { nome: 'não autorizado' }),
      {},
    );
    assert.equal(snapshotSeguro('conta', null), null);
  });
  it('preserva os campos das fontes complementares e descarta segredos', () => {
    assert.deepEqual(
      snapshotSeguro('coleta_diaria', {
        empreendimentoId: 10,
        empreendimentoNome: 'Hotel A',
        periodoId: 3,
        periodoRotulo: 'Novembro 2026',
        fonte: 'booking',
        dataColeta: '2026-11-01',
        dataEstadia: '2026-11-15',
        tipoDia: 'fim_de_semana',
        valorDiaria: '199.90',
        moeda: 'BRL',
        unidadePreco: 'por_uh_diaria',
        origem: 'manual',
        situacaoConferencia: 'conferida',
        referenciaOrigem: 'aba AI6',
        observacao: 'Preço ofertado.',
        conferidoEm: '2026-11-20T12:00:00.000Z',
        conferidoPor: 'Operadora',
        tokenHash: 'segredo',
        extra: 'omitido',
      }),
      {
        empreendimentoId: 10,
        empreendimentoNome: 'Hotel A',
        periodoId: 3,
        periodoRotulo: 'Novembro 2026',
        fonte: 'booking',
        dataColeta: '2026-11-01',
        dataEstadia: '2026-11-15',
        tipoDia: 'fim_de_semana',
        valorDiaria: '199.90',
        moeda: 'BRL',
        unidadePreco: 'por_uh_diaria',
        origem: 'manual',
        situacaoConferencia: 'conferida',
        referenciaOrigem: 'aba AI6',
        observacao: 'Preço ofertado.',
        conferidoEm: '2026-11-20T12:00:00.000Z',
        conferidoPor: 'Operadora',
      },
    );
    assert.deepEqual(
      snapshotSeguro('rhc_periodo', {
        periodoId: 3,
        periodoRotulo: 'Novembro 2026',
        qtdRhc: 2,
        leitos: 8,
        origem: 'manual',
        situacaoConferencia: 'conferida',
        revisao: 2,
        observacao: null,
        conferidoEm: '2026-11-20T12:00:00.000Z',
        conferidoPor: 'Operadora',
        senha: 'segredo',
      }),
      {
        periodoId: 3,
        periodoRotulo: 'Novembro 2026',
        qtdRhc: 2,
        leitos: 8,
        origem: 'manual',
        situacaoConferencia: 'conferida',
        revisao: 2,
        observacao: null,
        conferidoEm: '2026-11-20T12:00:00.000Z',
        conferidoPor: 'Operadora',
      },
    );
    assert.deepEqual(
      snapshotSeguro('parametro_calculo', {
        chave: 'day_use.percentual',
        valor: '15.15',
        unidade: 'percentual_0_100',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: null,
        fonte: 'Nota fictícia.',
        situacao: 'hipotese_pendente_homologacao',
        observacao: null,
        token: 'segredo',
      }),
      {
        chave: 'day_use.percentual',
        valor: '15.15',
        unidade: 'percentual_0_100',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: null,
        fonte: 'Nota fictícia.',
        situacao: 'hipotese_pendente_homologacao',
        observacao: null,
      },
    );
  });
  it('mantém zero, false e null e descarta undefined sem modificar o snapshot original', () => {
    const v = {
      capacidade: {
        leitos: 0,
        funciona24h: false,
        checkin: null,
        checkout: undefined,
      },
    };
    assert.deepEqual(snapshotSeguro('inventario_versao', v), {
      capacidade: { leitos: 0, funciona24h: false, checkin: null },
    });
    assert.ok(Object.hasOwn(v.capacidade, 'checkout'));
  });
  it('paginação estável e filtros por entidade, período, autor, ação e processo', () => {
    const c = lerConsultaColecao(
      {
        $filter:
          "entidade eq 'empreendimento' and em ge 2026-01-01T00:00:00Z and contains(autor,'Pessoa') and acao eq 'alterar'",
        $top: '5',
        $count: 'true',
      },
      { esquema: ESQUEMA_AUDITORIAS },
    );
    assert.ok(compilarFiltro(c.filtro!, ESQUEMA_AUDITORIAS, MAPA_AUDITORIAS));
    assert.deepEqual(
      compilarOrdenacao(c.ordenacao, ESQUEMA_AUDITORIAS, MAPA_AUDITORIAS),
      [{ em: 'desc' }, { id: 'desc' }],
    );
    assert.throws(() =>
      lerConsultaColecao(
        { $filter: "senha eq 'x'" },
        { esquema: ESQUEMA_AUDITORIAS },
      ),
    );
    assert.throws(() =>
      lerConsultaColecao({ page: '1' }, { esquema: ESQUEMA_AUDITORIAS }),
    );
  });
  it('falha de persistência da auditoria não é engolida pelo gravador transacional', async () => {
    const falha = new Error('auditoria indisponível');
    const tx = {
      usuario: { findUniqueOrThrow: async () => ({ nome: 'Pessoa fictícia' }) },
      auditoria: {
        create: async () => {
          throw falha;
        },
      },
    } as unknown as Prisma.TransactionClient;
    await assert.rejects(
      registrarAuditoria(tx, {
        usuarioId: 1,
        entidade: 'conta',
        entidadeId: 1,
        acao: 'alterar',
        depois: { evento: 'teste' },
      }),
      (e) => e === falha,
    );
    await assert.rejects(
      registrarAuditoria(tx, {
        processo: '',
        entidade: 'conta',
        entidadeId: 1,
        acao: 'alterar',
      }),
      /Processo/,
    );
  });
});
