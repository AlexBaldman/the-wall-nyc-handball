import assert from 'node:assert/strict';
import { accelerationFor, magnitude, stepBall } from '../src/sim/ballistics.js';
import { createBallState } from '../src/sim/types.js';
import { ONE_WALL_HANDBALL_PHYSICS } from '../src/sports/handball/physics-profile.js';
import { HANDBALL_SURFACES } from '../src/sports/handball/surface-profiles.js';

function cloneProfile(overrides = {}) {
  return {
    ...ONE_WALL_HANDBALL_PHYSICS,
    ...overrides,
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
const regulationWallContact = regulationEvents.find(
  (event) => event.type === 'contact' && event.contact.kind === 'wall',
);
assert.ok(
  regulationWallContact,
  'The regulation handball profile should keep the one-wall contact live at one meter high',
);
assert.equal(regulationBall.active, true);
assert.equal(regulationWallContact.contact.metadata.surfaceId, HANDBALL_SURFACES.wall.id);
assert.equal(regulationWallContact.contact.metadata.crack, false);

const crackBall = createBallState({
  position: {
    x: 0,
    y: ONE_WALL_HANDBALL_PHYSICS.ball.radius * 1.25,
    z: 0.5,
  },
  velocity: { x: 0, y: 0, z: -20 },
});
const crackEvents = stepBall(crackBall, 0.05, {
  tick: 2,
  profile: ONE_WALL_HANDBALL_PHYSICS,
});
const crackContact = crackEvents.find(
  (event) => event.type === 'contact' && event.contact.kind === 'wall',
);
assert.ok(crackContact, 'A low handball wall strike should still create a physical wall contact');
assert.equal(crackContact.contact.metadata.surfaceId, HANDBALL_SURFACES.crack.id);
assert.equal(crackContact.contact.metadata.surfaceKind, 'seam');
assert.equal(crackContact.contact.metadata.crack, true);
assert.equal(crackContact.contact.metadata.restitution, HANDBALL_SURFACES.crack.restitution);

const lowWallProfile = cloneProfile({
  court: { wallHeight: 0.5 },
});
const lowWallBall = createBallState({
  position: { x: 0, y: 1, z: 0.5 },
  velocity: { x: 0, y: 0, z: -20 },
});
const lowWallEvents = stepBall(lowWallBall, 0.05, {
  tick: 3,
  profile: lowWallProfile,
});
assert.ok(
  lowWallEvents.some((event) => event.type === 'wall-out'),
  'Injected court geometry should alter environment validation without changing BallisticsCore',
);
assert.equal(lowWallBall.active, false);

const syntheticSurfaceProfile = cloneProfile({
  resolveSurface: ({ hit }) => ({
    id: `synthetic-${hit.kind}`,
    kind: 'test-surface',
    restitution: 0.1,
    friction: 0,
    metadata: { injectedSurface: true, crack: false },
  }),
});
const syntheticBall = createBallState({
  position: { x: 0, y: 1, z: 0.5 },
  velocity: { x: 0, y: 0, z: -20 },
});
const syntheticEvents = stepBall(syntheticBall, 0.05, {
  tick: 4,
  profile: syntheticSurfaceProfile,
});
const syntheticContact = syntheticEvents.find(
  (event) => event.type === 'contact' && event.contact.kind === 'wall',
);
assert.ok(syntheticContact, 'An injected surface resolver should participate in core collision response');
assert.equal(syntheticContact.contact.metadata.surfaceId, 'synthetic-wall');
assert.equal(syntheticContact.contact.metadata.surfaceKind, 'test-surface');
assert.equal(syntheticContact.contact.metadata.injectedSurface, true);
assert.equal(syntheticContact.contact.metadata.restitution, 0.1);
assert.ok(syntheticBall.velocity.z > 0, 'Injected wall response should still reflect the ball');
assert.ok(
  syntheticBall.velocity.z < regulationBall.velocity.z,
  'Lower injected restitution should produce a slower rebound than the handball wall',
);

console.log('Sport physics profile and surface injection passed.');
