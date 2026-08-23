import {
  BALL,
  COURT,
  MATERIAL,
  PHYSICS,
  UNITS,
} from '../sports/handball/physics-profile.js';

export { BALL, COURT, MATERIAL, PHYSICS, UNITS };

export function courtRatios() {
  return {
    shortLine: COURT.shortLine / COURT.longLine,
    serviceMarkers: COURT.serviceMarkers / COURT.longLine,
  };
}

export function isInsideCourt(x, z, radius = 0, court = COURT) {
  return (
    x >= -court.halfWidth + radius
    && x <= court.halfWidth - radius
    && z >= radius
    && z <= court.longLine - radius
  );
}

export function labelFeet(meters) {
  return `${Math.round(meters / UNITS.FOOT)}′`;
}
