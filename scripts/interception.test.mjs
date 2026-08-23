import assert from 'node:assert/strict';
import {
  findReachableInterceptWindow,
  reachableTravelDistance,
} from '../src/sim/interception.js';

function near(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, got ${actual}`,
  );
}

near(
  reachableTravelDistance({
    time: 0.5,
    maxSpeed: 4,
    acceleration: 8,
  }),
  1,
  1e-12,
  'Acceleration-limited travel to top speed',
);
near(
  reachableTravelDistance({
    time: 1,
    maxSpeed: 4,
    acceleration: 8,
  }),
  3,
  1e-12,
  'Travel should accelerate then continue at top speed',
);
near(
  reachableTravelDistance({
    time: 1,
    reactionTime: 0.25,
    maxSpeed: 4,
    acceleration: 8,
  }),
  2,
  1e-12,
  'Reaction delay should reduce movement time before interception',
);

const sample = (time, x, y, z) => Object.freeze({
  time,
  active: true,
  position: Object.freeze({ x, y, z }),
  velocity: Object.freeze({ x: 0, y: 0, z: -1 }),
});

const trajectory = Object.freeze({
  samples: Object.freeze([
    sample(0.25, 2, 1, 0),
    sample(0.5, 1.8, 2.1, 0),
    sample(0.75, 1.5, 1.2, 0),
    sample(1, 2.5, 1.3, 0),
  ]),
});

const window = findReachableInterceptWindow(trajectory, {
  actorPosition: { x: 0, y: 0, z: 0 },
  maxSpeed: 4,
  acceleration: 8,
  reachRadius: 0.2,
  minHeight: 0.4,
  maxHeight: 1.8,
});

assert.equal(window.reachable, true);
assert.equal(window.earliest.time, 0.75, 'Too-early and too-high samples should be excluded');
assert.equal(window.latest.time, 1);
assert.ok(window.best.reachMarginMeters >= 0);
assert.equal(window.candidates.length, 2);

const delayedWindow = findReachableInterceptWindow(trajectory, {
  actorPosition: { x: 0, y: 0, z: 0 },
  reactionTime: 0.65,
  maxSpeed: 4,
  acceleration: 8,
  reachRadius: 0.2,
  minHeight: 0.4,
  maxHeight: 1.8,
});
assert.equal(
  delayedWindow.reachable,
  false,
  'A long reaction delay should correctly eliminate an otherwise reachable window',
);

const stationaryReach = findReachableInterceptWindow(
  { samples: [sample(0.2, 0.3, 1, 0)] },
  {
    actorPosition: { x: 0, y: 0, z: 0 },
    maxSpeed: 0,
    acceleration: 0,
    reachRadius: 0.35,
    minHeight: 0.5,
    maxHeight: 1.5,
  },
);
assert.equal(
  stationaryReach.reachable,
  true,
  'Physical reach should allow a contact without requiring locomotion',
);
assert.equal(stationaryReach.earliest.requiredTravelMeters, 0);

console.log('Reachable interception windows passed.');
