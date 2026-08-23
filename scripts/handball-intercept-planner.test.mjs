import assert from 'node:assert/strict';
import { createBallState } from '../src/sim/types.js';
import {
  HANDBALL_CONTACT_ENVELOPE,
  HANDBALL_PLAYER_MOVEMENT,
  planHandballIntercept,
} from '../src/sports/handball/intercept-planner.js';
import { ONE_WALL_HANDBALL } from '../src/sports/handball/sport-pack.js';

const returningFeed = createBallState({
  active: true,
  position: { x: 0, y: 1, z: 2 },
  velocity: { x: 0, y: 0, z: -10 },
  angularVelocity: { x: 0, y: 0, z: 0 },
});
const player = {
  position: { x: 2, y: 0, z: 4 },
  velocity: { x: 0, y: 0, z: 0 },
};
const noGravity = {
  gravity: 0,
  dragScale: 0,
  magnusScale: 0,
};

const freePlan = planHandballIntercept({
  ball: returningFeed,
  player,
  preparing: false,
  horizon: 1.2,
  coefficients: noGravity,
});
assert.equal(freePlan.reachable, true, 'A wide player should still have a reachable return window');
assert.ok(freePlan.returnStartTime > 0, 'A wall-bound ball should not become hittable until its return begins');
assert.ok(freePlan.recommended, 'A reachable handball return should produce a recommended contact');
assert.ok(
  freePlan.recommended.position.y >= HANDBALL_CONTACT_ENVELOPE.minHeight
    && freePlan.recommended.position.y <= HANDBALL_CONTACT_ENVELOPE.maxHeight,
  'Recommended contacts must stay inside the handball contact-height envelope',
);
assert.ok(['move', 'prepare', 'strike'].includes(freePlan.cue));

const sportPackPlan = ONE_WALL_HANDBALL.planIntercept({
  ball: returningFeed,
  player,
  preparing: false,
  horizon: 1.2,
  coefficients: noGravity,
});
assert.equal(ONE_WALL_HANDBALL.movement, HANDBALL_PLAYER_MOVEMENT);
assert.equal(ONE_WALL_HANDBALL.contactEnvelope, HANDBALL_CONTACT_ENVELOPE);
assert.deepEqual(
  sportPackPlan.recommended.position,
  freePlan.recommended.position,
  'SportPack intercept planning should resolve through the handball-owned planner',
);

const preparedPlan = planHandballIntercept({
  ball: returningFeed,
  player,
  preparing: true,
  horizon: 1.2,
  coefficients: noGravity,
});
assert.equal(preparedPlan.reachable, true);
assert.ok(
  preparedPlan.window.earliest.time >= freePlan.window.earliest.time,
  'Prepared movement slowdown should never create an earlier reachable contact than free movement',
);
assert.equal(HANDBALL_PLAYER_MOVEMENT.free.maxSpeed, 3.95);
assert.equal(HANDBALL_PLAYER_MOVEMENT.free.responseRate, 22);
assert.equal(HANDBALL_PLAYER_MOVEMENT.prepared.maxSpeed, 2.25);
assert.equal(HANDBALL_PLAYER_MOVEMENT.prepared.responseRate, 15);

const alreadyReturning = createBallState({
  active: true,
  position: { x: 0.1, y: 0.95, z: 3 },
  velocity: { x: 0, y: 0, z: 8 },
});
const nearPlayer = {
  position: { x: 0, y: 0, z: 4 },
  velocity: { x: 0, y: 0, z: 0 },
};
const immediatePlan = planHandballIntercept({
  ball: alreadyReturning,
  player: nearPlayer,
  coefficients: noGravity,
  horizon: 0.4,
});
assert.equal(immediatePlan.returnStartTime, 0);
assert.equal(immediatePlan.reachable, true);
assert.ok(immediatePlan.recommended.time < 0.4);

const deadBallPlan = planHandballIntercept({
  ball: createBallState({ active: false }),
  player: nearPlayer,
});
assert.equal(deadBallPlan.reachable, false);
assert.equal(deadBallPlan.cue, 'recover');
assert.equal(deadBallPlan.trajectory, null);

console.log('Handball intercept planning passed.');
