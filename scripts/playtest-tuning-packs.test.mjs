import assert from 'node:assert/strict';
import {
  evaluateAllHandballTuningPacks,
  evaluateHandballTuningPack,
  HANDBALL_PLAYTEST_TUNING_PACKS,
} from '../src/sports/handball/playtest-tuning-packs.js';
import { HANDBALL_PLAYER_MOVEMENT } from '../src/sports/handball/intercept-planner.js';

const packs = evaluateAllHandballTuningPacks();
assert.deepEqual(packs.map(({ id }) => id), [
  'canonical-live',
  'candidate-responsive',
  'candidate-deliberate',
  'candidate-prepared-relief',
]);
assert.ok(packs.every(({ gate }) => gate === 'passed'));
assert.ok(packs.every(({ checks }) => checks.length === 6));
assert.ok(packs.every(({ checks }) => checks.every(({ passed }) => passed)));
assert.deepEqual(
  packs.find(({ id }) => id === 'candidate-deliberate').warnings,
  ['wide-return free margin is below 0.05 m.'],
);
assert.strictEqual(
  HANDBALL_PLAYTEST_TUNING_PACKS.preparedRelief.experiment.free,
  HANDBALL_PLAYER_MOVEMENT.free,
  'Prepared Relief must leave free movement canonical',
);
assert.equal(
  Object.prototype.hasOwnProperty.call(packs, 'winner'),
  false,
  'Benchmark gates must not automatically declare a tuning winner',
);
assert.throws(() => evaluateHandballTuningPack(), /named tuning pack/i);

console.log('Named playtest tuning packs preserve deterministic benchmark reachability.');
