import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
async function walk(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...(await walk(target)));
    else result.push(target);
  }
  return result;
}

const documentation = [
  path.join(root, 'README.md'),
  path.join(root, 'AGENTS.md'),
  ...(await walk(path.join(root, 'docs/plano'))),
  ...(await walk(path.join(root, 'docs/planilhas'))),
  ...(await walk(path.join(root, '.agents/skills/continuar-oto'))),
  ...(await walk(path.join(root, 'fixtures/oto'))),
];
const sourceFiles = new Set(
  documentation.filter((file) => /\.(ods|xlsx)$/.test(file)),
);
const verified = new Set();
for (const file of documentation.filter((file) => file.endsWith('.md'))) {
  const text = await readFile(file, 'utf8');
  for (const [, rawTarget] of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = rawTarget.replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const resolved = path.resolve(
      path.dirname(file),
      decodeURIComponent(target),
    );
    assert.ok(
      resolved.startsWith(root),
      `Link fora do repositório: ${file}: ${target}`,
    );
    await access(resolved).catch(() => {
      throw new Error(
        `Link inexistente em ${path.relative(root, file)}: ${target}`,
      );
    });
  }
  for (const [, name, hash] of text.matchAll(
    /- `([^`]+\.(?:ods|xlsx))`: `([a-f0-9]{64})`/g,
  )) {
    const source = path.resolve(path.dirname(file), name);
    assert.ok(
      sourceFiles.has(source),
      `Manifesto aponta para fonte desconhecida: ${name}`,
    );
    assert.equal(
      createHash('sha256')
        .update(await readFile(source))
        .digest('hex'),
      hash,
      `Planilha alterada: ${name}`,
    );
    verified.add(source);
  }
}
assert.equal(
  verified.size,
  sourceFiles.size,
  'Toda planilha deve ter hash documentado no README da fonte.',
);
assert.ok(verified.size > 0, 'Nenhuma planilha de referência encontrada.');
const skillDirectory = path.join(root, '.agents/skills/continuar-oto');
const skill = await readFile(path.join(skillDirectory, 'SKILL.md'), 'utf8');
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
assert.ok(frontmatter, 'Frontmatter da skill ausente.');
const metadata = parse(frontmatter[1]);
assert.equal(metadata.name, 'continuar-oto');
assert.ok(
  typeof metadata.description === 'string' && metadata.description.trim(),
);
const ui = parse(
  await readFile(path.join(skillDirectory, 'agents/openai.yaml'), 'utf8'),
);
assert.ok(ui.interface.default_prompt.includes('$continuar-oto'));
assert.ok(
  ui.interface.short_description.length >= 25 &&
    ui.interface.short_description.length <= 64,
);
console.log(
  `Referências locais e skill válidas; ${verified.size} planilhas originais verificadas.`,
);
