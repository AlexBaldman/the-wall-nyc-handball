function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createCoachPlaytestReport({
  sport,
  physicsProfile,
  generatedAt,
  summary,
  diagnostic,
  thresholds,
} = {}) {
  if (!sport?.id) throw new Error('A sport id is required for a coaching report.');
  if (!physicsProfile?.id) throw new Error('A physics profile id is required for a coaching report.');

  const generated = generatedAt instanceof Date
    ? generatedAt.toISOString()
    : String(generatedAt ?? new Date().toISOString());

  return Object.freeze({
    schemaVersion: 1,
    reportType: 'intercept-coaching-playtest',
    generatedAt: generated,
    sport: Object.freeze({
      id: String(sport.id),
      label: String(sport.label ?? sport.id),
    }),
    physicsProfileId: String(physicsProfile.id),
    summary: Object.freeze(clone(summary ?? {})),
    diagnostic: Object.freeze(clone(diagnostic ?? {})),
    thresholds: Object.freeze(clone(thresholds ?? {})),
  });
}
