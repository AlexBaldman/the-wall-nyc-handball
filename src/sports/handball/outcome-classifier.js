const TECHNIQUE_LABELS = Object.freeze({
  palm: 'Open palm',
  topspin: 'Topspin',
  backspin: 'Backspin',
  fist: 'Fist',
});

function classifyShot(contact, metrics) {
  const modifiers = metrics.modifiers;
  const height = metrics.contactHeightMeters;
  const sideSpin = metrics.sideSpinRadS;

  if (height < 0.5 && metrics.preparationCharge > 0.72 && modifiers.drive) {
    return { id: 'kill-drive', label: 'Kill drive' };
  }
  if (height < 0.42 && metrics.technique === 'backspin') {
    return { id: 'roller-attempt', label: 'Roller attempt' };
  }
  if (modifiers.lift && metrics.technique === 'backspin') {
    return { id: 'touch-lob', label: 'Touch lob' };
  }
  if (sideSpin > 58) {
    return { id: 'hook', label: 'Hook' };
  }
  if (metrics.technique === 'topspin' && metrics.preparationCharge > 0.7) {
    return { id: 'topspin-cut', label: 'Topspin cut' };
  }
  if (metrics.technique === 'fist' && metrics.paceMph > 42) {
    return { id: 'knuckle-drive', label: 'Knuckle drive' };
  }

  return {
    id: metrics.technique ?? 'unknown',
    label: TECHNIQUE_LABELS[metrics.technique] ?? 'Handball return',
  };
}

function classifySpacing(lateralSpacingMeters) {
  if (lateralSpacingMeters < 0.28) return { id: 'jammed', label: 'Jammed' };
  if (lateralSpacingMeters > 0.64) return { id: 'reached', label: 'Reached' };
  return { id: 'clean', label: 'Clean' };
}

function classifyPreparation(charge) {
  if (charge >= 0.92) return { id: 'loaded', label: 'Loaded' };
  if (charge >= 0.55) return { id: 'set', label: 'Set' };
  return { id: 'quick', label: 'Quick' };
}

export function classifyHandballContact(contact, metrics) {
  const spacing = classifySpacing(metrics.lateralSpacingMeters);
  const preparation = classifyPreparation(metrics.preparationCharge);
  const pure = spacing.id === 'clean' && metrics.preparationCharge >= 0.55;

  return {
    schemaVersion: 1,
    shot: classifyShot(contact, metrics),
    quality: {
      id: pure ? 'pure' : spacing.id,
      label: pure ? 'Pure' : spacing.label,
      pure,
    },
    spacing: {
      ...spacing,
      lateralMeters: metrics.lateralSpacingMeters,
    },
    preparation: {
      ...preparation,
      charge: metrics.preparationCharge,
    },
    paceMph: metrics.paceMph,
    spinRpm: metrics.spinRpm,
    handSpeedMps: metrics.strikerSpeedMps,
  };
}
