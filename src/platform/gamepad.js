const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function applyDeadzone(value, deadzone = 0.16) {
  const numericValue = clamp(Number(value) || 0, -1, 1);
  const threshold = clamp(Number(deadzone) || 0, 0, 0.99);
  const absolute = Math.abs(numericValue);
  if (absolute <= threshold) return 0;
  return Math.sign(numericValue) * (absolute - threshold) / (1 - threshold);
}

export function findGamepad(preferredIndex = null, gamepads = null) {
  const available = gamepads
    ?? globalThis.navigator?.getGamepads?.()
    ?? [];
  if (preferredIndex !== null && available[preferredIndex]) {
    return available[preferredIndex];
  }
  return Array.from(available).find(Boolean) ?? null;
}

export function playGamepadRumble(
  gamepad,
  {
    duration = 70,
    strongMagnitude = 0.35,
    weakMagnitude = 0.55,
  } = {},
) {
  const actuator = gamepad?.vibrationActuator;
  if (!actuator?.playEffect) return false;

  try {
    Promise.resolve(
      actuator.playEffect('dual-rumble', {
        duration: Math.max(0, Number(duration) || 0),
        strongMagnitude: clamp(Number(strongMagnitude) || 0, 0, 1),
        weakMagnitude: clamp(Number(weakMagnitude) || 0, 0, 1),
      }),
    ).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
