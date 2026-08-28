import assert from 'node:assert/strict';
import {
  createPlaytestSessionReport,
  groupPlaytestReports,
  PLAYTEST_REPORT_SCHEMA_VERSION,
  PLAYTEST_REPORT_TYPE,
  summarizePlaytestCohort,
  validatePlaytestSessionReport,
} from '../src/playtest/session-report.js';

function fixture({
  generatedAt = '2026-08-28T12:00:00.000Z',
  difficulty = 'regular',
  inputMode = 'keyboard',
  revision = 'abc123',
  packId = 'canonical-live',
  winner = 'player',
  totalContacts = 10,
  cleanContacts = 6,
  rallyContactCounts = [2, 4],
  visibleSamples = 50,
  reachableRate = 0.8,
  averageMovementDemandMeters = 0.4,
  transitions = 5,
} = {}) {
  return createPlaytestSessionReport({
    generatedAt,
    build: { version: '0.5.1', revision, channel: 'test' },
    sport: { id: 'american-handball-one-wall', physicsProfileId: 'american-handball-one-wall' },
    tuning: { packId },
    session: { difficulty, inputMode },
    match: { winner, scores: { player: 11, ai: 7 } },
    performance: {
      totalContacts,
      cleanContacts,
      longestRally: Math.max(...rallyContactCounts),
      bestPaceMph: 38,
      ralliesCompleted: rallyContactCounts.length,
      rallyContactCounts,
      contactTypes: { palm: totalContacts },
      spacingTypes: { balanced: cleanContacts, stretched: totalContacts - cleanContacts },
      pointReasons: { 'second-bounce': rallyContactCounts.length },
      assistedContacts: 2,
    },
    coaching: {
      summary: { visibleSamples, reachableRate, averageMovementDemandMeters, transitions },
      diagnostic: { confidence: 'reviewable' },
    },
  });
}

const report = fixture();
assert.equal(report.type, PLAYTEST_REPORT_TYPE);
assert.equal(report.schemaVersion, PLAYTEST_REPORT_SCHEMA_VERSION);
assert.equal(validatePlaytestSessionReport(report).ok, true);
assert.equal(report.performance.contactTypes.palm, 10);

const legacy = {
  schemaVersion: 1,
  type: PLAYTEST_REPORT_TYPE,
  generatedAt: '2026-08-27T10:00:00.000Z',
  session: { difficulty: 'rookie', inputMode: 'touch' },
  match: { winner: null },
  performance: { totalContacts: 3, cleanContacts: 1 },
  coaching: { summary: { visibleSamples: 10 }, diagnostic: {} },
};
const migrated = validatePlaytestSessionReport(legacy);
assert.equal(migrated.ok, true);
assert.equal(migrated.report.schemaVersion, 2);
assert.equal(migrated.report.build.revision, 'unknown');
assert.equal(migrated.report.tuning.packId, 'unknown-legacy');
assert.ok(migrated.warnings.some((warning) => /migrated/i.test(warning)));

for (const invalid of [
  null,
  { ...report, type: 'other' },
  { ...report, schemaVersion: 99 },
  { ...report, generatedAt: 'not-a-date' },
  { ...report, generatedAt: null },
  { ...report, session: [] },
  { ...report, build: null },
  { ...report, performance: null },
  { ...report, performance: { ...report.performance, cleanContacts: 11 } },
  { ...report, performance: { ...report.performance, rallyContactCounts: ['four'] } },
  { ...report, performance: { ...report.performance, ralliesCompleted: 3 } },
  { ...report, performance: { ...report.performance, contactTypes: { palm: 1.5 } } },
  { ...report, performance: { ...report.performance, contactTypes: { palm: 9 } } },
  { ...report, performance: { ...report.performance, pointReasons: { 'second-bounce': 1 } } },
  { ...report, coaching: { ...report.coaching, summary: { ...report.coaching.summary, reachableRate: 1.2 } } },
]) {
  assert.equal(validatePlaytestSessionReport(invalid).ok, false);
}

const reservedKeys = JSON.parse('{"__proto__":4,"constructor":2}');
const reservedReport = createPlaytestSessionReport({
  ...report,
  performance: { ...report.performance, contactTypes: reservedKeys },
});
const reservedSummary = summarizePlaytestCohort([reservedReport]);
assert.equal(reservedSummary.contactTypes.__proto__, 4);
assert.equal(reservedSummary.contactTypes.constructor, 2);
assert.equal(Object.getPrototypeOf(reservedSummary.contactTypes), Object.prototype);

const reports = [
  fixture(),
  fixture({ generatedAt: '2026-08-28T12:05:00.000Z', totalContacts: 20, cleanContacts: 10, rallyContactCounts: [6], visibleSamples: 100, reachableRate: 0.5, averageMovementDemandMeters: 0.7, transitions: 10, winner: 'ai' }),
  fixture({ generatedAt: '2026-08-28T12:10:00.000Z', difficulty: 'champion', inputMode: 'gamepad', totalContacts: 0, cleanContacts: 0, rallyContactCounts: [], visibleSamples: 0, reachableRate: 0, averageMovementDemandMeters: 0, transitions: 0, winner: null }),
];
const summary = summarizePlaytestCohort(reports);
assert.equal(summary.sessions, 3);
assert.equal(summary.confidence, 'reviewable');
assert.equal(summary.completedMatches, 2);
assert.equal(summary.winRate, 0.5);
assert.equal(summary.cleanContactRate, 16 / 30);
assert.equal(summary.averageRallyContacts, 4);
assert.ok(Math.abs(summary.reachableRate - 0.6) < 1e-12);
assert.ok(Math.abs(summary.averageMovementDemandMeters - 0.6) < 1e-12);
assert.equal(summary.cueTransitionsPer100Samples, 10);
assert.deepEqual(summary.contactTypes, { palm: 30 });

const difficultyGroups = groupPlaytestReports(reports, 'difficulty');
assert.deepEqual(difficultyGroups.map(({ label, sessions }) => [label, sessions]), [
  ['regular', 2],
  ['champion', 1],
]);
assert.equal(difficultyGroups[0].confidence, 'small-sample');

console.log('Playtest session report schema, migration, and cohort aggregation passed.');
