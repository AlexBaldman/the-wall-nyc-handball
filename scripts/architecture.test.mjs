import assert from 'node:assert/strict';
import {
  applyDeadzone,
  findGamepad,
  playGamepadRumble,
} from '../src/platform/gamepad.js';
import { COURT as MATCH_COURT, GAMEPLAY_SEED } from '../src/game/match-environment.js';
import {
  chooseGhostTechnique,
  createGhostObservation,
  getGhostProfile,
  observationDelayTicks,
} from '../src/game/wall-ghost.js';
import { createCourtProjection } from '../src/presentation/court-projection.js';
import { createPlayerCommand } from '../src/sim/types.js';

assert.equal(applyDeadzone(0.1), 0, 'Small stick noise should remain inside the deadzone');
assert.equal(applyDeadzone(-0.16), 0, 'The deadzone boundary should resolve to zero');
assert.ok(applyDeadzone(0.7) > 0 && applyDeadzone(0.7) < 1);
assert.ok(applyDeadzone(-0.7) < 0 && applyDeadzone(-0.7) > -1);
assert.equal(applyDeadzone(2), 1, 'Malformed axis values should clamp to the Gamepad range');

const fallbackPad = { index: 1, id: 'fallback' };
const preferredPad = { index: 2, id: 'preferred' };
const pads = [null, fallbackPad, preferredPad];
assert.equal(findGamepad(2, pads), preferredPad);
assert.equal(findGamepad(0, pads), fallbackPad);
assert.equal(findGamepad(null, []), null);

let rumbleRequest = null;
const rumblePad = {
  vibrationActuator: {
    playEffect(type, options) {
      rumbleRequest = { type, options };
      return Promise.resolve();
    },
  },
};
assert.equal(
  playGamepadRumble(rumblePad, {
    duration: 90,
    strongMagnitude: 1.4,
    weakMagnitude: -0.2,
  }),
  true,
);
assert.deepEqual(rumbleRequest, {
  type: 'dual-rumble',
  options: {
    duration: 90,
    strongMagnitude: 1,
    weakMagnitude: 0,
  },
});
assert.equal(playGamepadRumble(null), false);

const projection = createCourtProjection({
  left: 208,
  right: 752,
  wallTop: 58,
  frontWall: 142,
  longLine: 532,
  floorBottom: 590,
  wallHeight: 184,
});
assert.equal(projection.centerX, 480);
assert.equal(projection.shortLineY, 326);
assert.equal(projection.serviceLineY, 429);
assert.equal(projection.backLineY, 532);
assert.ok(
  Math.abs(projection.serviceMarkerLength - 13.6) < 1e-12,
  'Six-inch service markers should preserve the official wall-width ratio',
);
assert.throws(
  () => createCourtProjection({
    left: 4,
    right: 3,
    wallTop: 0,
    frontWall: 1,
    longLine: 2,
    floorBottom: 3,
    wallHeight: 1,
  }),
  /right must be greater than left/,
);
assert.equal(MATCH_COURT.shortLineY, projection.shortLineY);
assert.equal(MATCH_COURT.serviceLineY, projection.serviceLineY);
assert.equal(GAMEPLAY_SEED, 0x57414c4c);

const rookie = getGhostProfile('rookie');
const regular = getGhostProfile('regular');
const champion = getGhostProfile('champion');
assert.ok(
  observationDelayTicks(rookie, 120) > observationDelayTicks(regular, 120)
    && observationDelayTicks(regular, 120) > observationDelayTicks(champion, 120),
  'Opponent difficulty should improve perception timing without changing ball physics',
);
assert.ok(
  rookie.moveSpeed < regular.moveSpeed && regular.moveSpeed < champion.moveSpeed,
  'Opponent foot speed should progress through explicit physical profiles',
);
assert.equal(
  chooseGhostTechnique(champion, {
    perceivedHeight: 0.4,
    rallyContacts: 7,
    random: 0,
  }),
  'backspin',
  'A low perceived ball should produce a safe low contact',
);
assert.equal(
  chooseGhostTechnique(champion, {
    perceivedHeight: 1,
    rallyContacts: 7,
    random: 0.2,
  }),
  'topspin',
  'Champion aggression should emerge from the profile rather than a hidden speed multiplier',
);
const observedBall = createGhostObservation({
  profile: regular,
  ball: {
    active: true,
    position: { x: 1, y: 1.2, z: 5 },
    velocity: { x: 0.2, y: -0.4, z: 7 },
    angularVelocity: { x: -20, y: 4, z: 0 },
  },
  tick: 10,
  simulationHz: 120,
  signedRandom: () => 0,
});
assert.equal(observedBall.sourceTick, 10);
assert.ok(observedBall.deliveredTick > observedBall.sourceTick);

const plantedCommand = createPlayerCommand({
  modifiers: { setPosition: true },
});
assert.equal(
  plantedCommand.modifiers.setPosition,
  true,
  'Off-ball set stance must survive the serializable command boundary',
);

console.log(
  'Architecture checks passed: shared gamepad semantics, bounded rumble, '
  + 'official 2.5D court projection, serializable set stance, and explicit Ghost profiles.',
);
