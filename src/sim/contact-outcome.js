import { magnitude } from './ballistics.js';

const METERS_PER_SECOND_TO_MPH = 2.236936;
const RADIANS_PER_SECOND_TO_RPM = 60 / (Math.PI * 2);

const TECHNIQUE_LABELS = {
  palm: 'Open palm',
  topspin: 'Topspin',
  backspin: 'Backspin',
  fist: 'Fist',
};

function rounded(value, precision = 3) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function classifyShot(contact, paceMph) {
  const modifiers = contact.metadata?.modifiers ?? {};
  const height = contact.position?.y ?? 0;
  const sideSpin = Math.abs(contact.outgoingSpin?.y ?? 0);

  if (height < 0.5 && contact.charge > 0.72 && modifiers.drive) {
    return { id: 'kill-drive', label: 'Kill drive' };
  }
  if (height < 0.42 && contact.technique === 'backspin') {
    return { id: 'roller-attempt', label: 'Roller attempt' };
  }
  if (modifiers.lift && contact.technique === 'backspin') {
    return { id: 'touch-lob', label: 'Touch lob' };
  }
  if (sideSpin > 58) {
    return { id: 'hook', label: 'Hook' };
  }
  if (contact.technique === 'topspin' && contact.charge > 0.7) {
    return { id: 'topspin-cut', label: 'Topspin cut' };
  }
  if (contact.technique === 'fist' && paceMph > 42) {
    return { id: 'knuckle-drive', label: 'Knuckle drive' };
  }

  return {
    id: contact.technique ?? 'unknown',
    label: TECHNIQUE_LABELS[contact.technique] ?? 'Handball return',
  };
}

export function deriveContactOutcome(contact, actorPosition) {
  const paceMph = magnitude(contact.outgoingVelocity) * METERS_PER_SECOND_TO_MPH;
  const spinRpm = magnitude(contact.outgoingSpin) * RADIANS_PER_SECOND_TO_RPM;
  const handSpeedMps = magnitude(contact.metadata?.handVelocity);
  const lateralSpacing = Math.abs(
    (contact.position?.x ?? 0) - (actorPosition?.x ?? 0),
  );
  const spacing = lateralSpacing < 0.28
    ? { id: 'jammed', label: 'Jammed' }
    : lateralSpacing > 0.64
      ? { id: 'reached', label: 'Reached' }
      : { id: 'clean', label: 'Clean' };
  const preparation = contact.charge >= 0.92
    ? { id: 'loaded', label: 'Loaded' }
    : contact.charge >= 0.55
      ? { id: 'set', label: 'Set' }
      : { id: 'quick', label: 'Quick' };
  const pure = spacing.id === 'clean' && contact.charge >= 0.55;

  return {
    schemaVersion: 1,
    shot: classifyShot(contact, paceMph),
    quality: {
      id: pure ? 'pure' : spacing.id,
      label: pure ? 'Pure' : spacing.label,
      pure,
    },
    spacing: {
      ...spacing,
      lateralMeters: rounded(lateralSpacing),
    },
    preparation: {
      ...preparation,
      charge: rounded(contact.charge ?? 0),
    },
    paceMph: rounded(paceMph),
    spinRpm: Math.round(spinRpm),
    handSpeedMps: rounded(handSpeedMps),
  };
}
