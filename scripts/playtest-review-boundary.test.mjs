import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const html = read('playtest.html');
const review = read('src/labs/playtest-review-lab.js');
const report = read('src/playtest/session-report.js');
const packs = read('src/sports/handball/playtest-tuning-packs.js');
const liveEntry = read('src/labs/ball-lab-entry.js');
const liveCoordinator = read('src/labs/ball-lab.js');
const stage = read('scripts/stage-site.mjs');

for (const id of ['reportFiles', 'groupDimension', 'cohortTableBody', 'candidatePacks']) {
  assert.ok(html.includes(`id="${id}"`), `Review Lab should expose ${id}`);
}
assert.ok(review.includes('validatePlaytestSessionReport'));
assert.ok(review.includes('summarizePlaytestCohort'));
assert.ok(review.includes('evaluateAllHandballTuningPacks'));
assert.ok(report.includes('Schema v1 migrated'));
assert.ok(packs.includes('runHandballMovementExperiment'));
assert.ok(stage.includes("'playtest.html'"));
assert.ok(stage.includes("'playtest.css'"));

for (const forbidden of ['fetch(', 'localStorage', 'sessionStorage', 'XMLHttpRequest', 'innerHTML = `<span>${labelFor']) {
  assert.equal(review.includes(forbidden), false, `Review Lab must keep imported evidence local and text-safe; found ${forbidden}`);
}
assert.equal(liveEntry.includes('playtest-tuning-packs'), false, 'Street Match must not compose candidate tuning packs');
assert.equal(liveCoordinator.includes('HANDBALL_PLAYTEST_TUNING_PACKS'), false, 'Live coordinator must not know candidate packs');
assert.equal(liveCoordinator.includes('candidate-responsive'), false, 'Live movement must remain canonical');

console.log('Playtest Review Lab local-only and live-game boundaries passed.');
