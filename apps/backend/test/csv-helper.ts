import assert from 'node:assert/strict';
import { colunasCsv, type DefinicaoColecao } from '@ssc0536/common';

/** Parser apenas para asserções; suporta aspas e quebras de linha dentro de células. */
export function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [],
    valor = '',
    aspas = false;
  texto = texto.replace(/^\uFEFF/, '');
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"') {
      if (aspas && texto[i + 1] === '"') {
        valor += '"';
        i++;
      } else aspas = !aspas;
    } else if (!aspas && c === ';') {
      linha.push(valor);
      valor = '';
    } else if (!aspas && c === '\r' && texto[i + 1] === '\n') {
      linha.push(valor);
      linhas.push(linha);
      linha = [];
      valor = '';
      i++;
    } else valor += c;
  }
  assert.equal(aspas, false);
  assert.equal(valor, '');
  return linhas;
}
export async function dadosCsv<T extends object = Record<string, unknown>>(
  resposta: Response,
  colecao: DefinicaoColecao,
) {
  assert.equal(resposta.status, 200);
  assert.match(resposta.headers.get('content-type') ?? '', /text\/csv/);
  assert.match(
    resposta.headers.get('content-disposition') ?? '',
    /attachment; filename=".+\.csv"/,
  );
  const [cabecalho, ...linhas] = lerCsv(await resposta.text());
  const colunas = colunasCsv(colecao);
  assert.deepEqual(
    cabecalho,
    colunas.map((c) => c.rotulo),
  );
  return {
    data: linhas.map((linha) =>
      Object.fromEntries(
        colunas.map((c, i) => {
          const campo = colecao.esquema.campos.find((f) => f.nome === c.campo)!;
          const valor = linha[i];
          return [
            c.campo,
            valor === '' && campo.anulavel
              ? null
              : campo.tipo === 'inteiro'
                ? Number(valor)
                : campo.tipo === 'booleano'
                  ? valor === 'Sim'
                  : valor,
          ];
        }),
      ),
    ) as T[],
  };
}
