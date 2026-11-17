#!/usr/bin/env node
// Monta um resumo em Markdown dos testes e da cobertura a partir dos relatórios da CI.
// Lê reports/*.xml (JUnit), reports/*.lcov (node:test) e apps/frontend/coverage/coverage-summary.json.
// Escreve o Markdown na saída padrão; a CI o redireciona para o resumo da execução e o comentário do PR.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const dirRelatorios = resolve(raiz, process.argv[2] ?? 'reports');

const decodificar = (texto) =>
  texto
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
const atributo = (tag, nome) => {
  const m = new RegExp(`\\b${nome}="([^"]*)"`).exec(tag);
  return m ? decodificar(m[1]) : '';
};

/** Conta casos de teste de um JUnit: cada <testcase> é uma folha; falha/skip vêm dentro dele. */
function lerJUnit(xml) {
  const resultado = {
    total: 0,
    aprovados: 0,
    falhas: 0,
    ignorados: 0,
    segundos: 0,
    falhados: [],
  };
  const partes = xml.split(/<testcase\b/).slice(1);
  for (const parte of partes) {
    const tag = parte.slice(0, parte.indexOf('>') + 1);
    const corpo = parte.split(/<\/testcase>|<testcase\b/)[0];
    const nome = atributo(tag, 'name');
    resultado.total += 1;
    resultado.segundos += Number(atributo(tag, 'time')) || 0;
    if (/<(failure|error)\b/.test(corpo)) {
      resultado.falhas += 1;
      resultado.falhados.push({ nome, classe: atributo(tag, 'classname') });
    } else if (/<skipped\b/.test(corpo)) resultado.ignorados += 1;
    else resultado.aprovados += 1;
  }
  return resultado;
}

/** Cobertura de linhas de um lcov, ignorando testes e dependências. */
function lerLcov(lcov) {
  let encontradas = 0;
  let cobertas = 0;
  for (const registro of lcov.split('end_of_record')) {
    const arquivo = /^SF:(.+)$/m.exec(registro)?.[1] ?? '';
    if (
      !arquivo ||
      /node_modules|[\\/](dist-test|test|generated)[\\/]|\.test\./.test(arquivo)
    )
      continue;
    encontradas += Number(/^LF:(\d+)$/m.exec(registro)?.[1] ?? 0);
    cobertas += Number(/^LH:(\d+)$/m.exec(registro)?.[1] ?? 0);
  }
  return encontradas ? { encontradas, cobertas } : null;
}

const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
const arquivos = existsSync(dirRelatorios) ? readdirSync(dirRelatorios) : [];

const linhas = ['## Relatório de testes', ''];
const falhas = [];
if (!arquivos.some((a) => a.endsWith('.xml'))) {
  linhas.push('Nenhum relatório JUnit foi gerado nesta execução.');
} else {
  linhas.push(
    '| Suíte | Total | Aprovados | Falhas | Ignorados | Tempo | Cobertura de linhas |',
    '|---|---:|---:|---:|---:|---:|---:|',
  );
  let soma = { total: 0, aprovados: 0, falhas: 0, ignorados: 0 };
  for (const arq of arquivos.filter((a) => a.endsWith('.xml')).sort()) {
    const nome = basename(arq, '.xml');
    const r = lerJUnit(readFileSync(join(dirRelatorios, arq), 'utf8'));
    let cobertura = '—';
    const lcov = join(dirRelatorios, `${nome}.lcov`);
    if (existsSync(lcov)) {
      const c = lerLcov(readFileSync(lcov, 'utf8'));
      if (c) cobertura = pct(c.cobertas, c.encontradas);
    }
    if (nome.startsWith('frontend')) {
      const f = join(raiz, 'apps/frontend/coverage/coverage-summary.json');
      if (existsSync(f)) {
        const l = JSON.parse(readFileSync(f, 'utf8')).total.lines;
        cobertura = pct(l.covered, l.total);
      }
    }
    const icone = r.falhas ? '❌' : '✅';
    linhas.push(
      `| ${icone} ${nome} | ${r.total} | ${r.aprovados} | ${r.falhas} | ${r.ignorados} | ${r.segundos.toFixed(1)} s | ${cobertura} |`,
    );
    soma = {
      total: soma.total + r.total,
      aprovados: soma.aprovados + r.aprovados,
      falhas: soma.falhas + r.falhas,
      ignorados: soma.ignorados + r.ignorados,
    };
    for (const f of r.falhados)
      falhas.push(
        `- \`${nome}\`: ${f.classe ? `${f.classe} › ` : ''}${f.nome}`,
      );
  }
  linhas.push(
    `| **Total** | **${soma.total}** | **${soma.aprovados}** | **${soma.falhas}** | **${soma.ignorados}** | | |`,
  );
  if (falhas.length) linhas.push('', '### Testes com falha', '', ...falhas);
  linhas.push(
    '',
    '_Cobertura de linhas dos arquivos de código; testes, código gerado e `components/ui` ficam de fora. Os relatórios completos estão no artefato `relatorios-de-teste`._',
  );
}

const saida = `${linhas.join('\n')}\n`;
process.stdout.write(saida);
