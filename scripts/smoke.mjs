import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const fail = (message) => {
  throw new Error(message);
};

const html = read('index.html');
const css = read('style.css');
const entrypoint = read('app.js');
const app = read('src/game/match-app.js');
const matchContent = read('src/game/match-content.js');
const labHtml = read('lab.html');
const labCss = read('lab.css');
const labApp = read('src/labs/ball-lab.js');

if (!html.includes('<script type="module" src="app.js"></script>')) {
  fail('The match entrypoint must load as an ES module.');
}
if (!entrypoint.includes("import './src/game/match-app.js';")) {
  fail('The root match entrypoint must stay a thin import boundary.');
}

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

const labIds = [...labHtml.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateLabIds = [...new Set(labIds.filter((id, index) => labIds.indexOf(id) !== index))];
if (duplicateLabIds.length) {
  fail(`Duplicate Accuracy Lab ids: ${duplicateLabIds.join(', ')}`);
}

const labBindings = [
  ...labApp.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g),
].map((match) => match[1]);
const listedLabBindings = [
  ...labApp.matchAll(/^\s{4}'([^']+)',$/gm),
].map((match) => match[1]);
const missingLabIds = [...new Set(
  [...labBindings, ...listedLabBindings].filter((id) => !labIds.includes(id)),
)];
if (missingLabIds.length) {
  fail(`Accuracy Lab references missing HTML ids: ${missingLabIds.join(', ')}`);
}

const labAssets = [...labHtml.matchAll(/\s(?:href|src)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((path) => !/^(?:https?:|#|data:)/.test(path));
for (const path of labAssets) {
  const asset = resolve(root, path.replace(/^\.\//, ''));
  if (!statSync(asset).isFile()) {
    fail(`Missing local Accuracy Lab asset: ${path}`);
  }
}

const requiredShots = ['palm', 'slice', 'fist', 'backhand', 'kill', 'roller', 'lob'];
const markupShots = [...html.matchAll(/data-shot="([^"]+)"/g)].map((match) => match[1]);
for (const shot of requiredShots) {
  if (!markupShots.includes(shot) || !matchContent.includes(`${shot}: {`)) {
    fail(`Shot is not wired through markup and simulation: ${shot}`);
  }
}

const requiredSystems = [
  'predictFirstBounce',
  'resolveAvoidableBlock',
  'updateFootworkBalance',
  'drawAimWindow',
  'createMatchStats',
  'applyRhythmPreset',
  'rhythmArrivalRate',
  'getStepInTransfer',
];
for (const system of requiredSystems) {
  if (!app.includes(`function ${system}`)) {
    fail(`Missing core gameplay system: ${system}`);
  }
}

if (!css.includes('@media (prefers-reduced-motion: reduce)')) {
  fail('Reduced-motion styling is missing.');
}
if (!labCss.includes('@media (prefers-reduced-motion: reduce)')) {
  fail('Accuracy Lab reduced-motion styling is missing.');
}

for (const modulePath of [
  'src/game/match-app.js',
  'src/game/match-content.js',
  'src/game/match-environment.js',
  'src/game/wall-ghost.js',
  'src/platform/gamepad.js',
  'src/presentation/court-projection.js',
  'src/sim/types.js',
  'src/sim/court.js',
  'src/sim/random.js',
  'src/sim/replay.js',
  'src/sim/rules.js',
  'src/sim/ballistics.js',
  'src/labs/ball-lab.js',
  'src/styles/tokens.css',
  'vendor/three.core.min.js',
  'vendor/three.module.min.js',
]) {
  if (!statSync(resolve(root, modulePath)).isFile()) {
    fail(`Missing 3D simulation module: ${modulePath}`);
  }
}

console.log(
  `Smoke check passed: ${htmlIds.length} unique ids, ${referencedIds.length} DOM bindings, `
    + `${requiredShots.length} shots, ${localAssets.length} match assets, `
    + `${labIds.length} Accuracy Lab ids, ${labAssets.length} lab assets.`
);
