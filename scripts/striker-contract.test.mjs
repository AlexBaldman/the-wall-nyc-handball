import assert from 'node:assert/strict';
import { resolveHandContact } from '../src/sim/ballistics.js';
import { resolveStrikerContact, STRIKER_COLLIDER } from '../src/sim/striker-contact.js';
import { createBallState } from '../src/sim/types.js';
import { createHandStriker } from '../src/sports/handball/striker-profile.js';

function contactBall() {
  return createBallState({
    position: { x: 0, y: 1, z: 0.7 },
    previousPosition: { x: 0, y: 1, z: 0.82 },
    velocity: { x: 0, y: 0, z: 4 },
  });
}

const hand = {
  previousPosition: { x: 0, y: 1, z: 1.05 },
  position: { x: 0, y: 1, z: 0.54 },
  velocity: { x: 0, y: 0, z: -15.3 },
  radius: 0.105,
  active: true,
};
const context = {
  id: 'baseline-contact',
  tick: 12,
  technique: 'topspin',
  charge: 0.82,
  spinImpulse: { x: -80, y: 0, z: 0 },
  faceInfluence: 0.2,
};

const legacyBall = contactBall();
const legacyContact = resolveHandContact(legacyBall, hand, context);
assert.ok(legacyContact, 'Legacy hand contact should resolve');

const strikerBall = contactBall();
const strikerContact = resolveStrikerContact(
  strikerBall,
  createHandStriker(hand, { id: 'player-right-hand' }),
  context,
);
assert.ok(strikerContact, 'Hand adapter should resolve through the generic striker contract');
assert.deepEqual(strikerBall.velocity, legacyBall.velocity, 'Hand adapter must preserve outgoing velocity');
assert.deepEqual(
  strikerBall.angularVelocity,
  legacyBall.angularVelocity,
  'Hand adapter must preserve outgoing spin',
);
assert.equal(strikerContact.kind, 'hand');
assert.equal(strikerContact.metadata.strikerId, 'player-right-hand');
assert.equal(strikerContact.metadata.strikerKind, 'hand');
assert.equal(strikerContact.metadata.colliderType, STRIKER_COLLIDER.SPHERE);
assert.deepEqual(strikerContact.metadata.strikerVelocity, strikerContact.metadata.handVelocity);

const paddleProxyBall = contactBall();
const paddleProxy = {
  id: 'prototype-paddle',
  kind: 'paddle-proxy',
  position: hand.position,
  previousPosition: hand.previousPosition,
  velocity: hand.velocity,
  collider: {
    type: STRIKER_COLLIDER.SPHERE,
    radius: hand.radius,
  },
};
const paddleContact = resolveStrikerContact(paddleProxyBall, paddleProxy, {
  ...context,
  id: 'paddle-proxy-contact',
  technique: 'drive',
});
assert.ok(paddleContact, 'A non-hand spherical striker should use the same moving-contact seam');
assert.equal(paddleContact.kind, 'paddle-proxy');
assert.equal(paddleContact.metadata.strikerId, 'prototype-paddle');
assert.equal(paddleContact.metadata.strikerKind, 'paddle-proxy');
assert.ok(paddleProxyBall.velocity.z < 0, 'Generic striker contact should send the ball through contact');

assert.throws(
  () => resolveStrikerContact(contactBall(), {
    ...paddleProxy,
    collider: { type: 'oriented-disc', radius: hand.radius },
  }, context),
  /Unsupported striker collider/,
  'Unsupported collider shapes should fail explicitly until their solver exists',
);

console.log('Generic striker contract passed.');
