import { zipSync, strToU8 } from 'fflate';

/** Valor de célula do construtor de .xlsx fictício usado apenas em testes. */
export type CelulaTeste =
  | string
  | number
  | { t?: 'e' | 'b' | 'str'; v?: string | number; f?: string; pct?: boolean };
export interface AbaTeste {
  nome: string;
  celulas: Record<string, CelulaTeste>;
  mesclas?: string[];
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Monta um pacote OOXML mínimo (estilo 0 = geral, estilo 1 = porcentagem `0%`). */
export function construirXlsx(
  abas: AbaTeste[],
  extras: Record<string, string> = {},
): Uint8Array {
  const compartilhadas: string[] = [];
  const indice = (t: string) => {
    let i = compartilhadas.indexOf(t);
    if (i < 0) i = compartilhadas.push(t) - 1;
    return i;
  };
  const colunaN = (ref: string) =>
    [...ref.replace(/\d+/g, '')].reduce(
      (n, c) => n * 26 + c.charCodeAt(0) - 64,
      0,
    );
  const planilhas = abas.map((aba) => {
    const porLinha = new Map<number, string[]>();
    const refs = Object.keys(aba.celulas).sort(
      (a, b) =>
        Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')) ||
        colunaN(a) - colunaN(b),
    );
    for (const ref of refs) {
      const c = aba.celulas[ref];
      const linha = Number(ref.replace(/\D/g, ''));
      let xml: string;
      if (typeof c === 'string')
        xml = `<c r="${ref}" t="s"><v>${indice(c)}</v></c>`;
      else if (typeof c === 'number') xml = `<c r="${ref}"><v>${c}</v></c>`;
      else {
        const t = c.t ? ` t="${c.t}"` : '';
        const s = c.pct ? ' s="1"' : '';
        const f = c.f !== undefined ? `<f>${esc(c.f)}</f>` : '';
        const v = c.v !== undefined ? `<v>${esc(String(c.v))}</v>` : '';
        xml = `<c r="${ref}"${s}${t}>${f}${v}</c>`;
      }
      porLinha.set(linha, [...(porLinha.get(linha) ?? []), xml]);
    }
    const linhas = [...porLinha.entries()]
      .map(([n, cs]) => `<row r="${n}">${cs.join('')}</row>`)
      .join('');
    const mesclas = aba.mesclas?.length
      ? `<mergeCells>${aba.mesclas.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '';
    return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${linhas}</sheetData>${mesclas}</worksheet>`;
  });
  const arquivos: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas
        .map(
          (a, i) =>
            `<sheet name="${esc(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
        )
        .join('')}</sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join('')}</Relationships>`,
    ),
    'xl/styles.xml': strToU8(
      '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="9"/></cellXfs></styleSheet>',
    ),
    ...Object.fromEntries(
      planilhas.map((p, i) => [`xl/worksheets/sheet${i + 1}.xml`, strToU8(p)]),
    ),
    ...Object.fromEntries(
      Object.entries(extras).map(([k, v]) => [k, strToU8(v)]),
    ),
  };
  arquivos['xl/sharedStrings.xml'] = strToU8(
    `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${compartilhadas
      .map((t) => `<si><t xml:space="preserve">${esc(t)}</t></si>`)
      .join('')}</sst>`,
  );
  return zipSync(arquivos, { mtime: new Date('2026-01-01T00:00:00Z') });
}

/** Aba TABULAÇÃO fictícia com o layout homologado; `linhas` preenche C e L a partir da linha 5. */
export function tabulacaoFicticia(
  linhas: Array<{ nome?: string; ocupacao?: CelulaTeste }> = [],
  ajustes: Record<string, CelulaTeste> = {},
): AbaTeste {
  const celulas: Record<string, CelulaTeste> = {
    B2: 'TAXA OCUPAÇÃO – CONSOLIDADA CARNAVAL 2026',
    B4: 'CONTROLE',
    C4: 'MEIO DE HOSPEDAGEM',
    G4: 'QTDE DE UH\n(C/ FÓRMULA)',
    L4: '% TAXA DE OCUPAÇÃO',
    M4: 'TOTAL NÚMERO TURISTAS PERÍODO',
    B45: 'TOTAL MH RESP.',
    B59: 'QUANTIDADE DE DIÁRIAS DO PERÍODO PESQUISADO:',
    G59: 5,
    // Colunas calculadas existem na planilha oficial, mas nunca viram respostas.
    G5: { f: 'IFERROR(VLOOKUP(C5,MH!B$2:D$85,3,0),"0")', v: 0 },
    M5: { f: '(J5*L5)*$G$59', v: 0 },
  };
  linhas.forEach((l, i) => {
    const n = 5 + i;
    celulas[`A${n}`] = i + 1;
    if (l.nome !== undefined) celulas[`C${n}`] = l.nome;
    if (l.ocupacao !== undefined) celulas[`L${n}`] = l.ocupacao;
  });
  return { nome: 'TABULAÇÃO', celulas: { ...celulas, ...ajustes } };
}

export const abasReferenciaTeste = (): AbaTeste[] => [
  { nome: 'MH', celulas: { B1: 'NOME FANTASIA', D2: 32 } },
  { nome: 'ACUMULADO', celulas: { B2: 'ACUMULADO' } },
];
