import assert from 'node:assert/strict';
import {
  HANDBALL_INTERCEPT_BENCHMARKS,
  runAllHandballInterceptBenchmarks,
  runHandballInterceptBenchmark,
} from '../src/sports/handball/intercept-benchmarks.js';

const center = runHandballInterceptBenchmark(HANDBALL_INTERCEPT_BENCHMARKS.centerReturn);
assert.equal(center.reachable, true, 'A centered return should remain comfortably reachable');
assert.ok(center.recommendedTime !== null);
assert.ok(center.movementDemandMeters <= 0.08, 'Centered return should not demand meaningful locomotion');

const wallBound = runHandballInterceptBenchmark(HANDBALL_INTERCEPT_BENCHMARKS.wallBound);
assert.ok(
  wallBound.returnStartTime > 0,
  'A wall-bound ball must not become a legal return candidate until after the front-wall rebound',
);
assert.equal(wallBound.reachable, true);

const wide = runHandballInterceptBenchmark(HANDBALL_INTERCEPT_BENCHMARKS.wideReturn);
assert.equal(wide.reachable, true, 'The canonical wide recovery should be difficult but reachable when unprepared');
assert.ok(wide.movementDemandMeters > center.movementDemandMeters);

const closerWide = runHandballInterceptBenchmark(
  HANDBALL_INTERCEPT_BENCHMARKS.wideReturn,
  { player: { position: { x: -0.25 } } },
);
assert.equal(closerWide.reachable, true);
assert.ok(
  closerWide.movementDemandMeters < wide.movementDemandMeters,
  'Starting closer to the lateral return should reduce required travel',
);

const preparedWide = runHandballInterceptBenchmark(
  HANDBALL_INTERCEPT_BENCHMARKS.wideReturn,
  { preparing: true },
);
assert.ok(
  !preparedWide.reachable
    || preparedWide.earliestTime >= wide.earliestTime,
  'Preparation slowdown must never create an earlier reachable wide contact',
);

const all = runAllHandballInterceptBenchmarks();
assert.deepEqual(
  Object.keys(all).sort(),
  ['center-return', 'wall-bound', 'wide-return'],
);
assert.equal(all['center-return'].id, 'center-return');

assert.throws(
  () => runHandballInterceptBenchmark(null),
  /benchmark scenario/i,
);

console.log('Canonical handball intercept benchmarks passed.');
