import assert from 'node:assert/strict';
import {
  createInterceptTelemetry,
  recordInterceptTelemetry,
  summarizeInterceptTelemetry,
} from '../src/sports/handball/intercept-telemetry.js';

function sample({
  visible = true,
  cue = 'move',
  rawCue = cue,
  reachable = true,
  movement = 0.4,
  eta = 0.5,
  margin = 0.2,
} = {}) {
  return {
    visible,
    cue,
    rawCue,
    footwork: {
      available: true,
      movementDistanceMeters: movement,
    },
    plan: {
      reachable,
      recommended: reachable
        ? { time: eta, reachMarginMeters: margin }
        : null,
    },
  };
}

let state = createInterceptTelemetry();
state = recordInterceptTelemetry(state, sample({ cue: 'move', movement: 0.6, eta: 0.8, margin: 0.1 }));
state = recordInterceptTelemetry(state, sample({ cue: 'move', movement: 0.4, eta: 0.6, margin: 0.3 }));
state = recordInterceptTelemetry(state, sample({ cue: 'prepare', rawCue: 'hold', movement: 0.2, eta: 0.4, margin: 0.5 }));
state = recordInterceptTelemetry(state, sample({ cue: 'strike', movement: 0.05, eta: 0.12, margin: 0.8 }));
state = recordInterceptTelemetry(state, sample({ visible: false, cue: 'recover', reachable: false }));
state = recordInterceptTelemetry(state, sample({ cue: 'strike', movement: 0, eta: 0.08, margin: 0.9 }));

const summary = summarizeInterceptTelemetry(state);
assert.equal(summary.samples, 6);
assert.equal(summary.visibleSamples, 5);
assert.equal(summary.transitions, 2, 'Visible move → prepare → strike changes should count as transitions');
assert.equal(summary.strikeEntries, 2, 'A hidden interval should break strike continuity');
assert.equal(summary.cueCounts.move, 2);
assert.equal(summary.cueCounts.prepare, 1);
assert.equal(summary.cueCounts.strike, 2);
assert.equal(summary.rawCueCounts.hold, 1);
assert.equal(summary.cueSuppressionRate, 1 / 5);
assert.equal(summary.reachableRate, 1);
assert.ok(Math.abs(summary.averageMovementDemandMeters - 0.25) < 1e-12);
assert.equal(summary.maxMovementDemandMeters, 0.6);
assert.ok(Math.abs(summary.averageEtaSeconds - 0.4) < 1e-12);
assert.ok(Math.abs(summary.averageReachMarginMeters - 0.52) < 1e-12);

const unreachable = recordInterceptTelemetry(createInterceptTelemetry(), {
  visible: true,
  cue: 'recover',
  rawCue: 'recover',
  footwork: { available: false },
  plan: { reachable: false, recommended: null },
});
const unreachableSummary = summarizeInterceptTelemetry(unreachable);
assert.equal(unreachableSummary.reachableRate, 0);
assert.equal(unreachableSummary.averageMovementDemandMeters, 0);
assert.equal(unreachableSummary.averageEtaSeconds, 0);
assert.equal(unreachableSummary.averageReachMarginMeters, 0);

assert.deepEqual(
  createInterceptTelemetry().cueCounts,
  { recover: 0, move: 0, prepare: 0, hold: 0, strike: 0 },
  'Fresh sessions should start with stable explicit cue counters',
);

console.log('Handball intercept telemetry passed.');
