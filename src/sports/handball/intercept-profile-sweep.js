import {
  HANDBALL_INTERCEPT_BENCHMARKS,
  runHandballInterceptBenchmark,
} from './intercept-benchmarks.js';
import { HANDBALL_PLAYER_MOVEMENT } from './intercept-planner.js';

function scaledProfile(base, id, speedScale = 1, responseScale = 1) {
  return Object.freeze({
    id,
    maxSpeed: base.maxSpeed * speedScale,
    responseRate: base.responseRate * responseScale,
  });
}

function experiment(id, label, free, prepared, note) {
  return Object.freeze({ id, label, free, prepared, note });
}

export const HANDBALL_MOVEMENT_EXPERIMENTS = Object.freeze({
  canonical: experiment(
    'canonical',
    'Canonical live movement',
    HANDBALL_PLAYER_MOVEMENT.free,
    HANDBALL_PLAYER_MOVEMENT.prepared,
    'Current live values. This is the comparison baseline, not a tuning proposal.',
  ),
  responsive: experiment(
    'responsive',
    'Responsive +5/+10',
    scaledProfile(HANDBALL_PLAYER_MOVEMENT.free, 'experiment-responsive-free', 1.05, 1.10),
    scaledProfile(HANDBALL_PLAYER_MOVEMENT.prepared, 'experiment-responsive-prepared', 1.05, 1.10),
    'Explores a small increase in top speed and movement response in both states.',
  ),
  deliberate: experiment(
    'deliberate',
    'Deliberate -5/-10',
    scaledProfile(HANDBALL_PLAYER_MOVEMENT.free, 'experiment-deliberate-free', 0.95, 0.90),
    scaledProfile(HANDBALL_PLAYER_MOVEMENT.prepared, 'experiment-deliberate-prepared', 0.95, 0.90),
    'Explores a slightly heavier player response without changing contact physics.',
  ),
  preparedRelief: experiment(
    'prepared-relief',
    'Prepared penalty relief',
    HANDBALL_PLAYER_MOVEMENT.free,
    scaledProfile(HANDBALL_PLAYER_MOVEMENT.prepared, 'experiment-prepared-relief', 1.10, 1.10),
    'Keeps free movement canonical while reducing only the locomotion penalty after loading the hand.',
  ),
});

function numericDelta(value, baseline) {
  return Number.isFinite(value) && Number.isFinite(baseline)
    ? value - baseline
    : null;
}

function compareResult(result, baseline) {
  return Object.freeze({
    reachableChanged: result.reachable !== baseline.reachable,
    earliestTimeSeconds: numericDelta(result.earliestTime, baseline.earliestTime),
    recommendedTimeSeconds: numericDelta(result.recommendedTime, baseline.recommendedTime),
    reachMarginMeters: numericDelta(result.reachMarginMeters, baseline.reachMarginMeters),
    movementDemandMeters: numericDelta(result.movementDemandMeters, baseline.movementDemandMeters),
  });
}

function runScenario(scenario, movementProfile, preparing) {
  return runHandballInterceptBenchmark(scenario, {
    preparing,
    movementProfile,
  });
}

function canonicalScenarioResults(scenario) {
  return Object.freeze({
    free: runScenario(scenario, HANDBALL_PLAYER_MOVEMENT.free, false),
    prepared: runScenario(scenario, HANDBALL_PLAYER_MOVEMENT.prepared, true),
  });
}

export function runHandballMovementExperiment(candidate, {
  benchmarks = HANDBALL_INTERCEPT_BENCHMARKS,
} = {}) {
  if (!candidate?.id || !candidate.free || !candidate.prepared) {
    throw new Error('A movement experiment with free and prepared profiles is required.');
  }

  const scenarios = Object.fromEntries(
    Object.values(benchmarks).map((scenario) => {
      const baseline = canonicalScenarioResults(scenario);
      const free = runScenario(scenario, candidate.free, false);
      const prepared = runScenario(scenario, candidate.prepared, true);
      return [scenario.id, Object.freeze({
        free: Object.freeze({ result: free, delta: compareResult(free, baseline.free) }),
        prepared: Object.freeze({ result: prepared, delta: compareResult(prepared, baseline.prepared) }),
      })];
    }),
  );

  return Object.freeze({
    id: candidate.id,
    label: candidate.label ?? candidate.id,
    note: candidate.note ?? '',
    profiles: Object.freeze({
      free: candidate.free,
      prepared: candidate.prepared,
    }),
    scenarios: Object.freeze(scenarios),
  });
}

export function runHandballMovementProfileSweep({
  experiments = HANDBALL_MOVEMENT_EXPERIMENTS,
  benchmarks = HANDBALL_INTERCEPT_BENCHMARKS,
} = {}) {
  return Object.freeze({
    schemaVersion: 1,
    sweep: 'handball-intercept-movement-profiles',
    baselineId: 'canonical',
    experiments: Object.freeze(
      Object.fromEntries(
        Object.values(experiments).map((candidate) => [
          candidate.id,
          runHandballMovementExperiment(candidate, { benchmarks }),
        ]),
      ),
    ),
  });
}
