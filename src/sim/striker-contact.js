import { resolveHandContact } from './ballistics.js';

export const STRIKER_COLLIDER = Object.freeze({
  SPHERE: 'sphere',
});

function finiteRadius(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function sphereRadius(striker) {
  return finiteRadius(striker?.collider?.radius) ?? finiteRadius(striker?.radius);
}

function legacyHandState(striker, radius) {
  return {
    position: striker.position,
    previousPosition: striker.previousPosition,
    velocity: striker.velocity,
    radius,
    active: striker.active ?? true,
  };
}

export function resolveStrikerContact(ball, striker, context = {}) {
  const colliderType = striker?.collider?.type ?? STRIKER_COLLIDER.SPHERE;
  if (colliderType !== STRIKER_COLLIDER.SPHERE) {
    throw new Error(`Unsupported striker collider: ${colliderType}`);
  }

  const radius = sphereRadius(striker);
  if (radius === null) {
    throw new Error('A spherical striker requires a positive collider radius.');
  }

  const strikerId = String(striker.id ?? context.strikerId ?? 'striker');
  const strikerKind = String(striker.kind ?? context.strikerKind ?? 'striker');
  const contactKind = String(context.contactKind ?? striker.contactKind ?? strikerKind);
  const contact = resolveHandContact(
    ball,
    legacyHandState(striker, radius),
    {
      ...context,
      id: context.id ?? `${strikerId}-${context.tick ?? 0}`,
    },
  );

  if (!contact) return null;

  return {
    ...contact,
    kind: contactKind,
    metadata: {
      ...contact.metadata,
      strikerId,
      strikerKind,
      strikerVelocity: { ...contact.metadata.handVelocity },
      colliderType,
      colliderRadius: radius,
    },
  };
}
