export const HANDBALL_COACH_DIAGNOSTIC_THRESHOLDS = Object.freeze({
  minimumVisibleSamples: 30,
  mediumConfidenceSamples: 60,
  highConfidenceSamples: 150,
  minimumReachableRate: 0.62,
  maximumCueSuppressionRate: 0.2,
  maximumAverageMovementDemandMeters: 0.65,
  minimumAverageReachMarginMeters: 0.1,
  minimumStrikeEntryRate: 0.015,
  minimumAverageEtaSeconds: 0.28,
});

function confidenceForSamples(samples, thresholds) {
  if (samples < thresholds.minimumVisibleSamples) return 'insufficient';
  if (samples < thresholds.mediumConfidenceSamples) return 'low';
  if (samples < thresholds.highConfidenceSamples) return 'medium';
  return 'high';
}

function finding(id, severity, label, detail, metric, threshold) {
  return Object.freeze({ id, severity, label, detail, metric, threshold });
}

export function diagnoseInterceptTelemetry(summary = {}, {
  thresholds = HANDBALL_COACH_DIAGNOSTIC_THRESHOLDS,
} = {}) {
  const visibleSamples = Math.max(0, Number(summary.visibleSamples) || 0);
  const confidence = confidenceForSamples(visibleSamples, thresholds);
  const strikeEntryRate = visibleSamples > 0
    ? Math.max(0, Number(summary.strikeEntries) || 0) / visibleSamples
    : 0;
  const findings = [];

  if (confidence === 'insufficient') {
    return Object.freeze({
      schemaVersion: 1,
      status: 'collect-more-data',
      confidence,
      visibleSamples,
      strikeEntryRate,
      findings: Object.freeze([]),
      note: `Collect at least ${thresholds.minimumVisibleSamples} visible coaching samples before tuning from this session.`,
    });
  }

  const reachableRate = Math.max(0, Number(summary.reachableRate) || 0);
  const cueSuppressionRate = Math.max(0, Number(summary.cueSuppressionRate) || 0);
  const averageMovement = Math.max(0, Number(summary.averageMovementDemandMeters) || 0);
  const averageMargin = Number(summary.averageReachMarginMeters) || 0;
  const averageEta = Math.max(0, Number(summary.averageEtaSeconds) || 0);

  if (reachableRate < thresholds.minimumReachableRate) {
    findings.push(finding(
      'low-reachability',
      'high',
      'Reachable windows are too rare',
      'The player spends too much coached time without a physically reachable return. Review recovery positioning, movement envelope, or feed difficulty before widening swing assistance.',
      reachableRate,
      thresholds.minimumReachableRate,
    ));
  }

  if (averageMovement > thresholds.maximumAverageMovementDemandMeters) {
    findings.push(finding(
      'high-movement-demand',
      'medium',
      'Footwork demand is consistently high',
      'Recommended contacts usually require substantial locomotion. Favor earlier recovery/reading changes before granting the hand more magnetic reach.',
      averageMovement,
      thresholds.maximumAverageMovementDemandMeters,
    ));
  }

  if (averageMargin < thresholds.minimumAverageReachMarginMeters) {
    findings.push(finding(
      'thin-contact-margin',
      'medium',
      'Reachable contacts have thin margin',
      'The planner is finding contacts near the edge of the movement budget. Check preparation slowdown and recovery depth before changing collision tolerances.',
      averageMargin,
      thresholds.minimumAverageReachMarginMeters,
    ));
  }

  if (cueSuppressionRate > thresholds.maximumCueSuppressionRate) {
    findings.push(finding(
      'cue-instability',
      'medium',
      'Raw coaching cues are churning',
      'Hysteresis is suppressing many raw cue changes. Tune planner cue boundaries before reducing stabilization, otherwise the HUD will become a caffeinated semaphore operator.',
      cueSuppressionRate,
      thresholds.maximumCueSuppressionRate,
    ));
  }

  if (strikeEntryRate < thresholds.minimumStrikeEntryRate) {
    findings.push(finding(
      'rare-strike-windows',
      'medium',
      'Strike windows are rarely surfaced',
      'The player is reaching very few explicit strike windows. Inspect contact-window timing and preparation thresholds before making the strike cue more permissive.',
      strikeEntryRate,
      thresholds.minimumStrikeEntryRate,
    ));
  }

  if (averageEta < thresholds.minimumAverageEtaSeconds) {
    findings.push(finding(
      'late-guidance',
      'medium',
      'Useful contacts are being identified late',
      'Average recommended-contact ETA is short. Consider earlier trajectory reading or recovery guidance rather than simply speeding up the player.',
      averageEta,
      thresholds.minimumAverageEtaSeconds,
    ));
  }

  const highSeverity = findings.some((item) => item.severity === 'high');
  const status = highSeverity || findings.length >= 2 ? 'review' : 'healthy';
  return Object.freeze({
    schemaVersion: 1,
    status,
    confidence,
    visibleSamples,
    strikeEntryRate,
    findings: Object.freeze(findings),
    note: findings.length
      ? 'These are playtest diagnostics, not automatic tuning instructions.'
      : 'No provisional coaching thresholds are currently outside the review band.',
  });
}
