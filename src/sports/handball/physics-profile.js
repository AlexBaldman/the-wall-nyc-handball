import {
  HANDBALL_CONTACT_ZONES,
  HANDBALL_SURFACES,
  resolveHandballSurface,
} from './surface-profiles.js';

const FOOT = 0.3048;
const INCH = 0.0254;

export const UNITS = Object.freeze({ FOOT, INCH });

export const COURT = Object.freeze({
  id: 'one-wall-regulation',
  width: 20 * FOOT,
  wallHeight: 16 * FOOT,
  shortLine: 16 * FOOT,
  serviceMarkers: 25 * FOOT,
  longLine: 34 * FOOT,
  serviceMarkerLength: 6 * INCH,
  halfWidth: 10 * FOOT,
  runback: 8 * FOOT,
});

export const BALL = Object.freeze({
  id: 'usha-red-label',
  diameter: 1.875 * INCH,
  radius: 0.9375 * INCH,
  mass: 0.061,
  officialDropHeight: 70 * INCH,
  reboundMin: 48 * INCH,
  reboundMax: 52 * INCH,
});

// Compatibility view for code and tests that still consume the original
// floor/wall/crack material fields. Canonical contact response now lives in
// HANDBALL_SURFACES.
export const MATERIAL = Object.freeze({
  floorRestitution: HANDBALL_SURFACES.floor.restitution,
  wallRestitution: HANDBALL_SURFACES.wall.restitution,
  crackRestitution: HANDBALL_SURFACES.crack.restitution,
  floorFriction: HANDBALL_SURFACES.floor.friction,
  wallFriction: HANDBALL_SURFACES.wall.friction,
  crackFriction: HANDBALL_SURFACES.crack.friction,
});

export const PHYSICS = Object.freeze({
  gravity: 9.80665,
  airDensity: 1.225,
  dragCoefficient: 0.47,
  magnusCoefficient: 0.000115,
  solverHz: 240,
  maxCollisionIterations: 4,
  sleepSpeed: 0.04,
});

export const ONE_WALL_HANDBALL_PHYSICS = Object.freeze({
  id: 'american-handball-one-wall',
  ball: BALL,
  court: COURT,
  material: MATERIAL,
  physics: PHYSICS,
  surfaces: HANDBALL_SURFACES,
  contactZones: HANDBALL_CONTACT_ZONES,
  resolveSurface: resolveHandballSurface,
});
