import { findReachableInterceptWindow } from '../../sim/interception.js';
import { predictTrajectory } from '../../sim/trajectory.js';
import { ONE_WALL_HANDBALL_PHYSICS } from './physics-profile.js';

export const HANDBALL_PLAYER_MOVEMENT = Object.freeze({
  free: Object.freeze({
    id: 'handball-free',
    maxSpeed: 3.95,
    responseRate: 22,
  }),
  prepared: Object.freeze({
    id: 'handball-prepared',
    maxSpeed: 2.25,
    responseRate: 15,
  }),
});

export const HANDBALL_CONTACT_ENVELOPE = Object.freeze({
  reachRadius: 0.78,
  minHeight: 0.28,
  maxHeight: 1.8,
  preferredHeight: 0.92,
  preferredLeadTime: 0.46,
  predictionHorizon: 1.8,
});

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function finiteNonNegative(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function resolveHandballMovementProfile(preparing = false, override = null) {
  const canonical = preparing
    ? HANDBALL_PLAYER_MOVEMENT.prepared
    : HANDBALL_PLAYER_MOVEMENT.free;

  if (!override) return canonical;

  return Object.freeze({
    id: String(override.id ?? `${canonical.id}-override`),
    maxSpeed: finiteNonNegative(override.maxSpeed, canonical.maxSpeed),
    responseRate: finiteNonNegative(override.responseRate, canonical.responseRate),
  });
}

function firstReturnTime(trajectory, ballState) {
  if ((ballState?.velocity?.z ?? 0) > 0.2) return 0;

  for (const sample of trajectory.samples) {
    const wallContact = sample.events.some(
      (event) => event.type === 'contact' && event.contact?.kind === 'wall',
    );
    if (wallContact || sample.velocity.z > 0.2) return sample.time;
  }

  return Infinity;
}

function candidateScore(candidate, envelope) {
  const heightScore = clamp01(
    1 - Math.abs(candidate.position.y - envelope.preferredHeight) / 0.9,
  );
  const marginScore = clamp01(candidate.reachMarginMeters / 0.85);
  const timingScore = clamp01(
    1 - Math.abs(candidate.time - envelope.preferredLeadTime) / 0.75,
  );

  return heightScore * 0.45 + marginScore * 0.35 + timingScore * 0.2;
}

function recommendedCandidate(window, envelope) {
  let recommended = null;
  let bestScore = -Infinity;

  for (const candidate of window.candidates) {
    const score = candidateScore(candidate, envelope);
    if (score > bestScore) {
      recommended = candidate;
      bestScore = score;
    }
  }

  return recommended
    ? Object.freeze({ ...recommended, score: bestScore })
    : null;
}

function cueForPlan(recommended, preparing) {
  if (!recommended) return 'recover';
  if (recommended.time <= 0.16) return 'strike';
  if (preparing) return 'hold';
  if (recommended.time <= 0.52) return 'prepare';
  return 'move';
}

export function planHandballIntercept({
  ball,
  player,
  preparing = false,
  reactionTime = 0,
  horizon = HANDBALL_CONTACT_ENVELOPE.predictionHorizon,
  coefficients = {},
  physicsProfile = ONE_WALL_HANDBALL_PHYSICS,
  envelope = HANDBALL_CONTACT_ENVELOPE,
  movementProfile = null,
} = {}) {
  const movement = resolveHandballMovementProfile(preparing, movementProfile);

  if (!ball?.active) {
    return Object.freeze({
      reachable: false,
      cue: 'recover',
      returnStartTime: null,
      trajectory: null,
      window: null,
      recommended: null,
      movementProfile: movement,
    });
  }

  const trajectory = predictTrajectory(ball, {
    duration: horizon,
    profile: physicsProfile,
    coefficients,
  });
  const returnStartTime = firstReturnTime(trajectory, ball);
  if (!Number.isFinite(returnStartTime)) {
    return Object.freeze({
      reachable: false,
      cue: 'recover',
      returnStartTime: null,
      trajectory,
      window: null,
      recommended: null,
      movementProfile: movement,
    });
  }

  const playerVelocity = player?.velocity ?? { x: 0, z: 0 };
  const initialSpeed = Math.hypot(playerVelocity.x ?? 0, playerVelocity.z ?? 0);
  const window = findReachableInterceptWindow(trajectory, {
    actorPosition: player?.position,
    reactionTime,
    initialSpeed,
    maxSpeed: movement.maxSpeed,
    responseRate: movement.responseRate,
    reachRadius: envelope.reachRadius,
    minHeight: envelope.minHeight,
    maxHeight: envelope.maxHeight,
    afterTime: returnStartTime,
  });
  const recommended = window.reachable
    ? recommendedCandidate(window, envelope)
    : null;

  return Object.freeze({
    reachable: window.reachable,
    cue: cueForPlan(recommended, preparing),
    returnStartTime,
    trajectory,
    window,
    recommended,
    movementProfile: movement,
  });
}
