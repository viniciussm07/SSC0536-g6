import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  abasReferenciaTeste,
  construirXlsx,
  tabulacaoFicticia,
} from './xlsx-teste';

/** Gera `fixtures/oto/importacao/*.xlsx` com dados fictícios no layout homologado. */
const destino = join(__dirname, '../../../fixtures/oto/importacao');
const nomes = [
  ['Hotel Fictício Alfa', { v: 0.755, pct: true }],
  ['Pousada Fictícia Beta', { v: 0.5, pct: true }],
  ['Resort Fictício Gama', '82,5%'],
  ['Flat Fictício Delta', { v: 0, pct: true }],
] as const;
writeFileSync(
  join(destino, 'tabulacao-consolidado-ficticia.xlsx'),
  construirXlsx([
    tabulacaoFicticia(nomes.map(([nome, ocupacao]) => ({ nome, ocupacao }))),
    ...abasReferenciaTeste(),
  ]),
);
// Mesmo layout com problemas típicos: escala ambígua, nome ausente e fórmula sem valor.
writeFileSync(
  join(destino, 'tabulacao-consolidado-ficticia-com-erros.xlsx'),
  construirXlsx([
    tabulacaoFicticia([
      { nome: 'Hotel Fictício Alfa', ocupacao: { v: 0.6, pct: true } },
      { nome: 'Pousada Fictícia Beta', ocupacao: 0.5 },
      { ocupacao: { v: 0.4, pct: true } },
      { nome: 'Resort Fictício Gama', ocupacao: { f: 'A1*2' } },
      { nome: 'Flat Fictício Delta' },
    ]),
    ...abasReferenciaTeste(),
  ]),
);

// Expectativa: mesmo layout, título e diárias próprios, abas de referência da fonte e um vínculo
// externo declarado (como no original), que o leitor não segue.
const expectativa = [
  ['Hotel Fictício Alfa', { v: 0.9, pct: true }],
  ['Pousada Fictícia Beta', '65,5%'],
  ['Resort Fictício Gama', { v: 0.82, pct: true }],
] as const;
writeFileSync(
  join(destino, 'tabulacao-expectativa-ficticia.xlsx'),
  construirXlsx(
    [
      tabulacaoFicticia(
        expectativa.map(([nome, ocupacao]) => ({ nome, ocupacao })),
        { B2: 'TAXA OCUPAÇÃO – EXPECTATIVA PÁSCOA 2026', G59: 3 },
      ),
      { nome: 'MH', celulas: { B1: 'NOME FANTASIA', D2: 32 } },
      { nome: 'ACUMULADO MENSAL', celulas: { B2: 'ACUMULADO MENSAL' } },
      {
        nome: 'CÁLCULO DA RECEITA ESTIMADA',
        celulas: { B2: 'QUANTIDADE DE DIÁRIAS DO PERÍODO PESQUISADO:' },
      },
    ],
    { 'xl/externalLinks/externalLink1.xml': '<externalLink/>' },
  ),
);
