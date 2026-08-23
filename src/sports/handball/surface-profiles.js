export const HANDBALL_SURFACES = Object.freeze({
  floor: Object.freeze({
    id: 'handball-court-floor',
    kind: 'floor',
    restitution: 0.852,
    friction: 0.19,
    metadata: Object.freeze({ crack: false }),
  }),
  wall: Object.freeze({
    id: 'handball-front-wall',
    kind: 'wall',
    restitution: 0.88,
    friction: 0.12,
    metadata: Object.freeze({ crack: false }),
  }),
  crack: Object.freeze({
    id: 'handball-wall-floor-crack',
    kind: 'seam',
    restitution: 0.22,
    friction: 0.34,
    metadata: Object.freeze({ crack: true }),
  }),
});

export const HANDBALL_CONTACT_ZONES = Object.freeze({
  wallFloorCrack: Object.freeze({
    id: 'front-wall-floor-seam',
    surfaceId: HANDBALL_SURFACES.crack.id,
    maxBallCenterHeightInRadii: 1.7,
  }),
});

function withLegacyCoefficientOverrides(surface, hitKind, coefficients = {}) {
  if (hitKind === 'floor') {
    return {
      ...surface,
      restitution: coefficients.floorRestitution ?? surface.restitution,
      friction: coefficients.floorFriction ?? surface.friction,
    };
  }

  if (hitKind === 'wall' && surface.id === HANDBALL_SURFACES.wall.id) {
    return {
      ...surface,
      restitution: coefficients.wallRestitution ?? surface.restitution,
      friction: coefficients.wallFriction ?? surface.friction,
    };
  }

  return surface;
}

export function resolveHandballSurface({
  hit,
  position,
  ballProfile,
  coefficients = {},
}) {
  if (hit.kind === 'floor') {
    return withLegacyCoefficientOverrides(HANDBALL_SURFACES.floor, hit.kind, coefficients);
  }

  if (hit.kind === 'wall') {
    const crackZone = HANDBALL_CONTACT_ZONES.wallFloorCrack;
    const inCrackZone = position.y <= (
      ballProfile.radius * crackZone.maxBallCenterHeightInRadii
    );
    const surface = inCrackZone ? HANDBALL_SURFACES.crack : HANDBALL_SURFACES.wall;
    return withLegacyCoefficientOverrides(surface, hit.kind, coefficients);
  }

  throw new Error(`Unsupported handball environment hit: ${hit.kind}`);
}
