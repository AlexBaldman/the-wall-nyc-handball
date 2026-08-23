import assert from 'node:assert/strict';
import { accelerationFor, magnitude, stepBall } from '../src/sim/ballistics.js';
import { createBallState } from '../src/sim/types.js';
import { ONE_WALL_HANDBALL_PHYSICS } from '../src/sports/handball/physics-profile.js';

function cloneProfile(overrides = {}) {
  return {
    ...ONE_WALL_HANDBALL_PHYSICS,
    ball: {
      ...ONE_WALL_HANDBALL_PHYSICS.ball,
      ...(overrides.ball ?? {}),
    },
    court: {
      ...ONE_WALL_HANDBALL_PHYSICS.court,
      ...(overrides.court ?? {}),
    },
    material: {
      ...ONE_WALL_HANDBALL_PHYSICS.material,
      ...(overrides.material ?? {}),
    },
    physics: {
      ...ONE_WALL_HANDBALL_PHYSICS.physics,
      ...(overrides.physics ?? {}),
    },
  };
}

const flightState = createBallState({
  position: { x: 0, y: 1.2, z: 5 },
  velocity: { x: 12, y: 0, z: -12 },
});

const defaultAcceleration = accelerationFor(
  flightState,
  {},
  ONE_WALL_HANDBALL_PHYSICS,
);
const largeLightBallProfile = cloneProfile({
  ball: {
    radius: ONE_WALL_HANDBALL_PHYSICS.ball.radius * 1.8,
    mass: ONE_WALL_HANDBALL_PHYSICS.ball.mass * 0.55,
  },
});
const alternateAcceleration = accelerationFor(
  flightState,
  {},
  largeLightBallProfile,
);

assert.ok(
  magnitude(alternateAcceleration) > magnitude(defaultAcceleration),
  'An injected larger/lighter ball profile should experience a different aerodynamic response',
);

const regulationBall = createBallState({
  position: { x: 0, y: 1, z: 0.5 },
  velocity: { x: 0, y: 0, z: -20 },
});
const regulationEvents = stepBall(regulationBall, 0.05, {
  tick: 1,
  profile: ONE_WALL_HANDBALL_PHYSICS,
});
assert.ok(
  regulationEvents.some((event) => event.type === 'contact' && event.contact.kind === 'wall'),
  'The regulation handball profile should keep the one-wall contact live at one meter high',
);
assert.equal(regulationBall.active, true);

const lowWallProfile = cloneProfile({
  court: { wallHeight: 0.5 },
});
const lowWallBall = createBallState({
  position: { x: 0, y: 1, z: 0.5 },
  velocity: { x: 0, y: 0, z: -20 },
});
const lowWallEvents = stepBall(lowWallBall, 0.05, {
  tick: 2,
  profile: lowWallProfile,
});
assert.ok(
  lowWallEvents.some((event) => event.type === 'wall-out'),
  'Injected court geometry should alter environment validation without changing BallisticsCore',
);
assert.equal(lowWallBall.active, false);

console.log('Sport physics profile injection passed.');
