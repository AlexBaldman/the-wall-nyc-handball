export const SIMULATION_SCHEMA_VERSION = 1;
export const PHYSICS_VERSION = 'ballistics-core-0.1.0';

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function vec3(value = {}) {
  return {
    x: finiteNumber(value.x),
    y: finiteNumber(value.y),
    z: finiteNumber(value.z),
  };
}

export function createPlayerCommand(overrides = {}) {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    controllerId: String(overrides.controllerId ?? 'player'),
    tick: Math.max(0, Math.trunc(finiteNumber(overrides.tick))),
    sequence: Math.max(0, Math.trunc(finiteNumber(overrides.sequence))),
    move: {
      x: Math.max(-1, Math.min(1, finiteNumber(overrides.move?.x))),
      z: Math.max(-1, Math.min(1, finiteNumber(overrides.move?.z))),
    },
    aim: {
      x: Math.max(-1, Math.min(1, finiteNumber(overrides.aim?.x))),
      y: Math.max(-1, Math.min(1, finiteNumber(overrides.aim?.y))),
    },
    contact: overrides.contact ?? null,
    phase: overrides.phase ?? 'none',
    modifiers: {
      english: Math.max(-1, Math.min(1, finiteNumber(overrides.modifiers?.english))),
      lift: Boolean(overrides.modifiers?.lift),
      drive: Boolean(overrides.modifiers?.drive),
    },
    charge: Math.max(0, Math.min(1, finiteNumber(overrides.charge))),
  };
}

export function createBallState(overrides = {}) {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    physicsVersion: PHYSICS_VERSION,
    active: overrides.active ?? true,
    position: vec3(overrides.position),
    previousPosition: vec3(overrides.previousPosition ?? overrides.position),
    velocity: vec3(overrides.velocity),
    angularVelocity: vec3(overrides.angularVelocity),
    floorBounces: Math.max(0, Math.trunc(finiteNumber(overrides.floorBounces))),
    wallContacts: Math.max(0, Math.trunc(finiteNumber(overrides.wallContacts))),
    lastContactId: overrides.lastContactId ?? null,
  };
}

export function createContactRecord(overrides = {}) {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    physicsVersion: PHYSICS_VERSION,
    id: String(overrides.id ?? ''),
    tick: Math.max(0, Math.trunc(finiteNumber(overrides.tick))),
    kind: String(overrides.kind ?? 'unknown'),
    position: vec3(overrides.position),
    normal: vec3(overrides.normal),
    incomingVelocity: vec3(overrides.incomingVelocity),
    outgoingVelocity: vec3(overrides.outgoingVelocity),
    incomingSpin: vec3(overrides.incomingSpin),
    outgoingSpin: vec3(overrides.outgoingSpin),
    technique: overrides.technique ?? null,
    charge: Math.max(0, Math.min(1, finiteNumber(overrides.charge))),
    metadata: { ...(overrides.metadata ?? {}) },
  };
}

export function createSimulationSnapshot(overrides = {}) {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    physicsVersion: PHYSICS_VERSION,
    tick: Math.max(0, Math.trunc(finiteNumber(overrides.tick))),
    simulationTime: Math.max(0, finiteNumber(overrides.simulationTime)),
    seed: (finiteNumber(overrides.seed, 1) >>> 0) || 1,
    courtId: String(overrides.courtId ?? 'one-wall-regulation'),
    player: {
      position: vec3(overrides.player?.position),
      velocity: vec3(overrides.player?.velocity),
      facing: finiteNumber(overrides.player?.facing),
      preparation: Math.max(0, Math.min(1, finiteNumber(overrides.player?.preparation))),
      contact: overrides.player?.contact ?? null,
    },
    opponent: overrides.opponent
      ? {
          position: vec3(overrides.opponent.position),
          velocity: vec3(overrides.opponent.velocity),
          facing: finiteNumber(overrides.opponent.facing),
          preparation: Math.max(0, Math.min(1, finiteNumber(overrides.opponent.preparation))),
          contact: overrides.opponent.contact ?? null,
        }
      : null,
    opponentHand: overrides.opponentHand
      ? {
          position: vec3(overrides.opponentHand.position),
          velocity: vec3(overrides.opponentHand.velocity),
          radius: Math.max(0, finiteNumber(overrides.opponentHand.radius, 0.105)),
          active: Boolean(overrides.opponentHand.active),
        }
      : null,
    hand: {
      position: vec3(overrides.hand?.position),
      velocity: vec3(overrides.hand?.velocity),
      radius: Math.max(0, finiteNumber(overrides.hand?.radius, 0.105)),
      active: Boolean(overrides.hand?.active),
    },
    ball: createBallState(overrides.ball),
    events: (overrides.events ?? []).map((event) => ({ ...event })),
  };
}

export function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

export function assertSimulationSnapshot(snapshot) {
  if (snapshot?.schemaVersion !== SIMULATION_SCHEMA_VERSION) {
    throw new Error(`Unsupported simulation schema: ${snapshot?.schemaVersion}`);
  }
  if (snapshot.physicsVersion !== PHYSICS_VERSION) {
    throw new Error(`Unsupported physics version: ${snapshot.physicsVersion}`);
  }

  const vectors = [
    snapshot.player?.position,
    snapshot.player?.velocity,
    snapshot.hand?.position,
    snapshot.hand?.velocity,
    snapshot.ball?.position,
    snapshot.ball?.velocity,
    snapshot.ball?.angularVelocity,
    ...(snapshot.opponent
      ? [snapshot.opponent.position, snapshot.opponent.velocity]
      : []),
    ...(snapshot.opponentHand
      ? [snapshot.opponentHand.position, snapshot.opponentHand.velocity]
      : []),
  ];
  if (vectors.some((vector) => !vector || !['x', 'y', 'z'].every((axis) => Number.isFinite(vector[axis])))) {
    throw new Error('Simulation snapshot contains a non-finite vector.');
  }

  return true;
}
