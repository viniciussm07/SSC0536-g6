import { describe, expect, it } from 'vitest';
import type { IndicadorConsulta } from '@ssc0536/common';
import {
  formatarDecimal,
  formatarValor,
  indicadoresDisponiveis,
  periodosDasLinhas,
  recortesDoPeriodo,
  rotuloCurtoPeriodo,
  serieDoRecorte,
  textoDaCelula,
  rotuloEixoValor,
  rotuloMetodo,
  rotuloRecorte,
  rotuloTipoColeta,
  rotuloTipoPeriodo,
} from './indicadores';

const base: IndicadorConsulta = {
  id: 1,
  indicadorId: 1,
  nome: 'Taxa fictícia',
  unidade: '%',
  periodo: 'Mar 2026',
  periodoId: 3,
  periodoTipo: 'mes',
  periodoInicio: '2026-03-01',
  periodoFim: '2026-03-31',
  tipoColeta: 'consolidado',
  recorte: 'total',
  metodo: 'ponderada',
  valor: '50.0',
};
const l = (extra: Partial<IndicadorConsulta>) => ({ ...base, ...extra });

describe('utilitários do painel de indicadores', () => {
  it('traduz valores internos em rótulos legíveis', () => {
    expect(rotuloMetodo('aritmetica')).toBe('Aritmética');
    expect(rotuloMetodo('ponderada')).toBe('Ponderada');
    expect(rotuloTipoPeriodo('mes')).toBe('Mês');
    expect(rotuloTipoPeriodo('feriado_prolongado')).toBe('Feriado prolongado');
    expect(rotuloTipoColeta('consolidado')).toBe('Consolidado');
    expect(rotuloTipoColeta('expectativa')).toBe('Expectativa');
    expect(['total', 'hotel', 'pousada', 'resort'].map(rotuloRecorte)).toEqual([
      'Total',
      'Hotéis',
      'Pousadas',
      'Resorts',
    ]);
    // Valor novo na API continua visível, sem sublinhado.
    expect(rotuloMetodo('media_movel')).toBe('media movel');
  });

  it('marca do eixo Y leva a unidade', () => {
    expect(rotuloEixoValor(60, '%')).toBe('60%');
    expect(rotuloEixoValor(400, 'R$')).toBe('R$ 400');
    expect(rotuloEixoValor(3, 'dias')).toBe('3');
  });

  it('formata decimais da API sem perder dígitos nem passar por float', () => {
    expect(formatarDecimal('0.1')).toBe('0,1');
    expect(formatarDecimal('1045.20')).toBe('1.045,20');
    expect(formatarDecimal('-1234567')).toBe('-1.234.567');
    expect(formatarDecimal('12345678901234567890.123456789')).toBe(
      '12.345.678.901.234.567.890,123456789',
    );
    expect(formatarValor('48.2', '%')).toBe('48,2%');
    expect(formatarValor('468.90', 'R$')).toBe('R$ 468,90');
    expect(formatarValor('3', 'dias')).toBe('3 dias');
  });

  it('rótulo curto do eixo distingue mês e feriado prolongado', () => {
    expect(rotuloCurtoPeriodo(base)).toBe('mar/26');
    expect(
      rotuloCurtoPeriodo({
        periodoTipo: 'feriado_prolongado',
        periodoInicio: '2026-02-14',
      }),
    ).toBe('14/02/26');
  });

  it('ordena períodos pela data de início, não pelo rótulo', () => {
    const periodos = periodosDasLinhas([
      l({ periodoId: 9, periodo: 'B', periodoInicio: '2026-04-01' }),
      l({ periodoId: 2, periodo: 'Z', periodoInicio: '2026-01-01' }),
      l({ periodoId: 9, periodo: 'B', periodoInicio: '2026-04-01' }),
    ]);
    expect(periodos.map((p) => p.id)).toEqual([2, 9]);
  });

  it('indicador de série mais longa vem primeiro', () => {
    expect(
      indicadoresDisponiveis([
        l({ indicadorId: 1 }),
        l({ indicadorId: 2, id: 2 }),
        l({ indicadorId: 2, id: 3 }),
      ]).map((i) => i.id),
    ).toEqual([2, 1]);
  });

  it('diferencia ausência, valor único e resultados conflitantes', () => {
    const linhas = [
      l({ id: 1 }),
      l({ id: 2, tipoColeta: 'expectativa', valor: '0' }),
      l({ id: 3, recorte: 'hotel' }),
      l({ id: 4, recorte: 'hotel', valor: '51.0' }),
    ];
    const [ponto] = serieDoRecorte(linhas, periodosDasLinhas(linhas), 'total');
    expect(ponto.consolidado).toEqual({ situacao: 'unico', valor: '50.0' });
    // Zero publicado é valor, não ausência.
    expect(textoDaCelula(ponto.expectativa, '%')).toBe('0%');
    const recortes = recortesDoPeriodo(linhas, 3);
    expect(recortes.map((r) => r.recorte)).toEqual(['total', 'hotel']);
    expect(recortes[1].consolidado).toEqual({
      situacao: 'conflito',
      quantidade: 2,
    });
    expect(textoDaCelula(recortes[1].expectativa, '%')).toBe('sem dado');
  });
});
