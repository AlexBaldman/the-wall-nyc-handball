import { readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = new URL('../', import.meta.url);
const sourceRoots = ['app.js', 'src', 'scripts'];
const supportedExtensions = new Set(['.js', '.mjs']);

function collectSourceFiles(path) {
  const absolutePath = new URL(path, projectRoot);
  if (!statSync(absolutePath).isDirectory()) {
    return supportedExtensions.has(extname(path)) ? [path] : [];
  }

  return readdirSync(absolutePath, { withFileTypes: true })
    .flatMap((entry) => collectSourceFiles(join(path, entry.name)));
}

const sourceFiles = sourceRoots.flatMap(collectSourceFiles).sort();
const failures = [];

for (const sourceFile of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', sourceFile], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failures.push(`${sourceFile}\n${result.stderr || result.stdout}`.trim());
  }
}

if (failures.length) {
  throw new Error(`Syntax checks failed:\n\n${failures.join('\n\n')}`);
}

console.log(`Syntax checks passed: ${sourceFiles.length} first-party modules.`);
