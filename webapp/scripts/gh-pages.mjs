// Post-build step for GitHub Pages deployment from /docs.
//
// 1. Copies index.html -> 404.html so client-side routes (e.g. /awards) resolve
//    correctly when a visitor refreshes or deep-links: GitHub Pages serves 404.html
//    for unknown paths, which re-bootstraps the Angular app.
// 2. Adds an empty .nojekyll file so GitHub Pages serves every build artifact
//    verbatim (Jekyll would otherwise skip files/folders starting with "_").

import { copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs');
const index = join(docs, 'index.html');

if (!existsSync(index)) {
  console.error(`✗ ${index} not found — run the build first.`);
  process.exit(1);
}

copyFileSync(index, join(docs, '404.html'));
writeFileSync(join(docs, '.nojekyll'), '');

console.log('✓ GitHub Pages: wrote docs/404.html and docs/.nojekyll');
