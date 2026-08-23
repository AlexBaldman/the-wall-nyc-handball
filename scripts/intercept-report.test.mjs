import assert from 'node:assert/strict';
import { createCoachPlaytestReport } from '../src/sports/handball/intercept-report.js';

const summary = {
  visibleSamples: 120,
  reachableRate: 0.78,
  averageMovementDemandMeters: 0.34,
};
const diagnostic = {
  status: 'healthy',
  confidence: 'medium',
  findings: [],
};
const thresholds = {
  minimumVisibleSamples: 30,
  minimumReachableRate: 0.62,
};

const report = createCoachPlaytestReport({
  sport: { id: 'american-handball-one-wall', label: 'American One-Wall Handball' },
  physicsProfile: { id: 'american-handball-one-wall' },
  generatedAt: new Date('2026-08-23T12:00:00.000Z'),
  summary,
  diagnostic,
  thresholds,
});

assert.equal(report.schemaVersion, 1);
assert.equal(report.reportType, 'intercept-coaching-playtest');
assert.equal(report.generatedAt, '2026-08-23T12:00:00.000Z');
assert.equal(report.sport.id, 'american-handball-one-wall');
assert.equal(report.physicsProfileId, 'american-handball-one-wall');
assert.deepEqual(report.summary, summary);
assert.deepEqual(report.diagnostic, diagnostic);
assert.deepEqual(report.thresholds, thresholds);

summary.visibleSamples = 1;
diagnostic.status = 'mutated';
thresholds.minimumVisibleSamples = 999;
assert.equal(report.summary.visibleSamples, 120, 'Report should snapshot telemetry rather than retain mutable references');
assert.equal(report.diagnostic.status, 'healthy');
assert.equal(report.thresholds.minimumVisibleSamples, 30);

assert.throws(
  () => createCoachPlaytestReport({ physicsProfile: { id: 'x' } }),
  /sport id/i,
);
assert.throws(
  () => createCoachPlaytestReport({ sport: { id: 'x' } }),
  /physics profile id/i,
);

console.log('Coaching playtest report passed.');
