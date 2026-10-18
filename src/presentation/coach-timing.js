// The hand moves *after* button release. The old cue treated a ball within
// 160ms as "strike now", irrespective of the current animation travel time.
// Estimate the release window using the authoritative planner and the current
// hand speed. This only changes teaching copy, never contact resolution.
export function deriveReleaseCue({
  plan,
  footwork,
  preparing = false,
  swingContactLag = 0.07,
} = {}) {
  const eta = plan?.recommended?.time;
  if (!Number.isFinite(eta) || eta < 0) return 'recover';

  const travel = Math.max(0.03, Math.min(0.16,
    Number.isFinite(swingContactLag) ? swingContactLag : 0.07));
  const remaining = eta - travel;
  const distance = Math.max(0, footwork?.movementDistanceMeters ?? 0);
  if (distance > 0.2 && remaining > 0.08) return 'move';
  if (remaining > 0.17) return preparing ? 'hold' : 'move';
  if (remaining > 0.055) return preparing ? 'hold' : 'prepare';
  if (remaining >= -0.045) return 'strike';
  // Once the optimal release window has passed, do not keep showing RELEASE NOW.
  return preparing ? 'hold' : 'recover';
}
