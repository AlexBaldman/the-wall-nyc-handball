import { STRIKER_COLLIDER } from '../../sim/striker-contact.js';

export function createHandStriker(hand, overrides = {}) {
  const radius = overrides.radius ?? hand.radius;
  return {
    id: String(overrides.id ?? 'hand'),
    kind: 'hand',
    contactKind: 'hand',
    position: hand.position,
    previousPosition: hand.previousPosition,
    velocity: hand.velocity,
    active: hand.active ?? true,
    collider: {
      type: STRIKER_COLLIDER.SPHERE,
      radius,
    },
  };
}
