import { zipSync, strToU8 } from 'fflate';
import type { ItemPainel, Painel } from '@ssc0536/common';

/** Tabela única que alimenta PDF e XLSX: ambos mostram exatamente o que a API devolveu. */
export interface TabelaExportacao {
  titulo: string;
  meta: string[];
  colunas: { rotulo: string; largura: number; numerica?: boolean }[];
  /** Célula numérica leva `numero` (decimal exato em texto) e `texto` formatado. */
  linhas: { texto: string; numero?: string }[][];
}

const MOTIVOS: Record<string, string> = {
  sem_respondentes: 'sem respondentes',
  capacidade_zero: 'capacidade zerada',
  base_zero: 'base zerada',
  dado_ausente: 'dado ausente',
  parametro_ausente: 'parâmetro ausente',
  entrada_invalida: 'entrada inválida',
};
const ROTULO_COLETA = {
  expectativa: 'Expectativa',
  consolidado: 'Consolidado',
};

const unidade = (u: string) =>
  u === 'percentual_0_100' ? '%' : u.replaceAll('_', ' ');
const decimal = (v: string) =>
  Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const instante = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  });
const origem = (i: ItemPainel) =>
  i.fonte.origem === 'carga'
    ? 'Carga histórica'
    : `Cálculo #${i.fonte.execucaoId}, revisão ${i.fonte.revisao}`;

export function montarTabela(painel: Painel): TabelaExportacao {
  const comparando = painel.comparacao !== null;
  const colunas: TabelaExportacao['colunas'] = [
    { rotulo: 'Grupo', largura: 14 },
    { rotulo: 'Indicador', largura: 46 },
    { rotulo: 'Recorte', largura: 14 },
    { rotulo: 'Valor', largura: 22, numerica: true },
    { rotulo: 'Unidade', largura: 16 },
    ...(comparando
      ? [
          {
            rotulo: 'Período base',
            largura: 22,
            numerica: true,
          },
          { rotulo: 'Variação', largura: 14, numerica: true },
        ]
      : []),
    { rotulo: 'Origem', largura: 30 },
    { rotulo: 'Atualizado em', largura: 26 },
  ];
  const linhas = painel.itens.map((i) => {
    const valor =
      i.valor.estado === 'disponivel'
        ? { texto: decimal(i.valor.valor), numero: i.valor.valor }
        : {
            texto: `Indisponível (${MOTIVOS[i.valor.motivo] ?? i.valor.motivo})`,
          };
    const c = i.comparacao;
    return [
      { texto: i.grupo === 'cobertura' ? 'Cobertura' : 'Indicador' },
      { texto: i.nome },
      { texto: i.recorte === 'total' ? 'Total' : i.recorte },
      valor,
      { texto: unidade(i.unidade) },
      ...(comparando
        ? [
            c?.estado === 'disponivel'
              ? { texto: decimal(c.valor), numero: c.valor }
              : {
                  texto:
                    c?.estado === 'indisponivel' ? 'Indisponível' : 'Sem base',
                },
            c?.estado === 'disponivel'
              ? { texto: decimal(c.variacao), numero: c.variacao }
              : { texto: '—' },
          ]
        : []),
      { texto: origem(i) },
      { texto: instante(i.fonte.calculadoEm) },
    ];
  });
  return {
    titulo: `Indicadores — ${painel.periodo.rotulo} · ${ROTULO_COLETA[painel.tipoColeta]}`,
    meta: [
      `Período: ${painel.periodo.rotulo} (${painel.periodo.dataInicio} a ${painel.periodo.dataFim})`,
      `Coleta: ${ROTULO_COLETA[painel.tipoColeta]}`,
      ...(painel.comparacao
        ? [`Comparado com: ${painel.comparacao.rotulo}`]
        : []),
      ...(painel.atualizadoEm
        ? [`Atualizado em: ${instante(painel.atualizadoEm)}`]
        : []),
      painel.aviso,
    ],
    colunas,
    linhas,
  };
}

/** Nome seguro do arquivo, sem acentos nem separadores. */
export function nomeArquivo(painel: Painel, extensao: string): string {
  const base = `indicadores-${painel.periodo.rotulo}-${painel.tipoColeta}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${base}.${extensao}`;
}

// ───────────────────────────── XLSX ─────────────────────────────

const xml = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const coluna = (n: number) => String.fromCharCode(65 + n);

export function gerarXlsx(painel: Painel): Uint8Array {
  const t = montarTabela(painel);
  const linhas: string[] = [];
  let r = 0;
  const texto = (c: number, v: string, estilo = 0) =>
    `<c r="${coluna(c)}${r}" t="inlineStr" s="${estilo}"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  const linha = (celulas: () => string) => {
    r += 1;
    linhas.push(`<row r="${r}">${celulas()}</row>`);
  };
  linha(() => texto(0, t.titulo, 1));
  for (const m of t.meta) linha(() => texto(0, m));
  r += 1; // linha em branco
  linha(() => t.colunas.map((c, i) => texto(i, c.rotulo, 2)).join(''));
  for (const l of t.linhas)
    linha(() =>
      l
        .map((c, i) =>
          c.numero !== undefined
            ? `<c r="${coluna(i)}${r}" s="3"><v>${xml(c.numero)}</v></c>`
            : texto(i, c.texto),
        )
        .join(''),
    );
  const cols = t.colunas
    .map(
      (c, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${c.largura}" customWidth="1"/>`,
    )
    .join('');
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const arquivos = {
    '[Content_Types].xml': `${cab}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${cab}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Indicadores" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `${cab}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF007BB6"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
    'xl/worksheets/sheet1.xml': `${cab}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${linhas.join('')}</sheetData></worksheet>`,
  };
  return zipSync(
    Object.fromEntries(
      Object.entries(arquivos).map(([k, v]) => [k, strToU8(v)]),
    ),
  );
}

// ───────────────────────────── PDF ─────────────────────────────

const A4 = { w: 842, h: 595 }; // paisagem
const MARGEM = 36;
const CORPO = 8.5;
const ALTURA_LINHA = 11;

/** Helvetica em WinAnsi: o que não cabe em Latin-1 vira "?" (sem quebrar o arquivo). */
const latin1 = (s: string) =>
  s
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7e\xa0-\xff]/g, '?');
const esc = (s: string) =>
  latin1(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function quebrar(texto: string, maxChars: number): string[] {
  const saida: string[] = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/)) {
    let p = palavra;
    while (p.length > maxChars) {
      if (atual) {
        saida.push(atual);
        atual = '';
      }
      saida.push(p.slice(0, maxChars));
      p = p.slice(maxChars);
    }
    const junta = atual ? `${atual} ${p}` : p;
    if (junta.length > maxChars) {
      saida.push(atual);
      atual = p;
    } else atual = junta;
  }
  if (atual) saida.push(atual);
  return saida.length ? saida : [''];
}

export function gerarPdf(painel: Painel): Uint8Array {
  const t = montarTabela(painel);
  const util = A4.w - 2 * MARGEM;
  const soma = t.colunas.reduce((a, c) => a + c.largura, 0);
  const larguras = t.colunas.map((c) => (c.largura / soma) * util);
  const maxChars = larguras.map((l) =>
    Math.max(4, Math.floor((l - 6) / (CORPO * 0.5))),
  );

  const paginas: string[][] = [];
  let ops: string[] = [];
  let y = 0;
  const texto = (
    x: number,
    yy: number,
    s: string,
    tam: number,
    negrito = false,
  ) =>
    `BT /${negrito ? 'F2' : 'F1'} ${tam} Tf ${x.toFixed(1)} ${yy.toFixed(1)} Td (${esc(s)}) Tj ET`;
  const cabecalhoTabela = () => {
    ops.push(
      `0 0.482 0.714 rg ${MARGEM} ${(y - 3).toFixed(1)} ${util.toFixed(1)} ${ALTURA_LINHA + 4} re f`,
    );
    ops.push('1 1 1 rg');
    let x = MARGEM;
    t.colunas.forEach((c, i) => {
      ops.push(texto(x + 3, y, c.rotulo, CORPO, true));
      x += larguras[i];
    });
    ops.push('0.1 0.1 0.1 rg');
    y -= ALTURA_LINHA + 6;
  };
  const novaPagina = (primeira: boolean) => {
    ops = [];
    paginas.push(ops);
    y = A4.h - MARGEM;
    if (primeira) {
      ops.push('0.1 0.1 0.1 rg');
      ops.push(texto(MARGEM, y, t.titulo, 15, true));
      y -= 20;
      for (const m of t.meta) {
        quebrar(m, 150).forEach((l) => {
          ops.push(texto(MARGEM, y, l, 9));
          y -= 12;
        });
      }
      y -= 8;
    }
    ops.push('0.1 0.1 0.1 rg');
    cabecalhoTabela();
  };
  novaPagina(true);
  for (const linha of t.linhas) {
    const partes = linha.map((c, i) => quebrar(c.texto, maxChars[i]));
    const altura = Math.max(...partes.map((p) => p.length)) * ALTURA_LINHA + 4;
    if (y - altura < MARGEM + 14) novaPagina(false);
    let x = MARGEM;
    partes.forEach((p, i) => {
      p.forEach((l, k) => {
        const largura = l.length * CORPO * 0.5;
        const xx = t.colunas[i].numerica
          ? x + larguras[i] - 3 - largura
          : x + 3;
        ops.push(texto(xx, y - k * ALTURA_LINHA, l, CORPO));
      });
      x += larguras[i];
    });
    ops.push(
      `0.89 0.91 0.93 RG ${MARGEM} ${(y - altura + ALTURA_LINHA - 1).toFixed(1)} m ${A4.w - MARGEM} ${(y - altura + ALTURA_LINHA - 1).toFixed(1)} l S`,
    );
    ops.push('0.1 0.1 0.1 rg');
    y -= altura;
  }
  paginas.forEach((p, i) =>
    p.push(
      texto(
        A4.w - MARGEM - 60,
        MARGEM - 14,
        `Página ${i + 1} de ${paginas.length}`,
        8,
      ),
    ),
  );

  // Objetos: 1 catálogo, 2 páginas, 3-4 fontes, depois (conteúdo, página) por página.
  const objetos: string[] = [];
  const idsPagina = paginas.map((_, i) => 6 + i * 2);
  objetos[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objetos[2] = `<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(' ')}] /Count ${paginas.length} >>`;
  objetos[3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objetos[4] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  objetos[5] = `<< /Title (${esc(t.titulo)}) /Producer (OTO) >>`;
  paginas.forEach((p, i) => {
    const conteudo = p.join('\n');
    objetos[idsPagina[i] - 1] =
      `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`;
    objetos[idsPagina[i]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idsPagina[i] - 1} 0 R >>`;
  });
  const partes: Buffer[] = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets: number[] = [];
  let pos = partes[0].length;
  for (let id = 1; id < objetos.length; id++) {
    offsets[id] = pos;
    const b = Buffer.from(`${id} 0 obj\n${objetos[id]}\nendobj\n`, 'latin1');
    partes.push(b);
    pos += b.length;
  }
  const xref =
    `xref\n0 ${objetos.length}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
      .join('') +
    `trailer\n<< /Size ${objetos.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  partes.push(Buffer.from(xref, 'latin1'));
  return new Uint8Array(Buffer.concat(partes));
}
