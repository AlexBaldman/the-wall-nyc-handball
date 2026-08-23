import assert from 'node:assert/strict';
import {
  advanceCueStability,
  createCueStabilityState,
  deriveHandballFootworkGuidance,
} from '../src/sports/handball/intercept-guidance.js';

const player = Object.freeze({ x: 0, y: 0, z: 5 });
const diagonalPlan = Object.freeze({
  recommended: Object.freeze({
    position: Object.freeze({ x: 1.2, y: 1.05, z: 3.8 }),
    requiredTravelMeters: 0.56,
  }),
});
const diagonal = deriveHandballFootworkGuidance(diagonalPlan, player);
assert.equal(diagonal.available, true);
assert.equal(diagonal.label, 'RIGHT + STEP IN');
assert.ok(Math.abs(Math.hypot(diagonal.delta.x, diagonal.delta.z) - 0.56) < 1e-12);
assert.ok(diagonal.targetPosition.x > player.x);
assert.ok(diagonal.targetPosition.z < player.z);

const deepPlan = Object.freeze({
  recommended: Object.freeze({
    position: Object.freeze({ x: 0.03, y: 1.2, z: 6.2 }),
    requiredTravelMeters: 0.4,
  }),
});
assert.equal(
  deriveHandballFootworkGuidance(deepPlan, player).label,
  'DROP BACK',
  'A deeper contact should create a depth cue without inventing lateral movement',
);

const setPlan = Object.freeze({
  recommended: Object.freeze({
    position: Object.freeze({ x: 0.5, y: 1, z: 5 }),
    requiredTravelMeters: 0.04,
  }),
});
assert.equal(
  deriveHandballFootworkGuidance(setPlan, player).label,
  'SET',
  'Contacts already inside practical reach should not nag the player to move',
);

const missing = deriveHandballFootworkGuidance({ reachable: false }, player);
assert.equal(missing.available, false);
assert.equal(missing.label, 'RESET');
assert.equal(missing.targetPosition, null);

let stability = createCueStabilityState('move');
stability = advanceCueStability(stability, 'prepare');
assert.equal(stability.displayCue, 'move');
assert.equal(stability.pendingCue, 'prepare');
assert.equal(stability.pendingCount, 1);
stability = advanceCueStability(stability, 'prepare');
assert.equal(stability.displayCue, 'prepare');
assert.equal(stability.pendingCue, null);

stability = advanceCueStability(stability, 'hold');
assert.equal(stability.displayCue, 'prepare');
stability = advanceCueStability(stability, 'prepare');
assert.equal(
  stability.displayCue,
  'prepare',
  'Returning to the displayed cue should cancel an unfinished transition',
);
assert.equal(stability.pendingCue, null);

stability = advanceCueStability(stability, 'strike');
assert.equal(stability.displayCue, 'strike', 'Strike must bypass normal confirmation delay');
stability = advanceCueStability(stability, 'hold');
assert.equal(stability.displayCue, 'strike', 'Strike should persist until another cue is confirmed');
stability = advanceCueStability(stability, 'hold');
assert.equal(stability.displayCue, 'hold');

stability = advanceCueStability(stability, 'move', { visible: false });
assert.equal(stability.displayCue, null, 'Hidden coaching should reset pending stability state');
stability = advanceCueStability(stability, 'move');
assert.equal(stability.displayCue, 'move', 'First visible cue after reset should render immediately');

console.log('Handball intercept guidance passed.');
