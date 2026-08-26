import assert from 'node:assert/strict';
import { HANDBALL_INTERCEPT_BENCHMARKS } from '../src/sports/handball/intercept-benchmarks.js';
import {
  benchmarkScenario,
  getInterceptLabPreset,
  INTERCEPT_LAB_PRESETS,
} from '../src/labs/intercept-lab-presets.js';

const cases = [
  ['center-return', HANDBALL_INTERCEPT_BENCHMARKS.centerReturn],
  ['wall-bound', HANDBALL_INTERCEPT_BENCHMARKS.wallBound],
  ['wide-return', HANDBALL_INTERCEPT_BENCHMARKS.wideReturn],
];

assert.deepEqual(
  Object.values(INTERCEPT_LAB_PRESETS).map((preset) => preset.id),
  ['custom', 'center-return', 'wall-bound', 'wide-return'],
);

for (const [id, benchmark] of cases) {
  const scenario = benchmarkScenario(id);
  assert.deepEqual(scenario.ball.position, benchmark.ball.position, `${id} position must be canonical`);
  assert.deepEqual(scenario.ball.velocity, benchmark.ball.velocity, `${id} velocity must be canonical`);
  assert.deepEqual(scenario.ball.angularVelocity, benchmark.ball.angularVelocity, `${id} spin must be canonical`);
  assert.deepEqual(scenario.player, benchmark.player, `${id} player state must be canonical`);
  assert.equal(scenario.preparing, benchmark.preparing, `${id} preparation must be canonical`);
  assert.equal(scenario.horizon, benchmark.horizon, `${id} horizon must be canonical`);
}

assert.equal(benchmarkScenario('custom'), null, 'Custom must not masquerade as a benchmark');
assert.equal(getInterceptLabPreset('unknown').id, 'custom', 'Unknown preset ids must fail safe to Custom');

console.log('Intercept Lab canonical presets passed.');
