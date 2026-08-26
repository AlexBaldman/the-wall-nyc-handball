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
assert.ok(report.includes("const REPORT_TYPE = 'the-wall-mvp-session'"));
assert.ok(report.includes('schemaVersion: SCHEMA_VERSION'));
assert.ok(report.includes('lab.getMatch()'));
assert.ok(report.includes('lab.getMatchStats()'));
assert.ok(report.includes('lab.getDifficulty()'));
assert.ok(report.includes('coach.getSummary()'));
assert.ok(report.includes('coach.getDiagnostic()'));
assert.ok(report.includes('__THE_WALL_MVP__?.getState'));
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
