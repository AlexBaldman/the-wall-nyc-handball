import { normalize, scale, subtract } from '../../sim/ballistics.js';

export const HANDBALL_HAND_ASSIST = Object.freeze({
  travelDistance: 1.28,
  approachFraction: 0.5,
  maxContactTimeError: 0.18,
  maxOffset: Object.freeze({
    x: 0.22,
    y: 0.28,
    z: 0.42,
  }),
});

function cloneVector(vector = {}) {
  return {
    x: Number.isFinite(vector.x) ? vector.x : 0,
    y: Number.isFinite(vector.y) ? vector.y : 0,
    z: Number.isFinite(vector.z) ? vector.z : 0,
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function closestContactCandidate(interceptPlan, desiredContactTime, maxTimeError) {
  const candidates = interceptPlan?.window?.candidates ?? [];
  if (!interceptPlan?.reachable || candidates.length === 0) return null;

  let closest = null;
  let closestError = Infinity;
  for (const candidate of candidates) {
    const error = Math.abs(candidate.time - desiredContactTime);
    if (error < closestError) {
      closest = candidate;
      closestError = error;
    }
  }

  if (!closest || closestError > maxTimeError) return null;
  return { candidate: closest, timeError: closestError };
}

export function planHandStartAssist({
  interceptPlan,
  preparedStart,
  wallTarget,
  desiredContactTime,
  config = HANDBALL_HAND_ASSIST,
} = {}) {
  const restingStart = cloneVector(preparedStart);
  const target = cloneVector(wallTarget);
  const contactTime = Number.isFinite(desiredContactTime)
    ? Math.max(0, desiredContactTime)
    : 0;
  const match = closestContactCandidate(
    interceptPlan,
    contactTime,
    config.maxContactTimeError,
  );

  if (!match) {
    return Object.freeze({
      assisted: false,
      start: Object.freeze(restingStart),
      contactPoint: null,
      desiredContactTime: contactTime,
      contactTimeError: null,
      direction: Object.freeze(normalize(
        subtract(target, restingStart),
        { x: 0, y: 0, z: -1 },
      )),
    });
  }

  const contactPoint = cloneVector(match.candidate.position);
  const direction = normalize(
    subtract(target, contactPoint),
    { x: 0, y: 0, z: -1 },
  );
  const desiredStart = subtract(
    contactPoint,
    scale(direction, config.travelDistance * config.approachFraction),
  );
  const maxOffset = config.maxOffset;
  const start = {
    x: restingStart.x + clamp(
      desiredStart.x - restingStart.x,
      -maxOffset.x,
      maxOffset.x,
    ),
    y: restingStart.y + clamp(
      desiredStart.y - restingStart.y,
      -maxOffset.y,
      maxOffset.y,
    ),
    z: restingStart.z + clamp(
      desiredStart.z - restingStart.z,
      -maxOffset.z,
      maxOffset.z,
    ),
  };

  return Object.freeze({
    assisted: true,
    start: Object.freeze(start),
    contactPoint: Object.freeze(contactPoint),
    desiredContactTime: contactTime,
    contactTimeError: match.timeError,
    direction: Object.freeze(direction),
    reachMarginMeters: match.candidate.reachMarginMeters,
  });
}
