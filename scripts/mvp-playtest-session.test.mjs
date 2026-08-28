import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const entry = read('src/labs/ball-lab-entry.js');
const report = read('src/labs/mvp-playtest-session.js');
const html = read('lab.html');

assert.ok(
  entry.includes("import './mvp-playtest-session.js';"),
  'Street Match should compose the compact MVP playtest reporter',
);
assert.ok(html.includes('id="exportReplayButton"'));
assert.ok(report.includes('PLAYTEST_REPORT_TYPE'));
assert.ok(report.includes('PLAYTEST_REPORT_SCHEMA_VERSION'));
assert.ok(report.includes('createPlaytestSessionReport'));
assert.ok(report.includes('lab.getMatch()'));
assert.ok(report.includes('lab.getMatchStats()'));
assert.ok(report.includes('lab.getPlaytestContext()'));
assert.ok(report.includes('lab.getDifficulty()'));
assert.ok(report.includes('coach.getSummary()'));
assert.ok(report.includes('coach.getDiagnostic()'));
assert.ok(report.includes('__THE_WALL_MVP__?.getState'));
assert.ok(report.includes("fetch('build.json'"));
assert.ok(report.includes('physicsCoefficients'));
assert.ok(report.includes('movement: clone(context.movement)'));
assert.ok(report.includes('Download MVP session JSON'));
assert.ok(report.includes('the-wall-mvp-session-${stamp}.json'));

for (const forbidden of [
  '../sim/',
  'stepBall(',
  'awardRally(',
  'resolveHandContact(',
  'getReplay(',
  'state.',
  'navigator.userAgent',
]) {
  assert.equal(
    report.includes(forbidden),
    false,
    `MVP session report should use compact public summaries only; found ${forbidden}`,
  );
}

console.log('MVP playtest session report boundary passed.');
