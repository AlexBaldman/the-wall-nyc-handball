import { DEFAULT_PHYSICS_PROFILE, stepBall } from './ballistics.js';
import { createBallState } from './types.js';

function cloneVector(vector = {}) {
  return {
    x: Number.isFinite(vector.x) ? vector.x : 0,
    y: Number.isFinite(vector.y) ? vector.y : 0,
    z: Number.isFinite(vector.z) ? vector.z : 0,
  };
}

function snapshotSample(ball, time, events = []) {
  return Object.freeze({
    time,
    active: Boolean(ball.active),
    position: Object.freeze(cloneVector(ball.position)),
    velocity: Object.freeze(cloneVector(ball.velocity)),
    angularVelocity: Object.freeze(cloneVector(ball.angularVelocity)),
    floorBounces: ball.floorBounces,
    wallContacts: ball.wallContacts,
    events: Object.freeze(events.map((event) => ({ ...event }))),
  });
}

export function predictTrajectory(ballState, {
  duration = 1,
  stepSeconds,
  profile = DEFAULT_PHYSICS_PROFILE,
  coefficients = {},
  tick = 0,
  includeInitial = true,
} = {}) {
  const physicsStep = stepSeconds ?? (1 / profile.physics.solverHz);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error('Trajectory duration must be a non-negative finite number.');
  }
  if (!Number.isFinite(physicsStep) || physicsStep <= 0) {
    throw new Error('Trajectory stepSeconds must be a positive finite number.');
  }

  const ball = createBallState(ballState);
  const samples = [];
  const events = [];
  let elapsed = 0;
  let stepIndex = 0;

  if (includeInitial) samples.push(snapshotSample(ball, 0));

  while (elapsed < duration && ball.active) {
    const dt = Math.min(physicsStep, duration - elapsed);
    const stepEvents = stepBall(ball, dt, {
      tick: tick + stepIndex,
      coefficients,
      profile,
    });
    elapsed += dt;
    stepIndex += 1;
    events.push(...stepEvents);
    samples.push(snapshotSample(ball, elapsed, stepEvents));
  }

  return Object.freeze({
    duration: elapsed,
    requestedDuration: duration,
    stepSeconds: physicsStep,
    samples: Object.freeze(samples),
    events: Object.freeze(events.map((event) => ({ ...event }))),
    finalState: createBallState(ball),
  });
}

function crossingDirection(previousValue, currentValue, target) {
  if (previousValue < target && currentValue >= target) return 1;
  if (previousValue > target && currentValue <= target) return -1;
  if (previousValue === target && currentValue !== target) {
    return currentValue > target ? 1 : -1;
  }
  return 0;
}

function interpolateVector(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function findTrajectoryCrossing(trajectory, {
  axis = 'z',
  value,
  direction = 0,
  afterTime = 0,
} = {}) {
  if (!['x', 'y', 'z'].includes(axis)) {
    throw new Error(`Unsupported crossing axis: ${axis}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error('Trajectory crossing value must be finite.');
  }
  if (![0, -1, 1].includes(direction)) {
    throw new Error('Trajectory crossing direction must be -1, 0, or 1.');
  }

  const samples = trajectory?.samples ?? [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (current.time < afterTime) continue;

    const previousValue = previous.position[axis];
    const currentValue = current.position[axis];
    const actualDirection = crossingDirection(previousValue, currentValue, value);
    if (actualDirection === 0 || (direction !== 0 && direction !== actualDirection)) continue;

    const denominator = currentValue - previousValue;
    const fraction = denominator === 0
      ? 0
      : Math.max(0, Math.min(1, (value - previousValue) / denominator));

    return Object.freeze({
      axis,
      value,
      direction: actualDirection,
      time: previous.time + (current.time - previous.time) * fraction,
      position: Object.freeze(interpolateVector(previous.position, current.position, fraction)),
      velocity: Object.freeze(interpolateVector(previous.velocity, current.velocity, fraction)),
      sampleIndex: index,
    });
  }

  return null;
}
