import assert from 'node:assert/strict';
import {
  HANDBALL_HAND_ASSIST,
  HANDBALL_NOVICE_HAND_ASSIST,
  planHandStartAssist,
} from '../src/sports/handball/hand-assist.js';
import { ONE_WALL_HANDBALL } from '../src/sports/handball/sport-pack.js';

const preparedStart = Object.freeze({ x: 0, y: 1, z: 4 });
const wallTarget = Object.freeze({ x: 0.6, y: 0.55, z: 0 });

const unreachable = planHandStartAssist({
  interceptPlan: { reachable: false, window: { candidates: [] } },
  preparedStart,
  wallTarget,
  desiredContactTime: 0.12,
});
assert.equal(unreachable.assisted, false);
assert.deepEqual(unreachable.start, preparedStart);
assert.equal(unreachable.contactPoint, null);

const candidate = Object.freeze({
  time: 0.13,
  position: Object.freeze({ x: 0.4, y: 1.15, z: 3.65 }),
  reachMarginMeters: 0.31,
});
const plan = Object.freeze({
  reachable: true,
  window: Object.freeze({ candidates: Object.freeze([candidate]) }),
});
const assisted = planHandStartAssist({
  interceptPlan: plan,
  preparedStart,
  wallTarget,
  desiredContactTime: 0.12,
});
assert.equal(assisted.assisted, true);
assert.deepEqual(assisted.contactPoint, candidate.position);
assert.ok(Math.abs(assisted.contactTimeError - 0.01) < 1e-12);
assert.equal(assisted.reachMarginMeters, 0.31);
assert.ok(
  Math.abs(assisted.start.x - preparedStart.x) <= HANDBALL_HAND_ASSIST.maxOffset.x + 1e-12,
  'Assist must respect the existing lateral hand-start clamp',
);
assert.ok(
  Math.abs(assisted.start.y - preparedStart.y) <= HANDBALL_HAND_ASSIST.maxOffset.y + 1e-12,
  'Assist must respect the existing vertical hand-start clamp',
);
assert.ok(
  Math.abs(assisted.start.z - preparedStart.z) <= HANDBALL_HAND_ASSIST.maxOffset.z + 1e-12,
  'Assist must respect the existing depth hand-start clamp',
);
assert.ok(assisted.direction.z < 0, 'A normal return should still swing toward the front wall');

assert.equal(ONE_WALL_HANDBALL.handAssist, HANDBALL_HAND_ASSIST);
const sportPackAssist = ONE_WALL_HANDBALL.planHandStart({
  interceptPlan: plan,
  preparedStart,
  wallTarget,
  desiredContactTime: 0.12,
});
assert.deepEqual(
  sportPackAssist,
  assisted,
  'SportPack should expose the same planner-backed hand assist result',
);

const stalePlan = Object.freeze({
  reachable: true,
  window: Object.freeze({
    candidates: Object.freeze([
      Object.freeze({
        time: 0.55,
        position: Object.freeze({ x: 0.1, y: 1, z: 5 }),
        reachMarginMeters: 0.8,
      }),
    ]),
  }),
});
const tooEarly = planHandStartAssist({
  interceptPlan: stalePlan,
  preparedStart,
  wallTarget,
  desiredContactTime: 0.1,
});
assert.equal(
  tooEarly.assisted,
  false,
  'The hand should not magnetize toward a contact that is far outside the current swing timing',
);

const multiCandidatePlan = Object.freeze({
  reachable: true,
  window: Object.freeze({
    candidates: Object.freeze([
      Object.freeze({ time: 0.06, position: Object.freeze({ x: -0.2, y: 0.9, z: 3.9 }), reachMarginMeters: 0.1 }),
      Object.freeze({ time: 0.115, position: Object.freeze({ x: 0.15, y: 1.02, z: 3.8 }), reachMarginMeters: 0.2 }),
      Object.freeze({ time: 0.17, position: Object.freeze({ x: 0.5, y: 1.2, z: 3.6 }), reachMarginMeters: 0.3 }),
    ]),
  }),
});
const closest = planHandStartAssist({
  interceptPlan: multiCandidatePlan,
  preparedStart,
  wallTarget,
  desiredContactTime: 0.12,
});
assert.equal(closest.assisted, true);
assert.deepEqual(
  closest.contactPoint,
  multiCandidatePlan.window.candidates[1].position,
  'Assist should select the reachable contact closest to the physical swing timing',
);

const edgeTimingPlan = Object.freeze({
  reachable: true,
  window: Object.freeze({ candidates: Object.freeze([
    Object.freeze({ time: 0.3, position: Object.freeze({ x: 0.45, y: 1.04, z: 3.7 }), reachMarginMeters: 0.1 }),
  ]) }),
});
const canonicalEdge = planHandStartAssist({
  interceptPlan: edgeTimingPlan,
  preparedStart,
  wallTarget,
  desiredContactTime: 0.1,
});
const noviceEdge = planHandStartAssist({
  interceptPlan: edgeTimingPlan,
  preparedStart,
  wallTarget,
  desiredContactTime: 0.1,
  config: HANDBALL_NOVICE_HAND_ASSIST,
});
assert.equal(canonicalEdge.assisted, false, 'Canonical timing must keep existing 180ms envelope');
assert.equal(noviceEdge.assisted, true, 'Novice training can adjust the hand start for a 200ms candidate');
for (const axis of ['x', 'y', 'z']) {
  const actual = Math.abs(noviceEdge.start[axis] - preparedStart[axis]);
  assert.ok(actual <= HANDBALL_NOVICE_HAND_ASSIST.maxOffset[axis] + 1e-12);
}
assert.equal(HANDBALL_NOVICE_HAND_ASSIST.maxContactTimeError, 0.21);
assert.equal(ONE_WALL_HANDBALL.noviceHandAssist, HANDBALL_NOVICE_HAND_ASSIST);
assert.ok(HANDBALL_NOVICE_HAND_ASSIST.maxOffset.x < 0.3, 'Beginner assist must not move the hand a foot');

assert.deepEqual(preparedStart, { x: 0, y: 1, z: 4 }, 'Assist must not mutate caller vectors');
assert.deepEqual(wallTarget, { x: 0.6, y: 0.55, z: 0 }, 'Assist must not mutate the wall target');

console.log('Planner-backed hand start assist passed.');
