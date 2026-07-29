const PROFILES = {
  rookie: {
    id: 'rookie',
    name: 'Rookie Ghost',
    title: 'The Park Learner',
    description: 'Reads late, plays safe, and leaves the corners open.',
    observationDelayMs: 168,
    observationIntervalTicks: 9,
    positionNoise: { x: 0.07, y: 0.05, z: 0.08 },
    velocityNoise: { x: 0.16, y: 0.2, z: 0.22 },
    spinNoise: 4.2,
    moveSpeed: 3.05,
    preparedMoveSpeed: 1.95,
    acceleration: 15,
    preparedAcceleration: 10,
    prepareEta: 0.58,
    releaseEta: 0.045,
    aimError: 0.5,
    english: 0.14,
    aggression: 0.08,
    recoveryDepth: 8.65,
  },
  regular: {
    id: 'regular',
    name: 'Wall Ghost',
    title: 'The Counterpuncher',
    description: 'Reads your position, redirects pace, and shades the open wall.',
    observationDelayMs: 96,
    observationIntervalTicks: 6,
    positionNoise: { x: 0.025, y: 0.018, z: 0.03 },
    velocityNoise: { x: 0.06, y: 0.08, z: 0.08 },
    spinNoise: 1.5,
    moveSpeed: 3.65,
    preparedMoveSpeed: 2.35,
    acceleration: 20,
    preparedAcceleration: 14,
    prepareEta: 0.72,
    releaseEta: 0.075,
    aimError: 0.32,
    english: 0.32,
    aggression: 0.36,
    recoveryDepth: 8.25,
  },
  champion: {
    id: 'champion',
    name: 'King Ghost',
    title: 'The Corner Taker',
    description: 'Sees early, closes space, and attacks every loose bounce.',
    observationDelayMs: 58,
    observationIntervalTicks: 4,
    positionNoise: { x: 0.012, y: 0.01, z: 0.014 },
    velocityNoise: { x: 0.03, y: 0.04, z: 0.04 },
    spinNoise: 0.7,
    moveSpeed: 4.18,
    preparedMoveSpeed: 2.72,
    acceleration: 24,
    preparedAcceleration: 17,
    prepareEta: 0.84,
    releaseEta: 0.095,
    aimError: 0.16,
    english: 0.46,
    aggression: 0.72,
    recoveryDepth: 7.95,
  },
};

function deepFreeze(value) {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') deepFreeze(nested);
  }
  return Object.freeze(value);
}

export const GHOST_PROFILES = Object.freeze(
  Object.fromEntries(
    Object.entries(PROFILES).map(([id, profile]) => [id, deepFreeze(profile)]),
  ),
);

export function getGhostProfile(id = 'regular') {
  return GHOST_PROFILES[id] ?? GHOST_PROFILES.regular;
}

export function observationDelayTicks(profile, simulationHz) {
  return Math.max(1, Math.round(getGhostProfile(profile?.id).observationDelayMs / 1000 * simulationHz));
}

export function createGhostObservation({
  profile,
  ball,
  tick,
  simulationHz,
  signedRandom,
}) {
  const activeProfile = getGhostProfile(profile?.id);
  const random = typeof signedRandom === 'function' ? signedRandom : () => 0;
  const deliveredTick = tick + observationDelayTicks(activeProfile, simulationHz);
  if (!ball) {
    return {
      active: false,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      sourceTick: tick,
      deliveredTick,
    };
  }
  return {
    active: Boolean(ball.active),
    position: {
      x: ball.position.x + random(activeProfile.positionNoise.x),
      y: Math.max(0, ball.position.y + random(activeProfile.positionNoise.y)),
      z: ball.position.z + random(activeProfile.positionNoise.z),
    },
    velocity: {
      x: ball.velocity.x + random(activeProfile.velocityNoise.x),
      y: ball.velocity.y + random(activeProfile.velocityNoise.y),
      z: ball.velocity.z + random(activeProfile.velocityNoise.z),
    },
    angularVelocity: {
      x: ball.angularVelocity.x + random(activeProfile.spinNoise),
      y: ball.angularVelocity.y + random(activeProfile.spinNoise),
      z: ball.angularVelocity.z + random(activeProfile.spinNoise),
    },
    sourceTick: tick,
    deliveredTick,
  };
}

export function chooseGhostTechnique(profile, {
  perceivedHeight = 1,
  rallyContacts = 0,
  random = 0.5,
} = {}) {
  const activeProfile = getGhostProfile(profile?.id);
  if (perceivedHeight < 0.52) return 'backspin';
  if (
    rallyContacts >= 3
    && random < activeProfile.aggression
  ) {
    return perceivedHeight > 1.15 && random < activeProfile.aggression * 0.42
      ? 'fist'
      : 'topspin';
  }
  if (activeProfile.id === 'rookie' && random > 0.82) return 'backspin';
  return 'palm';
}

export function ghostAim(profile, {
  playerX = 0,
  halfWidth,
  signedRandom,
}) {
  const activeProfile = getGhostProfile(profile?.id);
  const random = typeof signedRandom === 'function' ? signedRandom : () => 0;
  const raw = -playerX * (0.42 + activeProfile.aggression * 0.16)
    + random(activeProfile.aimError);
  return Math.max(-halfWidth, Math.min(halfWidth, raw));
}
