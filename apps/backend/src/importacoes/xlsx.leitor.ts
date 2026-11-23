import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import {
  LIMITES_IMPORTACAO,
  type CelulaBruta,
  type CodigoOcorrencia,
} from '@ssc0536/common';

/** Falha de arquivo ou de layout, com texto acionável para a tela de importação. */
export class ErroLeitura extends Error {
  constructor(
    readonly codigo: CodigoOcorrencia,
    mensagem: string,
    readonly orientacao: string,
  ) {
    super(mensagem);
  }
}

export interface CelulaXlsx extends CelulaBruta {
  coluna: string;
  linha: number;
}
export interface Mescla {
  c1: number;
  r1: number;
  c2: number;
  r2: number;
}
export interface PlanilhaXlsx {
  nome: string;
  celulas: ReadonlyMap<string, CelulaXlsx>;
  mesclas: readonly Mescla[];
}
export interface PastaXlsx {
  abas: readonly PlanilhaXlsx[];
  /**
   * O pacote declara vínculos com planilhas externas. Nunca são abertos nem seguidos: só valores
   * armazenados são lidos; o parser da fonte registra o aviso.
   */
  vinculosExternos: boolean;
}

type No = Record<string, unknown>;
const lista = <T>(v: unknown): T[] =>
  v === undefined ? [] : Array.isArray(v) ? (v as T[]) : [v as T];
const texto = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (v && typeof v === 'object') {
    const n = v as No;
    return typeof n['#text'] === 'string' ? n['#text'] : '';
  }
  return '';
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: true,
  isArray: (nome) =>
    [
      'row',
      'c',
      'si',
      'r',
      'sheet',
      'Relationship',
      'xf',
      'numFmt',
      'mergeCell',
    ].includes(nome),
});

const NOMES_NECESSARIOS =
  /^(\[Content_Types\]\.xml|xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/sharedStrings\.xml|xl\/styles\.xml|xl\/worksheets\/[^/]+\.xml)$/;

const letrasParaNumero = (letras: string): number =>
  [...letras].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);

function lerXml(bytes: Uint8Array | undefined, nome: string): No {
  if (!bytes)
    throw new ErroLeitura(
      'ARQUIVO_INVALIDO',
      `Parte obrigatória ausente no arquivo: ${nome}.`,
      'Salve novamente a planilha como .xlsx a partir do Excel ou LibreOffice.',
    );
  try {
    return parser.parse(Buffer.from(bytes).toString('utf8')) as No;
  } catch {
    throw new ErroLeitura(
      'ARQUIVO_INVALIDO',
      `Parte do arquivo ilegível: ${nome}.`,
      'O arquivo parece corrompido; gere uma nova cópia da planilha.',
    );
  }
}

function descompactar(conteudo: Uint8Array): {
  pacote: Record<string, Uint8Array>;
  vinculosExternos: boolean;
} {
  const inicio = Buffer.from(conteudo.subarray(0, 4));
  if (inicio.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])))
    throw new ErroLeitura(
      'FORMATO_NAO_HOMOLOGADO',
      'Planilhas .xls (formato binário antigo) não são homologadas.',
      'Salve o arquivo como .xlsx e envie novamente.',
    );
  if (!inicio.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))
    throw new ErroLeitura(
      'FORMATO_NAO_HOMOLOGADO',
      'O arquivo não é uma pasta de trabalho .xlsx.',
      'Envie a planilha original em formato .xlsx.',
    );
  let entradas = 0;
  let total = 0;
  let macro = false;
  let ods = false;
  let externo = false;
  let pacote: Record<string, Uint8Array>;
  try {
    pacote = unzipSync(conteudo, {
      filter: (arquivo) => {
        entradas += 1;
        total += arquivo.originalSize;
        if (
          entradas > LIMITES_IMPORTACAO.entradasPacoteMaximas ||
          total > LIMITES_IMPORTACAO.descompactadoMaximoBytes
        )
          throw new ErroLeitura(
            'LIMITE_EXCEDIDO',
            'O conteúdo do arquivo excede os limites de segurança.',
            'Envie a planilha original, sem anexos ou objetos embutidos.',
          );
        if (/(^|\/)vbaProject\.bin$/i.test(arquivo.name)) macro = true;
        if (/^xl\/externalLinks\//i.test(arquivo.name)) externo = true;
        if (arquivo.name === 'mimetype' || arquivo.name === 'content.xml')
          ods = true;
        return NOMES_NECESSARIOS.test(arquivo.name);
      },
    });
  } catch (e) {
    if (e instanceof ErroLeitura) throw e;
    throw new ErroLeitura(
      'ARQUIVO_INVALIDO',
      'Não foi possível abrir o pacote .xlsx.',
      'O arquivo parece corrompido ou protegido; gere uma nova cópia.',
    );
  }
  if (macro)
    throw new ErroLeitura(
      'MACRO_PRESENTE',
      'O arquivo contém macros (VBA), que nunca são executadas ou aceitas.',
      'Envie uma cópia .xlsx sem macros.',
    );
  if (ods)
    throw new ErroLeitura(
      'FORMATO_NAO_HOMOLOGADO',
      'Arquivos OpenDocument (.ods) não são homologados para esta fonte.',
      'Envie a planilha em formato .xlsx.',
    );
  return { pacote, vinculosExternos: externo };
}

function lerSharedStrings(bytes: Uint8Array | undefined): string[] {
  if (!bytes) return [];
  const raiz = lerXml(bytes, 'xl/sharedStrings.xml');
  const sst = (raiz.sst ?? {}) as No;
  return lista<No>(sst.si).map((si) => {
    if (si.t !== undefined) return texto(si.t);
    return lista<No>(si.r)
      .map((r) => texto(r.t))
      .join('');
  });
}

/** Percentual: formatos internos 9 e 10 ou formato personalizado com `%` fora de aspas. */
function lerEstilosPercentuais(bytes: Uint8Array | undefined): boolean[] {
  if (!bytes) return [];
  const raiz = lerXml(bytes, 'xl/styles.xml');
  const estilos = (raiz.styleSheet ?? {}) as No;
  const personalizados = new Map<string, string>();
  for (const f of lista<No>((estilos.numFmts as No | undefined)?.numFmt))
    personalizados.set(
      String(f['@_numFmtId']),
      String(f['@_formatCode'] ?? ''),
    );
  const xfs = lista<No>((estilos.cellXfs as No | undefined)?.xf);
  return xfs.map((xf) => {
    const id = String(xf['@_numFmtId'] ?? '0');
    if (id === '9' || id === '10') return true;
    const codigo = (personalizados.get(id) ?? '').replace(/"[^"]*"/g, '');
    return codigo.includes('%');
  });
}

function lerPlanilha(
  nome: string,
  bytes: Uint8Array | undefined,
  compartilhadas: string[],
  percentuais: boolean[],
): PlanilhaXlsx {
  const raiz = lerXml(bytes, `planilha ${nome}`);
  const ws = (raiz.worksheet ?? {}) as No;
  const dados = (ws.sheetData ?? {}) as No;
  const celulas = new Map<string, CelulaXlsx>();
  for (const row of lista<No>(dados.row)) {
    for (const c of lista<No>(row.c)) {
      const ref = String(c['@_r'] ?? '');
      const m = /^([A-Z]{1,3})(\d{1,7})$/.exec(ref);
      if (!m) continue;
      const t = String(c['@_t'] ?? 'n');
      const f = c.f;
      const temFormula = f !== undefined;
      const v = c.v === undefined ? undefined : texto(c.v);
      let tipo: CelulaBruta['tipo'] = 'vazio';
      let bruto: string | null = null;
      if (t === 'inlineStr') {
        const is = (c.is ?? {}) as No;
        bruto =
          is.t !== undefined
            ? texto(is.t)
            : lista<No>(is.r)
                .map((r) => texto(r.t))
                .join('');
        tipo = 'texto';
      } else if (v !== undefined) {
        if (t === 's') {
          bruto = compartilhadas[Number(v)] ?? null;
          tipo = bruto === null ? 'vazio' : 'texto';
        } else if (t === 'str' || t === 'd') {
          bruto = v;
          tipo = 'texto';
        } else if (t === 'e') {
          bruto = v;
          tipo = 'erro';
        } else if (t === 'b') {
          bruto = v;
          tipo = 'booleano';
        } else {
          bruto = v;
          tipo = 'numero';
        }
      }
      if (
        bruto !== null &&
        bruto.length > LIMITES_IMPORTACAO.celulaMaximaCaracteres
      )
        throw new ErroLeitura(
          'LIMITE_EXCEDIDO',
          `Célula ${ref} excede ${LIMITES_IMPORTACAO.celulaMaximaCaracteres} caracteres.`,
          'Revise o conteúdo da célula; a leitura não aceita blocos de texto longos.',
        );
      if (tipo === 'vazio' && !temFormula) continue;
      const estilo = Number(c['@_s'] ?? 0);
      celulas.set(ref, {
        coluna: m[1],
        linha: Number(m[2]),
        bruto,
        tipo,
        formula: temFormula ? texto(f) : null,
        formatoPercentual: tipo === 'numero' && percentuais[estilo] === true,
      });
    }
  }
  const mesclas: Mescla[] = [];
  for (const mc of lista<No>((ws.mergeCells as No | undefined)?.mergeCell)) {
    const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(String(mc['@_ref'] ?? ''));
    if (m)
      mesclas.push({
        c1: letrasParaNumero(m[1]),
        r1: Number(m[2]),
        c2: letrasParaNumero(m[3]),
        r2: Number(m[4]),
      });
  }
  return { nome, celulas, mesclas };
}

/** Lê valores armazenados; nunca executa macros nem recalcula fórmulas. */
export function lerXlsx(conteudo: Uint8Array): PastaXlsx {
  const { pacote, vinculosExternos } = descompactar(conteudo);
  const livro = (lerXml(pacote['xl/workbook.xml'], 'xl/workbook.xml')
    .workbook ?? {}) as No;
  const rels = (lerXml(
    pacote['xl/_rels/workbook.xml.rels'],
    'xl/_rels/workbook.xml.rels',
  ).Relationships ?? {}) as No;
  const destinos = new Map(
    lista<No>(rels.Relationship).map((r) => [
      String(r['@_Id']),
      String(r['@_Target']),
    ]),
  );
  const compartilhadas = lerSharedStrings(pacote['xl/sharedStrings.xml']);
  const percentuais = lerEstilosPercentuais(pacote['xl/styles.xml']);
  const abas: PlanilhaXlsx[] = [];
  for (const s of lista<No>((livro.sheets as No | undefined)?.sheet)) {
    const destino = destinos.get(String(s['@_r:id']));
    if (!destino) continue;
    const caminho = destino.startsWith('/')
      ? destino.slice(1)
      : `xl/${destino}`;
    abas.push(
      lerPlanilha(
        String(s['@_name']),
        pacote[caminho],
        compartilhadas,
        percentuais,
      ),
    );
  }
  if (abas.length === 0)
    throw new ErroLeitura(
      'ARQUIVO_INVALIDO',
      'A pasta de trabalho não tem abas legíveis.',
      'Envie a planilha original.',
    );
  return { abas, vinculosExternos };
}

export const colunaParaNumero = letrasParaNumero;
