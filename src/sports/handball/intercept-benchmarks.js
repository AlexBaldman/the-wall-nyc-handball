import { createBallState } from '../../sim/types.js';
import { deriveHandballFootworkGuidance } from './intercept-guidance.js';
import { planHandballIntercept } from './intercept-planner.js';

function freezeVector(value = {}) {
  return Object.freeze({
    x: Number(value.x ?? 0),
    y: Number(value.y ?? 0),
    z: Number(value.z ?? 0),
  });
}

function benchmark(id, label, { ball, player, preparing = false, horizon = 1.3 }) {
  return Object.freeze({
    id,
    label,
    ball: Object.freeze({
      position: freezeVector(ball.position),
      velocity: freezeVector(ball.velocity),
      angularVelocity: freezeVector(ball.angularVelocity),
    }),
    player: Object.freeze({
      position: freezeVector(player.position),
      velocity: freezeVector(player.velocity),
    }),
    preparing,
    horizon,
  });
}

export const HANDBALL_INTERCEPT_BENCHMARKS = Object.freeze({
  centerReturn: benchmark('center-return', 'Center return', {
    ball: {
      position: { x: 0, y: 1.15, z: 3.1 },
      velocity: { x: 0, y: 0.5, z: 7.5 },
      angularVelocity: { x: -18, y: 0, z: 0 },
    },
    player: {
      position: { x: 0, y: 0, z: 5.5 },
      velocity: { x: 0, y: 0, z: 0 },
    },
  }),
  wallBound: benchmark('wall-bound', 'Read through the wall', {
    ball: {
      position: { x: 0.2, y: 1.2, z: 2.0 },
      velocity: { x: 0.25, y: 0.8, z: -11 },
      angularVelocity: { x: -32, y: 3, z: 0 },
    },
    player: {
      position: { x: 0.6, y: 0, z: 4.6 },
      velocity: { x: 0, y: 0, z: 0 },
    },
  }),
  wideReturn: benchmark('wide-return', 'Wide recovery return', {
    ball: {
      position: { x: -1.35, y: 1.05, z: 3.0 },
      velocity: { x: 0.2, y: 0.75, z: 7.2 },
      angularVelocity: { x: -24, y: 5, z: 0 },
    },
    player: {
      position: { x: 1.0, y: 0, z: 5.4 },
      velocity: { x: 0, y: 0, z: 0 },
    },
    horizon: 1.15,
  }),
});

export function runHandballInterceptBenchmark(scenario, overrides = {}) {
  if (!scenario?.id) throw new Error('A benchmark scenario is required.');
  const player = {
    position: {
      ...scenario.player.position,
      ...(overrides.player?.position ?? {}),
    },
    velocity: {
      ...scenario.player.velocity,
      ...(overrides.player?.velocity ?? {}),
    },
  };
  const plan = planHandballIntercept({
    ball: createBallState({
      active: true,
      ...scenario.ball,
      ...(overrides.ball ?? {}),
    }),
    player,
    preparing: overrides.preparing ?? scenario.preparing,
    horizon: overrides.horizon ?? scenario.horizon,
    coefficients: overrides.coefficients,
    movementProfile: overrides.movementProfile,
  });
  const guidance = deriveHandballFootworkGuidance(plan, player.position);

  return Object.freeze({
    id: scenario.id,
    label: scenario.label,
    preparing: overrides.preparing ?? scenario.preparing,
    movementProfile: plan.movementProfile,
    reachable: plan.reachable,
    cue: plan.cue,
    returnStartTime: plan.returnStartTime,
    earliestTime: plan.window?.earliest?.time ?? null,
    latestTime: plan.window?.latest?.time ?? null,
    recommendedTime: plan.recommended?.time ?? null,
    recommendedHeightMeters: plan.recommended?.position?.y ?? null,
    reachMarginMeters: plan.recommended?.reachMarginMeters ?? null,
    movementDemandMeters: guidance.available
      ? guidance.movementDistanceMeters
      : null,
    footwork: guidance.label,
  });
}

export function runAllHandballInterceptBenchmarks(overridesById = {}) {
  return Object.freeze(
    Object.fromEntries(
      Object.values(HANDBALL_INTERCEPT_BENCHMARKS).map((scenario) => [
        scenario.id,
        runHandballInterceptBenchmark(scenario, overridesById[scenario.id] ?? {}),
      ]),
    ),
  );
}
