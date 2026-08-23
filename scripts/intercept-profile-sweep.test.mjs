import assert from 'node:assert/strict';
import {
  HANDBALL_MOVEMENT_EXPERIMENTS,
  runHandballMovementExperiment,
  runHandballMovementProfileSweep,
} from '../src/sports/handball/intercept-profile-sweep.js';
import { HANDBALL_PLAYER_MOVEMENT } from '../src/sports/handball/intercept-planner.js';

function assertIdentityDelta(result, delta) {
  assert.equal(delta.reachableChanged, false);
  for (const [resultKey, deltaKey] of [
    ['earliestTime', 'earliestTimeSeconds'],
    ['recommendedTime', 'recommendedTimeSeconds'],
    ['reachMarginMeters', 'reachMarginMeters'],
    ['movementDemandMeters', 'movementDemandMeters'],
  ]) {
    assert.equal(
      delta[deltaKey],
      Number.isFinite(result[resultKey]) ? 0 : null,
      `Canonical ${deltaKey} should be zero only when the underlying measurement exists`,
    );
  }
}

const sweep = runHandballMovementProfileSweep();
assert.equal(sweep.schemaVersion, 1);
assert.equal(sweep.baselineId, 'canonical');
assert.deepEqual(
  Object.keys(sweep.experiments),
  ['canonical', 'responsive', 'deliberate', 'prepared-relief'],
);

for (const scenario of Object.values(sweep.experiments.canonical.scenarios)) {
  for (const state of ['free', 'prepared']) {
    assertIdentityDelta(scenario[state].result, scenario[state].delta);
  }
}

const canonicalWide = sweep.experiments.canonical.scenarios['wide-return'];
const responsiveWide = sweep.experiments.responsive.scenarios['wide-return'];
assert.equal(responsiveWide.free.result.reachable, true);
assert.ok(
  responsiveWide.free.result.earliestTime <= canonicalWide.free.result.earliestTime,
  'Responsive experiment should not delay the earliest free wide-return contact',
);
assert.ok(
  !responsiveWide.prepared.result.reachable
    || !canonicalWide.prepared.result.reachable
    || responsiveWide.prepared.result.earliestTime <= canonicalWide.prepared.result.earliestTime,
  'Responsive prepared movement should not delay a contact that both profiles can reach',
);

const deliberateWide = sweep.experiments.deliberate.scenarios['wide-return'];
assert.ok(
  !deliberateWide.free.result.reachable
    || deliberateWide.free.result.earliestTime >= canonicalWide.free.result.earliestTime,
  'Deliberate experiment should not create an earlier free wide-return contact',
);

const relief = sweep.experiments['prepared-relief'];
assert.strictEqual(
  relief.profiles.free,
  HANDBALL_PLAYER_MOVEMENT.free,
  'Prepared-relief experiment must leave free movement canonical',
);
assertIdentityDelta(
  relief.scenarios['center-return'].free.result,
  relief.scenarios['center-return'].free.delta,
);

assert.equal(HANDBALL_PLAYER_MOVEMENT.free.maxSpeed, 3.95);
assert.equal(HANDBALL_PLAYER_MOVEMENT.prepared.maxSpeed, 2.25);
assert.equal(
  Object.prototype.hasOwnProperty.call(sweep, 'winner'),
  false,
  'Synthetic movement sweeps should compare candidates, not automatically declare a winner',
);

assert.throws(
  () => runHandballMovementExperiment({ id: 'broken' }),
  /free and prepared profiles/i,
);

console.log('Comparative handball movement profile sweep passed.');
