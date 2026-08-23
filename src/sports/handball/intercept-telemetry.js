const CUES = Object.freeze(['recover', 'move', 'prepare', 'hold', 'strike']);

function cueCounts() {
  return Object.freeze(Object.fromEntries(CUES.map((cue) => [cue, 0])));
}

function incrementCue(counts, cue) {
  if (!CUES.includes(cue)) return counts;
  return Object.freeze({ ...counts, [cue]: counts[cue] + 1 });
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function createInterceptTelemetry() {
  return Object.freeze({
    schemaVersion: 1,
    samples: 0,
    visibleSamples: 0,
    reachableSamples: 0,
    suppressedCueSamples: 0,
    transitions: 0,
    strikeEntries: 0,
    movementDemandSumMeters: 0,
    movementDemandMaxMeters: 0,
    etaSumSeconds: 0,
    etaSamples: 0,
    reachMarginSumMeters: 0,
    reachMarginSamples: 0,
    cueCounts: cueCounts(),
    rawCueCounts: cueCounts(),
    lastCue: null,
    lastRawCue: null,
    lastVisible: false,
  });
}

export function recordInterceptTelemetry(previous, sample = {}) {
  const state = previous ?? createInterceptTelemetry();
  const visible = Boolean(sample.visible);
  const cue = sample.cue ?? null;
  const rawCue = sample.rawCue ?? null;
  const recommended = sample.plan?.recommended ?? null;
  const movementDemand = sample.footwork?.available
    ? Math.max(0, finite(sample.footwork.movementDistanceMeters))
    : 0;
  const reachable = Boolean(sample.plan?.reachable);
  const suppressed = visible && cue && rawCue && cue !== rawCue;
  const transition = visible && state.lastVisible && cue && state.lastCue && cue !== state.lastCue;
  const strikeEntry = visible && cue === 'strike' && (!state.lastVisible || state.lastCue !== 'strike');
  const eta = recommended ? finite(recommended.time, NaN) : NaN;
  const margin = recommended ? finite(recommended.reachMarginMeters, NaN) : NaN;

  return Object.freeze({
    schemaVersion: 1,
    samples: state.samples + 1,
    visibleSamples: state.visibleSamples + (visible ? 1 : 0),
    reachableSamples: state.reachableSamples + (visible && reachable ? 1 : 0),
    suppressedCueSamples: state.suppressedCueSamples + (suppressed ? 1 : 0),
    transitions: state.transitions + (transition ? 1 : 0),
    strikeEntries: state.strikeEntries + (strikeEntry ? 1 : 0),
    movementDemandSumMeters: state.movementDemandSumMeters + (visible ? movementDemand : 0),
    movementDemandMaxMeters: Math.max(state.movementDemandMaxMeters, visible ? movementDemand : 0),
    etaSumSeconds: state.etaSumSeconds + (visible && Number.isFinite(eta) ? eta : 0),
    etaSamples: state.etaSamples + (visible && Number.isFinite(eta) ? 1 : 0),
    reachMarginSumMeters: state.reachMarginSumMeters + (visible && Number.isFinite(margin) ? margin : 0),
    reachMarginSamples: state.reachMarginSamples + (visible && Number.isFinite(margin) ? 1 : 0),
    cueCounts: visible ? incrementCue(state.cueCounts, cue) : state.cueCounts,
    rawCueCounts: visible ? incrementCue(state.rawCueCounts, rawCue) : state.rawCueCounts,
    lastCue: visible ? cue : null,
    lastRawCue: visible ? rawCue : null,
    lastVisible: visible,
  });
}

function average(sum, count) {
  return count > 0 ? sum / count : 0;
}

export function summarizeInterceptTelemetry(state = createInterceptTelemetry()) {
  return Object.freeze({
    schemaVersion: state.schemaVersion,
    samples: state.samples,
    visibleSamples: state.visibleSamples,
    reachableRate: state.visibleSamples > 0
      ? state.reachableSamples / state.visibleSamples
      : 0,
    cueSuppressionRate: state.visibleSamples > 0
      ? state.suppressedCueSamples / state.visibleSamples
      : 0,
    transitions: state.transitions,
    strikeEntries: state.strikeEntries,
    averageMovementDemandMeters: average(
      state.movementDemandSumMeters,
      state.visibleSamples,
    ),
    maxMovementDemandMeters: state.movementDemandMaxMeters,
    averageEtaSeconds: average(state.etaSumSeconds, state.etaSamples),
    averageReachMarginMeters: average(
      state.reachMarginSumMeters,
      state.reachMarginSamples,
    ),
    cueCounts: state.cueCounts,
    rawCueCounts: state.rawCueCounts,
  });
}
