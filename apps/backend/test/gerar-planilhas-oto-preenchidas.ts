import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/**
 * Preenche CÓPIAS das planilhas originais do OTO (docs/planilhas, que permanecem intactas) com
 * dados fictícios nas células de entrada: nome (C) e % de ocupação (L). Todo o resto do arquivo
 * original é mantido (fórmulas, abas, estilos, vínculos externos); valores em cache das fórmulas
 * ficam como no esqueleto, pois o leitor só consome as entradas.
 */
const raiz = join(__dirname, '../../..');
const origens = {
  consolidado: join(
    raiz,
    'docs/planilhas/tabulacao-consolidadas-2026/PLANILHA TABULAÇÃO CONSOLIDADAS 2026 - Cópia.xlsx',
  ),
  expectativa: join(
    raiz,
    'docs/planilhas/tabulacao-expectativa-2026/PLANILHA TABULAÇÃO EXPECTATIVA 2026 - Cópia.xlsx',
  ),
};
const destino = join(raiz, 'fixtures/oto/importacao/preenchidas');
mkdirSync(destino, { recursive: true });

const dados = JSON.parse(
  readFileSync(join(raiz, 'fixtures/oto/producao-simulada/dados.json'), 'utf8'),
) as { empreendimentos: Array<{ nomeFantasia: string; situacao: string }> };
const ativos = dados.empreendimentos
  .filter((e) => e.situacao === 'ativo')
  .map((e) => e.nomeFantasia);
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Linha = { nome?: string; ocupacao?: number | string };
/** Fração (0–1) vira número com o formato de porcentagem já existente na célula; texto vai como texto. */
function preencher(
  origem: string,
  linhas: Linha[],
  saida: string,
  periodo?: { titulo: string; diarias: number },
) {
  const arquivos = unzipSync(new Uint8Array(readFileSync(origem)));
  const caminho = 'xl/worksheets/sheet3.xml';
  let xml = strFromU8(arquivos[caminho]);
  linhas.forEach((l, i) => {
    const n = 5 + i;
    if (l.nome !== undefined) {
      const antes = new RegExp(`<c r="C${n}"( s="\\d+")?/>`);
      if (!antes.test(xml))
        throw new Error(`C${n} não está vazia no esqueleto.`);
      xml = xml.replace(
        antes,
        `<c r="C${n}"$1 t="inlineStr"><is><t>${esc(l.nome)}</t></is></c>`,
      );
    }
    if (l.ocupacao !== undefined) {
      const antes = new RegExp(`<c r="L${n}"( s="\\d+")?/>`);
      if (!antes.test(xml))
        throw new Error(`L${n} não está vazia no esqueleto.`);
      xml = xml.replace(
        antes,
        typeof l.ocupacao === 'number'
          ? `<c r="L${n}"$1><v>${l.ocupacao}</v></c>`
          : `<c r="L${n}"$1 t="inlineStr"><is><t>${esc(l.ocupacao)}</t></is></c>`,
      );
    }
  });
  if (periodo) {
    // Título (texto compartilhado) e quantidade de diárias (G59) do período da cópia.
    const textos = 'xl/sharedStrings.xml';
    arquivos[textos] = strToU8(
      strFromU8(arquivos[textos]).replace(
        'CONSOLIDADA CARNAVAL 2026',
        esc(periodo.titulo),
      ),
    );
    xml = xml.replace(
      '<c r="G59" s="232" t="n"><v>5</v></c>',
      `<c r="G59" s="232" t="n"><v>${periodo.diarias}</v></c>`,
    );
  }
  arquivos[caminho] = strToU8(xml);
  writeFileSync(
    saida,
    zipSync(arquivos, { mtime: new Date('2026-01-01T00:00:00Z') }),
  );
}

const par = (nomes: string[], valores: Array<number | string>): Linha[] =>
  nomes.map((nome, i) => ({ nome, ocupacao: valores[i] }));

// Consolidado (Carnaval 2026, 5 diárias): ocupação realizada.
const consolidado: Linha[] = [
  ...par(ativos.slice(0, 8), [0.93, 0.88, 0.76, 0.82, 0.69, 0.91, 0.58, 0.74]),
  { nome: ativos[8].toUpperCase(), ocupacao: 0.85 }, // caixa diferente: continua só sugestão
  { nome: `  ${ativos[9]}  `, ocupacao: '72,5%' }, // espaços e texto com %
  { nome: ativos[10], ocupacao: 0.97 },
  { nome: 'Pousada Recanto Sol', ocupacao: 0.66 }, // nome que não existe no cadastro
  { nome: 'Hotel Fazenda Nova Esperança', ocupacao: 0.54 }, // empreendimento desconhecido
  { nome: ativos[2], ocupacao: 0.7 }, // nome repetido no arquivo (aviso)
  { nome: 'Chalé Aurora' }, // listado sem taxa: ausência não é zero
];
// Expectativa (Páscoa 2026, 3 diárias): intenção declarada.
const expectativa: Linha[] = [
  ...par(
    ativos.slice(0, 9),
    [0.8, 0.72, 0.65, 0.7, 0.55, 0.85, 0.48, 0.6, 0.77],
  ),
  { nome: ativos[9], ocupacao: '68%' },
  { nome: ativos[10], ocupacao: 0.9 },
  { nome: 'Pousada Recanto Sol', ocupacao: 0.5 },
  { nome: 'Hotel Fazenda Nova Esperança', ocupacao: 0.45 },
  { nome: 'Chalé Aurora' },
];

// Consolidado curto para a demonstração em vídeo (Outubro/2026): Hotel Bela Vista fica de fora
// porque responde pelo painel do empresário; sobram vínculos por sugestão, um nome desconhecido
// para rejeitar e uma linha sem taxa.
const demonstracao: Linha[] = [
  ...par(
    ativos.filter((nome) => nome !== 'Hotel Bela Vista').slice(0, 6),
    [0.88, 0.76, 0.82, 0.69, 0.91, 0.58],
  ),
  { nome: 'Hotel Fazenda Nova Esperança', ocupacao: 0.54 },
  { nome: 'Chalé Aurora' },
];

// Consolidado completo (Outubro/2026): os 11 empreendimentos ativos, todos com taxa, para
// popular o painel com dados fictícios sem linhas rejeitadas.
const completa: Linha[] = par(
  ativos,
  [0.84, 0.88, 0.76, 0.82, 0.69, 0.91, 0.58, 0.74, 0.85, 0.72, 0.97],
);

preencher(
  origens.consolidado,
  consolidado,
  join(destino, 'tabulacao-consolidada-2026-preenchida.xlsx'),
);
preencher(
  origens.consolidado,
  completa,
  join(destino, 'tabulacao-consolidada-completa.xlsx'),
  { titulo: 'CONSOLIDADA OUTUBRO 2026', diarias: 31 },
);
preencher(
  origens.consolidado,
  demonstracao,
  join(destino, 'tabulacao-consolidada-demonstracao.xlsx'),
  { titulo: 'CONSOLIDADA OUTUBRO 2026', diarias: 31 },
);
preencher(
  origens.expectativa,
  expectativa,
  join(destino, 'tabulacao-expectativa-2026-preenchida.xlsx'),
);
console.log('ok', ativos.length, 'ativos usados');
