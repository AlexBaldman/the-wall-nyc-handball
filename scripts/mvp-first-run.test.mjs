import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const entry = read('src/labs/ball-lab-entry.js');
const shell = read('src/labs/mvp-shell.js');
const lab = read('lab.html');

assert.ok(
  entry.includes("import './mvp-shell.js';"),
  'Street Match entrypoint should compose the first-run MVP shell explicitly',
);

for (const anchor of [
  'id="courtEntry"',
  'id="enterCourtButton"',
  'id="practiceFirstButton"',
  'id="rallyButton"',
  'id="viewportWrap"',
  'id="controllerBadge"',
  'class="lab-topbar__actions"',
]) {
  assert.ok(lab.includes(anchor), `MVP shell requires lab anchor: ${anchor}`);
}

assert.ok(shell.includes("const STORAGE_KEY = 'the-wall:mvp:v1'"));
assert.ok(shell.includes("preferences.difficulty ?? 'rookie'"));
assert.ok(shell.includes('api.setDifficulty(initialDifficulty)'));
assert.ok(shell.includes('api.getMatchStats().totalContacts'));
assert.ok(shell.includes('api.startRallyPoint()'));
assert.ok(shell.includes('api.feedBall()'));
assert.ok(shell.includes('mvp-help-dialog'));
assert.ok(shell.includes('Recommended: take one warm-up feed'));
assert.ok(shell.includes('firstRunComplete'));

for (const forbidden of [
  "../sim/",
  'stepBall(',
  'resolveHandContact(',
  'awardRally(',
  'state.ball',
  'state.match',
]) {
  assert.equal(
    shell.includes(forbidden),
    false,
    `MVP shell must remain presentation-only; found forbidden dependency: ${forbidden}`,
  );
}

assert.ok(
  shell.indexOf('waitForLab()') < shell.indexOf('api.setDifficulty(initialDifficulty)'),
  'First-run preferences should apply only after the public game API exists',
);

console.log('MVP first-run shell boundary passed.');
