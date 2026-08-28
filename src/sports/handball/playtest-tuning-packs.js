import {
  HANDBALL_MOVEMENT_EXPERIMENTS,
  runHandballMovementExperiment,
} from './intercept-profile-sweep.js';

function pack(id, label, experiment, hypothesis, status = 'candidate') {
  return Object.freeze({ id, label, experiment, hypothesis, status });
}

export const HANDBALL_PLAYTEST_TUNING_PACKS = Object.freeze({
  canonical: pack(
    'canonical-live',
    'Canonical Live',
    HANDBALL_MOVEMENT_EXPERIMENTS.canonical,
    'Current shipped movement. Comparison baseline only.',
    'live',
  ),
  responsive: pack(
    'candidate-responsive',
    'Responsive Feet',
    HANDBALL_MOVEMENT_EXPERIMENTS.responsive,
    'Tests whether slightly faster acceleration and recovery make returns legible without erasing positioning.',
  ),
  deliberate: pack(
    'candidate-deliberate',
    'Deliberate Weight',
    HANDBALL_MOVEMENT_EXPERIMENTS.deliberate,
    'Tests whether heavier footwork improves physicality without collapsing wide-return margin.',
  ),
  preparedRelief: pack(
    'candidate-prepared-relief',
    'Prepared Relief',
    HANDBALL_MOVEMENT_EXPERIMENTS.preparedRelief,
    'Tests whether reducing only prepared-movement cost rewards early reads without buffing free recovery.',
  ),
});

export function evaluateHandballTuningPack(candidate) {
  if (!candidate?.id || !candidate.experiment) throw new Error('A named tuning pack is required.');
  const experiment = runHandballMovementExperiment(candidate.experiment);
  const checks = [];
  for (const [scenarioId, scenario] of Object.entries(experiment.scenarios)) {
    for (const mode of ['free', 'prepared']) {
      const result = scenario[mode];
      checks.push(Object.freeze({
        id: `${scenarioId}:${mode}:reachability`,
        passed: !result.delta.reachableChanged,
        scenarioId,
        mode,
        reachable: result.result.reachable,
        reachMarginMeters: result.result.reachMarginMeters,
      }));
    }
  }
  const warnings = checks
    .filter((check) => check.passed && check.reachable && check.reachMarginMeters < 0.05)
    .map((check) => `${check.scenarioId} ${check.mode} margin is below 0.05 m.`);
  return Object.freeze({
    id: candidate.id,
    label: candidate.label,
    status: candidate.status,
    hypothesis: candidate.hypothesis,
    gate: checks.every((check) => check.passed) ? 'passed' : 'failed',
    checks: Object.freeze(checks),
    warnings: Object.freeze(warnings),
    profiles: experiment.profiles,
  });
}

export function evaluateAllHandballTuningPacks() {
  return Object.freeze(
    Object.values(HANDBALL_PLAYTEST_TUNING_PACKS).map(evaluateHandballTuningPack),
  );
}
