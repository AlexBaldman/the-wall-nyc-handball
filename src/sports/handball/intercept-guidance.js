const DEFAULT_CONFIRMATIONS = 2;
const POSITION_EPSILON = 1e-9;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clampNonNegative(value) {
  return Math.max(0, finite(value));
}

function freezeVector(vector) {
  return Object.freeze({
    x: finite(vector?.x),
    y: finite(vector?.y),
    z: finite(vector?.z),
  });
}

function movementLabel(delta, requiredTravelMeters) {
  if (requiredTravelMeters <= 0.08) return 'SET';

  const parts = [];
  if (Math.abs(delta.x) >= 0.12) parts.push(delta.x < 0 ? 'LEFT' : 'RIGHT');
  if (Math.abs(delta.z) >= 0.12) parts.push(delta.z < 0 ? 'STEP IN' : 'DROP BACK');
  return parts.length ? parts.join(' + ') : 'CLOSE';
}

export function deriveHandballFootworkGuidance(plan, playerPosition = {}) {
  const recommended = plan?.recommended;
  if (!recommended?.position) {
    return Object.freeze({
      available: false,
      label: 'RESET',
      movementDistanceMeters: 0,
      centerDistanceMeters: 0,
      targetPosition: null,
      delta: freezeVector(),
    });
  }

  const player = freezeVector(playerPosition);
  const contact = freezeVector(recommended.position);
  const dx = contact.x - player.x;
  const dz = contact.z - player.z;
  const centerDistanceMeters = Math.hypot(dx, dz);
  const requiredTravelMeters = Math.min(
    centerDistanceMeters,
    clampNonNegative(recommended.requiredTravelMeters),
  );
  const scale = centerDistanceMeters > POSITION_EPSILON
    ? requiredTravelMeters / centerDistanceMeters
    : 0;
  const delta = freezeVector({ x: dx * scale, y: 0, z: dz * scale });
  const targetPosition = freezeVector({
    x: player.x + delta.x,
    y: player.y,
    z: player.z + delta.z,
  });

  return Object.freeze({
    available: true,
    label: movementLabel(delta, requiredTravelMeters),
    movementDistanceMeters: requiredTravelMeters,
    centerDistanceMeters,
    targetPosition,
    delta,
  });
}

export function createCueStabilityState(cue = null) {
  return Object.freeze({
    displayCue: cue,
    pendingCue: null,
    pendingCount: 0,
  });
}

export function advanceCueStability(previous, nextCue, {
  visible = true,
  confirmations = DEFAULT_CONFIRMATIONS,
} = {}) {
  const prior = previous ?? createCueStabilityState();
  if (!visible || !nextCue) return createCueStabilityState();
  if (!prior.displayCue) return createCueStabilityState(nextCue);
  if (nextCue === prior.displayCue) return createCueStabilityState(prior.displayCue);

  // Strike windows are intentionally brief. Surface them immediately instead
  // of waiting for another 100 ms coaching sample and teaching the player late.
  if (nextCue === 'strike') return createCueStabilityState('strike');

  const required = Math.max(1, Math.trunc(finite(confirmations, DEFAULT_CONFIRMATIONS)));
  const pendingCount = prior.pendingCue === nextCue ? prior.pendingCount + 1 : 1;
  if (pendingCount >= required) return createCueStabilityState(nextCue);

  return Object.freeze({
    displayCue: prior.displayCue,
    pendingCue: nextCue,
    pendingCount,
  });
}
