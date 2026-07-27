import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const projectRoot = new URL('../', import.meta.url);
const destination = resolve(process.argv[2] ?? '_site');

if (basename(destination) !== '_site') {
  throw new Error('Static site staging is restricted to an explicit _site directory.');
}

const files = [
  'index.html',
  'style.css',
  'app.js',
  'lab.html',
  'lab.css',
  'outputs/the-wall-gameplay-final-clean.png',
];
const directories = ['src', 'vendor'];

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });

for (const file of files) {
  const outputPath = resolve(destination, file);
  mkdirSync(dirname(outputPath), { recursive: true });
  cpSync(new URL(file, projectRoot), outputPath);
}

for (const directory of directories) {
  cpSync(new URL(directory, projectRoot), resolve(destination, directory), { recursive: true });
}

writeFileSync(resolve(destination, '.nojekyll'), '');
console.log(`Static site staged in ${destination}.`);
