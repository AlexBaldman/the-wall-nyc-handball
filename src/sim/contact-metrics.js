import { magnitude } from './ballistics.js';

const METERS_PER_SECOND_TO_MPH = 2.236936;
const RADIANS_PER_SECOND_TO_RPM = 60 / (Math.PI * 2);

function rounded(value, precision = 3) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function safeVector(vector) {
  return vector ?? { x: 0, y: 0, z: 0 };
}

export function deriveContactMetrics(contact, actorPosition = {}) {
  const outgoingVelocity = safeVector(contact.outgoingVelocity);
  const outgoingSpin = safeVector(contact.outgoingSpin);
  const strikerVelocity = safeVector(
    contact.metadata?.strikerVelocity ?? contact.metadata?.handVelocity,
  );
  const contactPosition = contact.position ?? {};
  const actor = actorPosition ?? {};
  const lateralSpacingMeters = Math.abs(
    (contactPosition.x ?? 0) - (actor.x ?? 0),
  );
  const paceMps = magnitude(outgoingVelocity);
  const spinRadS = magnitude(outgoingSpin);
  const strikerSpeedMps = magnitude(strikerVelocity);

  return Object.freeze({
    schemaVersion: 1,
    contactKind: String(contact.kind ?? 'unknown'),
    technique: contact.technique ?? null,
    modifiers: Object.freeze({ ...(contact.metadata?.modifiers ?? {}) }),
    preparationCharge: rounded(contact.charge ?? 0),
    contactHeightMeters: rounded(contactPosition.y ?? 0),
    lateralSpacingMeters: rounded(lateralSpacingMeters),
    paceMps: rounded(paceMps),
    paceMph: rounded(paceMps * METERS_PER_SECOND_TO_MPH),
    spinRadS: rounded(spinRadS),
    spinRpm: Math.round(spinRadS * RADIANS_PER_SECOND_TO_RPM),
    sideSpinRadS: rounded(Math.abs(outgoingSpin.y ?? 0)),
    strikerSpeedMps: rounded(strikerSpeedMps),
  });
}
