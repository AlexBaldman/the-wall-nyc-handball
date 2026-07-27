'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  playerScore: document.getElementById('playerScore'),
  aiScore: document.getElementById('aiScore'),
  rallyCount: document.getElementById('rallyCount'),
  shotMode: document.getElementById('shotMode'),
  statusLine: document.getElementById('statusLine'),
  detailLine: document.getElementById('detailLine'),
  metaLine: document.getElementById('metaLine'),
  serveButton: document.getElementById('serveButton'),
  resetButton: document.getElementById('resetButton'),
};

const keys = new Set();

const COURT = {
  left: 110,
  right: 850,
  top: 84,
  bottom: 530,
  frontWallY: 102,
  shortLineY: 292,
  serviceLineY: 236,
  backLineY: 504,
  centerX: 480,
};

const PHYSICS = {
  gravity: 1650,
  bounceLoss: 0.71,
  wallLoss: 0.96,
  sideLoss: 0.82,
  drag: 0.996,
};

const SHOTS = {
  flat: {
    label: 'Flat',
    targetHeight: 78,
    speed: 840,
    spinScale: 1,
    paceScale: 1,
    cue: 'Balanced pace and the safest line to the wall.',
  },
  lob: {
    label: 'Lob',
    targetHeight: 132,
    speed: 730,
    spinScale: 0.75,
    paceScale: 0.88,
    cue: 'Higher arc that buys you recovery time.',
  },
  kill: {
    label: 'Kill',
    targetHeight: 34,
    speed: 940,
    spinScale: 0.55,
    paceScale: 1.12,
    cue: 'Low missile. Great if you catch it early, brutal if you miss.',
  },
};

const state = {
  mode: 'ready',
  targetScore: 11,
  scores: { player: 0, ai: 0 },
  rallyCount: 0,
  selectedShot: 'flat',
  lastShotLabel: 'Flat',
  message: 'Press Serve to start the point.',
  detail: 'Movement: WASD or arrows. Swing: Space. Hold Z/X for english, Shift for extra pace.',
  meta: 'Race to 11. Select a shot with 1 = Flat, 2 = Lob, 3 = Kill.',
  player: createActor('player', 480, 450, '#ffb84d'),
  ai: createActor('ai', 480, 196, '#72d4ff'),
  ball: createBall(),
  lastTime: performance.now(),
};

function createActor(id, x, y, color) {
  return {
    id,
    x,
    y,
    radius: 20,
    speed: id === 'player' ? 330 : 300,
    color,
    cooldown: 0,
    swingTimer: 0,
  };
}

function createBall() {
  return {
    active: false,
    x: COURT.centerX,
    y: 430,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    radius: 9,
    expectedReceiver: 'player',
    lastHitter: null,
    needsFrontWall: true,
    bouncesAfterWall: 0,
    isServe: false,
    firstServeBounceRecorded: false,
    shotType: 'flat',
  };
}

function isDown(key) {
  return keys.has(key);
}

function setStatus(message, detail = state.detail, meta = state.meta) {
  state.message = message;
  state.detail = detail;
  state.meta = meta;
  ui.statusLine.textContent = message;
  ui.detailLine.textContent = detail;
  ui.metaLine.textContent = meta;
}

function syncScoreboard() {
  ui.playerScore.textContent = String(state.scores.player);
  ui.aiScore.textContent = String(state.scores.ai);
  ui.rallyCount.textContent = String(state.rallyCount);
  ui.shotMode.textContent = SHOTS[state.selectedShot].label;
  ui.serveButton.textContent = state.mode === 'matchOver' ? 'New Match' : 'Serve';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetActors() {
  state.player.x = COURT.centerX;
  state.player.y = 450;
  state.player.cooldown = 0;
  state.player.swingTimer = 0;
  state.ai.x = COURT.centerX;
  state.ai.y = 196;
  state.ai.cooldown = 0;
  state.ai.swingTimer = 0;
}

function parkBallAtServer() {
  const ball = state.ball;
  ball.active = false;
  ball.x = state.player.x;
  ball.y = state.player.y - 26;
  ball.z = 20;
  ball.vx = 0;
  ball.vy = 0;
  ball.vz = 0;
  ball.spin = 0;
  ball.expectedReceiver = 'ai';
  ball.lastHitter = null;
  ball.needsFrontWall = true;
  ball.bouncesAfterWall = 0;
  ball.isServe = false;
  ball.firstServeBounceRecorded = false;
  ball.shotType = 'flat';
}

function resetMatch() {
  state.mode = 'ready';
  state.scores.player = 0;
  state.scores.ai = 0;
  state.rallyCount = 0;
  state.selectedShot = 'flat';
  state.lastShotLabel = SHOTS.flat.label;
  resetActors();
  parkBallAtServer();
  syncScoreboard();
  setStatus(
    'Press Serve to start the point.',
    'Movement: WASD or arrows. Swing: Space. Hold Z/X for english, Shift for extra pace.',
    'Race to 11. Select a shot with 1 = Flat, 2 = Lob, 3 = Kill.'
  );
}

function aimBiasFromKeys() {
  let bias = 0;
  if (isDown('arrowleft') || isDown('a')) {
    bias -= 0.9;
  }
  if (isDown('arrowright') || isDown('d')) {
    bias += 0.9;
  }
  return bias;
}

function spinBiasFromKeys() {
  let spin = 0;
  if (isDown('z')) {
    spin -= 1.2;
  }
  if (isDown('x')) {
    spin += 1.2;
  }
  return spin;
}

function getShotProfile(actor, options = {}) {
  if (options.serve) {
    return SHOTS.flat;
  }

  if (actor.id === 'player') {
    return SHOTS[state.selectedShot];
  }

  const roll = Math.random();
  if (roll > 0.8) {
    return SHOTS.kill;
  }
  if (roll > 0.45) {
    return SHOTS.flat;
  }
  return SHOTS.lob;
}

function setShotMode(shotKey) {
  if (!SHOTS[shotKey]) {
    return;
  }

  state.selectedShot = shotKey;
  syncScoreboard();
  setStatus(
    `Shot selected: ${SHOTS[shotKey].label}.`,
    SHOTS[shotKey].cue,
    `Race to ${state.targetScore}. Press Space to strike with ${SHOTS[shotKey].label.toLowerCase()}.`
  );
}

function strikeBall(actor, options = {}) {
  const ball = state.ball;
  const otherId = actor.id === 'player' ? 'ai' : 'player';
  const powerShot = actor.id === 'player' ? isDown('shift') : Math.random() > 0.6;
  const shotProfile = getShotProfile(actor, options);
  const aimBias = actor.id === 'player'
    ? aimBiasFromKeys()
    : clamp((state.player.x - actor.x) / 180 + (Math.random() - 0.5) * 0.8, -1.1, 1.1);
  const spin = actor.id === 'player'
    ? spinBiasFromKeys() * shotProfile.spinScale
    : (Math.random() - 0.5) * 0.9;
  const wallTargetX = clamp(COURT.centerX + aimBias * 220, COURT.left + 55, COURT.right - 55);
  const wallTargetZ = options.targetHeight ?? shotProfile.targetHeight;
  const paceBoost = powerShot ? 1.08 : 1;
  const launchSpeed = options.speed ?? shotProfile.speed * shotProfile.paceScale * paceBoost;
  const originZ = Math.max(ball.z, options.minimumZ ?? 18);

  const dx = wallTargetX - ball.x;
  const dy = COURT.frontWallY - ball.y;
  const dz = wallTargetZ - originZ;
  const planarDistance = Math.hypot(dx, dy) || 1;
  const travelTime = planarDistance / launchSpeed;
  const safeTravelTime = Math.max(travelTime, 0.12);

  ball.active = true;
  ball.z = originZ;
  ball.vx = dx / safeTravelTime;
  ball.vy = dy / safeTravelTime;
  ball.vz = (dz + 0.5 * PHYSICS.gravity * safeTravelTime * safeTravelTime) / safeTravelTime;
  ball.spin = spin;
  ball.expectedReceiver = otherId;
  ball.lastHitter = actor.id;
  ball.needsFrontWall = true;
  ball.bouncesAfterWall = 0;
  ball.isServe = Boolean(options.serve);
  ball.firstServeBounceRecorded = false;
  ball.shotType = options.serve ? 'serve' : shotProfile.label;
  state.lastShotLabel = ball.shotType;

  actor.cooldown = 0.22;
  actor.swingTimer = 0.12;

  if (options.serve) {
    state.mode = 'serving';
    setStatus(
      'Serve away.',
      'Good serve: front wall first, then beyond the short line.',
      `Race to ${state.targetScore}. Start clean, then look for a ${SHOTS[state.selectedShot].label.toLowerCase()}.`
    );
  } else {
    state.rallyCount += 1;
    setStatus(
      actor.id === 'player'
        ? `${shotProfile.label} strike landed. Stay ready for the next hop.`
        : `Wall Ghost answered with a ${shotProfile.label.toLowerCase()}.`,
      actor.id === 'player'
        ? shotProfile.cue
        : 'Move your feet and cut it off before the second bounce.',
      `Race to ${state.targetScore}. Current selection: ${SHOTS[state.selectedShot].label}.`
    );
  }

  syncScoreboard();
}

function canActorStrike(actor) {
  const ball = state.ball;
  if (!ball.active || ball.expectedReceiver !== actor.id || ball.needsFrontWall || actor.cooldown > 0) {
    return false;
  }

  if (ball.bouncesAfterWall > 1 || ball.z > 92) {
    return false;
  }

  const reachX = actor.radius + 24;
  const reachY = actor.radius + 24;
  const dx = ball.x - actor.x;
  const dy = ball.y - actor.y;
  return Math.abs(dx) <= reachX && Math.abs(dy) <= reachY;
}

function resolvePoint(winner, reason, detail) {
  state.scores[winner] += 1;
  state.ball.active = false;
  state.rallyCount = 0;
  parkBallAtServer();

  if (state.scores[winner] >= state.targetScore) {
    state.mode = 'matchOver';
  } else {
    state.mode = 'pointOver';
  }

  syncScoreboard();

  if (state.mode === 'matchOver') {
    const matchMessage = winner === 'player'
      ? 'You closed it out. Match to you.'
      : 'Wall Ghost took the match.';
    setStatus(
      `${matchMessage} ${reason}`,
      detail,
      `Final score ${state.scores.player}-${state.scores.ai}. Press Serve to start a fresh race to ${state.targetScore}.`
    );
    return;
  }

  const prefix = winner === 'player' ? 'Point for you.' : 'Point for Wall Ghost.';
  setStatus(
    `${prefix} ${reason}`,
    detail,
    `Score ${state.scores.player}-${state.scores.ai}. Press Serve for the next point.`
  );
}

function validateServeBounce(y) {
  if (y < COURT.shortLineY) {
    resolvePoint('ai', 'Short fault on the serve.', 'The first bounce has to clear the short line.');
    return false;
  }

  if (y > COURT.backLineY) {
    resolvePoint('ai', 'Long fault on the serve.', 'That serve carried past the legal back line.');
    return false;
  }

  state.mode = 'rally';
  setStatus(
    'Good serve. Rally live.',
    'Ghost is reading the bounce. Get ready for the return.',
    `Score ${state.scores.player}-${state.scores.ai}. Current shot: ${SHOTS[state.selectedShot].label}.`
  );
  return true;
}

function updatePlayer(dt) {
  let moveX = 0;
  let moveY = 0;

  if (isDown('a') || isDown('arrowleft')) {
    moveX -= 1;
  }
  if (isDown('d') || isDown('arrowright')) {
    moveX += 1;
  }
  if (isDown('w') || isDown('arrowup')) {
    moveY -= 1;
  }
  if (isDown('s') || isDown('arrowdown')) {
    moveY += 1;
  }

  if (moveX || moveY) {
    const magnitude = Math.hypot(moveX, moveY) || 1;
    state.player.x += (moveX / magnitude) * state.player.speed * dt;
    state.player.y += (moveY / magnitude) * state.player.speed * dt;
  }

  state.player.x = clamp(state.player.x, COURT.left + 24, COURT.right - 24);
  state.player.y = clamp(state.player.y, COURT.frontWallY + 110, COURT.bottom - 20);
}

function updateAi(dt) {
  const ai = state.ai;
  const ball = state.ball;

  let targetX = COURT.centerX;
  let targetY = 214;

  if (ball.active) {
    if (ball.expectedReceiver === 'ai' && !ball.needsFrontWall) {
      targetX = clamp(ball.x, COURT.left + 34, COURT.right - 34);
      targetY = clamp(ball.y - 28, COURT.frontWallY + 65, COURT.bottom - 130);
    } else if (ball.lastHitter === 'ai') {
      targetX = COURT.centerX;
      targetY = 188;
    }
  }

  const dx = targetX - ai.x;
  const dy = targetY - ai.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 1) {
    ai.x += (dx / distance) * ai.speed * dt;
    ai.y += (dy / distance) * ai.speed * dt;
  }

  ai.x = clamp(ai.x, COURT.left + 24, COURT.right - 24);
  ai.y = clamp(ai.y, COURT.frontWallY + 40, COURT.bottom - 120);

  if (canActorStrike(ai)) {
    strikeBall(ai, {
      targetHeight: 62 + Math.random() * 42,
      speed: 760 + Math.random() * 120,
      minimumZ: 15,
    });
  }
}

function updateBall(dt) {
  const ball = state.ball;
  if (!ball.active) {
    ball.x = state.player.x;
    ball.y = state.player.y - 26;
    return;
  }

  ball.vx += ball.spin * 92 * dt;
  ball.vx *= PHYSICS.drag;
  ball.vy *= PHYSICS.drag;
  ball.vz -= PHYSICS.gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;

  if (ball.x <= COURT.left || ball.x >= COURT.right) {
    resolvePoint(ball.expectedReceiver, 'The shot leaked out over the sideline.', 'Keep the angle tighter off the wall.');
    return;
  }

  if (ball.y >= COURT.bottom + 18) {
    resolvePoint(ball.expectedReceiver, 'That one sailed long.', 'The back line still matters in this prototype.');
    return;
  }

  if (ball.y <= COURT.frontWallY && ball.vy < 0) {
    ball.y = COURT.frontWallY;
    ball.vy = Math.abs(ball.vy) * PHYSICS.wallLoss;
    ball.vx += ball.spin * 44;
    ball.spin *= 0.8;
    ball.needsFrontWall = false;
    ball.bouncesAfterWall = 0;
  }

  if (ball.z <= 0) {
    ball.z = 0;
    ball.vz = Math.abs(ball.vz) * PHYSICS.bounceLoss;
    ball.vx *= PHYSICS.sideLoss;
    ball.bouncesAfterWall += 1;

    if (ball.needsFrontWall) {
      resolvePoint(ball.expectedReceiver, 'Down before the front wall.', 'Every return has to reach the wall before it dies.');
      return;
    }

    if (ball.isServe && !ball.firstServeBounceRecorded) {
      ball.firstServeBounceRecorded = true;
      if (!validateServeBounce(ball.y)) {
        return;
      }
      ball.isServe = false;
    }

    if (ball.bouncesAfterWall > 1) {
      resolvePoint(ball.lastHitter, 'Second bounce. Rally over.', 'You only get one bounce to set up the return.');
      return;
    }
  }
}

function updateCooldowns(dt) {
  for (const actor of [state.player, state.ai]) {
    actor.cooldown = Math.max(0, actor.cooldown - dt);
    actor.swingTimer = Math.max(0, actor.swingTimer - dt);
  }
}

function attemptPlayerSwing() {
  if (state.mode === 'ready' || state.mode === 'pointOver') {
    startServe();
    return;
  }

  if (canActorStrike(state.player)) {
    strikeBall(state.player, { minimumZ: 14 });
  } else if (state.ball.active) {
    setStatus(
      'Too early or out of reach.',
      'Move under the ball and catch it before the second bounce.',
      `Selected shot: ${SHOTS[state.selectedShot].label}.`
    );
  }
}

function startServe() {
  if (state.mode === 'matchOver') {
    resetMatch();
    return;
  }

  if (state.mode !== 'ready' && state.mode !== 'pointOver') {
    return;
  }

  parkBallAtServer();
  strikeBall(state.player, {
    serve: true,
    speed: 860,
    targetHeight: 78,
    minimumZ: 20,
  });
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#dbefff');
  sky.addColorStop(0.28, '#b4daf2');
  sky.addColorStop(0.72, '#e3c39f');
  sky.addColorStop(1, '#c1895c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#8a4d2e';
  ctx.fillRect(0, COURT.top - 40, canvas.width, 38);

  ctx.fillStyle = '#5f2419';
  ctx.fillRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);

  const wallGradient = ctx.createLinearGradient(0, COURT.top, 0, COURT.frontWallY + 56);
  wallGradient.addColorStop(0, '#cf7e57');
  wallGradient.addColorStop(1, '#8f3727');
  ctx.fillStyle = wallGradient;
  ctx.fillRect(COURT.left, COURT.top, COURT.right - COURT.left, 96);

  const floorGradient = ctx.createLinearGradient(0, COURT.frontWallY, 0, COURT.bottom);
  floorGradient.addColorStop(0, '#d4a77d');
  floorGradient.addColorStop(0.5, '#c79265');
  floorGradient.addColorStop(1, '#b0784e');
  ctx.fillStyle = floorGradient;
  ctx.fillRect(COURT.left, COURT.frontWallY, COURT.right - COURT.left, COURT.bottom - COURT.frontWallY);

  ctx.strokeStyle = 'rgba(255, 243, 221, 0.95)';
  ctx.lineWidth = 4;
  ctx.strokeRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);

  drawCourtLine(COURT.frontWallY + 42, 2.5);
  drawCourtLine(COURT.serviceLineY, 2);
  drawCourtLine(COURT.shortLineY, 3);
  drawCourtLine(COURT.backLineY, 2.5);

  ctx.strokeStyle = 'rgba(255, 243, 221, 0.4)';
  ctx.beginPath();
  ctx.moveTo(COURT.centerX, COURT.serviceLineY);
  ctx.lineTo(COURT.centerX, COURT.backLineY);
  ctx.stroke();

  ctx.fillStyle = 'rgba(8, 17, 29, 0.24)';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(COURT.left + 24 + i * 142, COURT.bottom + 16, 58, 8);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.font = '700 16px "Space Grotesk"';
  ctx.fillText('FRONT WALL', COURT.left + 18, COURT.top + 26);
  ctx.fillText('SERVICE LINE', COURT.left + 18, COURT.serviceLineY - 10);
  ctx.fillText('SHORT LINE', COURT.left + 18, COURT.shortLineY - 10);
}

function drawCourtLine(y, width) {
  ctx.lineWidth = width;
  ctx.strokeStyle = 'rgba(255, 248, 235, 0.96)';
  ctx.beginPath();
  ctx.moveTo(COURT.left, y);
  ctx.lineTo(COURT.right, y);
  ctx.stroke();
}

function drawActor(actor) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(actor.x, actor.y + 14, actor.radius + 10, actor.radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(actor.x, actor.y);
  if (actor.swingTimer > 0) {
    ctx.rotate(actor.id === 'player' ? -0.18 : 0.18);
  }

  ctx.fillStyle = actor.color;
  ctx.beginPath();
  ctx.arc(0, 0, actor.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#08111d';
  ctx.beginPath();
  ctx.arc(0, -3, actor.radius * 0.32, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-actor.radius * 0.8, actor.radius * 0.1);
  ctx.lineTo(actor.radius * 0.8, actor.radius * 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawBall() {
  const ball = state.ball;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y + 12, ball.radius + 5, ball.radius * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  const renderY = ball.y - ball.z * 0.34;
  const glow = ctx.createRadialGradient(ball.x - 2, renderY - 3, 1, ball.x, renderY, ball.radius + 9);
  glow.addColorStop(0, '#fff6cb');
  glow.addColorStop(0.55, '#ffb84d');
  glow.addColorStop(1, '#f26814');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ball.x, renderY, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawMeters() {
  const spin = spinBiasFromKeys();
  const power = isDown('shift') ? 1 : 0.55;
  const shot = SHOTS[state.selectedShot];

  ctx.save();
  ctx.fillStyle = 'rgba(6, 14, 25, 0.7)';
  ctx.fillRect(28, 22, 278, 96);

  ctx.fillStyle = '#e8f1ff';
  ctx.font = '700 14px "Space Grotesk"';
  ctx.fillText('ENGLISH', 42, 44);
  ctx.fillText('PACE', 42, 76);
  ctx.fillText('SHOT', 42, 108);

  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(118, 32, 110, 10);
  ctx.fillRect(118, 64, 110, 10);

  ctx.fillStyle = spin < 0 ? '#72d4ff' : '#ff7a18';
  ctx.fillRect(173, 32, spin * 44, 10);

  ctx.fillStyle = '#67ffd3';
  ctx.fillRect(118, 64, 110 * power, 10);

  ctx.fillStyle = state.selectedShot === 'kill' ? '#ff7a18' : state.selectedShot === 'lob' ? '#72d4ff' : '#67ffd3';
  ctx.font = '700 24px "Barlow Condensed"';
  ctx.fillText(shot.label.toUpperCase(), 118, 110);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawActor(state.ai);
  drawActor(state.player);
  drawBall();
  drawMeters();
}

function tick(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.025);
  state.lastTime = now;

  updatePlayer(dt);
  updateAi(dt);
  updateBall(dt);
  updateCooldowns(dt);
  draw();
  requestAnimationFrame(tick);
}

function handleKeyChange(event, isPressed) {
  const key = event.key.toLowerCase();

  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'backspace'].includes(key)) {
    event.preventDefault();
  }

  if (isPressed) {
    keys.add(key);
  } else {
    keys.delete(key);
  }

  if (!isPressed) {
    return;
  }

  if (key === ' ') {
    attemptPlayerSwing();
  } else if (key === 'r') {
    startServe();
  } else if (key === 'backspace') {
    resetMatch();
  } else if (key === '1') {
    setShotMode('flat');
  } else if (key === '2') {
    setShotMode('lob');
  } else if (key === '3') {
    setShotMode('kill');
  }
}

ui.serveButton.addEventListener('click', startServe);
ui.resetButton.addEventListener('click', resetMatch);

window.addEventListener('keydown', (event) => handleKeyChange(event, true));
window.addEventListener('keyup', (event) => handleKeyChange(event, false));

resetMatch();
requestAnimationFrame(tick);
