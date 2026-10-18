// Read-only presentation mapping for a suggested return position. We never
// change the simulated ball, player, or contact window to match this guide.
const HIDE = Object.freeze({ visible: false, label: '', detail: '', targetPosition: null });

export function deriveReturnGuideView(coach) {
  if (
    !coach?.visible
    || !coach?.plan?.recommended
    || !coach?.footwork?.available
    || !coach.footwork.targetPosition
  ) return HIDE;

  const footwork = coach.footwork;
  const distance = Math.max(0, Number(footwork.movementDistanceMeters) || 0);
  const moving = distance > 0.12;
  const cue = coach.cue;
  let label = moving ? 'MOVE HERE' : 'SET + LOAD';

  if (cue === 'strike') {
    label = coach.preparing ? 'RELEASE NOW' : 'QUICK PALM';
  } else if (cue === 'hold') {
    label = 'HOLD YOUR LOAD';
  } else if (cue === 'prepare' && !moving) {
    label = 'LOAD OPEN PALM';
  }

  const detail = moving
    ? `${footwork.label} · ${distance.toFixed(1)} m`
    : cue === 'strike'
      ? 'Contact window now'
      : 'Feet in range';

  return Object.freeze({
    visible: true,
    label,
    detail,
    cue,
    targetPosition: Object.freeze({
      x: footwork.targetPosition.x,
      y: 0.035,
      z: footwork.targetPosition.z,
    }),
  });
}
