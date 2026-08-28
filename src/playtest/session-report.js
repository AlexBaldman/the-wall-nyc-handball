export const PLAYTEST_REPORT_TYPE = 'the-wall-mvp-session';
export const PLAYTEST_REPORT_SCHEMA_VERSION = 2;
export const PLAYTEST_MINIMUM_COHORT_SIZE = 3;

const EMPTY_PERFORMANCE = Object.freeze({
  totalContacts: 0,
  cleanContacts: 0,
  longestRally: 0,
  bestPaceMph: 0,
  pointsWon: 0,
  pointsLost: 0,
  ralliesCompleted: 0,
  rallyContactCounts: Object.freeze([]),
  contactTypes: Object.freeze({}),
  spacingTypes: Object.freeze({}),
  pointReasons: Object.freeze({}),
  assistedContacts: 0,
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function countMap(value) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key.length > 0)
      .map(([key, count]) => [key, Math.max(0, Math.trunc(finite(count)))]),
  );
}

function normalizePerformance(value = {}) {
  return {
    totalContacts: Math.max(0, Math.trunc(finite(value.totalContacts))),
    cleanContacts: Math.max(0, Math.trunc(finite(value.cleanContacts))),
    longestRally: Math.max(0, Math.trunc(finite(value.longestRally))),
    bestPaceMph: Math.max(0, finite(value.bestPaceMph)),
    pointsWon: Math.max(0, Math.trunc(finite(value.pointsWon))),
    pointsLost: Math.max(0, Math.trunc(finite(value.pointsLost))),
    ralliesCompleted: Math.max(0, Math.trunc(finite(value.ralliesCompleted))),
    rallyContactCounts: Array.isArray(value.rallyContactCounts)
      ? value.rallyContactCounts.map((count) => Math.max(0, Math.trunc(finite(count))))
      : [],
    contactTypes: countMap(value.contactTypes),
    spacingTypes: countMap(value.spacingTypes),
    pointReasons: countMap(value.pointReasons),
    assistedContacts: Math.max(0, Math.trunc(finite(value.assistedContacts))),
  };
}

function normalizeGeneratedAt(value) {
  if (!(value instanceof Date) && typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function totalCounts(value) {
  return Object.values(value ?? {}).reduce((total, count) => total + count, 0);
}

export function createPlaytestSessionReport({
  generatedAt = new Date(),
  build = {},
  sport = {},
  tuning = {},
  session = {},
  match = {},
  performance = {},
  coaching = {},
} = {}) {
  const generated = normalizeGeneratedAt(generatedAt) ?? new Date().toISOString();
  return Object.freeze({
    schemaVersion: PLAYTEST_REPORT_SCHEMA_VERSION,
    type: PLAYTEST_REPORT_TYPE,
    generatedAt: generated,
    build: Object.freeze({
      version: String(build.version ?? 'unknown'),
      revision: String(build.revision ?? 'unknown'),
      channel: String(build.channel ?? 'unknown'),
    }),
    sport: Object.freeze({
      id: String(sport.id ?? 'american-handball-one-wall'),
      physicsProfileId: String(sport.physicsProfileId ?? 'unknown'),
    }),
    tuning: Object.freeze(clone(tuning) ?? {}),
    session: Object.freeze(clone(session) ?? {}),
    match: Object.freeze(clone(match) ?? {}),
    performance: Object.freeze(normalizePerformance(performance)),
    coaching: Object.freeze(clone(coaching) ?? {}),
  });
}

function migrateV1(report) {
  return createPlaytestSessionReport({
    generatedAt: report.generatedAt,
    build: { version: '0.5.1-or-earlier', revision: 'unknown', channel: 'legacy' },
    sport: { id: 'american-handball-one-wall', physicsProfileId: 'unknown' },
    tuning: { packId: 'unknown-legacy', provenance: 'migrated-v1' },
    session: report.session,
    match: report.match,
    performance: report.performance,
    coaching: report.coaching,
  });
}

export function validatePlaytestSessionReport(input) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return Object.freeze({ ok: false, errors: Object.freeze(['Report must be a JSON object.']), warnings: Object.freeze([]), report: null });
  }
  if (input.type !== PLAYTEST_REPORT_TYPE) errors.push(`Unsupported report type: ${input.type ?? 'missing'}.`);
  if (![1, PLAYTEST_REPORT_SCHEMA_VERSION].includes(input.schemaVersion)) {
    errors.push(`Unsupported schema version: ${input.schemaVersion ?? 'missing'}.`);
  }
  if (!normalizeGeneratedAt(input.generatedAt)) errors.push('generatedAt must be a valid timestamp.');
  if (!isRecord(input.session)) errors.push('session must be a JSON object.');
  if (!isRecord(input.match)) errors.push('match must be a JSON object.');
  if (!isRecord(input.performance)) errors.push('performance must be a JSON object.');
  if (!isRecord(input.coaching)) errors.push('coaching must be a JSON object.');
  if (input.schemaVersion === PLAYTEST_REPORT_SCHEMA_VERSION) {
    for (const field of ['build', 'sport', 'tuning']) {
      if (!isRecord(input[field])) errors.push(`${field} must be a JSON object in schema v2.`);
    }
    if (isRecord(input.performance)) {
      for (const field of [
        'totalContacts',
        'cleanContacts',
        'longestRally',
        'pointsWon',
        'pointsLost',
        'ralliesCompleted',
        'assistedContacts',
      ]) {
        if (!isNonNegativeInteger(input.performance[field])) {
          errors.push(`performance.${field} must be a non-negative integer.`);
        }
      }
      if (!Number.isFinite(input.performance.bestPaceMph) || input.performance.bestPaceMph < 0) {
        errors.push('performance.bestPaceMph must be a non-negative number.');
      }
      if (!Array.isArray(input.performance.rallyContactCounts)
        || input.performance.rallyContactCounts.some((value) => !isNonNegativeInteger(value))) {
        errors.push('performance.rallyContactCounts must contain non-negative integers.');
      } else if (input.performance.ralliesCompleted !== input.performance.rallyContactCounts.length) {
        errors.push('performance.ralliesCompleted must match rallyContactCounts length.');
      }
      for (const field of ['contactTypes', 'spacingTypes', 'pointReasons']) {
        const counts = input.performance[field];
        if (!isRecord(counts)
          || Object.values(counts).some((value) => !isNonNegativeInteger(value))) {
          errors.push(`performance.${field} must contain non-negative integer counts.`);
        }
      }
      if (input.performance.cleanContacts > input.performance.totalContacts) {
        errors.push('performance.cleanContacts cannot exceed totalContacts.');
      }
      if (input.performance.assistedContacts > input.performance.totalContacts) {
        errors.push('performance.assistedContacts cannot exceed totalContacts.');
      }
      if (isRecord(input.performance.contactTypes)
        && totalCounts(input.performance.contactTypes) !== input.performance.totalContacts) {
        errors.push('performance.contactTypes counts must sum to totalContacts.');
      }
      if (isRecord(input.performance.spacingTypes)
        && totalCounts(input.performance.spacingTypes) !== input.performance.totalContacts) {
        errors.push('performance.spacingTypes counts must sum to totalContacts.');
      }
      if (isRecord(input.performance.pointReasons)
        && totalCounts(input.performance.pointReasons) !== input.performance.ralliesCompleted) {
        errors.push('performance.pointReasons counts must sum to ralliesCompleted.');
      }
      if (Array.isArray(input.performance.rallyContactCounts)
        && input.performance.longestRally !== Math.max(0, ...input.performance.rallyContactCounts)) {
        errors.push('performance.longestRally must match the completed rally evidence.');
      }
    }
    const summary = input.coaching?.summary;
    if (!isRecord(summary)) {
      errors.push('coaching.summary must be a JSON object in schema v2.');
    } else {
      if (!isNonNegativeInteger(summary.visibleSamples)) {
        errors.push('coaching.summary.visibleSamples must be a non-negative integer.');
      }
      if (!Number.isFinite(summary.reachableRate)
        || summary.reachableRate < 0
        || summary.reachableRate > 1) {
        errors.push('coaching.summary.reachableRate must be between 0 and 1.');
      }
      if (!Number.isFinite(summary.averageMovementDemandMeters)
        || summary.averageMovementDemandMeters < 0) {
        errors.push('coaching.summary.averageMovementDemandMeters must be non-negative.');
      }
      if (!isNonNegativeInteger(summary.transitions)) {
        errors.push('coaching.summary.transitions must be a non-negative integer.');
      }
    }
  }
  if (errors.length) return Object.freeze({ ok: false, errors: Object.freeze(errors), warnings: Object.freeze(warnings), report: null });

  const report = input.schemaVersion === 1 ? migrateV1(input) : createPlaytestSessionReport(input);
  if (input.schemaVersion === 1) warnings.push('Schema v1 migrated with unknown build and tuning provenance.');
  if (report.build.revision === 'unknown' || report.build.revision === 'development') {
    warnings.push('Build revision is not deployment-exact; compare this session cautiously.');
  }
  if ((report.coaching?.summary?.visibleSamples ?? 0) < 30) {
    warnings.push('Coaching sample count is below the diagnostic tuning floor of 30.');
  }
  return Object.freeze({ ok: true, errors: Object.freeze([]), warnings: Object.freeze(warnings), report });
}

function sumMap(reports, field) {
  const result = Object.create(null);
  for (const report of reports) {
    for (const [key, value] of Object.entries(report.performance?.[field] ?? {})) {
      result[key] = (result[key] ?? 0) + finite(value);
    }
  }
  return Object.freeze({ ...result });
}

function weightedCoachingAverage(reports, field) {
  let weighted = 0;
  let samples = 0;
  for (const report of reports) {
    const summary = report.coaching?.summary ?? {};
    const visible = Math.max(0, finite(summary.visibleSamples));
    const value = finite(summary[field], NaN);
    if (visible > 0 && Number.isFinite(value)) {
      weighted += value * visible;
      samples += visible;
    }
  }
  return samples > 0 ? weighted / samples : null;
}

function mean(values) {
  const finiteValues = values.filter(Number.isFinite);
  return finiteValues.length
    ? finiteValues.reduce((total, value) => total + value, 0) / finiteValues.length
    : null;
}

export function summarizePlaytestCohort(reports = [], label = 'All sessions') {
  const valid = reports.filter((report) => report?.schemaVersion === PLAYTEST_REPORT_SCHEMA_VERSION);
  const completed = valid.filter((report) => report.match?.winner != null);
  const totalContacts = valid.reduce((total, report) => total + finite(report.performance?.totalContacts), 0);
  const cleanContacts = valid.reduce((total, report) => total + finite(report.performance?.cleanContacts), 0);
  const rallyCounts = valid.flatMap((report) => report.performance?.rallyContactCounts ?? []);
  const visibleSamples = valid.reduce(
    (total, report) => total + finite(report.coaching?.summary?.visibleSamples),
    0,
  );
  const transitions = valid.reduce(
    (total, report) => total + finite(report.coaching?.summary?.transitions),
    0,
  );

  return Object.freeze({
    label,
    sessions: valid.length,
    confidence: valid.length >= PLAYTEST_MINIMUM_COHORT_SIZE ? 'reviewable' : 'small-sample',
    completedMatches: completed.length,
    winRate: completed.length
      ? completed.filter((report) => report.match.winner === 'player').length / completed.length
      : null,
    totalContacts,
    cleanContactRate: totalContacts > 0 ? cleanContacts / totalContacts : null,
    averageLongestRally: mean(valid.map((report) => finite(report.performance?.longestRally, NaN))),
    averageRallyContacts: mean(rallyCounts.map((value) => finite(value, NaN))),
    averageBestPaceMph: mean(valid.map((report) => finite(report.performance?.bestPaceMph, NaN))),
    reachableRate: weightedCoachingAverage(valid, 'reachableRate'),
    averageMovementDemandMeters: weightedCoachingAverage(valid, 'averageMovementDemandMeters'),
    cueTransitionsPer100Samples: visibleSamples > 0 ? transitions / visibleSamples * 100 : null,
    contactTypes: sumMap(valid, 'contactTypes'),
    spacingTypes: sumMap(valid, 'spacingTypes'),
    pointReasons: sumMap(valid, 'pointReasons'),
  });
}

export function groupPlaytestReports(reports = [], dimension = 'difficulty') {
  const getters = {
    difficulty: (report) => report.session?.difficulty,
    inputMode: (report) => report.session?.inputMode,
    build: (report) => report.build?.revision,
    tuningPack: (report) => report.tuning?.packId,
  };
  const getValue = getters[dimension] ?? getters.difficulty;
  const groups = new Map();
  for (const report of reports) {
    const key = String(getValue(report) ?? 'unknown');
    groups.set(key, [...(groups.get(key) ?? []), report]);
  }
  return Object.freeze(
    [...groups.entries()]
      .map(([key, group]) => summarizePlaytestCohort(group, key))
      .sort((a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label)),
  );
}

export { EMPTY_PERFORMANCE };
