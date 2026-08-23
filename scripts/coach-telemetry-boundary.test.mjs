import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const entry = readFileSync(resolve(root, 'src/labs/ball-lab-entry.js'), 'utf8');
const telemetry = readFileSync(
  resolve(root, 'src/labs/intercept-coach-telemetry.js'),
  'utf8',
);

assert.ok(
  entry.includes("import './intercept-coach-telemetry.js';"),
  'Street Match entrypoint should compose the telemetry observer explicitly',
);
assert.ok(
  telemetry.includes('window.__THE_WALL_INTERCEPT_COACH__?.getState'),
  'Telemetry should observe the public live-coach state rather than reach into game internals',
);
assert.ok(
  telemetry.includes('ONE_WALL_HANDBALL.recordCoachTelemetry'),
  'Telemetry accumulation must use the handball SportPack contract',
);
assert.ok(
  telemetry.includes('ONE_WALL_HANDBALL.summarizeCoachTelemetry'),
  'Telemetry summaries must use the handball SportPack contract',
);
assert.ok(
  telemetry.includes('ONE_WALL_HANDBALL.diagnoseCoachTelemetry'),
  'Playtest diagnostics must derive from SportPack telemetry rather than direct game state',
);
assert.ok(
  telemetry.includes('ONE_WALL_HANDBALL.createCoachReport'),
  'Exported coaching reports must use the SportPack report schema',
);
assert.ok(
  telemetry.includes('getDiagnostic: diagnostic'),
  'Live playtesting API should expose the provisional coaching diagnostic',
);
assert.ok(
  telemetry.includes('getReport: report'),
  'Live playtesting API should expose a portable coaching report',
);
assert.ok(
  telemetry.includes('downloadReport'),
  'Live telemetry observer should expose the report download action',
);
assert.equal(telemetry.includes('stepBall('), false);
assert.equal(telemetry.includes('awardRally('), false);
assert.equal(telemetry.includes('__THE_WALL_LAB__'), false);

console.log('Live coach telemetry boundary passed.');
