// Pure and reusable touch-control math, no physics or DOM dependencies.
export function clamp(value, low = -1, high = 1) {
  return Math.min(high, Math.max(low, Number.isFinite(value) ? value : 0));
}

export function joystickVector({ x, y, centerX, centerY, radius = 58, deadzone = 0.12 } = {}) {
  if (![x, y, centerX, centerY, radius].every(Number.isFinite)) return Object.freeze({ x: 0, z: 0 });
  const r = Math.max(1, radius);
  const rawX = (x - centerX) / r;
  const rawZ = (y - centerY) / r;
  const length = Math.hypot(rawX, rawZ);
  const bounded = Math.min(1, length);
  const dead = clamp(deadzone, 0, 0.9);
  const power = length > dead ? (bounded - dead) / (1 - dead) : 0;
  if (!length || !Number.isFinite(power)) return Object.freeze({ x: 0, z: 0 });
  return Object.freeze({ x: rawX / length * power, z: rawZ / length * power });
}

// Relative dragging the strike pad changes wall intention, not ball trajectory.
// A new drag uses the previous target as its starting point, so short gestures
// are learnable and a single hand can steer *while* the contact is charging.
export function draggedWallAim(initial, dx = 0, dy = 0, { width = 125, height = 160 } = {}) {
  return Object.freeze({
    x: clamp((initial?.x ?? 0) + dx / Math.max(1, width)),
    y: clamp((initial?.y ?? -0.7) - dy / Math.max(1, height)),
  });
}

export function aimDescription(aim = {}) {
  const horizontal = aim.x < -0.34 ? 'LEFT' : aim.x > 0.34 ? 'RIGHT' : 'CENTER';
  const vertical = aim.y < -0.35 ? 'LOW' : aim.y > 0.33 ? 'HIGH' : 'MID';
  return `${horizontal} · ${vertical}`;
}

export const MOBILE_TECHNIQUES = Object.freeze([
  Object.freeze({ id: 'palm', label: 'PALM' }),
  Object.freeze({ id: 'topspin', label: 'TOP' }),
  Object.freeze({ id: 'backspin', label: 'SLICE' }),
  Object.freeze({ id: 'fist', label: 'FIST' }),
]);
