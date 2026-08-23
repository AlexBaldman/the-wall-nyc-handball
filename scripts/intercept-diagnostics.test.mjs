import assert from 'node:assert/strict';
import {
  diagnoseInterceptTelemetry,
  HANDBALL_COACH_DIAGNOSTIC_THRESHOLDS,
} from '../src/sports/handball/intercept-diagnostics.js';

const insufficient = diagnoseInterceptTelemetry({
  visibleSamples: 12,
  strikeEntries: 1,
});
assert.equal(insufficient.status, 'collect-more-data');
assert.equal(insufficient.confidence, 'insufficient');
assert.equal(insufficient.findings.length, 0);

const healthy = diagnoseInterceptTelemetry({
  visibleSamples: 180,
  reachableRate: 0.8,
  cueSuppressionRate: 0.08,
  averageMovementDemandMeters: 0.32,
  averageReachMarginMeters: 0.26,
  averageEtaSeconds: 0.48,
  strikeEntries: 9,
});
assert.equal(healthy.status, 'healthy');
assert.equal(healthy.confidence, 'high');
assert.equal(healthy.findings.length, 0);

const problematic = diagnoseInterceptTelemetry({
  visibleSamples: 90,
  reachableRate: 0.45,
  cueSuppressionRate: 0.31,
  averageMovementDemandMeters: 0.82,
  averageReachMarginMeters: 0.04,
  averageEtaSeconds: 0.19,
  strikeEntries: 0,
});
assert.equal(problematic.status, 'review');
assert.equal(problematic.confidence, 'medium');
const ids = problematic.findings.map((item) => item.id);
for (const id of [
  'low-reachability',
  'high-movement-demand',
  'thin-contact-margin',
  'cue-instability',
  'rare-strike-windows',
  'late-guidance',
]) {
  assert.ok(ids.includes(id), `Expected diagnostic finding: ${id}`);
}
assert.equal(
  problematic.findings.find((item) => item.id === 'low-reachability').severity,
  'high',
);

const customThreshold = diagnoseInterceptTelemetry({
  visibleSamples: 40,
  reachableRate: 0.7,
  cueSuppressionRate: 0,
  averageMovementDemandMeters: 0.4,
  averageReachMarginMeters: 0.2,
  averageEtaSeconds: 0.5,
  strikeEntries: 1,
}, {
  thresholds: {
    ...HANDBALL_COACH_DIAGNOSTIC_THRESHOLDS,
    minimumReachableRate: 0.75,
  },
});
assert.ok(
  customThreshold.findings.some((item) => item.id === 'low-reachability'),
  'Diagnostic thresholds should be configurable for deliberate tuning experiments',
);

console.log('Handball intercept diagnostics passed.');
