import { describe, expect, it } from 'vitest';
import { ESQUEMA_EMPREENDIMENTOS } from '@ssc0536/common';
import {
  buscaComEstadoDaGrade,
  condicoesEditaveis,
  consultaDaGrade,
  estadoDaGrade,
  validarBuscaDaGrade,
  validarBuscaDasGrades,
  filtroComCondicao,
} from './grade';

describe('estado da grade na URL', () => {
  it('mantém filtro personalizado ao acrescentar condição de coluna', () => {
    const original = "situacao eq 'ativo' or situacao eq 'encerrado'";
    const resultado = filtroComCondicao(
      original,
      { campo: 'nomeFantasia', operador: 'contem', valor: 'hotel' },
      ESQUEMA_EMPREENDIMENTOS,
    );
    expect(resultado).toEqual({
      valido: true,
      data: `(${original}) and (contains(tolower(nomeFantasia),'hotel'))`,
    });
  });

  it('recusa páginas que ultrapassam o limite de skip do servidor', () => {
    expect(
      validarBuscaDaGrade(
        { 'empreendimentos.page': 50002 },
        'empreendimentos',
        ESQUEMA_EMPREENDIMENTOS,
      ),
    ).toEqual({});
  });
  it('valida somente as chaves namespaced e descarta OData inválido', () => {
    expect(
      validarBuscaDaGrade(
        {
          'empreendimentos.filter': "situacao eq 'ativo'",
          'empreendimentos.orderby': 'nomeFantasia desc',
          'empreendimentos.page': '3',
          'outra.page': '9',
        },
        'empreendimentos',
        ESQUEMA_EMPREENDIMENTOS,
      ),
    ).toEqual({
      'empreendimentos.filter': "situacao eq 'ativo'",
      'empreendimentos.orderby': 'nomeFantasia desc',
      'empreendimentos.page': 3,
    });
    expect(
      validarBuscaDaGrade(
        {
          'empreendimentos.filter': 'campoSecreto eq 1',
          'empreendimentos.orderby': 'pendencia asc',
          'empreendimentos.page': '-1',
        },
        'empreendimentos',
        ESQUEMA_EMPREENDIMENTOS,
      ),
    ).toEqual({});
  });

  it('combina grades independentes na mesma rota', () => {
    expect(
      validarBuscaDasGrades(
        {
          'principal.page': 2,
          'secundaria.page': 3,
        },
        [
          { id: 'principal', esquema: ESQUEMA_EMPREENDIMENTOS },
          { id: 'secundaria', esquema: ESQUEMA_EMPREENDIMENTOS },
        ],
      ),
    ).toEqual({ 'principal.page': 2, 'secundaria.page': 3 });
  });

  it('traduz a página em top/skip e reinicia sem apagar outras grades', () => {
    const busca = buscaComEstadoDaGrade(
      { 'outra.page': 4 },
      'empreendimentos',
      { filter: "situacao eq 'ativo'", orderby: '', page: 2 },
    );
    expect(busca).toEqual({
      'outra.page': 4,
      'empreendimentos.filter': "situacao eq 'ativo'",
      'empreendimentos.page': 2,
    });
    expect(consultaDaGrade(estadoDaGrade(busca, 'empreendimentos'))).toEqual({
      filter: "situacao eq 'ativo'",
      orderby: undefined,
      top: 20,
      skip: 20,
      count: true,
    });
  });

  it('distingue condições editáveis de filtro personalizado', () => {
    expect(
      condicoesEditaveis(
        "contains(tolower(nomeFantasia),'hotel')",
        ESQUEMA_EMPREENDIMENTOS,
      ),
    ).toEqual([{ campo: 'nomeFantasia', operador: 'contem', valor: 'hotel' }]);
    expect(
      condicoesEditaveis(
        "situacao eq 'ativo' or situacao eq 'encerrado'",
        ESQUEMA_EMPREENDIMENTOS,
      ),
    ).toBeNull();
  });
});
