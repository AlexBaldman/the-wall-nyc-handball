function finiteNonNegative(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function reachableTravelDistance({
  time,
  reactionTime = 0,
  initialSpeed = 0,
  maxSpeed,
  acceleration,
} = {}) {
  const availableTime = Math.max(
    0,
    finiteNonNegative(time) - finiteNonNegative(reactionTime),
  );
  const topSpeed = finiteNonNegative(maxSpeed);
  const accel = finiteNonNegative(acceleration);
  const startingSpeed = Math.min(topSpeed, finiteNonNegative(initialSpeed));

  if (availableTime === 0 || topSpeed === 0) return 0;
  if (accel === 0 || startingSpeed >= topSpeed) {
    return startingSpeed * availableTime;
  }

  const timeToTopSpeed = (topSpeed - startingSpeed) / accel;
  if (availableTime <= timeToTopSpeed) {
    return startingSpeed * availableTime + 0.5 * accel * availableTime * availableTime;
  }

  const accelerationDistance = (
    startingSpeed * timeToTopSpeed
    + 0.5 * accel * timeToTopSpeed * timeToTopSpeed
  );
  return accelerationDistance + topSpeed * (availableTime - timeToTopSpeed);
}

export function reachableTravelDistanceExponential({
  time,
  reactionTime = 0,
  initialSpeed = 0,
  maxSpeed,
  responseRate,
} = {}) {
  const availableTime = Math.max(
    0,
    finiteNonNegative(time) - finiteNonNegative(reactionTime),
  );
  const topSpeed = finiteNonNegative(maxSpeed);
  const rate = finiteNonNegative(responseRate);
  const startingSpeed = Math.min(topSpeed, finiteNonNegative(initialSpeed));

  if (availableTime === 0 || topSpeed === 0) return 0;
  if (rate === 0 || startingSpeed >= topSpeed) {
    return startingSpeed * availableTime;
  }

  return (
    topSpeed * availableTime
    + (startingSpeed - topSpeed) * (1 - Math.exp(-rate * availableTime)) / rate
  );
}

function horizontalDistance(a = {}, b = {}) {
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.z ?? 0) - (b.z ?? 0));
}

function movementBudgetAtTime(time, options) {
  if (options.responseRate > 0) {
    return reachableTravelDistanceExponential({
      time,
      reactionTime: options.reactionTime,
      initialSpeed: options.initialSpeed,
      maxSpeed: options.maxSpeed,
      responseRate: options.responseRate,
    });
  }

  return reachableTravelDistance({
    time,
    reactionTime: options.reactionTime,
    initialSpeed: options.initialSpeed,
    maxSpeed: options.maxSpeed,
    acceleration: options.acceleration,
  });
}

function candidateForSample(sample, options) {
  const centerDistance = horizontalDistance(options.actorPosition, sample.position);
  const movementBudget = movementBudgetAtTime(sample.time, options);
  const requiredTravel = Math.max(0, centerDistance - options.reachRadius);
  const margin = movementBudget - requiredTravel;

  return Object.freeze({
    time: sample.time,
    position: sample.position,
    velocity: sample.velocity,
    centerDistanceMeters: centerDistance,
    requiredTravelMeters: requiredTravel,
    movementBudgetMeters: movementBudget,
    reachMarginMeters: margin,
    sample,
  });
}

export function findReachableInterceptWindow(trajectory, {
  actorPosition = { x: 0, y: 0, z: 0 },
  reactionTime = 0,
  initialSpeed = 0,
  maxSpeed = 0,
  acceleration = 0,
  responseRate = 0,
  reachRadius = 0,
  minHeight = -Infinity,
  maxHeight = Infinity,
  afterTime = 0,
  beforeTime = Infinity,
} = {}) {
  const options = {
    actorPosition,
    reactionTime: finiteNonNegative(reactionTime),
    initialSpeed: finiteNonNegative(initialSpeed),
    maxSpeed: finiteNonNegative(maxSpeed),
    acceleration: finiteNonNegative(acceleration),
    responseRate: finiteNonNegative(responseRate),
    reachRadius: finiteNonNegative(reachRadius),
  };
  const candidates = [];

  for (const sample of trajectory?.samples ?? []) {
    if (!sample.active) continue;
    if (sample.time < afterTime || sample.time > beforeTime) continue;
    if (sample.position.y < minHeight || sample.position.y > maxHeight) continue;

    const candidate = candidateForSample(sample, options);
    if (candidate.reachMarginMeters >= 0) candidates.push(candidate);
  }

  if (candidates.length === 0) {
    return Object.freeze({
      reachable: false,
      earliest: null,
      latest: null,
      best: null,
      candidates: Object.freeze([]),
    });
  }

  let best = candidates[0];
  for (const candidate of candidates.slice(1)) {
    if (candidate.reachMarginMeters > best.reachMarginMeters) best = candidate;
  }

  return Object.freeze({
    reachable: true,
    earliest: candidates[0],
    latest: candidates[candidates.length - 1],
    best,
    candidates: Object.freeze(candidates),
  });
}
