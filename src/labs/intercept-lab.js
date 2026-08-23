import { createBallState } from '../sim/types.js';
import { ONE_WALL_HANDBALL } from '../sports/handball/sport-pack.js';

const { court } = ONE_WALL_HANDBALL.physics;
const envelope = ONE_WALL_HANDBALL.contactEnvelope;
const canvas = document.getElementById('courtCanvas');
const context = canvas.getContext('2d');

const ui = Object.fromEntries([
  'playerX',
  'playerXValue',
  'playerZ',
  'playerZValue',
  'ballX',
  'ballXValue',
  'ballY',
  'ballYValue',
  'feedSpeed',
  'feedSpeedValue',
  'prepared',
  'resetButton',
  'cueValue',
  'contactTimeValue',
  'contactHeightValue',
  'reachMarginValue',
  'windowValue',
  'returnValue',
  'freeValue',
  'preparedValue',
  'comparisonNote',
].map((id) => [id, document.getElementById(id)]));

const DEFAULTS = Object.freeze({
  playerX: 1.2,
  playerZ: 6.2,
  ballX: -0.4,
  ballY: 1.05,
  feedSpeed: 14,
  prepared: false,
});

const FEED_DEPTH = Math.max(2.8, court.shortLine - 1.4);
const VIEW = Object.freeze({
  left: 94,
  right: 806,
  top: 58,
  bottom: 662,
});

function numericInput(input) {
  return Number.parseFloat(input.value);
}

function scenario() {
  return {
    player: {
      position: {
        x: numericInput(ui.playerX),
        y: 0,
        z: numericInput(ui.playerZ),
      },
      velocity: { x: 0, y: 0, z: 0 },
    },
    ball: createBallState({
      active: true,
      position: {
        x: numericInput(ui.ballX),
        y: numericInput(ui.ballY),
        z: FEED_DEPTH,
      },
      velocity: {
        x: 0,
        y: 0.45,
        z: -numericInput(ui.feedSpeed),
      },
      angularVelocity: { x: -16, y: 0, z: 0 },
    }),
  };
}

function planFor(preparing, source = scenario()) {
  return ONE_WALL_HANDBALL.planIntercept({
    ball: source.ball,
    player: source.player,
    preparing,
    horizon: 1.8,
  });
}

function courtPoint(position) {
  const xRatio = (position.x + court.halfWidth) / (court.halfWidth * 2);
  const zRatio = position.z / court.longLine;
  return {
    x: VIEW.left + xRatio * (VIEW.right - VIEW.left),
    y: VIEW.top + zRatio * (VIEW.bottom - VIEW.top),
  };
}

function clearCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, VIEW.top, 0, VIEW.bottom);
  gradient.addColorStop(0, '#141b24');
  gradient.addColorStop(1, '#0e141c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCourt() {
  const topLeft = courtPoint({ x: -court.halfWidth, z: 0 });
  const bottomRight = courtPoint({ x: court.halfWidth, z: court.longLine });
  context.fillStyle = '#202832';
  context.fillRect(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y,
  );

  context.strokeStyle = 'rgba(255,255,255,0.42)';
  context.lineWidth = 2;
  context.strokeRect(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y,
  );

  const wallA = courtPoint({ x: -court.halfWidth, z: 0 });
  const wallB = courtPoint({ x: court.halfWidth, z: 0 });
  context.strokeStyle = '#ffd166';
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(wallA.x, wallA.y);
  context.lineTo(wallB.x, wallB.y);
  context.stroke();

  const lines = [
    { z: court.shortLine, label: 'SHORT' },
    { z: court.serviceMarkers, label: 'SERVICE' },
    { z: court.longLine, label: 'LONG' },
  ];

  context.font = '700 12px system-ui, sans-serif';
  for (const line of lines) {
    const a = courtPoint({ x: -court.halfWidth, z: line.z });
    const b = courtPoint({ x: court.halfWidth, z: line.z });
    context.strokeStyle = 'rgba(255,255,255,0.18)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
    context.fillStyle = 'rgba(255,255,255,0.46)';
    context.fillText(line.label, a.x + 8, a.y - 7);
  }

  context.fillStyle = '#ffd166';
  context.fillText('FRONT WALL', wallA.x + 8, wallA.y + 20);
}

function drawTrajectory(plan) {
  if (!plan?.trajectory?.samples?.length) return;
  context.strokeStyle = '#6ee7f2';
  context.lineWidth = 2.25;
  context.beginPath();

  let started = false;
  for (const sample of plan.trajectory.samples) {
    const point = courtPoint(sample.position);
    if (!started) {
      context.moveTo(point.x, point.y);
      started = true;
    } else {
      context.lineTo(point.x, point.y);
    }
  }
  context.stroke();

  const wallSample = plan.trajectory.samples.find((sample) =>
    sample.events.some(
      (event) => event.type === 'contact' && event.contact?.kind === 'wall',
    ));
  if (wallSample) {
    const point = courtPoint(wallSample.position);
    context.fillStyle = '#ff8c66';
    context.beginPath();
    context.arc(point.x, point.y, 5, 0, Math.PI * 2);
    context.fill();
  }
}

function drawReachableWindow(plan) {
  if (!plan?.window?.reachable) return;
  context.fillStyle = '#b9ff66';
  const stride = Math.max(1, Math.ceil(plan.window.candidates.length / 48));
  for (let index = 0; index < plan.window.candidates.length; index += stride) {
    const candidate = plan.window.candidates[index];
    const point = courtPoint(candidate.position);
    context.globalAlpha = 0.72;
    context.beginPath();
    context.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawPlayer(player) {
  const point = courtPoint(player.position);
  const pixelsPerMeter = (VIEW.right - VIEW.left) / (court.halfWidth * 2);
  context.strokeStyle = 'rgba(169,139,255,0.3)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(point.x, point.y, envelope.reachRadius * pixelsPerMeter, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = '#a98bff';
  context.beginPath();
  context.arc(point.x, point.y, 9, 0, Math.PI * 2);
  context.fill();
}

function drawRecommended(plan) {
  if (!plan?.recommended) return;
  const point = courtPoint(plan.recommended.position);
  context.fillStyle = '#ffd166';
  context.strokeStyle = '#111319';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(point.x, point.y, 9, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function drawFeed(ball) {
  const point = courtPoint(ball.position);
  context.fillStyle = '#6ee7f2';
  context.beginPath();
  context.arc(point.x, point.y, 6, 0, Math.PI * 2);
  context.fill();
}

function formatSeconds(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)} s` : '—';
}

function syncControls() {
  ui.playerXValue.textContent = `${numericInput(ui.playerX).toFixed(2)} m`;
  ui.playerZValue.textContent = `${numericInput(ui.playerZ).toFixed(2)} m`;
  ui.ballXValue.textContent = `${numericInput(ui.ballX).toFixed(2)} m`;
  ui.ballYValue.textContent = `${numericInput(ui.ballY).toFixed(2)} m`;
  ui.feedSpeedValue.textContent = `${numericInput(ui.feedSpeed).toFixed(2)} m/s`;
}

function syncReadout(selectedPlan, freePlan, preparedPlan) {
  const recommended = selectedPlan.recommended;
  ui.cueValue.textContent = selectedPlan.cue;
  ui.contactTimeValue.textContent = recommended ? formatSeconds(recommended.time) : 'unreachable';
  ui.contactHeightValue.textContent = recommended
    ? `${recommended.position.y.toFixed(2)} m`
    : '—';
  ui.reachMarginValue.textContent = recommended
    ? `${recommended.reachMarginMeters >= 0 ? '+' : ''}${recommended.reachMarginMeters.toFixed(2)} m`
    : '—';
  ui.windowValue.textContent = selectedPlan.window?.reachable
    ? `${selectedPlan.window.earliest.time.toFixed(2)}–${selectedPlan.window.latest.time.toFixed(2)} s`
    : 'none';
  ui.returnValue.textContent = formatSeconds(selectedPlan.returnStartTime);
  ui.freeValue.textContent = freePlan.window?.reachable
    ? formatSeconds(freePlan.window.earliest.time)
    : 'none';
  ui.preparedValue.textContent = preparedPlan.window?.reachable
    ? formatSeconds(preparedPlan.window.earliest.time)
    : 'none';

  if (freePlan.window?.reachable && preparedPlan.window?.reachable) {
    const delta = preparedPlan.window.earliest.time - freePlan.window.earliest.time;
    ui.comparisonNote.textContent = delta > 0.015
      ? `Preparing here costs about ${delta.toFixed(2)} s of earliest reach. Arrive first, then load the swing.`
      : 'This feed is already close enough that preparation does not meaningfully delay the first reachable contact.';
  } else if (freePlan.window?.reachable && !preparedPlan.window?.reachable) {
    ui.comparisonNote.textContent = 'Free movement can save this ball; preparing too early removes the reachable window.';
  } else {
    ui.comparisonNote.textContent = 'Move the player or change the feed until a playable return window appears.';
  }
}

function render() {
  syncControls();
  const source = scenario();
  const freePlan = planFor(false, source);
  const preparedPlan = planFor(true, source);
  const selectedPlan = ui.prepared.checked ? preparedPlan : freePlan;

  clearCanvas();
  drawCourt();
  drawTrajectory(selectedPlan);
  drawReachableWindow(selectedPlan);
  drawPlayer(source.player);
  drawFeed(source.ball);
  drawRecommended(selectedPlan);
  syncReadout(selectedPlan, freePlan, preparedPlan);
}

function reset() {
  ui.playerX.value = DEFAULTS.playerX;
  ui.playerZ.value = DEFAULTS.playerZ;
  ui.ballX.value = DEFAULTS.ballX;
  ui.ballY.value = DEFAULTS.ballY;
  ui.feedSpeed.value = DEFAULTS.feedSpeed;
  ui.prepared.checked = DEFAULTS.prepared;
  render();
}

for (const input of [
  ui.playerX,
  ui.playerZ,
  ui.ballX,
  ui.ballY,
  ui.feedSpeed,
  ui.prepared,
]) {
  input.addEventListener('input', render);
  input.addEventListener('change', render);
}
ui.resetButton.addEventListener('click', reset);

render();
