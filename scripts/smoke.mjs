import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const fail = (message) => {
  throw new Error(message);
};

const html = read('index.html');
const css = read('style.css');
const app = read('app.js');

new vm.Script(app, { filename: 'app.js' });

const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index))];
if (duplicateIds.length) {
  fail(`Duplicate HTML ids: ${duplicateIds.join(', ')}`);
}

const referencedIds = [
  ...app.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g),
].map((match) => match[1]);
const missingIds = [...new Set(referencedIds.filter((id) => !htmlIds.includes(id)))];
if (missingIds.length) {
  fail(`JavaScript references missing HTML ids: ${missingIds.join(', ')}`);
}

const localAssets = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((path) => !/^(?:https?:|#|data:)/.test(path));
for (const path of localAssets) {
  const asset = resolve(root, path.replace(/^\.\//, ''));
  if (!statSync(asset).isFile()) {
    fail(`Missing local asset: ${path}`);
  }
}

const requiredShots = ['palm', 'slice', 'fist', 'backhand', 'kill', 'roller', 'lob'];
const markupShots = [...html.matchAll(/data-shot="([^"]+)"/g)].map((match) => match[1]);
for (const shot of requiredShots) {
  if (!markupShots.includes(shot) || !app.includes(`${shot}: {`)) {
    fail(`Shot is not wired through markup and simulation: ${shot}`);
  }
}

const requiredSystems = [
  'predictFirstBounce',
  'resolveAvoidableBlock',
  'updateFootworkBalance',
  'drawAimWindow',
  'createMatchStats',
];
for (const system of requiredSystems) {
  if (!app.includes(`function ${system}`)) {
    fail(`Missing core gameplay system: ${system}`);
  }
}

if (!css.includes('@media (prefers-reduced-motion: reduce)')) {
  fail('Reduced-motion styling is missing.');
}

console.log(
  `Smoke check passed: ${htmlIds.length} unique ids, ${referencedIds.length} DOM bindings, `
    + `${requiredShots.length} shots, ${localAssets.length} local assets.`
);
