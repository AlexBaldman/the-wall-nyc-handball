import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'intercept.html'), 'utf8');
const lab = readFileSync(resolve(root, 'src/labs/intercept-lab.js'), 'utf8');
const liveCoach = readFileSync(resolve(root, 'src/labs/intercept-coach.js'), 'utf8');
const liveEntry = readFileSync(resolve(root, 'src/labs/ball-lab-entry.js'), 'utf8');

assert.ok(
  html.includes('id="movementExperiment"'),
  'Standalone Intercept Lab should expose the movement experiment selector',
);
assert.ok(
  lab.includes('HANDBALL_MOVEMENT_EXPERIMENTS'),
  'Intercept Lab must consume the shared experiment definitions',
);
assert.ok(
  lab.includes('movementProfile: preparing ? candidate.prepared : candidate.free'),
  'Intercept Lab should apply free/prepared movement profiles through the planner override seam',
);
assert.ok(
  lab.includes('window.__THE_WALL_INTERCEPT_LAB__'),
  'Intercept Lab should expose its selected experiment for browser-level verification',
);
assert.equal(
  liveCoach.includes('HANDBALL_MOVEMENT_EXPERIMENTS'),
  false,
  'Live coach must not opt the Street Match into experimental movement profiles',
);
assert.equal(
  liveEntry.includes('intercept-profile-sweep'),
  false,
  'Street Match composition must remain unaware of movement experiment definitions',
);

console.log('Intercept Lab movement experiment isolation passed.');
