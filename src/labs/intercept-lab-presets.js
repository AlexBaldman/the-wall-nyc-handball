import { HANDBALL_INTERCEPT_BENCHMARKS } from '../sports/handball/intercept-benchmarks.js';

export const INTERCEPT_LAB_PRESETS = Object.freeze({
  custom: Object.freeze({ id: 'custom', label: 'Custom', benchmark: null }),
  centerReturn: Object.freeze({ id: 'center-return', label: 'Center Return', benchmark: HANDBALL_INTERCEPT_BENCHMARKS.centerReturn }),
  wallBound: Object.freeze({ id: 'wall-bound', label: 'Wall-Bound Read', benchmark: HANDBALL_INTERCEPT_BENCHMARKS.wallBound }),
  wideReturn: Object.freeze({ id: 'wide-return', label: 'Wide Recovery', benchmark: HANDBALL_INTERCEPT_BENCHMARKS.wideReturn }),
});

const PRESET_BY_ID = Object.freeze(
  Object.fromEntries(Object.values(INTERCEPT_LAB_PRESETS).map((preset) => [preset.id, preset])),
);

export function getInterceptLabPreset(id) {
  return PRESET_BY_ID[id] ?? INTERCEPT_LAB_PRESETS.custom;
}

export function benchmarkScenario(preset) {
  const benchmark = typeof preset === 'string'
    ? getInterceptLabPreset(preset).benchmark
    : preset?.benchmark;
  if (!benchmark) return null;
  return {
    player: {
      position: { ...benchmark.player.position },
      velocity: { ...benchmark.player.velocity },
    },
    ball: {
      active: true,
      position: { ...benchmark.ball.position },
      velocity: { ...benchmark.ball.velocity },
      angularVelocity: { ...benchmark.ball.angularVelocity },
    },
    preparing: benchmark.preparing,
    horizon: benchmark.horizon,
  };
}

export function presetControlValues(preset) {
  const scenario = benchmarkScenario(preset);
  if (!scenario) return null;
  return Object.freeze({
    playerX: scenario.player.position.x,
    playerZ: scenario.player.position.z,
    ballX: scenario.ball.position.x,
    ballY: scenario.ball.position.y,
    prepared: scenario.preparing,
  });
}
