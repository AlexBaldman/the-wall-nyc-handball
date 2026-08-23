import assert from 'node:assert/strict';
import { stepBall } from '../src/sim/ballistics.js';
import { createBallState } from '../src/sim/types.js';
import { findTrajectoryCrossing, predictTrajectory } from '../src/sim/trajectory.js';
import { ONE_WALL_HANDBALL_PHYSICS } from '../src/sports/handball/physics-profile.js';

function near(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, got ${actual}`,
  );
}

const source = createBallState({
  position: { x: 0.4, y: 1.3, z: 5.2 },
  velocity: { x: 2.1, y: 1.4, z: -13.5 },
  angularVelocity: { x: -52, y: 7, z: 0 },
});
const sourceBefore = JSON.stringify(source);
const duration = 0.3;
const stepSeconds = 1 / ONE_WALL_HANDBALL_PHYSICS.physics.solverHz;
const prediction = predictTrajectory(source, {
  duration,
  stepSeconds,
  profile: ONE_WALL_HANDBALL_PHYSICS,
});

assert.equal(JSON.stringify(source), sourceBefore, 'Prediction must never mutate the supplied BallState');
assert.ok(prediction.samples.length > 2, 'Prediction should expose time-ordered trajectory samples');
assert.equal(prediction.samples[0].time, 0, 'Prediction should include the initial state by default');
near(prediction.duration, duration, 1e-12, 'Prediction should cover the requested duration');

const manual = createBallState(source);
let elapsed = 0;
let manualTick = 0;
while (elapsed < duration && manual.active) {
  const dt = Math.min(stepSeconds, duration - elapsed);
  stepBall(manual, dt, {
    tick: manualTick,
    profile: ONE_WALL_HANDBALL_PHYSICS,
  });
  elapsed += dt;
  manualTick += 1;
}

for (const axis of ['x', 'y', 'z']) {
  near(
    prediction.finalState.position[axis],
    manual.position[axis],
    1e-12,
    `Predicted final ${axis} position must match BallisticsCore`,
  );
  near(
    prediction.finalState.velocity[axis],
    manual.velocity[axis],
    1e-12,
    `Predicted final ${axis} velocity must match BallisticsCore`,
  );
}
assert.equal(prediction.finalState.wallContacts, manual.wallContacts);
assert.equal(prediction.finalState.floorBounces, manual.floorBounces);

const bounceSource = createBallState({
  position: { x: 0, y: 1, z: 2 },
  velocity: { x: 0, y: 0, z: -10 },
  angularVelocity: { x: 0, y: 0, z: 0 },
});
const bouncePrediction = predictTrajectory(bounceSource, {
  duration: 0.5,
  profile: ONE_WALL_HANDBALL_PHYSICS,
  coefficients: {
    gravity: 0,
    dragScale: 0,
    magnusScale: 0,
  },
});

assert.ok(
  bouncePrediction.events.some(
    (event) => event.type === 'contact' && event.contact.kind === 'wall',
  ),
  'Trajectory prediction should preserve real BallisticsCore wall contacts',
);

const inboundCrossing = findTrajectoryCrossing(bouncePrediction, {
  axis: 'z',
  value: 1,
  direction: -1,
});
assert.ok(inboundCrossing, 'Prediction should find the inbound crossing of a court depth');
near(inboundCrossing.position.z, 1, 1e-12, 'Inbound crossing should lie on the requested depth');
assert.equal(inboundCrossing.direction, -1);

const reboundCrossing = findTrajectoryCrossing(bouncePrediction, {
  axis: 'z',
  value: 1,
  direction: 1,
});
assert.ok(reboundCrossing, 'Prediction should find the post-wall rebound crossing of the same depth');
near(reboundCrossing.position.z, 1, 1e-12, 'Rebound crossing should lie on the requested depth');
assert.equal(reboundCrossing.direction, 1);
assert.ok(
  reboundCrossing.time > inboundCrossing.time,
  'The rebound crossing must occur after the inbound crossing',
);

assert.throws(
  () => predictTrajectory(source, { duration: -1 }),
  /duration/,
  'Invalid prediction horizons should fail explicitly',
);
assert.throws(
  () => findTrajectoryCrossing(prediction, { axis: 'banana', value: 0 }),
  /axis/,
  'Invalid crossing axes should fail explicitly',
);

console.log('Deterministic trajectory prediction passed.');
