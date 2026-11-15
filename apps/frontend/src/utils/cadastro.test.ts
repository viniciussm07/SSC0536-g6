import { describe, expect, it } from 'vitest';
import type { EmpreendimentoDetalhe } from '@ssc0536/common';
import {
  campoDoFormulario,
  contatoVazio,
  errosPorCampo,
  paraEntrada,
  valoresIniciais,
} from './cadastro';

const detalhe: EmpreendimentoDetalhe = {
  id: 7,
  nomeFantasia: 'Hotel Fictício',
  cnpj: '11222333000181',
  situacao: 'ativo',
  tipoHospedagem: 'HOTEL',
  pendencias: [],
  razaoSocial: 'Hotel Ltda.',
  idOrigem: null,
  categoriaIndicador: null,
  endereco: 'Rua A, 1',
  zona: 'urbana',
  localizacao: { longitude: -49, latitude: -20 },
  dataInicioAtividades: '2026-01-01',
  dataEncerramento: null,
  segmentos: [{ id: 1, chave: 's', nome: 'S', nivelCadastro: 'completo' }],
  contatos: [
    {
      id: 5,
      tipo: 'email',
      valor: 'a@example.test',
      finalidade: 'publico',
      responsavelNome: null,
      responsavelCargo: null,
    },
  ],
  cadastur: [
    {
      id: 9,
      situacao: 'numero_proprio',
      numero: '000123',
      vencimento: '2027-01-31',
    },
    { id: 10, situacao: 'nao_possui', numero: null, vencimento: null },
  ],
};

describe('Cadastro: valores do formulário e entrada da API', () => {
  it('valores iniciais refletem o detalhe e mantêm zeros à esquerda do Cadastur', () => {
    const v = valoresIniciais(detalhe);
    expect(v.longitude).toBe('-49');
    expect(v.cadasturNumero).toBe('000123');
    expect(v.segmentoIds).toEqual(['1']);
    expect(v.contatos[0].id).toBe('5');
    expect(valoresIniciais().situacao).toBe('ativo');
  });

  it('criação omite o que está vazio e envia só o informado', () => {
    const v = {
      ...valoresIniciais(),
      nomeFantasia: ' Hotel Gama ',
      segmentoIds: ['1'],
    };
    expect(paraEntrada(v, 'criar')).toEqual({
      nomeFantasia: 'Hotel Gama',
      situacao: 'ativo',
      segmentoIds: [1],
    });
  });

  it('atualização envia null para limpar campos opcionais esvaziados', () => {
    const v = {
      ...valoresIniciais(detalhe),
      razaoSocial: '',
      endereco: '',
      longitude: '',
      latitude: '',
    };
    const e = paraEntrada(v, 'alterar', detalhe, false);
    expect(e.razaoSocial).toBeNull();
    expect(e.endereco).toBeNull();
    expect(e.localizacao).toBeNull();
    expect(e.nomeFantasia).toBe('Hotel Fictício');
  });

  it('coordenadas aceitam vírgula decimal; um só lado preenchido vira inválido para o validador', () => {
    const v = { ...valoresIniciais(), longitude: '-49,5', latitude: '-20,25' };
    expect(paraEntrada(v, 'criar').localizacao).toEqual({
      longitude: -49.5,
      latitude: -20.25,
    });
    const meio = paraEntrada(
      { ...valoresIniciais(), longitude: '-49' },
      'criar',
    );
    expect(Number.isNaN(meio.localizacao?.latitude)).toBe(true);
  });

  it('empresário (restrito) não envia campos reservados à equipe', () => {
    const e = paraEntrada(valoresIniciais(detalhe), 'alterar', detalhe, true);
    for (const campo of [
      'nomeFantasia',
      'cnpj',
      'idOrigem',
      'tipoHospedagem',
      'categoriaIndicador',
      'situacao',
      'dataEncerramento',
      'segmentoIds',
    ])
      expect(campo in e).toBe(false);
    expect(e.endereco).toBe('Rua A, 1');
  });

  it('contatos: linha em branco sem ID é descartada; existente esvaziada segue para remoção/validação', () => {
    const v = valoresIniciais(detalhe);
    v.contatos = [...v.contatos, contatoVazio()];
    const e = paraEntrada(v, 'alterar', detalhe, false);
    expect(e.contatos).toHaveLength(1);
    expect(e.contatos?.[0]).toMatchObject({ id: 5, tipo: 'email' });
  });

  it('Cadastur: edita o primeiro e preserva os demais registros; vazio remove só o primeiro', () => {
    const v = { ...valoresIniciais(detalhe), cadasturNumero: '000999' };
    const e = paraEntrada(v, 'alterar', detalhe, false);
    expect(e.cadastur).toHaveLength(2);
    expect(e.cadastur?.[0]).toMatchObject({ id: 9, numero: '000999' });
    expect(e.cadastur?.[1]).toMatchObject({ id: 10, situacao: 'nao_possui' });
    const sem = paraEntrada(
      { ...valoresIniciais(detalhe), cadasturSituacao: '' },
      'alterar',
      detalhe,
      false,
    );
    expect(sem.cadastur).toEqual([expect.objectContaining({ id: 10 })]);
  });

  it('encerramento só envia data quando encerrado; reativar limpa a data', () => {
    const encerrado = {
      ...valoresIniciais(detalhe),
      situacao: 'encerrado' as const,
      dataEncerramento: '2026-09-30',
    };
    expect(
      paraEntrada(encerrado, 'alterar', detalhe, false).dataEncerramento,
    ).toBe('2026-09-30');
    const reativado = { ...encerrado, situacao: 'ativo' as const };
    expect(
      paraEntrada(reativado, 'alterar', detalhe, false).dataEncerramento,
    ).toBeNull();
  });

  it('erros da API são mapeados para os nomes dos campos do formulário', () => {
    expect(campoDoFormulario('localizacao.latitude')).toBe('latitude');
    expect(campoDoFormulario('cadastur[0].numero')).toBe('cadasturNumero');
    expect(campoDoFormulario('cadastur')).toBe('cadasturSituacao');
    expect(campoDoFormulario('contatos[1].valor')).toBe('contatos[1].valor');
    expect(
      errosPorCampo([
        { field: 'cadastur[0].numero', message: 'A.' },
        { field: 'cadastur[0].vencimento', message: 'B.' },
        { field: 'cnpj', message: 'C.' },
      ]),
    ).toEqual({ cadasturNumero: 'A.', cadasturVencimento: 'B.', cnpj: 'C.' });
  });
});
