import assert from 'node:assert/strict';
import {
  HANDBALL_PLAYER_MOVEMENT,
  resolveHandballMovementProfile,
} from '../src/sports/handball/intercept-planner.js';
import {
  HANDBALL_INTERCEPT_BENCHMARKS,
  runHandballInterceptBenchmark,
} from '../src/sports/handball/intercept-benchmarks.js';

const canonicalFree = resolveHandballMovementProfile(false);
assert.strictEqual(
  canonicalFree,
  HANDBALL_PLAYER_MOVEMENT.free,
  'Omitting an override should return the canonical live free-movement profile',
);
const canonicalPrepared = resolveHandballMovementProfile(true);
assert.strictEqual(canonicalPrepared, HANDBALL_PLAYER_MOVEMENT.prepared);

const partial = resolveHandballMovementProfile(false, {
  id: 'faster-feet-experiment',
  maxSpeed: 4.35,
});
assert.equal(partial.id, 'faster-feet-experiment');
assert.equal(partial.maxSpeed, 4.35);
assert.equal(
  partial.responseRate,
  HANDBALL_PLAYER_MOVEMENT.free.responseRate,
  'Partial experiments should inherit untouched canonical movement fields',
);

const invalid = resolveHandballMovementProfile(true, {
  id: 'bad-input-experiment',
  maxSpeed: -3,
  responseRate: Number.NaN,
});
assert.equal(invalid.maxSpeed, HANDBALL_PLAYER_MOVEMENT.prepared.maxSpeed);
assert.equal(invalid.responseRate, HANDBALL_PLAYER_MOVEMENT.prepared.responseRate);

const scenario = HANDBALL_INTERCEPT_BENCHMARKS.wideReturn;
const defaultResult = runHandballInterceptBenchmark(scenario);
const explicitCanonical = runHandballInterceptBenchmark(scenario, {
  movementProfile: HANDBALL_PLAYER_MOVEMENT.free,
});
for (const key of [
  'reachable',
  'cue',
  'returnStartTime',
  'earliestTime',
  'latestTime',
  'recommendedTime',
  'recommendedHeightMeters',
  'reachMarginMeters',
  'movementDemandMeters',
  'footwork',
]) {
  assert.deepEqual(
    explicitCanonical[key],
    defaultResult[key],
    `Explicit canonical movement must preserve default benchmark behavior for ${key}`,
  );
}
assert.equal(defaultResult.movementProfile.id, 'handball-free');

const faster = runHandballInterceptBenchmark(scenario, {
  movementProfile: {
    id: 'faster-feet-experiment',
    maxSpeed: 5,
    responseRate: 28,
  },
});
assert.equal(faster.movementProfile.id, 'faster-feet-experiment');
assert.equal(faster.reachable, true);
assert.ok(
  faster.earliestTime <= defaultResult.earliestTime,
  'A strictly faster movement profile must not delay the earliest reachable wide contact',
);

const slower = runHandballInterceptBenchmark(scenario, {
  movementProfile: {
    id: 'slower-feet-experiment',
    maxSpeed: 1.5,
    responseRate: 8,
  },
});
assert.ok(
  !slower.reachable || slower.earliestTime >= defaultResult.earliestTime,
  'A strictly slower movement profile must not create an earlier reachable wide contact',
);

const preparedDefault = runHandballInterceptBenchmark(scenario, { preparing: true });
const preparedExplicit = runHandballInterceptBenchmark(scenario, {
  preparing: true,
  movementProfile: HANDBALL_PLAYER_MOVEMENT.prepared,
});
assert.equal(preparedExplicit.reachable, preparedDefault.reachable);
assert.equal(preparedExplicit.earliestTime, preparedDefault.earliestTime);
assert.equal(preparedExplicit.movementProfile.id, 'handball-prepared');

console.log('Experimental intercept movement profile overrides passed.');
