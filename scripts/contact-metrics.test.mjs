import assert from 'node:assert/strict';
import { deriveContactMetrics } from '../src/sim/contact-metrics.js';
import { deriveContactOutcome } from '../src/sim/contact-outcome.js';
import { classifyHandballContact } from '../src/sports/handball/outcome-classifier.js';
import { ONE_WALL_HANDBALL } from '../src/sports/handball/sport-pack.js';

const contact = (overrides = {}) => ({
  kind: 'hand',
  position: { x: 0.45, y: 0.8, z: 4 },
  outgoingVelocity: { x: 0, y: 0, z: -20 },
  outgoingSpin: { x: 0, y: 0, z: 0 },
  technique: 'palm',
  charge: 0.65,
  ...overrides,
  metadata: {
    handVelocity: { x: 0, y: 0, z: -8 },
    modifiers: {},
    ...(overrides.metadata ?? {}),
  },
});

const actor = { x: 0, y: 0, z: 4 };
const baseContact = contact();
const metrics = deriveContactMetrics(baseContact, actor);

assert.equal(metrics.schemaVersion, 1);
assert.equal(metrics.contactKind, 'hand');
assert.equal(metrics.technique, 'palm');
assert.equal(metrics.preparationCharge, 0.65);
assert.equal(metrics.contactHeightMeters, 0.8);
assert.equal(metrics.lateralSpacingMeters, 0.45);
assert.equal(metrics.paceMps, 20);
assert.ok(Math.abs(metrics.paceMph - 44.73872) < 1e-9);
assert.equal(metrics.spinRpm, 0);
assert.equal(metrics.strikerSpeedMps, 8);
assert.equal('shot' in metrics, false, 'Neutral metrics must not assign sport-specific shot names');
assert.equal('quality' in metrics, false, 'Neutral metrics must not assign handball coaching quality');

const oldFacadeOutcome = deriveContactOutcome(baseContact, actor);
const explicitOutcome = classifyHandballContact(baseContact, metrics);
const sportPackOutcome = ONE_WALL_HANDBALL.classifyContact(baseContact, actor);
assert.deepEqual(explicitOutcome, oldFacadeOutcome, 'Compatibility facade must preserve handball outcomes');
assert.deepEqual(sportPackOutcome, oldFacadeOutcome, 'SportPack must own the same handball interpretation');
assert.equal(oldFacadeOutcome.quality.id, 'pure');
assert.equal(oldFacadeOutcome.shot.id, 'palm');
assert.equal(oldFacadeOutcome.paceMph, 44.739);
assert.equal(oldFacadeOutcome.spacing.lateralMeters, 0.45);
assert.equal(oldFacadeOutcome.preparation.charge, 0.65);
assert.equal(oldFacadeOutcome.handSpeedMps, 8);

const thresholdContact = contact({
  position: { x: 0.45, y: 0.4999, z: 4 },
  charge: 0.7204,
  metadata: { modifiers: { drive: true } },
});
const thresholdMetrics = deriveContactMetrics(thresholdContact, actor);
assert.equal(
  thresholdMetrics.preparationCharge,
  0.7204,
  'Metrics must preserve full precision before sport classification',
);
assert.equal(
  classifyHandballContact(thresholdContact, thresholdMetrics).shot.id,
  'kill-drive',
  'Classification thresholds must use full-precision physical metrics',
);

const genericStrikerContact = contact({
  kind: 'paddle-proxy',
  metadata: {
    handVelocity: undefined,
    strikerVelocity: { x: 3, y: 4, z: 0 },
    modifiers: {},
  },
});
const genericMetrics = deriveContactMetrics(genericStrikerContact, actor);
assert.equal(genericMetrics.contactKind, 'paddle-proxy');
assert.equal(genericMetrics.strikerSpeedMps, 5, 'Neutral metrics should consume generic striker velocity');

console.log('Sport-neutral contact metrics and handball classification passed.');
