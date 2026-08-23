import { BALL, COURT, MATERIAL, PHYSICS, isInsideCourt } from './court.js';
import { createContactRecord, vec3 } from './types.js';

const EPSILON = 1e-8;

export const DEFAULT_PHYSICS_PROFILE = Object.freeze({
  ball: BALL,
  court: COURT,
  material: MATERIAL,
  physics: PHYSICS,
});

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(vector, scalar) {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function magnitude(vector) {
  return Math.sqrt(dot(vector, vector));
}

export function normalize(vector, fallback = { x: 0, y: 1, z: 0 }) {
  const length = magnitude(vector);
  return length > EPSILON ? scale(vector, 1 / length) : vec3(fallback);
}

function cloneVector(vector) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function profileParts(profile = DEFAULT_PHYSICS_PROFILE) {
  return {
    ball: profile.ball ?? BALL,
    court: profile.court ?? COURT,
    material: profile.material ?? MATERIAL,
    physics: profile.physics ?? PHYSICS,
  };
}

export function accelerationFor(ball, coefficients = {}, profile = DEFAULT_PHYSICS_PROFILE) {
  const { ball: ballProfile, physics } = profileParts(profile);
  const gravity = coefficients.gravity ?? physics.gravity;
  const dragScale = coefficients.dragScale ?? 1;
  const magnusScale = coefficients.magnusScale ?? 1;
  const speed = magnitude(ball.velocity);
  const area = Math.PI * ballProfile.radius * ballProfile.radius;
  const dragK = (
    0.5
    * physics.airDensity
    * physics.dragCoefficient
    * area
    / ballProfile.mass
  ) * dragScale;
  const drag = scale(ball.velocity, -dragK * speed);
  const magnus = scale(
    cross(ball.angularVelocity, ball.velocity),
    physics.magnusCoefficient * magnusScale,
  );

  return {
    x: drag.x + magnus.x,
    y: -gravity + drag.y + magnus.y,
    z: drag.z + magnus.z,
  };
}

function candidatePlaneHit(start, end, axis, plane, normal, kind) {
  const delta = end[axis] - start[axis];
  if (Math.abs(delta) < EPSILON) return null;
  const time = (plane - start[axis]) / delta;
  if (time < -EPSILON || time > 1 + EPSILON) return null;
  if (dot({ x: axis === 'x' ? delta : 0, y: axis === 'y' ? delta : 0, z: axis === 'z' ? delta : 0 }, normal) >= 0) {
    return null;
  }
  return { time: Math.max(0, Math.min(1, time)), normal, kind };
}

function findEarliestEnvironmentHit(start, end, ballProfile = BALL) {
  const hits = [
    candidatePlaneHit(start, end, 'y', ballProfile.radius, { x: 0, y: 1, z: 0 }, 'floor'),
    candidatePlaneHit(start, end, 'z', ballProfile.radius, { x: 0, y: 0, z: 1 }, 'wall'),
  ].filter(Boolean);

  hits.sort((a, b) => a.time - b.time || (a.kind === 'wall' ? -1 : 1));
  return hits[0] ?? null;
}

export function resolveStaticPlaneContact(
  ball,
  normal,
  restitution,
  friction,
  ballProfile = BALL,
) {
  const incomingVelocity = cloneVector(ball.velocity);
  const incomingSpin = cloneVector(ball.angularVelocity);
  const normalSpeed = dot(ball.velocity, normal);
  if (normalSpeed >= 0) {
    return { incomingVelocity, incomingSpin };
  }

  ball.velocity = add(
    ball.velocity,
    scale(normal, -(1 + restitution) * normalSpeed),
  );

  const contactOffset = scale(normal, -ballProfile.radius);
  const surfaceVelocity = add(ball.velocity, cross(ball.angularVelocity, contactOffset));
  const tangentVelocity = subtract(surfaceVelocity, scale(normal, dot(surfaceVelocity, normal)));
  const tangentDelta = scale(tangentVelocity, -Math.max(0, Math.min(1, friction)));
  ball.velocity = add(ball.velocity, tangentDelta);

  const inertia = 0.4 * ballProfile.mass * ballProfile.radius * ballProfile.radius;
  const tangentImpulse = scale(tangentDelta, ballProfile.mass);
  ball.angularVelocity = add(
    ball.angularVelocity,
    scale(cross(contactOffset, tangentImpulse), 1 / inertia),
  );

  return { incomingVelocity, incomingSpin };
}

function integrateSegment(ball, seconds, acceleration) {
  ball.position = add(
    ball.position,
    add(scale(ball.velocity, seconds), scale(acceleration, 0.5 * seconds * seconds)),
  );
  ball.velocity = add(ball.velocity, scale(acceleration, seconds));
}

function createEnvironmentRecord(ball, context, hit, incoming, metadata = {}) {
  return createContactRecord({
    id: `${hit.kind}-${context.tick ?? 0}-${context.contactSequence ?? 0}`,
    tick: context.tick,
    kind: hit.kind,
    position: ball.position,
    normal: hit.normal,
    incomingVelocity: incoming.incomingVelocity,
    outgoingVelocity: ball.velocity,
    incomingSpin: incoming.incomingSpin,
    outgoingSpin: ball.angularVelocity,
    metadata,
  });
}

export function stepBall(ball, seconds, context = {}) {
  if (!ball.active || seconds <= 0) return [];

  const profile = profileParts(context.profile);
  const ballProfile = profile.ball;
  const court = profile.court;
  const material = profile.material;
  const physics = profile.physics;
  const events = [];
  ball.previousPosition = cloneVector(ball.position);
  let remaining = seconds;

  for (let iteration = 0; iteration < physics.maxCollisionIterations && remaining > EPSILON; iteration += 1) {
    const acceleration = accelerationFor(ball, context.coefficients, profile);
    const end = add(
      ball.position,
      add(scale(ball.velocity, remaining), scale(acceleration, 0.5 * remaining * remaining)),
    );
    const hit = findEarliestEnvironmentHit(ball.position, end, ballProfile);

    if (!hit) {
      integrateSegment(ball, remaining, acceleration);
      remaining = 0;
      break;
    }

    const travelSeconds = remaining * hit.time;
    integrateSegment(ball, travelSeconds, acceleration);
    remaining -= travelSeconds;

    if (hit.kind === 'wall') {
      const wallLive = (
        Math.abs(ball.position.x) <= court.halfWidth - ballProfile.radius
        && ball.position.y <= court.wallHeight - ballProfile.radius
      );
      if (!wallLive) {
        events.push({
          type: 'wall-out',
          tick: context.tick ?? 0,
          position: cloneVector(ball.position),
        });
        ball.active = false;
        break;
      }
    }

    const isCrack = (
      hit.kind === 'wall'
      && ball.position.y <= ballProfile.radius * 1.7
    );
    const restitution = isCrack
      ? material.crackRestitution
      : hit.kind === 'floor'
        ? (context.coefficients?.floorRestitution ?? material.floorRestitution)
        : (context.coefficients?.wallRestitution ?? material.wallRestitution);
    const friction = isCrack
      ? material.crackFriction
      : hit.kind === 'floor'
        ? (context.coefficients?.floorFriction ?? material.floorFriction)
        : (context.coefficients?.wallFriction ?? material.wallFriction);

    const incoming = resolveStaticPlaneContact(
      ball,
      hit.normal,
      restitution,
      friction,
      ballProfile,
    );
    if (hit.kind === 'floor') ball.floorBounces += 1;
    if (hit.kind === 'wall') ball.wallContacts += 1;
    const record = createEnvironmentRecord(ball, context, hit, incoming, {
      inBounds: hit.kind === 'floor'
        ? isInsideCourt(ball.position.x, ball.position.z, 0, court)
        : true,
      crack: isCrack,
      restitution,
      friction,
    });
    events.push({ type: 'contact', contact: record });
    ball.position = add(ball.position, scale(hit.normal, 1e-5));
    remaining = Math.max(0, remaining - 1e-6);
  }

  if (ball.position.y < ballProfile.radius) ball.position.y = ballProfile.radius;
  return events;
}

export function sweepMovingSpheres(
  ballStart,
  ballEnd,
  ballRadius,
  handStart,
  handEnd,
  handRadius,
) {
  const relativeStart = subtract(ballStart, handStart);
  const relativeDelta = subtract(
    subtract(ballEnd, ballStart),
    subtract(handEnd, handStart),
  );
  const radius = ballRadius + handRadius;
  const a = dot(relativeDelta, relativeDelta);
  const b = 2 * dot(relativeStart, relativeDelta);
  const c = dot(relativeStart, relativeStart) - radius * radius;

  if (c <= 0) return 0;
  if (a < EPSILON) return null;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  if (first >= 0 && first <= 1) return first;
  if (second >= 0 && second <= 1) return second;
  return null;
}

export function resolveHandContact(ball, hand, context = {}) {
  const { ball: ballProfile } = profileParts(context.profile);
  const time = sweepMovingSpheres(
    ball.previousPosition,
    ball.position,
    ballProfile.radius,
    hand.previousPosition,
    hand.position,
    hand.radius,
  );
  if (time === null) return null;

  const ballAtContact = add(
    ball.previousPosition,
    scale(subtract(ball.position, ball.previousPosition), time),
  );
  const handAtContact = add(
    hand.previousPosition,
    scale(subtract(hand.position, hand.previousPosition), time),
  );
  const geometricNormal = normalize(
    subtract(ballAtContact, handAtContact),
    { x: 0, y: 0, z: -1 },
  );
  const faceInfluence = Math.max(0, Math.min(0.82, context.faceInfluence ?? 0));
  const swingNormal = normalize(hand.velocity, geometricNormal);
  const normal = faceInfluence > 0
    ? normalize(
        add(
          scale(geometricNormal, 1 - faceInfluence),
          scale(swingNormal, faceInfluence),
        ),
        geometricNormal,
      )
    : geometricNormal;
  const incomingVelocity = cloneVector(ball.velocity);
  const incomingSpin = cloneVector(ball.angularVelocity);
  const relativeVelocity = subtract(ball.velocity, hand.velocity);
  const closingSpeed = dot(relativeVelocity, normal);
  if (closingSpeed >= -0.05) return null;

  const restitution = context.restitution ?? 0.94;
  ball.velocity = add(
    ball.velocity,
    scale(normal, -(1 + restitution) * closingSpeed),
  );

  const techniqueSpin = context.spinImpulse ?? { x: 0, y: 0, z: 0 };
  ball.angularVelocity = add(ball.angularVelocity, techniqueSpin);
  ball.position = add(ballAtContact, scale(normal, 1e-4));
  ball.lastContactId = context.id ?? `hand-${context.tick ?? 0}`;

  return createContactRecord({
    id: ball.lastContactId,
    tick: context.tick,
    kind: 'hand',
    position: ball.position,
    normal,
    incomingVelocity,
    outgoingVelocity: ball.velocity,
    incomingSpin,
    outgoingSpin: ball.angularVelocity,
    technique: context.technique,
    charge: context.charge,
    metadata: {
      handVelocity: cloneVector(hand.velocity),
      geometricNormal,
      faceInfluence,
      sweptTime: time,
      modifiers: { ...(context.modifiers ?? {}) },
      assist: vec3(context.assist),
    },
  });
}

export function calculateDropReboundHeight({
  profile = DEFAULT_PHYSICS_PROFILE,
  dropHeight,
  restitution,
  gravity,
} = {}) {
  const parts = profileParts(profile);
  const resolvedDropHeight = dropHeight ?? parts.ball.officialDropHeight;
  const resolvedRestitution = restitution ?? parts.material.floorRestitution;
  const resolvedGravity = gravity ?? parts.physics.gravity;
  const impactSpeed = Math.sqrt(
    2 * resolvedGravity * Math.max(0, resolvedDropHeight - parts.ball.radius),
  );
  const reboundSpeed = impactSpeed * resolvedRestitution;
  return parts.ball.radius + (reboundSpeed * reboundSpeed) / (2 * resolvedGravity);
}
