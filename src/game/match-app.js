'use strict';

import { findGamepad, applyDeadzone, playGamepadRumble } from '../platform/gamepad.js';
import { createSeededRandom } from '../sim/random.js';
import {
  CAMERA_MODES,
  COURT,
  GAMEPLAY_SEED,
  PHYSICS,
  RHYTHM_PRESETS,
  VENUES,
} from './match-environment.js';
import {
  AVATAR_OPTIONS,
  AVATAR_PRESETS,
  DEFAULT_AVATAR,
  DIFFICULTIES,
  RIVAL_AVATARS,
  SHOTS,
  SHOT_TIMING,
  TRAINING_DRILLS,
} from './match-content.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  playerScore: document.getElementById('playerScore'),
  aiScore: document.getElementById('aiScore'),
  rallyCount: document.getElementById('rallyCount'),
  shotMode: document.getElementById('shotMode'),
  difficultyMode: document.getElementById('difficultyMode'),
  statusLine: document.getElementById('statusLine'),
  detailLine: document.getElementById('detailLine'),
  metaLine: document.getElementById('metaLine'),
  serveButton: document.getElementById('serveButton'),
  serveButtonLabel: document.querySelector('#serveButton span'),
  resetButton: document.getElementById('resetButton'),
  difficultyButtons: Array.from(document.querySelectorAll('.difficulty-button')),
  shotButtons: Array.from(document.querySelectorAll('.shot-button')),
  soundButton: document.getElementById('soundButton'),
  helpButton: document.getElementById('helpButton'),
  rulesButton: document.getElementById('rulesButton'),
  helpDialog: document.getElementById('helpDialog'),
  closeHelpButton: document.getElementById('closeHelpButton'),
  pointBanner: document.getElementById('pointBanner'),
  pointEyebrow: document.getElementById('pointEyebrow'),
  pointMessage: document.getElementById('pointMessage'),
  serveStatus: document.getElementById('serveStatus'),
  playerPanel: document.querySelector('.player-score--you'),
  playerName: document.getElementById('playerName'),
  aiPanel: document.querySelector('.player-score--ghost'),
  aiName: document.getElementById('aiName'),
  swingButton: document.getElementById('swingButton'),
  venueButton: document.getElementById('venueButton'),
  cameraButton: document.getElementById('cameraButton'),
  cameraMode: document.getElementById('cameraMode'),
  cameraZoom: document.getElementById('cameraZoom'),
  zoomOutButton: document.getElementById('zoomOutButton'),
  zoomInButton: document.getElementById('zoomInButton'),
  trainingButton: document.getElementById('trainingButton'),
  trainingDialog: document.getElementById('trainingDialog'),
  closeTrainingButton: document.getElementById('closeTrainingButton'),
  trainingCards: Array.from(document.querySelectorAll('[data-training]')),
  trainingHud: document.getElementById('trainingHud'),
  trainingName: document.getElementById('trainingName'),
  trainingScore: document.getElementById('trainingScore'),
  trainingGoal: document.getElementById('trainingGoal'),
  trainingPrompt: document.getElementById('trainingPrompt'),
  exitTrainingButton: document.getElementById('exitTrainingButton'),
  rhythmButton: document.getElementById('rhythmButton'),
  rhythmChip: document.getElementById('rhythmChip'),
  rhythmMode: document.getElementById('rhythmMode'),
  rhythmPercent: document.getElementById('rhythmPercent'),
  rhythmDialog: document.getElementById('rhythmDialog'),
  closeRhythmButton: document.getElementById('closeRhythmButton'),
  resetRhythmButton: document.getElementById('resetRhythmButton'),
  copyRhythmButton: document.getElementById('copyRhythmButton'),
  rhythmPresetButtons: Array.from(document.querySelectorAll('[data-rhythm-preset]')),
  rhythmControls: Array.from(document.querySelectorAll('[data-rhythm-control]')),
  rhythmVerdictLabel: document.getElementById('rhythmVerdictLabel'),
  rhythmVerdict: document.getElementById('rhythmVerdict'),
  rhythmAdvice: document.getElementById('rhythmAdvice'),
  avatarButton: document.getElementById('avatarButton'),
  avatarDialog: document.getElementById('avatarDialog'),
  closeAvatarButton: document.getElementById('closeAvatarButton'),
  avatarPreview: document.getElementById('avatarPreview'),
  avatarPoseButtons: Array.from(document.querySelectorAll('[data-avatar-pose]')),
  avatarNameInput: document.getElementById('avatarNameInput'),
  avatarOptionGroups: document.getElementById('avatarOptionGroups'),
  avatarPresetButtons: Array.from(document.querySelectorAll('[data-avatar-preset]')),
  randomizeAvatarButton: document.getElementById('randomizeAvatarButton'),
  resetAvatarButton: document.getElementById('resetAvatarButton'),
  saveAvatarButton: document.getElementById('saveAvatarButton'),
  timingMeter: document.getElementById('timingMeter'),
  timingFill: document.getElementById('timingFill'),
  timingLabel: document.getElementById('timingLabel'),
  timingGrade: document.getElementById('timingGrade'),
  timingBalance: document.getElementById('timingBalance'),
  timingIntercept: document.getElementById('timingIntercept'),
  gamepadStatus: document.getElementById('gamepadStatus'),
  virtualButtons: Array.from(document.querySelectorAll('[data-key]')),
};

const keys = new Set();
let audioContext = null;
let bannerTimer = null;
let canvasSize = { width: 960, height: 600, dpr: 1 };
const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

const gameplayRng = createSeededRandom();
const gameplayRandom = () => gameplayRng.next();

function loadSavedAvatar() {
  try {
    const saved = JSON.parse(localStorage.getItem('the-wall-avatar') || 'null');
    return saved ? { ...DEFAULT_AVATAR, ...saved } : { ...DEFAULT_AVATAR };
  } catch {
    return { ...DEFAULT_AVATAR };
  }
}

function loadSavedRhythm() {
  const defaults = { preset: 'real', ...RHYTHM_PRESETS.real };
  try {
    const saved = JSON.parse(localStorage.getItem('the-wall-rhythm') || 'null');
    if (!saved) {
      return defaults;
    }
    return {
      ...defaults,
      ...saved,
      masterTempo: clamp(Number(saved.masterTempo) || defaults.masterTempo, 0.6, 1.15),
      ballClock: clamp(Number(saved.ballClock) || defaults.ballClock, 0.7, 1.15),
      footworkClock: clamp(Number(saved.footworkClock) || defaults.footworkClock, 0.7, 1.15),
      readWindow: clamp(Number(saved.readWindow) || defaults.readWindow, 0.85, 1.45),
      cameraDepth: clamp(Number(saved.cameraDepth) || defaults.cameraDepth, 0.85, 1.3),
    };
  } catch {
    return defaults;
  }
}

function createMatchStats() {
  return {
    pointsPlayed: 0,
    longestRally: 0,
    blocksCalled: 0,
    player: { shots: 0, pureContacts: 0, cracks: 0, rallyWins: 0 },
    ai: { shots: 0, pureContacts: 0, cracks: 0, rallyWins: 0 },
  };
}

const state = {
  mode: 'ready',
  targetScore: 11,
  scores: { player: 0, ai: 0 },
  server: 'player',
  serveFaults: 0,
  rallyCount: 0,
  swingBuffer: 0,
  selectedShot: 'palm',
  difficulty: 'medium',
  lastShotLabel: 'Palm',
  message: 'Your court. Your serve.',
  detail: 'Get loose, pick a shot, and put the first ball on the wall.',
  meta: 'Race to 11 · Flat shot selected',
  player: createActor('player', 480, 450, '#ffb84d'),
  ai: createActor('ai', 480, 218, '#7de4dc'),
  ball: createBall(),
  particles: [],
  shake: 0,
  flash: 0,
  hitStop: 0,
  prediction: {
    valid: false,
    x: COURT.centerX,
    y: COURT.serviceLineY,
    eta: 0,
    wallX: COURT.centerX,
    wallZ: 0,
    bounceNumber: 1,
  },
  callout: {
    text: '',
    color: '#d7f36a',
    x: COURT.centerX,
    y: COURT.frontWallY,
    timer: 0,
    duration: 0.68,
  },
  tendencies: {
    playerShots: Object.fromEntries(Object.keys(SHOTS).map((shotKey) => [shotKey, 0])),
    leftAims: 0,
    rightAims: 0,
    samples: 0,
  },
  matchStats: createMatchStats(),
  soundEnabled: true,
  charge: {
    active: false,
    shotKey: null,
    inputKey: null,
    duration: 0,
    value: 0,
    releasedValue: 0,
    feedbackTimer: 0,
  },
  bufferedCharge: 0,
  input: {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    power: 0,
    holdPosition: false,
    focusRead: false,
    gamepadIndex: null,
    gamepadButtons: [],
  },
  training: null,
  rhythm: loadSavedRhythm(),
  avatar: loadSavedAvatar(),
  avatarPreviewPose: 'idle',
  presentation: {
    introTimer: 0,
    introDuration: 2.4,
    matchWinner: null,
  },
  venueIndex: 0,
  camera: {
    modeIndex: 1,
    zoom: 1,
    x: 480,
    y: 300,
  },
  lastTime: performance.now(),
};

function createActor(id, x, y, color) {
  return {
    id,
    x,
    y,
    radius: 20,
    speed: id === 'player' ? 330 : 300,
    vx: 0,
    vy: 0,
    color,
    cooldown: 0,
    swingTimer: 0,
    swingDuration: 0.18,
    lastShotKey: 'palm',
    plantTimer: 0,
    stepPhase: 0,
    anticipation: 0,
    recoveryX: COURT.centerX,
    recoveryY: COURT.shortLineY + 42,
    reactionTimer: 0,
    poseTimer: 0,
    poseType: 'idle',
    footworkBalance: 1,
    turnLoad: 0,
    inputStrength: 0,
    squeakCooldown: 0,
    holdingGround: false,
    readingBall: false,
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
    verticalSpin: 0,
    bounceHeight: 1,
    bouncePace: 1,
    radius: 6,
    expectedReceiver: 'player',
    lastHitter: null,
    needsFrontWall: true,
    bouncesAfterWall: 0,
    isServe: false,
    firstServeBounceRecorded: false,
    shotType: 'flat',
    shotKey: 'flat',
    contactType: 'serve',
    contactQuality: 'Serve',
    contactBalance: 1,
    chargeGrade: 'loaded',
    crack: false,
    flightAge: 0,
    knuckleSeed: 0,
    trail: [],
  };
}

function getAvatarOption(group, id) {
  const config = AVATAR_OPTIONS[group];
  return config?.options.find((option) => option.id === id) || config?.options[0];
}

function renderAvatarOptionGroups() {
  ui.avatarOptionGroups.replaceChildren();
  for (const [group, config] of Object.entries(AVATAR_OPTIONS)) {
    const section = document.createElement('section');
    section.className = 'avatar-option-group';
    const heading = document.createElement('h3');
    heading.textContent = config.label;
    const list = document.createElement('div');
    list.className = 'avatar-option-list';

    for (const option of config.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'avatar-option-button';
      button.dataset.avatarGroup = group;
      button.dataset.avatarValue = option.id;
      button.setAttribute('aria-pressed', String(state.avatar[group] === option.id));
      if (option.color && option.color !== 'transparent') {
        const swatch = document.createElement('i');
        swatch.style.setProperty('--swatch', option.color);
        swatch.setAttribute('aria-hidden', 'true');
        button.append(swatch);
      }
      const label = document.createElement('span');
      label.textContent = option.label;
      button.append(label);
      button.addEventListener('click', () => {
        state.avatar[group] = option.id;
        renderAvatarOptionGroups();
        drawAvatarPreview();
      });
      list.append(button);
    }

    section.append(heading, list);
    ui.avatarOptionGroups.append(section);
  }
}

function drawPixelEmblem(targetContext, emblemId, x, y, size, color) {
  if (!emblemId || emblemId === 'none') {
    return;
  }
  targetContext.save();
  targetContext.fillStyle = color;
  targetContext.strokeStyle = color;
  targetContext.textAlign = 'center';
  targetContext.textBaseline = 'middle';
  targetContext.font = `900 ${size}px "Barlow Condensed"`;
  if (emblemId === 'wall') {
    targetContext.fillText('W', x, y);
  } else if (emblemId === 'four') {
    targetContext.fillText('4', x, y);
  } else if (emblemId === 'star') {
    targetContext.fillText('★', x, y);
  } else if (emblemId === 'crown') {
    targetContext.fillText('♛', x, y);
  } else if (emblemId === 'bolt') {
    targetContext.fillText('ϟ', x, y);
  } else if (emblemId === 'blocks') {
    const block = size * 0.23;
    targetContext.fillRect(x - block * 1.6, y - block, block, block);
    targetContext.fillRect(x - block * 0.5, y, block, block);
    targetContext.fillRect(x + block * 0.6, y - block, block, block);
  }
  targetContext.restore();
}

function drawAvatarPreview(time = performance.now() / 1000) {
  const preview = ui.avatarPreview;
  const previewContext = preview.getContext('2d');
  const avatar = state.avatar;
  const skin = getAvatarOption('skin', avatar.skin);
  const build = getAvatarOption('build', avatar.build);
  const face = getAvatarOption('face', avatar.face);
  const facialHair = getAvatarOption('facialHair', avatar.facialHair);
  const hair = getAvatarOption('hair', avatar.hair);
  const top = getAvatarOption('top', avatar.top);
  const palette = getAvatarOption('palette', avatar.palette);
  const emblem = getAvatarOption('emblem', avatar.emblem);
  const bottom = getAvatarOption('bottom', avatar.bottom);
  const headwear = getAvatarOption('headwear', avatar.headwear);
  const shoes = getAvatarOption('shoes', avatar.shoes);
  const accessory = getAvatarOption('accessory', avatar.accessory);
  const eyewear = getAvatarOption('eyewear', avatar.eyewear);
  const bodyart = getAvatarOption('bodyart', avatar.bodyart);
  const topColor = palette.id === 'original' ? top.color : palette.top;
  const accentColor = palette.id === 'original' ? top.accent : palette.accent;
  const bottomColor = palette.id === 'original' ? bottom.color : palette.bottom;
  const width = preview.width;
  const height = preview.height;

  previewContext.imageSmoothingEnabled = false;
  const sky = previewContext.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#15394a');
  sky.addColorStop(0.48, '#e17854');
  sky.addColorStop(0.49, '#9a4a36');
  sky.addColorStop(1, '#6f493d');
  previewContext.fillStyle = sky;
  previewContext.fillRect(0, 0, width, height);
  previewContext.strokeStyle = 'rgba(255,255,255,0.16)';
  previewContext.lineWidth = 2;
  for (let line = -height; line < width; line += 24) {
    previewContext.beginPath();
    previewContext.moveTo(line, 0);
    previewContext.lineTo(line + height, height);
    previewContext.stroke();
  }
  previewContext.fillStyle = 'rgba(5,11,18,0.32)';
  previewContext.fillRect(18, 24, width - 36, 42);
  previewContext.fillStyle = '#d7f36a';
  previewContext.font = '900 18px "Barlow Condensed"';
  previewContext.textAlign = 'center';
  previewContext.fillText((avatar.name || 'YOU').toUpperCase(), width / 2, 51);

  const scale = 0.92 * build.scale;
  const bodyWidth = 58 * build.width * scale;
  const centerX = width / 2;
  const pose = state.avatarPreviewPose;
  const pulse = (Math.sin(time * (pose === 'idle' ? 2.4 : 5.2)) + 1) / 2;
  const crouch = pose === 'roller' ? 18 * scale * pulse : 0;
  const bounce = pose === 'victory' ? Math.abs(Math.sin(time * 4.2)) * 9 * scale : Math.sin(time * 2.4) * 2 * scale;
  const floorY = height - 26 - bounce + crouch;
  const stride = pose === 'idle' ? Math.sin(time * 2.4) * 4 * scale : 0;
  previewContext.fillStyle = 'rgba(0,0,0,0.32)';
  previewContext.beginPath();
  previewContext.ellipse(centerX, floorY + 3, bodyWidth * 0.84, 12, 0, 0, Math.PI * 2);
  previewContext.fill();

  previewContext.fillStyle = bottomColor;
  previewContext.fillRect(centerX - bodyWidth * 0.42 - stride, floorY - 84 * scale, bodyWidth * 0.34, 70 * scale);
  previewContext.fillRect(centerX + bodyWidth * 0.08 + stride, floorY - 84 * scale, bodyWidth * 0.34, 70 * scale);
  previewContext.fillStyle = shoes.color;
  previewContext.fillRect(centerX - bodyWidth * 0.55 - stride, floorY - 18 * scale, bodyWidth * 0.48, 15 * scale);
  previewContext.fillRect(centerX + bodyWidth * 0.07 + stride, floorY - 18 * scale, bodyWidth * 0.48, 15 * scale);

  let leftHandX = centerX - bodyWidth * 0.88;
  let leftHandY = floorY - 94 * scale;
  let rightHandX = centerX + bodyWidth * 0.88;
  let rightHandY = floorY - 94 * scale;
  if (pose === 'palm') {
    rightHandX += 26 * scale * pulse;
    rightHandY -= 62 * scale * pulse;
  } else if (pose === 'backhand') {
    rightHandX = centerX - bodyWidth * (0.55 + pulse * 0.6);
    rightHandY -= 42 * scale * pulse;
    leftHandX = centerX + bodyWidth * 0.5;
  } else if (pose === 'roller') {
    rightHandX += 24 * scale * pulse;
    rightHandY += 56 * scale * pulse;
    leftHandY += 18 * scale;
  } else if (pose === 'victory') {
    leftHandX -= 18 * scale;
    rightHandX += 18 * scale;
    leftHandY -= 92 * scale;
    rightHandY -= 92 * scale;
  }
  const shoulderY = floorY - 166 * scale;
  previewContext.strokeStyle = '#071018';
  previewContext.lineWidth = 22 * scale;
  previewContext.beginPath();
  previewContext.moveTo(centerX - bodyWidth * 0.48, shoulderY);
  previewContext.lineTo(leftHandX, leftHandY);
  previewContext.moveTo(centerX + bodyWidth * 0.48, shoulderY);
  previewContext.lineTo(rightHandX, rightHandY);
  previewContext.stroke();
  previewContext.fillStyle = skin.color;
  previewContext.strokeStyle = skin.color;
  previewContext.lineWidth = 12 * scale;
  previewContext.stroke();
  previewContext.fillStyle = topColor;
  previewContext.fillRect(centerX - bodyWidth * 0.65, floorY - 184 * scale, bodyWidth * 1.3, 104 * scale);
  previewContext.fillStyle = accentColor;
  previewContext.fillRect(centerX - bodyWidth * 0.11, floorY - 163 * scale, bodyWidth * 0.22, 34 * scale);
  drawPixelEmblem(previewContext, emblem.id, centerX, floorY - 142 * scale, 28 * scale, accentColor);

  const headSize = 54 * scale;
  const headX = centerX - headSize / 2;
  const headY = floorY - 234 * scale;
  previewContext.fillStyle = skin.color;
  previewContext.fillRect(headX, headY, headSize, 55 * scale);
  previewContext.fillStyle = hair.color;
  if (avatar.hair === 'afro') {
    previewContext.fillRect(headX - 12 * scale, headY - 18 * scale, headSize + 24 * scale, 34 * scale);
    previewContext.fillRect(headX - 5 * scale, headY - 30 * scale, headSize + 10 * scale, 20 * scale);
  } else if (avatar.hair === 'mohawk') {
    previewContext.fillRect(centerX - 8 * scale, headY - 32 * scale, 16 * scale, 38 * scale);
  } else if (['braids', 'locs'].includes(avatar.hair)) {
    previewContext.fillRect(headX - 5 * scale, headY - 12 * scale, headSize + 10 * scale, 20 * scale);
    for (let index = 0; index < 5; index += 1) {
      previewContext.fillRect(headX - 4 * scale + index * 13 * scale, headY + 4 * scale, 6 * scale, 58 * scale);
    }
  } else {
    previewContext.fillRect(headX - 3 * scale, headY - 13 * scale, headSize + 6 * scale, avatar.hair === 'buzz' ? 15 * scale : 25 * scale);
  }
  if (avatar.hair === 'ponytail') {
    previewContext.fillRect(headX + headSize, headY - 2 * scale, 22 * scale, 16 * scale);
  }

  if (avatar.headwear !== 'none') {
    previewContext.fillStyle = headwear.color;
    if (avatar.headwear === 'bucket') {
      previewContext.fillRect(headX - 12 * scale, headY - 22 * scale, headSize + 24 * scale, 12 * scale);
      previewContext.fillRect(headX - 4 * scale, headY - 37 * scale, headSize + 8 * scale, 18 * scale);
    } else {
      previewContext.fillRect(headX - 4 * scale, headY - 21 * scale, headSize + 8 * scale, 17 * scale);
      if (avatar.headwear === 'fitted') {
        previewContext.fillRect(headX + headSize - 2 * scale, headY - 9 * scale, 23 * scale, 7 * scale);
      }
    }
  }

  previewContext.fillStyle = '#071018';
  const eyeHeight = face.id === 'wide' ? 8 * scale : 5 * scale;
  previewContext.fillRect(centerX - 15 * scale, headY + 24 * scale, 8 * scale, eyeHeight);
  previewContext.fillRect(centerX + 7 * scale, headY + 24 * scale, 8 * scale, eyeHeight);
  if (face.id === 'tough') {
    previewContext.fillRect(centerX - 17 * scale, headY + 17 * scale, 13 * scale, 3 * scale);
    previewContext.fillRect(centerX + 4 * scale, headY + 17 * scale, 13 * scale, 3 * scale);
  }
  if (face.id === 'grin') {
    previewContext.fillRect(centerX - 12 * scale, headY + 42 * scale, 24 * scale, 6 * scale);
    previewContext.fillStyle = '#f1eee5';
    previewContext.fillRect(centerX - 9 * scale, headY + 42 * scale, 18 * scale, 3 * scale);
  } else if (face.id === 'soft') {
    previewContext.fillRect(centerX - 8 * scale, headY + 43 * scale, 16 * scale, 3 * scale);
  } else {
    previewContext.fillRect(centerX - 9 * scale, headY + 42 * scale, 18 * scale, 4 * scale);
  }
  if (facialHair.id !== 'none') {
    previewContext.fillStyle = hair.color;
    if (['mustache', 'goatee', 'beard'].includes(facialHair.id)) {
      previewContext.fillRect(centerX - 12 * scale, headY + 36 * scale, 24 * scale, 5 * scale);
    }
    if (['goatee', 'beard'].includes(facialHair.id)) {
      previewContext.fillRect(centerX - 7 * scale, headY + 44 * scale, 14 * scale, 12 * scale);
    }
    if (facialHair.id === 'beard') {
      previewContext.fillRect(centerX - 20 * scale, headY + 39 * scale, 40 * scale, 18 * scale);
    }
    if (facialHair.id === 'stubble') {
      previewContext.globalAlpha = 0.48;
      previewContext.fillRect(centerX - 18 * scale, headY + 39 * scale, 36 * scale, 13 * scale);
      previewContext.globalAlpha = 1;
    }
  }
  if (avatar.eyewear !== 'none') {
    previewContext.fillStyle = eyewear.color || '#071018';
    previewContext.fillRect(centerX - 22 * scale, headY + 18 * scale, 44 * scale, avatar.eyewear === 'clear' ? 5 * scale : 11 * scale);
  }
  if (['chain', 'silverChain'].includes(avatar.accessory)) {
    previewContext.strokeStyle = accessory.color || '#ffd66b';
    previewContext.lineWidth = 4;
    previewContext.beginPath();
    previewContext.arc(centerX, floorY - 168 * scale, 18 * scale, 0.1, Math.PI - 0.1);
    previewContext.stroke();
  }
  if (avatar.accessory === 'hoops') {
    previewContext.strokeStyle = accessory.color || '#ffd66b';
    previewContext.lineWidth = 3;
    previewContext.strokeRect(headX - 5 * scale, headY + 31 * scale, 6 * scale, 10 * scale);
    previewContext.strokeRect(headX + headSize - 1 * scale, headY + 31 * scale, 6 * scale, 10 * scale);
  }
  if (avatar.accessory === 'wristTape') {
    previewContext.fillStyle = accessory.color || '#f1eee5';
    previewContext.fillRect(centerX + bodyWidth * 0.67, floorY - 117 * scale, bodyWidth * 0.2, 10 * scale);
  }
  if (avatar.bodyart !== 'none') {
    previewContext.fillStyle = bodyart.color || '#26333b';
    previewContext.fillRect(centerX - bodyWidth * 0.85, floorY - 146 * scale, bodyWidth * 0.14, 7 * scale);
    previewContext.fillRect(centerX + bodyWidth * 0.71, floorY - 132 * scale, bodyWidth * 0.14, 7 * scale);
    if (avatar.bodyart === 'sleeve') {
      previewContext.fillRect(centerX + bodyWidth * 0.69, floorY - 164 * scale, bodyWidth * 0.18, 48 * scale);
    }
  }
}

function openAvatarCreator() {
  ui.avatarNameInput.value = state.avatar.name || 'You';
  renderAvatarOptionGroups();
  setAvatarPreviewPose(state.avatarPreviewPose);
  drawAvatarPreview();
  if (typeof ui.avatarDialog.showModal === 'function') {
    ui.avatarDialog.showModal();
  }
}

function setAvatarPreviewPose(pose) {
  state.avatarPreviewPose = ['idle', 'palm', 'backhand', 'roller', 'victory'].includes(pose) ? pose : 'idle';
  for (const button of ui.avatarPoseButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.avatarPose === state.avatarPreviewPose));
  }
  drawAvatarPreview();
}

function closeAvatarCreator() {
  if (ui.avatarDialog.open) {
    ui.avatarDialog.close();
  }
}

function applyAvatarPreset(id) {
  const preset = AVATAR_PRESETS[id];
  if (!preset) {
    return;
  }
  Object.assign(state.avatar, preset);
  renderAvatarOptionGroups();
  drawAvatarPreview();
}

function randomizeAvatar() {
  for (const [group, config] of Object.entries(AVATAR_OPTIONS)) {
    const option = config.options[Math.floor(Math.random() * config.options.length)];
    state.avatar[group] = option.id;
  }
  renderAvatarOptionGroups();
  drawAvatarPreview();
}

function saveAvatar() {
  const name = ui.avatarNameInput.value.trim().replace(/\s+/g, ' ').slice(0, 14);
  state.avatar.name = name || 'You';
  try {
    localStorage.setItem('the-wall-avatar', JSON.stringify(state.avatar));
  } catch {
    // The avatar still works for this session if storage is unavailable.
  }
  syncScoreboard();
  closeAvatarCreator();
  setStatus(
    `${state.avatar.name} steps onto the court.`,
    'Fit saved. Your customized player is live in matches and Wall School.',
    'The Locker · Saved on this device'
  );
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

function opponentName() {
  return DIFFICULTIES[state.difficulty].opponent;
}

function syncScoreboard() {
  ui.playerScore.textContent = String(state.scores.player);
  ui.aiScore.textContent = String(state.scores.ai);
  ui.playerName.textContent = state.avatar.name || 'You';
  ui.rallyCount.textContent = String(state.rallyCount);
  ui.shotMode.textContent = SHOTS[state.selectedShot].label;
  ui.difficultyMode.textContent = opponentName();
  ui.aiName.textContent = opponentName();
  const serverName = state.server === 'player' ? 'You' : opponentName();
  const serveNumber = state.serveFaults > 0 ? 'second serve' : 'first serve';
  ui.serveButtonLabel.textContent = state.training
    ? state.mode === 'trainingComplete' ? 'Again' : 'Feed ball'
    : state.mode === 'matchOver'
      ? 'New match'
      : state.server === 'player'
        ? state.serveFaults > 0 ? 'Second serve' : 'Serve'
        : 'Receive';
  ui.serveStatus.textContent = state.training
    ? `Wall School · ${state.training.name}`
    : `${serverName} serve · ${serveNumber}`;
  ui.playerPanel.classList.toggle('is-serving', state.server === 'player');
  ui.aiPanel.classList.toggle('is-serving', state.server === 'ai');
  const cameraMode = CAMERA_MODES[state.camera.modeIndex];
  ui.cameraMode.textContent = cameraMode.label;
  ui.cameraZoom.textContent = `${Math.round(state.camera.zoom * 100)}%`;
  ui.venueButton.textContent = VENUES[state.venueIndex].label;
  syncRhythmUi();
  document.body.dataset.server = state.server;
  document.body.dataset.mode = state.mode;
  document.body.dataset.serveFaults = String(state.serveFaults);
  document.body.dataset.venue = VENUES[state.venueIndex].id;
  document.body.dataset.training = state.training?.id || 'match';
  for (const button of ui.difficultyButtons) {
    const active = button.dataset.difficulty === state.difficulty;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const button of ui.shotButtons) {
    const active = button.dataset.shot === state.selectedShot;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function updateTrainingHud() {
  const drill = state.training;
  ui.trainingHud.hidden = !drill;
  if (!drill) {
    return;
  }
  ui.trainingName.textContent = drill.name;
  ui.trainingScore.textContent = String(drill.score);
  ui.trainingGoal.textContent = String(drill.goal);
  if (drill.id === 'spin') {
    const requested = drill.sequence[drill.attempts % drill.sequence.length];
    ui.trainingPrompt.textContent = `Call: ${SHOTS[requested].label.toUpperCase()} · ${SHOTS[requested].contact}`;
  } else if (drill.id === 'rally') {
    ui.trainingPrompt.textContent = `${drill.misses}/${drill.maxMisses} misses · keep the rhythm`;
  } else {
    ui.trainingPrompt.textContent = drill.prompt;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rhythmArrivalRate() {
  return state.rhythm.masterTempo * state.rhythm.ballClock;
}

function rhythmFootworkRate() {
  return state.rhythm.masterTempo * state.rhythm.footworkClock;
}

function getRhythmVerdict() {
  const arrival = rhythmArrivalRate();
  const relativeRead = rhythmFootworkRate() / Math.max(arrival, 0.01);

  if (arrival < 0.62) {
    return {
      label: 'Film-room pace',
      advice: 'Built for studying wall reads, bounce timing, and where your feet should arrive.',
    };
  }
  if (arrival < 0.82) {
    return {
      label: 'Readable park pace',
      advice: relativeRead > 1.05
        ? 'Your feet have a slight edge over the ball—good for learning real recovery position.'
        : 'Ball and feet stay close enough to reward anticipation without feeling frantic.',
    };
  }
  if (arrival <= 1.02) {
    return {
      label: 'Tournament pace',
      advice: 'The rally clock is close to full speed; early reads and efficient routes matter.',
    };
  }
  return {
    label: 'After-dark arcade pace',
    advice: 'The ball is ahead of the natural read window. Expect reaction play and short rallies.',
  };
}

function syncRhythmUi() {
  if (!ui.rhythmMode) {
    return;
  }
  const preset = RHYTHM_PRESETS[state.rhythm.preset];
  const arrivalPercent = Math.round(rhythmArrivalRate() * 100);
  const values = {
    masterTempo: state.rhythm.masterTempo,
    ballClock: state.rhythm.ballClock,
    footworkClock: state.rhythm.footworkClock,
    readWindow: state.rhythm.readWindow,
    cameraDepth: state.rhythm.cameraDepth,
  };
  ui.rhythmMode.textContent = preset?.label || 'Custom';
  ui.rhythmPercent.textContent = `${arrivalPercent}%`;
  for (const control of ui.rhythmControls) {
    const key = control.dataset.rhythmControl;
    const percent = Math.round(values[key] * 100);
    control.value = String(percent);
    const output = document.getElementById(`${key}Value`);
    if (output) {
      output.value = `${percent}%`;
      output.textContent = `${percent}%`;
    }
  }
  for (const button of ui.rhythmPresetButtons) {
    const active = button.dataset.rhythmPreset === state.rhythm.preset;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  const verdict = getRhythmVerdict();
  ui.rhythmVerdictLabel.textContent = verdict.label;
  ui.rhythmVerdict.textContent = `Ball arrives at ${arrivalPercent}% real-time speed`;
  ui.rhythmAdvice.textContent = verdict.advice;
  document.body.dataset.rhythm = state.rhythm.preset;
}

function saveRhythm() {
  try {
    localStorage.setItem('the-wall-rhythm', JSON.stringify(state.rhythm));
  } catch {
    // Live tuning still works if device storage is unavailable.
  }
}

function applyRhythmPreset(presetId, announce = true) {
  const preset = RHYTHM_PRESETS[presetId];
  if (!preset) {
    return;
  }
  state.rhythm = { preset: presetId, ...preset };
  saveRhythm();
  syncRhythmUi();
  if (announce) {
    setStatus(
      `${preset.label} rhythm loaded.`,
      `${Math.round(rhythmArrivalRate() * 100)}% ball arrival · ${Math.round(rhythmFootworkRate() * 100)}% footwork.`,
      'Official court dimensions and spatial ball physics stay unchanged'
    );
  }
}

function updateRhythmControl(control) {
  const key = control.dataset.rhythmControl;
  if (!Object.hasOwn(state.rhythm, key)) {
    return;
  }
  state.rhythm[key] = Number(control.value) / 100;
  state.rhythm.preset = 'custom';
  state.rhythm.label = 'Custom';
  saveRhythm();
  syncRhythmUi();
}

function openRhythmLab() {
  syncRhythmUi();
  if (typeof ui.rhythmDialog.showModal === 'function') {
    ui.rhythmDialog.showModal();
  }
}

function closeRhythmLab() {
  if (ui.rhythmDialog.open) {
    ui.rhythmDialog.close();
  }
}

async function copyRhythmCode() {
  const rhythm = state.rhythm;
  const code = [
    'WALL-RHYTHM v1',
    rhythm.preset,
    `tempo:${Math.round(rhythm.masterTempo * 100)}`,
    `ball:${Math.round(rhythm.ballClock * 100)}`,
    `feet:${Math.round(rhythm.footworkClock * 100)}`,
    `read:${Math.round(rhythm.readWindow * 100)}`,
    `depth:${Math.round(rhythm.cameraDepth * 100)}`,
  ].join(' | ');
  try {
    await navigator.clipboard.writeText(code);
    ui.copyRhythmButton.textContent = 'Copied';
  } catch {
    window.prompt('Copy this playtest code:', code);
  }
  window.setTimeout(() => {
    ui.copyRhythmButton.textContent = 'Copy playtest code';
  }, 1400);
}

function ensureAudio() {
  if (!state.soundEnabled) {
    return null;
  }
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playSound(kind, intensity = 1, shotKey = null) {
  const audio = ensureAudio();
  if (!audio) {
    return;
  }

  const presets = {
    slap: { frequency: 185, endFrequency: 95, duration: 0.08, gain: 0.16, type: 'square' },
    wall: { frequency: 105, endFrequency: 62, duration: 0.1, gain: 0.18, type: 'triangle' },
    bounce: { frequency: 138, endFrequency: 104, duration: 0.045, gain: 0.08, type: 'sine' },
    crack: { frequency: 82, endFrequency: 38, duration: 0.13, gain: 0.2, type: 'square' },
    squeak: { frequency: 720, endFrequency: 310, duration: 0.055, gain: 0.045, type: 'sawtooth' },
    point: { frequency: 420, endFrequency: 690, duration: 0.22, gain: 0.1, type: 'triangle' },
    loss: { frequency: 190, endFrequency: 92, duration: 0.26, gain: 0.1, type: 'sawtooth' },
  };
  const preset = presets[kind];
  if (!preset) {
    return;
  }

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  const shotPitch = shotKey === 'fist'
    ? 0.72
    : shotKey === 'slice'
      ? 1.16
      : shotKey === 'roller'
        ? 0.84
        : shotKey === 'lob'
          ? 1.08
          : 1;
  const strength = clamp(intensity, 0.55, 1.35);
  oscillator.type = preset.type;
  oscillator.frequency.setValueAtTime(preset.frequency * shotPitch * strength, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    preset.endFrequency * shotPitch,
    now + preset.duration
  );
  gain.gain.setValueAtTime(preset.gain * strength, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + preset.duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + preset.duration);

  if (kind === 'slap' || kind === 'crack') {
    const click = audio.createOscillator();
    const clickGain = audio.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(preset.frequency * shotPitch * 2.5, now);
    click.frequency.exponentialRampToValueAtTime(preset.frequency * shotPitch * 1.4, now + 0.024);
    clickGain.gain.setValueAtTime(preset.gain * strength * 0.34, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
    click.connect(clickGain);
    clickGain.connect(audio.destination);
    click.start(now);
    click.stop(now + 0.024);
  }
}

function addParticles(x, y, color, count = 8) {
  const particleCount = reducedMotionQuery?.matches ? Math.max(2, Math.ceil(count * 0.35)) : count;
  for (let index = 0; index < particleCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 130;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.28 + Math.random() * 0.3,
      maxLife: 0.58,
      size: 2 + Math.random() * 4,
      color,
    });
  }
}

function showCallout(text, x, y, color = '#d7f36a', duration = 0.68) {
  state.callout.text = text;
  state.callout.x = x;
  state.callout.y = y;
  state.callout.color = color;
  state.callout.timer = duration;
  state.callout.duration = duration;
}

function showPointBanner(owner, message, eyebrow = null, forceLoss = false) {
  window.clearTimeout(bannerTimer);
  ui.pointEyebrow.textContent = eyebrow || (owner === 'player' ? 'Your point' : 'Ghost point');
  ui.pointMessage.textContent = message;
  ui.pointBanner.classList.remove('is-visible', 'is-loss');
  void ui.pointBanner.offsetWidth;
  ui.pointBanner.classList.toggle('is-loss', forceLoss || owner !== 'player');
  ui.pointBanner.classList.add('is-visible');
  ui.pointBanner.setAttribute('aria-hidden', 'false');
  bannerTimer = window.setTimeout(() => {
    ui.pointBanner.classList.remove('is-visible', 'is-loss');
    ui.pointBanner.setAttribute('aria-hidden', 'true');
  }, 1600);
}

function hidePointBanner() {
  window.clearTimeout(bannerTimer);
  ui.pointBanner.classList.remove('is-visible', 'is-loss');
  ui.pointBanner.setAttribute('aria-hidden', 'true');
}

function summarizePoint(reason) {
  if (reason.includes('Short fault')) return 'Short fault';
  if (reason.includes('Long fault') || reason.includes('sailed long')) return 'Long';
  if (reason.includes('Down')) return 'Down';
  if (reason.includes('sideline')) return 'Out';
  if (reason.includes('Second bounce')) return 'Second bounce';
  return 'Point';
}

function describeFinish(winner, reason, ball) {
  if (winner !== ball.lastHitter) {
    return summarizePoint(reason);
  }
  if (ball.crack) return 'Crack winner';
  if (ball.shotKey === 'roller') return 'Roller winner';
  if (ball.shotKey === 'kill') return 'Kill winner';
  if (ball.shotKey === 'fist') return 'Knuckle winner';
  if (ball.contactType === 'Fly') return 'Fly winner';
  return summarizePoint(reason);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvasSize = { width, height, dpr };
}

function getActor(id) {
  return id === 'player' ? state.player : state.ai;
}

function resetActorsForServe() {
  const server = getActor(state.server);
  const receiver = getActor(state.server === 'player' ? 'ai' : 'player');
  const serviceY = (COURT.shortLineY + COURT.serviceLineY) / 2;

  server.x = COURT.centerX - 54;
  server.y = serviceY;
  receiver.x = COURT.centerX + 62;
  receiver.y = COURT.serviceLineY + 42;

  for (const actor of [state.player, state.ai]) {
    actor.cooldown = 0;
    actor.swingTimer = 0;
    actor.swingDuration = 0.18;
    actor.plantTimer = 0;
    actor.anticipation = 0;
    actor.reactionTimer = 0;
    actor.poseTimer = 0;
    actor.poseType = 'idle';
    actor.vx = 0;
    actor.vy = 0;
    actor.footworkBalance = 1;
    actor.turnLoad = 0;
    actor.inputStrength = 0;
    actor.squeakCooldown = 0;
    actor.holdingGround = false;
    actor.readingBall = false;
  }
}

function parkBallAtServer() {
  const ball = state.ball;
  const server = getActor(state.server);
  const receiverId = state.server === 'player' ? 'ai' : 'player';
  ball.active = false;
  ball.x = server.x + 24;
  ball.y = server.y - 6;
  ball.z = 18;
  ball.vx = 0;
  ball.vy = 0;
  ball.vz = 0;
  ball.spin = 0;
  ball.verticalSpin = 0;
  ball.bounceHeight = 1;
  ball.bouncePace = 1;
  ball.expectedReceiver = receiverId;
  ball.lastHitter = null;
  ball.needsFrontWall = true;
  ball.bouncesAfterWall = 0;
  ball.isServe = false;
  ball.firstServeBounceRecorded = false;
  ball.shotType = 'flat';
  ball.shotKey = 'flat';
  ball.contactType = 'serve';
  ball.contactQuality = 'Serve';
  ball.contactBalance = 1;
  ball.chargeGrade = 'loaded';
  ball.crack = false;
  ball.flightAge = 0;
  ball.knuckleSeed = 0;
  ball.trail = [];
  state.prediction.valid = false;
}

function resetMatch() {
  gameplayRng.setState(GAMEPLAY_SEED);
  state.training = null;
  ui.trainingHud.hidden = true;
  resetCharge();
  state.mode = 'ready';
  state.scores.player = 0;
  state.scores.ai = 0;
  state.server = 'player';
  state.serveFaults = 0;
  state.rallyCount = 0;
  state.swingBuffer = 0;
  state.hitStop = 0;
  state.callout.timer = 0;
  state.tendencies.playerShots = Object.fromEntries(Object.keys(SHOTS).map((shotKey) => [shotKey, 0]));
  state.tendencies.leftAims = 0;
  state.tendencies.rightAims = 0;
  state.tendencies.samples = 0;
  state.matchStats = createMatchStats();
  state.selectedShot = 'palm';
  state.lastShotLabel = SHOTS.palm.label;
  hidePointBanner();
  resetActorsForServe();
  parkBallAtServer();
  state.presentation.introTimer = state.presentation.introDuration;
  state.presentation.matchWinner = null;
  syncScoreboard();
  setStatus(
    'Your court. Your serve.',
    'Get loose, pick a shot, and put the first ball on the wall.',
    'Race to 11 · Palm topspin selected'
  );
}

function getInterceptType(ball = state.ball, actorId = 'player') {
  if (!ball.active) {
    return 'Serve';
  }
  if (ball.needsFrontWall || ball.expectedReceiver !== actorId) {
    return 'Recover';
  }
  if (ball.bouncesAfterWall === 0) {
    return 'Fly';
  }
  if (ball.bouncesAfterWall === 1 && ball.z < 24 && ball.vz > 0) {
    return 'Short hop';
  }
  if (Math.abs(ball.vz) < 170 && ball.z < 66) {
    return 'Apex';
  }
  return 'Bounce';
}

function getBodyBalance(actor, shotKey = state.selectedShot) {
  const speedRatio = clamp(Math.hypot(actor.vx, actor.vy) / actor.speed, 0, 1);
  const movementScore = clamp(
    (actor.footworkBalance ?? 1) * 0.72 + (1 - speedRatio) * 0.28,
    0,
    1
  );
  if (!state.ball.active || state.ball.expectedReceiver !== actor.id) {
    return clamp(0.68 + movementScore * 0.32, 0, 1);
  }
  const { reachX } = getReachForActor(actor);
  const lateralOffset = clamp((state.ball.x - actor.x) / Math.max(reachX, 1), -1, 1);
  const idealOffset = shotKey === 'backhand' ? -0.52 : 0.5;
  const alignmentScore = clamp(1 - Math.abs(lateralOffset - idealOffset) * 0.72, 0, 1);
  const jamPenalty = Math.abs(lateralOffset) < 0.17 ? 0.16 : 0;
  return clamp(movementScore * 0.58 + alignmentScore * 0.42 - jamPenalty, 0, 1);
}

function getBalanceLabel(balance) {
  if (balance >= 0.82) return 'Feet set';
  if (balance >= 0.62) return 'Balanced';
  if (balance >= 0.4) return 'Moving';
  return 'Jammed';
}

function getShotTiming(shotKey = state.selectedShot) {
  return SHOT_TIMING[shotKey] || SHOT_TIMING.palm;
}

function getChargeGrade(value, shotKey = state.charge.shotKey || state.selectedShot) {
  const timing = getShotTiming(shotKey);
  if (value < 0.2) {
    return {
      label: 'Control touch',
      key: 'early',
      pace: 0.88,
      aimError: -0.012,
      wideRisk: 0.42,
    };
  }
  if (value < timing.sweetStart) {
    return {
      label: 'Loaded',
      key: 'loaded',
      pace: 1,
      aimError: 0.01,
      wideRisk: 0.72,
    };
  }
  if (value <= timing.sweetEnd) {
    return {
      label: 'Clean power',
      key: 'sweet',
      pace: 1.12,
      aimError: 0.008,
      wideRisk: 1,
    };
  }
  if (value <= 0.96) {
    return {
      label: 'Late power',
      key: 'late',
      pace: 1.04,
      aimError: 0.065,
      wideRisk: 1.34,
    };
  }
  return {
    label: 'Overcooked',
    key: 'over',
    pace: 0.96,
    aimError: 0.14,
    wideRisk: 1.72,
  };
}

function resetCharge() {
  state.charge.active = false;
  state.charge.shotKey = null;
  state.charge.inputKey = null;
  state.charge.duration = 0;
  state.charge.value = 0;
  state.charge.releasedValue = 0;
  state.charge.feedbackTimer = 0;
  state.bufferedCharge = 0;
  ui.timingMeter.hidden = true;
  ui.timingFill.style.width = '0%';
}

function syncTimingMeter() {
  const charge = state.charge;
  if (!charge.active && charge.feedbackTimer <= 0) {
    ui.timingMeter.hidden = true;
    return;
  }

  const value = charge.active ? charge.value : charge.releasedValue;
  const shotKey = charge.shotKey || state.selectedShot;
  const timing = getShotTiming(shotKey);
  const grade = getChargeGrade(value, shotKey);
  ui.timingMeter.hidden = false;
  ui.timingMeter.dataset.grade = grade.key;
  ui.timingMeter.style.setProperty('--sweet-start', `${timing.sweetStart * 100}%`);
  ui.timingMeter.style.setProperty('--sweet-width', `${(timing.sweetEnd - timing.sweetStart) * 100}%`);
  ui.timingFill.style.width = `${Math.round(value * 100)}%`;
  ui.timingLabel.textContent = `${SHOTS[shotKey].label} load`;
  ui.timingGrade.textContent = charge.active && value < timing.sweetStart
    ? `${grade.label} · hold for pace`
    : grade.label;
  const balance = getBodyBalance(state.player, shotKey);
  ui.timingBalance.textContent = getBalanceLabel(balance);
  ui.timingIntercept.textContent = `Read: ${getInterceptType().toLowerCase()}`;
}

function beginPlayerCharge(shotKey = state.selectedShot, inputKey = 'manual') {
  if (state.charge.active || !SHOTS[shotKey] || state.mode === 'matchOver') {
    return false;
  }

  const canPrepare = ['ready', 'pointOver', 'trainingReady', 'trainingComplete'].includes(state.mode)
    || (state.ball.active && state.ball.expectedReceiver === 'player');
  if (!canPrepare) {
    return false;
  }

  setShotMode(shotKey);
  state.charge.active = true;
  state.charge.shotKey = shotKey;
  state.charge.inputKey = inputKey;
  state.charge.duration = 0;
  state.charge.value = 0.04;
  state.charge.feedbackTimer = 0;
  state.player.lastShotKey = shotKey;
  state.player.anticipation = 1;
  syncTimingMeter();
  return true;
}

function releasePlayerCharge(inputKey = null) {
  const charge = state.charge;
  if (!charge.active || (inputKey && charge.inputKey !== inputKey)) {
    return false;
  }

  const value = Math.max(0.08, charge.value);
  charge.active = false;
  charge.releasedValue = value;
  charge.feedbackTimer = 0.46;
  charge.inputKey = null;
  syncTimingMeter();
  attemptPlayerSwing(value);
  return true;
}

function updateCharge(dt) {
  const charge = state.charge;
  if (charge.active) {
    charge.duration += dt;
    charge.value = clamp(charge.duration / getShotTiming(charge.shotKey).loadTime, 0.04, 1);
    state.player.anticipation = 1;
  } else {
    charge.feedbackTimer = Math.max(0, charge.feedbackTimer - dt);
  }
  syncTimingMeter();
}

function aimBiasFromKeys() {
  let bias = state.input.aimX;
  if (isDown('arrowleft') || isDown('a')) {
    bias -= 0.9;
  }
  if (isDown('arrowright') || isDown('d')) {
    bias += 0.9;
  }
  return bias;
}

function spinBiasFromKeys() {
  let spin = state.input.aimX * 0.72;
  if (isDown('z')) {
    spin -= 1.2;
  }
  if (isDown('x')) {
    spin += 1.2;
  }
  return spin;
}

function getAiShotWeights() {
  const difficulty = DIFFICULTIES[state.difficulty];
  const weights = { ...difficulty.shotWeights };
  const playerWide = Math.abs(state.player.x - COURT.centerX) > 82;
  const playerDeep = state.player.y > COURT.serviceLineY + 35;
  const lowContact = state.ball.z < 34 || state.ball.bouncesAfterWall === 1;

  if (state.difficulty === 'easy' && state.rallyCount > 4) {
    weights.lob += 0.1;
    weights.fist = Math.max(0.04, weights.fist - 0.05);
    weights.kill = 0.01;
  } else if (state.difficulty === 'medium' && playerWide) {
    weights.slice += 0.08;
    weights.backhand += 0.07;
    weights.palm = Math.max(0.12, weights.palm - 0.08);
  } else if (state.difficulty === 'hard') {
    if (lowContact || playerDeep) {
      weights.kill += 0.15;
      weights.roller += lowContact ? 0.08 : 0.03;
      weights.palm = Math.max(0.06, weights.palm - 0.1);
      weights.lob = Math.max(0.02, weights.lob - 0.04);
    } else {
      weights.fist += 0.08;
      weights.slice += 0.05;
    }
  }

  const tendencies = state.tendencies;
  if (tendencies.samples >= 3) {
    const attackRate = (tendencies.playerShots.kill + tendencies.playerShots.roller) / tendencies.samples;
    const lobRate = tendencies.playerShots.lob / tendencies.samples;
    const palmRate = tendencies.playerShots.palm / tendencies.samples;
    if (attackRate > 0.32) {
      weights.lob += 0.14 * difficulty.adaptation;
      weights.palm += 0.06 * difficulty.adaptation;
    }
    if (lobRate > 0.25) {
      weights.kill += 0.14 * difficulty.adaptation;
      weights.fist += 0.06 * difficulty.adaptation;
    }
    if (palmRate > 0.48) {
      weights.slice += 0.11 * difficulty.adaptation;
      weights.backhand += 0.07 * difficulty.adaptation;
    }
  }

  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0) || 1;
  return Object.fromEntries(Object.entries(weights).map(([key, weight]) => [key, weight / total]));
}

function getShotProfile(actor, options = {}) {
  if (options.serve) {
    return SHOTS.flat;
  }

  if (actor.id === 'player') {
    return SHOTS[state.selectedShot];
  }

  const weights = getAiShotWeights();
  const roll = gameplayRandom();
  let threshold = 0;
  for (const [shotKey, weight] of Object.entries(weights)) {
    threshold += weight;
    if (roll <= threshold) {
      return SHOTS[shotKey];
    }
  }
  return SHOTS.palm;
}

function setShotMode(shotKey, attempt = false) {
  if (!SHOTS[shotKey]) {
    return;
  }

  state.selectedShot = shotKey;
  syncScoreboard();
  if (attempt && !['ready', 'pointOver', 'matchOver'].includes(state.mode)) {
    attemptPlayerSwing();
    return;
  }
  setStatus(
    `${SHOTS[shotKey].label} contact armed.`,
    SHOTS[shotKey].cue,
    state.training
      ? `${state.training.name} · ${SHOTS[shotKey].contact} ready`
      : `Race to ${state.targetScore} · ${SHOTS[shotKey].contact} contact armed`
  );
}

function setDifficulty(level, announce = true) {
  if (!DIFFICULTIES[level]) {
    return;
  }

  state.difficulty = level;
  syncScoreboard();
  if (!state.ball.active && !state.training) {
    state.presentation.introTimer = Math.min(1.8, state.presentation.introDuration);
  }

  if (!announce) {
    return;
  }

  setStatus(
    `${DIFFICULTIES[level].opponent} · ${DIFFICULTIES[level].style}.`,
    DIFFICULTIES[level].tactic,
    `${DIFFICULTIES[level].description} · Current shot: ${SHOTS[state.selectedShot].label}.`
  );
}

function openTraining() {
  if (typeof ui.trainingDialog.showModal === 'function') {
    ui.trainingDialog.showModal();
  }
}

function closeTraining() {
  if (ui.trainingDialog.open) {
    ui.trainingDialog.close();
  }
}

function makeTrainingTarget(index = 0) {
  const leftSide = index % 2 === 0;
  return {
    x: leftSide ? COURT.left + 92 : COURT.right - 92,
    z: index % 4 < 2 ? 72 : 122,
    radius: 48,
  };
}

function startTraining(id) {
  const config = TRAINING_DRILLS[id];
  if (!config) {
    return;
  }
  closeTraining();
  state.training = {
    id,
    ...config,
    score: 0,
    attempts: 0,
    misses: 0,
    target: makeTrainingTarget(0),
    sequence: config.sequence ? [...config.sequence] : [],
  };
  state.mode = 'trainingReady';
  state.server = 'player';
  state.serveFaults = 0;
  state.rallyCount = 0;
  state.swingBuffer = 0;
  resetCharge();
  state.player.x = COURT.centerX;
  state.player.y = COURT.serviceLineY + 34;
  state.ai.x = COURT.right + 160;
  state.ai.y = COURT.bottom + 80;
  parkBallAtServer();
  hidePointBanner();
  updateTrainingHud();
  syncScoreboard();
  setStatus(
    `${config.name}. Feed the first ball.`,
    config.prompt,
    `Wall School · Goal ${config.goal}`
  );
}

function resetTrainingBall(message = 'Feed the next ball.') {
  if (!state.training) {
    return;
  }
  state.mode = 'trainingReady';
  state.ball.active = false;
  state.swingBuffer = 0;
  resetCharge();
  state.player.cooldown = 0;
  state.player.x = clamp(state.player.x, COURT.left + 50, COURT.right - 50);
  state.player.y = COURT.serviceLineY + 34;
  parkBallAtServer();
  syncScoreboard();
  setStatus(message, state.training.prompt, `${state.training.score}/${state.training.goal} complete`);
}

function completeTraining(success) {
  const drill = state.training;
  if (!drill) {
    return;
  }
  state.ball.active = false;
  state.mode = 'trainingComplete';
  showPointBanner(
    success ? 'player' : 'ai',
    success ? 'Lesson passed' : 'Run it back',
    `${drill.score}/${drill.goal}`,
    !success
  );
  setStatus(
    success ? `${drill.name} cleared.` : `${drill.name}: almost.`,
    success ? 'That skill is ready for match pressure.' : 'Reset your feet and take another run.',
    'Press Again or choose another Wall School drill'
  );
  syncScoreboard();
}

function registerTrainingWallHit(ball) {
  const drill = state.training;
  if (!drill) {
    return false;
  }

  let scored = false;
  if (drill.id === 'corners') {
    const distance = Math.hypot(ball.x - drill.target.x, (ball.z - drill.target.z) * 1.35);
    scored = distance <= drill.target.radius;
  } else if (drill.id === 'spin') {
    scored = ball.shotKey === drill.sequence[drill.attempts % drill.sequence.length];
  } else if (drill.id === 'kill') {
    scored = ['kill', 'roller'].includes(ball.shotKey) && ball.z <= 42;
  } else if (drill.id === 'rally') {
    scored = true;
  }

  drill.attempts += 1;
  if (scored) {
    drill.score += 1;
    addParticles(ball.x, COURT.frontWallY - ball.z * 0.34, '#d7f36a', 24);
    playSound('point');
  } else {
    addParticles(ball.x, COURT.frontWallY - ball.z * 0.34, '#ff7048', 12);
  }
  if (drill.id === 'corners') {
    drill.target = makeTrainingTarget(drill.attempts);
  }
  updateTrainingHud();

  if (drill.score >= drill.goal) {
    completeTraining(true);
    return true;
  }
  if (drill.maxAttempts && drill.attempts >= drill.maxAttempts) {
    completeTraining(false);
    return true;
  }
  return false;
}

function registerTrainingMiss(reason) {
  const drill = state.training;
  if (!drill) {
    return false;
  }
  drill.misses += 1;
  if (drill.id === 'rally') {
    drill.score = 0;
    drill.attempts = 0;
  }
  updateTrainingHud();
  if (drill.maxMisses && drill.misses >= drill.maxMisses) {
    completeTraining(false);
  } else {
    resetTrainingBall(`${reason} Feed it again.`);
  }
  return true;
}

function exitTraining() {
  state.training = null;
  ui.trainingHud.hidden = true;
  resetMatch();
}

function getContactQuality(actor, shotKey = actor.id === 'player' ? state.selectedShot : 'palm') {
  const ball = state.ball;
  const { reachX, reachY } = getReachForActor(actor);
  const distance = Math.hypot((ball.x - actor.x) / reachX, (ball.y - actor.y) / reachY);
  const footSpeed = Math.hypot(actor.vx, actor.vy);
  const balance = getBodyBalance(actor, shotKey);
  const interceptType = getInterceptType(ball, actor.id);
  if (distance > 0.82) {
    return { label: 'Reach', type: interceptType, balance, pace: 0.88, aimError: 0.17, heightOffset: 14, color: '#7de4dc' };
  }
  if (balance < 0.32) {
    return { label: 'Jammed', type: interceptType, balance, pace: 0.84, aimError: 0.18, heightOffset: 12, color: '#ff4d83' };
  }
  if (interceptType === 'Fly') {
    return { label: 'Fly', type: interceptType, balance, pace: 1.08, aimError: 0.07, heightOffset: -3, color: '#e5a9ff' };
  }
  if (interceptType === 'Short hop') {
    return { label: 'Short hop', type: interceptType, balance, pace: 1.05, aimError: 0.06, heightOffset: -8, color: '#ffb84d' };
  }
  if (footSpeed > 205) {
    return { label: 'On the run', type: interceptType, balance, pace: 0.93, aimError: 0.11, heightOffset: 8, color: '#ffb84d' };
  }
  if (ball.z > 62) {
    return { label: 'Early', type: interceptType, balance, pace: 0.96, aimError: 0.09, heightOffset: 16, color: '#7de4dc' };
  }
  if (interceptType === 'Apex') {
    return { label: 'Apex', type: interceptType, balance, pace: 1.09, aimError: 0.02, heightOffset: 0, color: '#d7f36a' };
  }
  if (ball.bouncesAfterWall === 1 && ball.z < 18) {
    return { label: 'Late', type: interceptType, balance, pace: 0.9, aimError: 0.14, heightOffset: -8, color: '#ff7a3d' };
  }
  return { label: 'Clean', type: interceptType, balance, pace: 1.07, aimError: 0.025, heightOffset: 0, color: '#d7f36a' };
}

function getAiAimBias(actor, serve = false) {
  if (serve) {
    return (gameplayRandom() - 0.5) * 0.42;
  }
  const difficulty = DIFFICULTIES[state.difficulty];
  const playerOffset = clamp((state.player.x - COURT.centerX) / 250, -1, 1);
  const openCourt = -playerOffset * difficulty.openCourtAim;
  const downLine = state.difficulty === 'hard'
    ? clamp((actor.x - COURT.centerX) / 360, -0.22, 0.22)
    : 0;
  const randomRange = state.difficulty === 'easy' ? 0.46 : state.difficulty === 'medium' ? 0.28 : 0.16;
  return clamp(openCourt + downLine + (gameplayRandom() - 0.5) * randomRange, -0.94, 0.94);
}

function getStepInTransfer(actor, balance) {
  const speed = Math.hypot(actor.vx, actor.vy);
  if (speed < 32 || balance < 0.56) {
    return 0;
  }
  const forwardSpeed = Math.max(0, -actor.vy);
  const forwardShare = forwardSpeed / Math.max(speed, 1);
  const usefulDrive = clamp((forwardSpeed - 28) / 128, 0, 1);
  const control = 1 - clamp((speed - 205) / 135, 0, 0.82);
  return clamp(usefulDrive * forwardShare * control * balance, 0, 1);
}

function strikeBall(actor, options = {}) {
  const ball = state.ball;
  const otherId = state.training && actor.id === 'player'
    ? 'player'
    : actor.id === 'player' ? 'ai' : 'player';
  const rawCharge = actor.id === 'player'
    ? Math.max(options.charge ?? 0.3, state.input.power)
    : clamp(
        (state.difficulty === 'hard' ? 0.72 : state.difficulty === 'medium' ? 0.58 : 0.42)
          + (gameplayRandom() - 0.5) * 0.24,
        0.14,
        0.94
      );
  const shotProfile = getShotProfile(actor, options);
  const shotKey = options.serve
    ? 'flat'
    : actor.id === 'player'
      ? state.selectedShot
      : Object.keys(SHOTS).find((key) => SHOTS[key] === shotProfile) || 'palm';
  const chargeGrade = getChargeGrade(clamp(rawCharge, 0, 1), shotKey);
  const powerThreshold = getShotTiming(shotKey).sweetStart;
  const powerShot = actor.id === 'player'
    ? isDown('shift') || rawCharge >= powerThreshold
    : rawCharge >= powerThreshold;
  const difficulty = DIFFICULTIES[state.difficulty];
  const baseContact = options.serve
    ? { label: 'Serve', type: 'Serve', balance: 1, pace: 1, aimError: 0.02, heightOffset: 0, color: actor.color }
    : getContactQuality(actor, shotKey);
  const stepIn = options.serve ? 0 : getStepInTransfer(actor, baseContact.balance);
  const balancePace = 0.82 + baseContact.balance * 0.18;
  const balanceError = (1 - baseContact.balance) * 0.11;
  const contact = {
    ...baseContact,
    pace: baseContact.pace * chargeGrade.pace * balancePace * (1 + stepIn * 0.08),
    aimError: Math.max(
      0.012,
      (baseContact.aimError + chargeGrade.aimError + balanceError) * (1 - stepIn * 0.18)
    ),
    stepIn,
  };
  const aimBias = clamp(
    actor.id === 'player' ? aimBiasFromKeys() : getAiAimBias(actor, options.serve),
    -1,
    1
  );
  const attackReady = contact.balance >= 0.74
    && ['Clean', 'Apex', 'Short hop', 'Fly'].includes(contact.label)
    && ['loaded', 'sweet'].includes(chargeGrade.key);
  const advancedRisk = shotKey === 'roller' && !attackReady
    ? 0.2
    : shotKey === 'kill' && !attackReady
      ? 0.06
      : 0;
  const wideAimRisk = Math.pow(Math.abs(aimBias), 1.65)
    * chargeGrade.wideRisk
    * (0.035 + Math.max(0, shotProfile.aimScale - 0.85) * 0.045);
  const placementError = (gameplayRandom() - 0.5)
    * 2
    * (contact.aimError + advancedRisk + wideAimRisk);
  let spin = actor.id === 'player'
    ? spinBiasFromKeys() * shotProfile.spinScale
    : (gameplayRandom() - 0.5) * 0.9;
  if (!options.serve && Math.abs(spin) < 0.12 && ['slice', 'backhand'].includes(shotKey)) {
    spin = (aimBias || (actor.id === 'player' ? 0.65 : -0.65)) * shotProfile.spinScale;
  }
  const placementScale = (actor.id === 'player' ? 282 : 222) * shotProfile.aimScale;
  const wallTargetX = clamp(
    COURT.centerX + (aimBias + placementError) * placementScale,
    COURT.left - 26,
    COURT.right + 26
  );
  const heightAim = actor.id === 'player' ? -state.input.aimY * 34 : 0;
  const rollerPenalty = shotKey === 'roller' && !attackReady ? -12 : 0;
  const wallTargetZ = clamp(
    (options.targetHeight ?? shotProfile.targetHeight) + contact.heightOffset + heightAim + rollerPenalty,
    shotProfile.minWallHeight,
    172
  );
  const paceBoost = powerShot ? 1.08 : 1;
  const difficultyPace = actor.id === 'ai' ? difficulty.returnSpeedScale : 1;
  const baseSpeed = options.speed ?? shotProfile.speed * shotProfile.paceScale;
  const launchSpeed = baseSpeed * paceBoost * difficultyPace * contact.pace;
  const originZ = options.serve ? Math.max(ball.z, 20) : Math.max(ball.z, 5);

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
  ball.verticalSpin = shotProfile.verticalSpin;
  ball.bounceHeight = shotProfile.bounceHeight;
  ball.bouncePace = shotProfile.bouncePace;
  ball.expectedReceiver = otherId;
  ball.lastHitter = actor.id;
  ball.needsFrontWall = true;
  ball.bouncesAfterWall = 0;
  ball.isServe = Boolean(options.serve);
  ball.firstServeBounceRecorded = false;
  ball.shotType = options.serve ? 'serve' : shotProfile.label;
  ball.shotKey = shotKey;
  ball.contactType = contact.type;
  ball.contactQuality = contact.label;
  ball.contactBalance = contact.balance;
  ball.chargeGrade = chargeGrade.key;
  ball.crack = false;
  ball.flightAge = 0;
  ball.knuckleSeed = shotKey === 'fist' ? gameplayRandom() * Math.PI * 2 : 0;
  ball.trail = [];
  state.lastShotLabel = ball.shotType;

  if (actor.id === 'player' && !options.serve && !state.training) {
    state.tendencies.playerShots[shotKey] += 1;
    state.tendencies.samples += 1;
    if (aimBias < -0.2) {
      state.tendencies.leftAims += 1;
    } else if (aimBias > 0.2) {
      state.tendencies.rightAims += 1;
    }
  }

  actor.cooldown = 0.22;
  actor.lastShotKey = shotKey;
  actor.swingDuration = ['kill', 'roller'].includes(shotKey) ? 0.24 : shotKey === 'backhand' ? 0.22 : 0.19;
  actor.swingTimer = actor.swingDuration;
  actor.plantTimer = powerShot ? 0.18 : 0.12;
  actor.anticipation = 0;
  actor.vx *= powerShot ? 0.12 : 0.24;
  actor.vy *= powerShot ? 0.12 : 0.24;
  if (actor.id === 'ai') {
    const recoveryShade = 1 - difficulty.recoveryCenter;
    actor.recoveryX = clamp(
      COURT.centerX
        + (state.player.x - COURT.centerX) * 0.22 * recoveryShade
        - ball.vx * 0.022 * recoveryShade,
      COURT.left + 70,
      COURT.right - 70
    );
    actor.recoveryY = COURT.shortLineY + difficulty.recoveryDepth + (shotKey === 'lob' ? 24 : 0);
  }
  state.hitStop = Math.max(state.hitStop, powerShot ? 0.052 : 0.03);
  state.shake = Math.max(state.shake, powerShot ? 5 : 2.5);
  addParticles(ball.x, ball.y - ball.z * 0.34, shotProfile.color || contact.color, powerShot ? 16 : 10);
  playSound('slap', launchSpeed / 900, shotKey);
  if (navigator.vibrate && actor.id === 'player') {
    navigator.vibrate(powerShot ? 18 : 10);
  }
  if (actor.id === 'player') {
    rumble(powerShot ? 90 : 55, powerShot ? 0.6 : 0.28, 0.5);
  }
  const pureContact = !options.serve
    && chargeGrade.key === 'sweet'
    && contact.balance >= 0.82
    && ['Clean', 'Apex', 'Short hop', 'Fly'].includes(contact.label)
    && (contact.label !== 'Fly' || contact.balance >= 0.9);
  if (!options.serve && !state.training) {
    state.matchStats[actor.id].shots += 1;
    if (pureContact) {
      state.matchStats[actor.id].pureContacts += 1;
    }
  }
  if (pureContact) {
    state.hitStop = Math.max(state.hitStop, 0.072);
    state.flash = Math.max(state.flash, 0.7);
    showCallout('PURE', ball.x, ball.y - ball.z * 0.34, shotProfile.color, 0.6);
    rumble(85, 0.52, 0.72);
  } else if (stepIn >= 0.52) {
    showCallout('STEP IN', ball.x, ball.y - ball.z * 0.34, '#d7f36a', 0.54);
  } else if (contact.label === 'Fly') {
    showCallout('FLY', ball.x, ball.y - ball.z * 0.34, '#e5a9ff', 0.48);
  } else if (contact.label === 'Short hop') {
    showCallout('SHORT HOP', ball.x, ball.y - ball.z * 0.34, '#ffb84d', 0.5);
  } else if (contact.label === 'Jammed') {
    showCallout('JAMMED', ball.x, ball.y - ball.z * 0.34, '#ff4d83', 0.5);
  } else if (chargeGrade.key === 'early' && contact.balance >= 0.7) {
    showCallout('TOUCH', ball.x, ball.y - ball.z * 0.34, '#7de4dc', 0.46);
  }

  if (options.serve) {
    state.mode = 'serving';
    setStatus(
      actor.id === 'player' ? 'Serve away.' : `${opponentName()} serves.`,
      actor.id === 'player'
        ? 'Wall first, then land it between the short and long lines.'
        : 'Stay behind the short line and read the first bounce.',
      `${state.serveFaults > 0 ? 'Second serve' : 'First serve'} · Only the server can score`
    );
  } else {
    state.rallyCount += 1;
    setStatus(
      actor.id === 'player'
        ? `${contact.label} ${shotProfile.label.toLowerCase()} — ${getBalanceLabel(contact.balance).toLowerCase()}.`
        : `${opponentName()} · ${difficulty.style}: ${shotProfile.label.toLowerCase()}.`,
      actor.id === 'player'
        ? `${shotProfile.cue} ${
            pureContact
              ? 'Perfect preparation and intercept.'
              : stepIn >= 0.52
                ? 'Weight transferred through the target.'
                : chargeGrade.label + '.'
          }`.trim()
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

  const { reachX, reachY } = getReachForActor(actor);
  const dx = ball.x - actor.x;
  const dy = ball.y - actor.y;
  return Math.abs(dx) <= reachX && Math.abs(dy) <= reachY;
}

function distanceToSegment(pointX, pointY, startX, startY, endX, endY) {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared <= 0.0001) {
    return Math.hypot(pointX - startX, pointY - startY);
  }
  const projection = clamp(
    ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / lengthSquared,
    0,
    1
  );
  return Math.hypot(
    pointX - (startX + segmentX * projection),
    pointY - (startY + segmentY * projection)
  );
}

function resolveAvoidableBlock(receiver, defender) {
  if (
    state.training
    || !state.ball.active
    || state.ball.expectedReceiver !== receiver.id
    || state.ball.needsFrontWall
    || defender.holdingGround
  ) {
    return false;
  }

  const defenderSpeed = Math.hypot(defender.vx, defender.vy);
  if (defenderSpeed < 28) {
    return false;
  }
  const actorCrowding = Math.hypot(defender.x - receiver.x, defender.y - receiver.y);
  const strokeCrowding = Math.hypot(defender.x - state.ball.x, defender.y - state.ball.y);
  const laneDistance = distanceToSegment(
    defender.x,
    defender.y,
    receiver.x,
    receiver.y,
    state.ball.x,
    state.ball.y
  );
  const blocksStroke = actorCrowding < receiver.radius + defender.radius + 12
    || strokeCrowding < defender.radius + state.ball.radius + 17
    || laneDistance < defender.radius + 5;
  if (!blocksStroke) {
    return false;
  }

  const offender = defender.id === 'player' ? 'You' : opponentName();
  state.matchStats.blocksCalled += 1;
  showCallout('BLOCK!', defender.x, defender.y - 32, '#ff4d83', 0.72);
  resolveRally(
    receiver.id,
    'Avoidable block.',
    `${offender} moved through the hitter's access lane. Hold Set before the return to establish a legal stationary position.`
  );
  return true;
}

function resolvePoint(winner, reason, detail) {
  const endingBall = {
    lastHitter: state.ball.lastHitter,
    shotKey: state.ball.shotKey,
    contactType: state.ball.contactType,
    crack: state.ball.crack,
  };
  const serverWon = winner === state.server;
  const sideOut = !serverWon;
  state.matchStats.pointsPlayed += 1;
  state.matchStats.longestRally = Math.max(state.matchStats.longestRally, state.rallyCount);
  state.matchStats[winner].rallyWins += 1;
  if (serverWon) {
    state.scores[winner] += 1;
  } else {
    state.server = winner;
  }
  state.serveFaults = 0;
  state.ball.active = false;
  state.rallyCount = 0;
  state.swingBuffer = 0;
  resetCharge();
  resetActorsForServe();
  parkBallAtServer();
  state.flash = 1;
  state.shake = 9;
  showPointBanner(
    winner,
    sideOut ? winner === 'player' ? 'Your serve' : `${opponentName()} serve` : describeFinish(winner, reason, endingBall),
    sideOut ? 'Side out' : null
  );
  playSound(winner === 'player' ? 'point' : 'loss');
  rumble(160, winner === 'player' ? 0.65 : 0.35, winner === 'player' ? 0.8 : 0.45);

  if (serverWon && state.scores[winner] >= state.targetScore) {
    state.mode = 'matchOver';
  } else {
    state.mode = 'pointOver';
  }
  const winnerActor = getActor(winner);
  const loserActor = getActor(winner === 'player' ? 'ai' : 'player');
  winnerActor.poseType = state.mode === 'matchOver' ? 'victory' : 'pointWin';
  winnerActor.poseTimer = state.mode === 'matchOver' ? 999 : 0.9;
  loserActor.poseType = state.mode === 'matchOver' ? 'defeat' : 'pointLoss';
  loserActor.poseTimer = state.mode === 'matchOver' ? 999 : 0.7;
  state.presentation.matchWinner = state.mode === 'matchOver' ? winner : null;

  syncScoreboard();

  if (state.mode === 'matchOver') {
    const matchMessage = winner === 'player'
      ? 'You closed it out. Match to you.'
      : `${opponentName()} took the match.`;
    setStatus(
      `${matchMessage} ${reason}`,
      detail,
      `Final score ${state.scores.player}-${state.scores.ai}. Press Serve to start a fresh race to ${state.targetScore}.`
    );
    return;
  }

  if (sideOut) {
    const nextServer = winner === 'player' ? 'You take the serve.' : `${opponentName()} takes the serve.`;
    setStatus(
      `Side out. ${nextServer}`,
      reason,
      `Score ${state.scores.player}-${state.scores.ai} · Only the server can score`
    );
  } else {
    const prefix = winner === 'player' ? 'Point for you.' : `Point for ${opponentName()}.`;
    setStatus(
      `${prefix} ${reason}`,
      detail,
      `Score ${state.scores.player}-${state.scores.ai} · ${winner === 'player' ? 'You keep' : `${opponentName()} keeps`} the serve`
    );
  }
}

function handleServeFault(reason, detail) {
  state.serveFaults += 1;
  state.ball.active = false;
  state.rallyCount = 0;
  resetCharge();

  if (state.serveFaults >= 2) {
    const receiver = state.server === 'player' ? 'ai' : 'player';
    resolvePoint(receiver, `Two service faults. ${reason}`, 'Two faults cost the serve.');
    return false;
  }

  state.mode = 'pointOver';
  resetActorsForServe();
  parkBallAtServer();
  showPointBanner(
    state.server,
    'Second serve',
    'Service fault',
    state.server === 'player'
  );
  playSound(state.server === 'player' ? 'loss' : 'point');
  syncScoreboard();
  setStatus(
    `${reason} Second serve.`,
    detail,
    `Score ${state.scores.player}-${state.scores.ai} · One serve remaining`
  );
  return false;
}

function validateServeBounce(y) {
  if (y < COURT.shortLineY) {
    return handleServeFault('Short fault.', 'The first bounce has to clear the short line.');
  }

  if (y > COURT.backLineY) {
    return handleServeFault('Long fault.', 'The first bounce has to land on or before the long line.');
  }

  state.serveFaults = 0;
  state.mode = 'rally';
  setStatus(
    'Good serve. Rally live.',
    state.server === 'player'
      ? `${opponentName()} is reading the bounce. Recover behind the short line.`
      : 'Read the rebound and return it before the second bounce.',
    `Score ${state.scores.player}-${state.scores.ai} · ${SHOTS[state.selectedShot].label} selected`
  );
  syncScoreboard();
  return true;
}

function getTurnStress(actor, desiredX, desiredY, inputStrength) {
  const speed = Math.hypot(actor.vx, actor.vy);
  if (speed < 28 || inputStrength < 0.04) {
    return 0;
  }
  const directionDot = (actor.vx / speed) * desiredX + (actor.vy / speed) * desiredY;
  return clamp((1 - directionDot) * 0.5, 0, 1);
}

function updateFootworkBalance(actor, inputStrength, turnStress, dt) {
  const speedRatio = clamp(Math.hypot(actor.vx, actor.vy) / Math.max(actor.speed, 1), 0, 1.25);
  const targetBalance = clamp(
    1 - inputStrength * 0.38 - speedRatio * 0.12 - turnStress * 0.38,
    0.16,
    1
  );
  const response = targetBalance > actor.footworkBalance ? 8.5 : 15;
  const blend = 1 - Math.exp(-response * dt);
  actor.footworkBalance += (targetBalance - actor.footworkBalance) * blend;
  actor.turnLoad += (turnStress - actor.turnLoad) * (1 - Math.exp(-12 * dt));
  actor.inputStrength = inputStrength;
}

function updatePlayer(dt) {
  if (state.mode === 'matchOver') {
    state.player.holdingGround = false;
    state.player.vx *= Math.max(0, 1 - dt * 12);
    state.player.vy *= Math.max(0, 1 - dt * 12);
    return;
  }
  let moveX = state.input.moveX;
  let moveY = state.input.moveY;

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

  const canHoldGround = state.ball.active && state.ball.expectedReceiver !== 'player';
  const wasHoldingGround = state.player.holdingGround;
  state.player.holdingGround = canHoldGround && (isDown('e') || state.input.holdPosition);
  const canReadBall = state.ball.active && state.ball.expectedReceiver === 'player';
  const wasReadingBall = state.player.readingBall;
  state.player.readingBall = canReadBall && (isDown('q') || state.input.focusRead);
  if (state.player.holdingGround) {
    moveX = 0;
    moveY = 0;
    state.player.vx = 0;
    state.player.vy = 0;
    if (!wasHoldingGround) {
      showCallout('SET', state.player.x, state.player.y - 34, '#7de4dc', 0.42);
      rumble(34, 0.08, 0.2);
    }
  }
  if (state.player.readingBall && !wasReadingBall) {
    showCallout('TRACK', state.player.x, state.player.y - 34, '#e5a9ff', 0.42);
  }

  const rawMagnitude = Math.hypot(moveX, moveY);
  const magnitude = rawMagnitude || 1;
  const inputStrength = clamp(rawMagnitude, 0, 1);
  const desiredX = rawMagnitude > 0 ? moveX / magnitude : 0;
  const desiredY = rawMagnitude > 0 ? moveY / magnitude : 0;
  const turnStress = getTurnStress(state.player, desiredX, desiredY, inputStrength);
  const preparationScale = state.player.plantTimer > 0
    ? 0.12
    : state.charge.active
      ? 0.62 - state.charge.value * 0.18
      : 1;
  const movementScale = preparationScale * (state.player.readingBall ? 0.86 : 1);
  const targetSpeed = state.player.speed * movementScale * inputStrength;
  const targetVx = desiredX * targetSpeed;
  const targetVy = desiredY * targetSpeed;
  const response = rawMagnitude > 0 ? 12.5 + turnStress * 8 : 18;
  const blend = 1 - Math.exp(-response * dt);
  state.player.vx += (targetVx - state.player.vx) * blend;
  state.player.vy += (targetVy - state.player.vy) * blend;
  state.player.x += state.player.vx * dt;
  state.player.y += state.player.vy * dt;
  updateFootworkBalance(state.player, inputStrength, turnStress, dt);

  if (turnStress > 0.62 && Math.hypot(state.player.vx, state.player.vy) > 155 && state.player.squeakCooldown <= 0) {
    state.player.squeakCooldown = 0.24;
    addParticles(state.player.x, state.player.y + 8, 'rgba(244, 220, 176, 0.72)', 4);
    playSound('squeak', 0.82 + turnStress * 0.2);
    rumble(28, 0.08, 0.16);
  }

  const unclampedX = state.player.x;
  state.player.x = clamp(unclampedX, COURT.left + 24, COURT.right - 24);
  if (state.player.x !== unclampedX) {
    state.player.vx = 0;
  }
  const waitingForServe = !state.ball.active && ['ready', 'pointOver'].includes(state.mode);
  const minY = waitingForServe
    ? state.server === 'player' ? COURT.shortLineY + 12 : COURT.serviceLineY + 28
    : COURT.frontWallY + 74;
  const maxY = waitingForServe && state.server === 'player'
    ? COURT.serviceLineY - 12
    : COURT.bottom - 20;
  const unclampedY = state.player.y;
  state.player.y = clamp(unclampedY, minY, maxY);
  if (state.player.y !== unclampedY) {
    state.player.vy = 0;
  }

  const playerSpeed = Math.hypot(state.player.vx, state.player.vy);
  state.player.stepPhase += playerSpeed * dt * 0.055;
  if (!state.charge.active) {
    const ball = state.ball;
    const preparing = ball.active
      && ball.expectedReceiver === 'player'
      && !ball.needsFrontWall
      && Math.hypot(ball.x - state.player.x, ball.y - state.player.y) < 150;
    const anticipationTarget = preparing ? 1 : 0;
    state.player.anticipation += (anticipationTarget - state.player.anticipation) * Math.min(1, dt * 12);
  }
}

function rumble(duration = 70, strong = 0.35, weak = 0.55) {
  if (state.input.gamepadIndex === null) {
    return;
  }
  const gamepad = findGamepad(state.input.gamepadIndex);
  playGamepadRumble(gamepad, {
    duration,
    strongMagnitude: strong,
    weakMagnitude: weak,
  });
}

function triggerShot(shotKey) {
  setShotMode(shotKey);
  attemptPlayerSwing();
}

function updateGamepad() {
  const gamepad = findGamepad(state.input.gamepadIndex);
  state.input.gamepadIndex = gamepad?.index ?? null;
  if (!gamepad) {
    state.input.moveX = 0;
    state.input.moveY = 0;
    state.input.aimX = 0;
    state.input.aimY = 0;
    state.input.power = 0;
    state.input.holdPosition = false;
    state.input.focusRead = false;
    ui.gamepadStatus.classList.remove('is-connected');
    ui.gamepadStatus.querySelector('span').textContent = 'Keys';
    if (state.charge.inputKey?.startsWith('pad-')) {
      resetCharge();
    }
    return;
  }

  state.input.moveX = applyDeadzone(gamepad.axes[0] || 0);
  state.input.moveY = applyDeadzone(gamepad.axes[1] || 0);
  state.input.aimX = applyDeadzone(gamepad.axes[2] || 0, 0.12);
  state.input.aimY = applyDeadzone(gamepad.axes[3] || 0, 0.12);
  state.input.power = gamepad.buttons[6]?.value || 0;
  state.input.holdPosition = Boolean(gamepad.buttons[10]?.pressed);
  state.input.focusRead = Boolean(gamepad.buttons[11]?.pressed);
  ui.gamepadStatus.classList.add('is-connected');
  ui.gamepadStatus.querySelector('span').textContent = 'Gamepad';

  const shotButtons = {
    0: 'palm',
    1: 'fist',
    2: 'slice',
    3: 'backhand',
    4: 'lob',
    5: 'kill',
    7: 'roller',
  };
  for (const [indexText, shotKey] of Object.entries(shotButtons)) {
    const index = Number(indexText);
    const pressed = Boolean(gamepad.buttons[index]?.pressed);
    if (pressed && !state.input.gamepadButtons[index]) {
      beginPlayerCharge(shotKey, `pad-${index}`);
    } else if (!pressed && state.input.gamepadButtons[index]) {
      releasePlayerCharge(`pad-${index}`);
    }
    state.input.gamepadButtons[index] = pressed;
  }

  const cameraPressed = Boolean(gamepad.buttons[8]?.pressed);
  if (cameraPressed && !state.input.gamepadButtons[8]) {
    cycleCamera();
  }
  state.input.gamepadButtons[8] = cameraPressed;
}

function updateAi(dt) {
  if (state.training) {
    return;
  }
  const ai = state.ai;
  if (state.mode === 'matchOver') {
    ai.holdingGround = false;
    ai.vx *= Math.max(0, 1 - dt * 12);
    ai.vy *= Math.max(0, 1 - dt * 12);
    return;
  }
  const ball = state.ball;
  const difficulty = DIFFICULTIES[state.difficulty];

  let targetX = COURT.centerX;
  let targetY = state.server === 'ai'
    ? (COURT.shortLineY + COURT.serviceLineY) / 2
    : COURT.shortLineY + difficulty.recoveryDepth;

  if (ball.active) {
    if (ball.expectedReceiver === 'ai' && !ball.needsFrontWall) {
      const liveReadX = ball.x + ball.vx * difficulty.anticipationSeconds;
      const liveReadY = ball.y + ball.vy * difficulty.anticipationSeconds;
      const canReadBounce = state.prediction.valid && state.prediction.bounceNumber === 1;
      const predictedX = canReadBounce ? state.prediction.x : liveReadX;
      const predictedY = canReadBounce ? state.prediction.y : liveReadY;
      targetX = clamp(
        liveReadX * (1 - difficulty.predictionBlend) + predictedX * difficulty.predictionBlend,
        COURT.left + 34,
        COURT.right - 34
      );
      targetY = clamp(
        liveReadY * (1 - difficulty.predictionBlend) + predictedY * difficulty.predictionBlend - difficulty.targetOffset,
        COURT.frontWallY + 65,
        COURT.bottom - 130
      );
    } else if (ball.expectedReceiver === 'ai' && ball.needsFrontWall && ball.vy < -1) {
      const timeToWall = clamp((COURT.frontWallY - ball.y) / ball.vy, 0, 0.8);
      const projectedWallX = ball.x + ball.vx * timeToWall;
      targetX = clamp(
        COURT.centerX + (projectedWallX - COURT.centerX) * 0.46,
        COURT.left + 55,
        COURT.right - 55
      );
      targetY = COURT.shortLineY + difficulty.recoveryDepth;
    } else if (ball.lastHitter === 'ai') {
      targetX = ai.recoveryX;
      targetY = ai.recoveryY;
    }
  }

  const playerApproachingContact = ball.active
    && ball.expectedReceiver === 'player'
    && !ball.needsFrontWall
    && Math.hypot(ball.x - state.player.x, ball.y - state.player.y) < 108;
  const aiNearPlayerLane = Math.hypot(ai.x - state.player.x, ai.y - state.player.y) < 72
    || distanceToSegment(ai.x, ai.y, state.player.x, state.player.y, ball.x, ball.y) < ai.radius + 8;
  ai.holdingGround = playerApproachingContact && aiNearPlayerLane;
  if (ai.holdingGround) {
    targetX = ai.x;
    targetY = ai.y;
    ai.vx = 0;
    ai.vy = 0;
  }

  const dx = targetX - ai.x;
  const dy = targetY - ai.y;
  const distance = Math.hypot(dx, dy);
  const inputStrength = clamp(distance / 62, 0, 1);
  const desiredX = distance > 1 ? dx / distance : 0;
  const desiredY = distance > 1 ? dy / distance : 0;
  const turnStress = getTurnStress(ai, desiredX, desiredY, inputStrength);
  const aiMovementScale = ai.plantTimer > 0 ? 0.1 : 1;
  const targetSpeed = ai.speed * difficulty.speedScale * aiMovementScale * inputStrength;
  const targetVx = desiredX * targetSpeed;
  const targetVy = desiredY * targetSpeed;
  const blend = 1 - Math.exp(-difficulty.movementResponse * dt);
  ai.vx += (targetVx - ai.vx) * blend;
  ai.vy += (targetVy - ai.vy) * blend;
  ai.x += ai.vx * dt;
  ai.y += ai.vy * dt;
  updateFootworkBalance(ai, inputStrength, turnStress, dt);
  ai.stepPhase += Math.hypot(ai.vx, ai.vy) * dt * 0.055;

  ai.x = clamp(ai.x, COURT.left + 24, COURT.right - 24);
  ai.y = clamp(ai.y, COURT.frontWallY + 40, COURT.bottom - 20);

  const inStrikeWindow = canActorStrike(ai) && ball.z <= difficulty.contactHeight;
  const anticipationTarget = inStrikeWindow || (
    ball.active
    && ball.expectedReceiver === 'ai'
    && !ball.needsFrontWall
    && Math.hypot(ball.x - ai.x, ball.y - ai.y) < 125
  ) ? 1 : 0;
  ai.anticipation += (anticipationTarget - ai.anticipation) * Math.min(1, dt * 13);

  if (inStrikeWindow && ai.reactionTimer <= 0) {
    if (!resolveAvoidableBlock(ai, state.player)) {
      strikeBall(ai);
    }
  }
}

function resolveRally(winner, reason, detail) {
  if (state.training) {
    registerTrainingMiss(reason);
    return;
  }
  resolvePoint(winner, reason, detail);
}

function simulateBallStep(dt) {
  const ball = state.ball;
  if (!ball.active) {
    const server = getActor(state.server);
    ball.x = server.x + 24;
    ball.y = server.y - 6;
    return;
  }

  ball.flightAge += dt;
  ball.vx += ball.spin * PHYSICS.curveAcceleration * dt;
  if (ball.shotKey === 'fist') {
    ball.vx += Math.sin(ball.flightAge * 31 + ball.knuckleSeed) * PHYSICS.knuckleAcceleration * dt;
    ball.vz += Math.sin(ball.flightAge * 23 + ball.knuckleSeed * 1.7) * PHYSICS.knuckleLift * dt;
  }
  const dragFactor = Math.exp(-PHYSICS.airDrag * dt);
  ball.vx *= dragFactor;
  ball.vy *= dragFactor;
  ball.vz -= PHYSICS.gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;
  ball.trail.unshift({ x: ball.x, y: ball.y, z: ball.z });
  ball.trail.length = Math.min(ball.trail.length, 12);

  if (ball.y >= COURT.bottom + 96 || ball.x <= COURT.left - 180 || ball.x >= COURT.right + 180) {
    resolveRally(ball.expectedReceiver, 'That one sailed long.', 'The back line still matters in this prototype.');
    return;
  }

  if (ball.y <= COURT.frontWallY && ball.vy < 0) {
    if (ball.x < COURT.left || ball.x > COURT.right || ball.z > COURT.wallHeightZ) {
      resolveRally(
        ball.expectedReceiver,
        ball.z > COURT.wallHeightZ ? 'Out over the top edge.' : 'Wide of the front wall.',
        'Use the wall face—its top and side edges are out.'
      );
      return;
    }
    ball.y = COURT.frontWallY;
    if (registerTrainingWallHit(ball)) {
      return;
    }
    ball.vy = Math.abs(ball.vy) * PHYSICS.wallLoss;
    ball.vz -= ball.verticalSpin * 46;
    ball.vx += ball.spin * 44;
    ball.spin *= 0.8;
    ball.needsFrontWall = false;
    ball.bouncesAfterWall = 0;
    const crackContact = ball.z <= PHYSICS.crackHeight
      && ['roller', 'kill'].includes(ball.shotKey)
      && ball.contactBalance >= 0.72
      && !['Reach', 'Jammed', 'Late', 'On the run'].includes(ball.contactQuality)
      && ['loaded', 'sweet'].includes(ball.chargeGrade);
    if (crackContact) {
      ball.crack = true;
      if (!state.training && ball.lastHitter) {
        state.matchStats[ball.lastHitter].cracks += 1;
      }
      ball.vy *= ball.shotKey === 'roller' ? 0.68 : 0.78;
      ball.vz = Math.min(ball.vz, ball.shotKey === 'roller' ? -58 : -34);
      ball.bounceHeight = ball.shotKey === 'roller' ? 0.08 : Math.min(ball.bounceHeight, 0.28);
      ball.bouncePace = Math.max(ball.bouncePace, 1.08);
      state.hitStop = Math.max(state.hitStop, 0.085);
      state.flash = Math.max(state.flash, 0.9);
      state.shake = Math.max(state.shake, 10);
      showCallout('CRACK!', ball.x, COURT.frontWallY - 8, '#ff4d83', 0.88);
      addParticles(ball.x, COURT.frontWallY - 5, '#ff4d83', 30);
      playSound('crack');
      rumble(120, 0.82, 0.66);
    }
    if (ball.expectedReceiver === 'ai') {
      state.ai.reactionTimer = DIFFICULTIES[state.difficulty].reactionDelay;
    }
    state.shake = Math.max(state.shake, Math.min(8, Math.abs(ball.vy) / 125));
    state.flash = Math.max(state.flash, 0.42);
    if (!crackContact) {
      addParticles(ball.x, ball.y - ball.z * 0.34, '#ffd66b', 12);
      playSound('wall');
      rumble(45, 0.18, 0.42);
    }
  }

  if (ball.z <= 0) {
    ball.z = 0;
    ball.vz = Math.abs(ball.vz) * PHYSICS.bounceLoss * ball.bounceHeight;
    ball.vx *= PHYSICS.sideLoss * ball.bouncePace;
    ball.vy *= ball.bouncePace;
    ball.bouncesAfterWall += 1;
    addParticles(ball.x, ball.y, 'rgba(244, 220, 176, 0.9)', 5);
    playSound('bounce');

    if (ball.needsFrontWall) {
      resolveRally(ball.expectedReceiver, 'Down before the front wall.', 'Every return has to reach the wall before it dies.');
      return;
    }

    if (ball.x < COURT.left || ball.x > COURT.right || ball.y > COURT.backLineY) {
      if (ball.bouncesAfterWall > 1) {
        resolveRally(
          ball.lastHitter,
          'Second bounce. Rally over.',
          'The first bounce was live; the return player could not reach it before bounce two.'
        );
        return;
      }
      if (ball.isServe && !ball.firstServeBounceRecorded) {
        ball.firstServeBounceRecorded = true;
        handleServeFault(
          ball.y > COURT.backLineY ? 'Long fault.' : 'Outside fault.',
          'The serve rebound must land between the short and long lines and inside both sidelines.'
        );
        return;
      }
      resolveRally(
        ball.expectedReceiver,
        ball.y > COURT.backLineY ? 'The first bounce sailed beyond the long line.' : 'The first bounce leaked over a sideline.',
        'A fly ball can travel outside the lines, but its court bounce has to stay in the playing zone.'
      );
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
      resolveRally(ball.lastHitter, 'Second bounce. Rally over.', 'You only get one bounce to set up the return.');
      return;
    }
  }
}

function predictFirstBounce() {
  const source = state.ball;
  if (!source.active) {
    return { valid: false };
  }
  const ball = {
    x: source.x,
    y: source.y,
    z: source.z,
    vx: source.vx,
    vy: source.vy,
    vz: source.vz,
    spin: source.spin,
    verticalSpin: source.verticalSpin,
    bounceHeight: source.bounceHeight,
    bouncePace: source.bouncePace,
    needsFrontWall: source.needsFrontWall,
    shotKey: source.shotKey,
    contactBalance: source.contactBalance,
    contactQuality: source.contactQuality,
    chargeGrade: source.chargeGrade,
    flightAge: source.flightAge,
    knuckleSeed: source.knuckleSeed,
  };
  let wallX = source.needsFrontWall ? source.x : state.prediction.wallX;
  let wallZ = source.needsFrontWall ? source.z : state.prediction.wallZ;
  let eta = 0;

  for (let stepIndex = 0; stepIndex < 360; stepIndex += 1) {
    const dt = PHYSICS.fixedStep;
    eta += dt;
    ball.flightAge += dt;
    ball.vx += ball.spin * PHYSICS.curveAcceleration * dt;
    if (ball.shotKey === 'fist') {
      ball.vx += Math.sin(ball.flightAge * 31 + ball.knuckleSeed) * PHYSICS.knuckleAcceleration * dt;
      ball.vz += Math.sin(ball.flightAge * 23 + ball.knuckleSeed * 1.7) * PHYSICS.knuckleLift * dt;
    }
    const dragFactor = Math.exp(-PHYSICS.airDrag * dt);
    ball.vx *= dragFactor;
    ball.vy *= dragFactor;
    ball.vz -= PHYSICS.gravity * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.z += ball.vz * dt;

    if (ball.y <= COURT.frontWallY && ball.vy < 0) {
      if (ball.x < COURT.left || ball.x > COURT.right || ball.z > COURT.wallHeightZ) {
        return { valid: false };
      }
      ball.y = COURT.frontWallY;
      wallX = ball.x;
      wallZ = ball.z;
      ball.vy = Math.abs(ball.vy) * PHYSICS.wallLoss;
      ball.vz -= ball.verticalSpin * 46;
      ball.vx += ball.spin * 44;
      ball.spin *= 0.8;
      ball.needsFrontWall = false;
      const crackContact = ball.z <= PHYSICS.crackHeight
        && ['roller', 'kill'].includes(ball.shotKey)
        && ball.contactBalance >= 0.72
        && !['Reach', 'Jammed', 'Late', 'On the run'].includes(ball.contactQuality)
        && ['loaded', 'sweet'].includes(ball.chargeGrade);
      if (crackContact) {
        ball.vy *= ball.shotKey === 'roller' ? 0.68 : 0.78;
        ball.vz = Math.min(ball.vz, ball.shotKey === 'roller' ? -58 : -34);
      }
    }

    if (ball.z <= 0) {
      if (ball.needsFrontWall) {
        return { valid: false };
      }
      return {
        valid: true,
        x: ball.x,
        y: ball.y,
        eta,
        wallX,
        wallZ,
        bounceNumber: source.bouncesAfterWall + 1,
        inBounds: ball.x >= COURT.left && ball.x <= COURT.right && ball.y <= COURT.backLineY,
      };
    }
  }
  return { valid: false };
}

function updateBall(dt) {
  let remaining = Math.max(0, dt);
  let substeps = 0;
  while (remaining > 0.00001 && substeps < PHYSICS.maxSubsteps) {
    const step = Math.min(PHYSICS.fixedStep, remaining);
    const wasActive = state.ball.active;
    simulateBallStep(step);
    remaining -= step;
    substeps += 1;
    if (wasActive && !state.ball.active) {
      break;
    }
  }
  const prediction = predictFirstBounce();
  Object.assign(state.prediction, prediction);
}

function updateEffects(dt) {
  state.flash = Math.max(0, state.flash - dt * 3.8);
  state.shake = Math.max(0, state.shake - dt * 22);
  state.presentation.introTimer = Math.max(0, state.presentation.introTimer - dt);
  state.callout.timer = Math.max(0, state.callout.timer - dt);
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.94;
    particle.vy *= 0.94;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updateCooldowns(dt) {
  for (const actor of [state.player, state.ai]) {
    actor.cooldown = Math.max(0, actor.cooldown - dt);
    actor.swingTimer = Math.max(0, actor.swingTimer - dt);
    actor.plantTimer = Math.max(0, actor.plantTimer - dt);
    actor.reactionTimer = Math.max(0, actor.reactionTimer - dt);
    actor.poseTimer = Math.max(0, actor.poseTimer - dt);
    actor.squeakCooldown = Math.max(0, actor.squeakCooldown - dt);
    if (actor.poseTimer <= 0 && actor.poseType !== 'idle') {
      actor.poseType = 'idle';
    }
  }

  state.swingBuffer = Math.max(0, state.swingBuffer - dt);
  if (state.swingBuffer > 0 && canActorStrike(state.player)) {
    state.swingBuffer = 0;
    if (!resolveAvoidableBlock(state.player, state.ai)) {
      strikeBall(state.player, { charge: state.bufferedCharge });
    }
    state.bufferedCharge = 0;
  }
}

function attemptPlayerSwing(chargeValue = 0.3) {
  if (['ready', 'pointOver', 'trainingReady', 'trainingComplete'].includes(state.mode)) {
    startServe(chargeValue);
    return;
  }

  if (canActorStrike(state.player)) {
    state.swingBuffer = 0;
    state.bufferedCharge = 0;
    if (!resolveAvoidableBlock(state.player, state.ai)) {
      strikeBall(state.player, { charge: chargeValue });
    }
  } else if (state.ball.active && state.ball.expectedReceiver === 'player') {
    state.swingBuffer = 0.2;
    state.bufferedCharge = chargeValue;
    state.player.lastShotKey = state.selectedShot;
    state.player.anticipation = 1;
    setStatus(
      `${getChargeGrade(chargeValue).label} swing loaded.`,
      'Keep moving into the ball—the input will fire when it enters your reach.',
      `${SHOTS[state.selectedShot].label} armed · 200 ms input buffer`
    );
  } else if (state.ball.active) {
    setStatus('Recover your court.', `${opponentName()} owns this touch.`, `Selected shot: ${SHOTS[state.selectedShot].label}.`);
  }
}

function startServe(chargeValue = 0.3) {
  if (state.training) {
    if (state.mode === 'trainingComplete') {
      startTraining(state.training.id);
      return;
    }
    if (state.ball.active) {
      return;
    }
    state.mode = 'training';
    parkBallAtServer();
    strikeBall(state.player, {
      speed: 790,
      targetHeight: state.training.id === 'kill' ? 34 : 76,
      charge: chargeValue,
    });
    syncScoreboard();
    return;
  }
  if (state.mode === 'matchOver') {
    resetMatch();
    return;
  }

  if (state.mode !== 'ready' && state.mode !== 'pointOver') {
    return;
  }

  state.presentation.introTimer = 0;
  state.presentation.matchWinner = null;
  resetActorsForServe();
  parkBallAtServer();
  const server = getActor(state.server);
  strikeBall(server, {
    serve: true,
    speed: state.server === 'player' ? 860 : 825,
    targetHeight: 78,
    charge: state.server === 'player' ? chargeValue : undefined,
  });
}

function cycleCamera() {
  state.camera.modeIndex = (state.camera.modeIndex + 1) % CAMERA_MODES.length;
  syncScoreboard();
  const mode = CAMERA_MODES[state.camera.modeIndex];
  setStatus(
    `${mode.label} camera.`,
    mode.id === 'broadcast'
      ? 'The full rally and both recovery positions stay visible.'
      : mode.id === 'player'
        ? 'A deeper baseline-style view makes foreground footwork and wall angles easier to read.'
      : mode.id === 'follow'
        ? 'A tighter match camera follows you and the live ball.'
        : 'A low, angled crop adds courtside speed and comic-book energy.',
    `Camera ${mode.label} · Zoom ${Math.round(state.camera.zoom * 100)}%`
  );
}

function changeCameraZoom(delta) {
  state.camera.zoom = clamp(Math.round((state.camera.zoom + delta) * 10) / 10, 0.8, 1.5);
  syncScoreboard();
}

function cycleVenue() {
  state.venueIndex = (state.venueIndex + 1) % VENUES.length;
  syncScoreboard();
  setStatus(
    `Next court: ${VENUES[state.venueIndex].label}.`,
    'The atmosphere changes; the official 20′ × 34′ competition geometry does not.',
    'Tap the court name to travel again'
  );
}

const SKYLINE = [
  [0, 45, 86], [55, 24, 107], [112, 72, 62], [166, 38, 96], [236, 62, 76],
  [290, 30, 112], [352, 78, 59], [421, 45, 90], [491, 64, 74], [552, 26, 116],
  [620, 84, 58], [694, 42, 96], [758, 64, 76], [823, 34, 108], [895, 70, 72],
];

const COURT_CRACKS = [
  [132, 411, 164, 425, 150, 446], [292, 500, 322, 486, 350, 496],
  [646, 392, 620, 411, 632, 432], [770, 482, 744, 496, 762, 516],
  [430, 352, 447, 369, 432, 384], [210, 248, 229, 258, 214, 272],
];

function drawFence() {
  ctx.save();
  ctx.strokeStyle = 'rgba(185, 211, 212, 0.18)';
  ctx.lineWidth = 1;
  for (let x = -160; x < 1120; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 155, 155);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 155, 0);
    ctx.lineTo(x, 155);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(6, 14, 20, 0.72)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, 145);
  ctx.lineTo(960, 145);
  ctx.stroke();
  for (const x of [34, 926]) {
    ctx.fillStyle = '#101a20';
    ctx.fillRect(x - 6, 0, 12, 600);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x - 3, 0, 2, 600);
  }
  ctx.restore();
}

function drawVenueSilhouette(venue) {
  ctx.save();
  if (venue.id === 'west4') {
    for (let index = 0; index < SKYLINE.length; index += 1) {
      const [x, width, height] = SKYLINE[index];
      ctx.fillStyle = index % 3 === 0 ? '#122734' : '#0d202b';
      ctx.fillRect(x, 142 - height, width, height);
      ctx.fillStyle = 'rgba(255, 190, 93, 0.28)';
      for (let wx = x + 10; wx < x + width - 5; wx += 18) {
        for (let wy = 154 - height; wy < 128; wy += 18) {
          if ((wx + wy + index) % 3 > 0.8) {
            ctx.fillRect(wx, wy, 5, 7);
          }
        }
      }
    }
  } else if (venue.id === 'coney') {
    ctx.fillStyle = 'rgba(21, 66, 83, 0.76)';
    ctx.fillRect(0, 116, 960, 30);
    ctx.strokeStyle = 'rgba(18, 52, 64, 0.82)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(108, 118, 68, Math.PI, 0);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (let angle = Math.PI; angle <= Math.PI * 2; angle += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(108, 118);
      ctx.lineTo(108 + Math.cos(angle) * 68, 118 + Math.sin(angle) * 68);
      ctx.stroke();
    }
    ctx.fillStyle = '#173543';
    ctx.fillRect(720, 76, 132, 70);
    ctx.fillStyle = 'rgba(255, 236, 180, 0.32)';
    ctx.fillRect(734, 90, 18, 34);
    ctx.fillRect(764, 90, 18, 34);
  } else {
    ctx.fillStyle = 'rgba(37, 38, 67, 0.8)';
    ctx.fillRect(0, 128, 960, 18);
    for (const x of [94, 832]) {
      ctx.strokeStyle = '#20283d';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(x, 142);
      ctx.quadraticCurveTo(x - 4, 92, x + 8, 34);
      ctx.stroke();
      ctx.fillStyle = '#20283d';
      for (let angle = -2.7; angle < -0.3; angle += 0.38) {
        ctx.save();
        ctx.translate(x + 8, 38);
        ctx.rotate(angle);
        ctx.fillRect(0, -5, 58, 10);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

function drawCrowd() {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 12, 18, 0.76)';
  const spectators = [
    [52, 124, 9], [82, 130, 7], [116, 125, 10], [160, 132, 7],
    [800, 130, 7], [838, 123, 10], [876, 130, 8], [914, 124, 9],
  ];
  for (const [x, y, radius] of spectators) {
    ctx.beginPath();
    ctx.arc(x, y - radius * 2.4, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - radius * 0.8, y - radius * 1.6, radius * 1.6, radius * 2.4);
  }
  ctx.restore();
}

function drawTrainingTarget() {
  const drill = state.training;
  if (!drill) {
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  if (drill.id === 'corners') {
    const y = COURT.frontWallY - drill.target.z * 0.34;
    const pulse = 1 + Math.sin(performance.now() / 180) * 0.08;
    ctx.strokeStyle = '#d7f36a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(drill.target.x, y, drill.target.radius * 0.42 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(215, 243, 106, 0.38)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(drill.target.x, y, drill.target.radius * 0.68 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f6ffbd';
    ctx.font = '900 18px "Barlow Condensed"';
    ctx.textAlign = 'center';
    ctx.fillText(drill.attempts % 2 === 0 ? 'BX' : 'BK', drill.target.x, y + 6);
  } else if (drill.id === 'kill') {
    ctx.fillStyle = 'rgba(255, 77, 131, 0.2)';
    ctx.fillRect(COURT.left + 24, COURT.frontWallY - 18, COURT.right - COURT.left - 48, 18);
    ctx.strokeStyle = '#ff4d83';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 9]);
    ctx.beginPath();
    ctx.moveTo(COURT.left + 24, COURT.frontWallY - 18);
    ctx.lineTo(COURT.right - 24, COURT.frontWallY - 18);
    ctx.stroke();
  } else if (drill.id === 'spin') {
    const requested = drill.sequence[drill.attempts % drill.sequence.length];
    ctx.fillStyle = SHOTS[requested].color;
    ctx.globalAlpha = 0.28;
    ctx.font = '900 58px "Barlow Condensed"';
    ctx.textAlign = 'center';
    ctx.fillText(SHOTS[requested].label.toUpperCase(), COURT.centerX, 126);
  }
  ctx.restore();
}

function drawBackground() {
  const venue = VENUES[state.venueIndex];
  const sky = ctx.createLinearGradient(0, 0, 0, 240);
  sky.addColorStop(0, venue.skyTop);
  sky.addColorStop(0.5, venue.id === 'west4' ? '#d77a58' : venue.skyBottom);
  sky.addColorStop(1, venue.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(-240, -160, 1440, 920);

  const sun = ctx.createRadialGradient(786, 50, 4, 786, 50, 92);
  sun.addColorStop(0, 'rgba(255, 240, 174, 0.95)');
  sun.addColorStop(0.28, 'rgba(255, 178, 83, 0.48)');
  sun.addColorStop(1, 'rgba(255, 126, 63, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(680, -50, 220, 220);

  drawVenueSilhouette(venue);
  drawFence();
  drawCrowd();

  ctx.fillStyle = '#07131b';
  ctx.fillRect(0, COURT.frontWallY, COURT.left, 458);
  ctx.fillRect(COURT.right, COURT.frontWallY, 960 - COURT.right, 458);

  const wall = ctx.createLinearGradient(0, COURT.top, 0, COURT.frontWallY);
  wall.addColorStop(0, venue.wallTop);
  wall.addColorStop(1, venue.wallBottom);
  ctx.fillStyle = wall;
  ctx.fillRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.frontWallY - COURT.top);

  ctx.strokeStyle = 'rgba(84, 29, 25, 0.28)';
  ctx.lineWidth = 1;
  for (let y = COURT.top + 17; y < COURT.frontWallY; y += 18) {
    ctx.beginPath();
    ctx.moveTo(COURT.left, y);
    ctx.lineTo(COURT.right, y);
    ctx.stroke();
  }
  for (let x = COURT.left + 34; x < COURT.right; x += 68) {
    ctx.beginPath();
    ctx.moveTo(x, COURT.top);
    ctx.lineTo(x, COURT.frontWallY);
    ctx.stroke();
  }

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.font = '900 64px "Barlow Condensed"';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#1d6971';
  ctx.strokeText('THE WALL', COURT.centerX - 4, 125);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#8c315f';
  ctx.strokeText('THE WALL', COURT.centerX + 3, 128);
  ctx.fillStyle = '#fff0c7';
  ctx.fillText('THE WALL', COURT.centerX, 126);
  ctx.font = '900 16px "Barlow Condensed"';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#d7f36a';
  ctx.fillText('BX 2 BK', COURT.left + 20, 92);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7de4dc';
  ctx.fillText('NO EASY POINTS', COURT.right - 18, 136);
  ctx.restore();
  drawTrainingTarget();

  const floor = ctx.createLinearGradient(0, COURT.frontWallY, 0, COURT.bottom);
  floor.addColorStop(0, venue.floorTop);
  floor.addColorStop(0.5, '#a8674d');
  floor.addColorStop(1, venue.floorBottom);
  ctx.fillStyle = floor;
  ctx.fillRect(COURT.left, COURT.frontWallY, COURT.right - COURT.left, COURT.bottom - COURT.frontWallY);

  for (let index = 0; index < 9; index += 1) {
    const start = Math.pow(index / 9, 1.55);
    const end = Math.pow((index + 1) / 9, 1.55);
    const y = COURT.frontWallY + (COURT.bottom - COURT.frontWallY) * start;
    const nextY = COURT.frontWallY + (COURT.bottom - COURT.frontWallY) * end;
    ctx.fillStyle = index % 2 === 0 ? 'rgba(255,255,255,0.026)' : 'rgba(0,0,0,0.035)';
    ctx.fillRect(COURT.left, y, COURT.right - COURT.left, nextY - y);
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 239, 204, 0.085)';
  ctx.lineWidth = 2;
  for (const offset of [-170, -86, 86, 170]) {
    ctx.beginPath();
    ctx.moveTo(COURT.centerX + offset * 0.22, COURT.frontWallY);
    ctx.lineTo(COURT.centerX + offset, COURT.bottom);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(5, 11, 18, 0.08)';
  ctx.beginPath();
  ctx.moveTo(COURT.left, COURT.frontWallY);
  ctx.lineTo(COURT.centerX - 62, COURT.frontWallY);
  ctx.lineTo(COURT.centerX - 206, COURT.bottom);
  ctx.lineTo(COURT.left, COURT.bottom);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(COURT.centerX + 62, COURT.frontWallY);
  ctx.lineTo(COURT.right, COURT.frontWallY);
  ctx.lineTo(COURT.right, COURT.bottom);
  ctx.lineTo(COURT.centerX + 206, COURT.bottom);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(47, 34, 30, 0.26)';
  ctx.lineWidth = 2;
  for (const crack of COURT_CRACKS) {
    ctx.beginPath();
    ctx.moveTo(crack[0], crack[1]);
    ctx.lineTo(crack[2], crack[3]);
    ctx.lineTo(crack[4], crack[5]);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 239, 204, 0.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);
  drawCourtLine(COURT.frontWallY, 4);
  drawCourtLine(COURT.shortLineY, 3);
  drawCourtLine(COURT.backLineY, 3);

  const serviceMarkerLength = COURT.serviceMarkerLength;
  ctx.strokeStyle = 'rgba(255, 239, 204, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(COURT.left, COURT.serviceLineY);
  ctx.lineTo(COURT.left + serviceMarkerLength, COURT.serviceLineY);
  ctx.moveTo(COURT.right - serviceMarkerLength, COURT.serviceLineY);
  ctx.lineTo(COURT.right, COURT.serviceLineY);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 239, 204, 0.48)';
  ctx.font = '700 11px "Space Grotesk"';
  ctx.textAlign = 'left';
  ctx.fillText('16′ SHORT', COURT.left + 14, COURT.shortLineY - 10);
  ctx.fillText('25′ SERVE', COURT.left + 14, COURT.serviceLineY - 10);
  ctx.fillText('34′ LONG', COURT.left + 14, COURT.backLineY - 10);
  ctx.textAlign = 'center';
  ctx.fillText('20′ WALL · 16′ HIGH', COURT.centerX, COURT.top + 15);
}

function drawCourtLine(y, width) {
  ctx.lineWidth = width;
  ctx.strokeStyle = 'rgba(255, 239, 204, 0.88)';
  ctx.beginPath();
  ctx.moveTo(COURT.left, y);
  ctx.lineTo(COURT.right, y);
  ctx.stroke();
}

function getRenderDepthScale(y) {
  const progress = clamp(
    (y - COURT.frontWallY) / (COURT.bottom - COURT.frontWallY),
    0,
    1
  );
  const depth = state.rhythm.cameraDepth;
  return 0.72 + Math.pow(progress, 1.08) * 0.5 * depth;
}

function drawActor(actor) {
  const isPlayer = actor.id === 'player';
  const avatar = isPlayer
    ? state.avatar
    : RIVAL_AVATARS[state.difficulty];
  const skin = getAvatarOption('skin', avatar.skin);
  const build = getAvatarOption('build', avatar.build);
  const face = getAvatarOption('face', avatar.face);
  const facialHair = getAvatarOption('facialHair', avatar.facialHair);
  const hair = getAvatarOption('hair', avatar.hair);
  const top = getAvatarOption('top', avatar.top);
  const palette = getAvatarOption('palette', avatar.palette);
  const emblem = getAvatarOption('emblem', avatar.emblem);
  const bottom = getAvatarOption('bottom', avatar.bottom);
  const headwear = getAvatarOption('headwear', avatar.headwear);
  const shoes = getAvatarOption('shoes', avatar.shoes);
  const accessory = getAvatarOption('accessory', avatar.accessory);
  const eyewear = getAvatarOption('eyewear', avatar.eyewear);
  const bodyart = getAvatarOption('bodyart', avatar.bodyart);
  const topColor = palette.id === 'original' ? top.color : palette.top;
  const accentColor = palette.id === 'original' ? top.accent : palette.accent;
  const bottomColor = palette.id === 'original' ? bottom.color : palette.bottom;
  const depth = getRenderDepthScale(actor.y);
  const playerCameraBoost = CAMERA_MODES[state.camera.modeIndex].id === 'player' ? 1.1 : 1;
  const size = actor.radius * depth * build.scale * playerCameraBoost;
  const bodyWidth = build.width;
  const isPlayerReady = isPlayer && canActorStrike(actor);
  let actorX = Math.round(actor.x / 2) * 2;
  let actorY = Math.round(actor.y / 2) * 2;
  if (state.presentation.introTimer > 0 && !state.training) {
    const introProgress = 1 - state.presentation.introTimer / state.presentation.introDuration;
    const eased = 1 - Math.pow(1 - clamp(introProgress, 0, 1), 3);
    const entranceX = isPlayer ? COURT.left - 90 : COURT.right + 90;
    actorX = entranceX + (actorX - entranceX) * eased;
    actorY -= Math.abs(Math.sin(introProgress * Math.PI * 3)) * size * 0.18;
  }
  if (actor.poseType === 'victory' && actor.poseTimer > 0) {
    actorY -= Math.abs(Math.sin(performance.now() / 130)) * size * 0.18;
  }
  const speed = Math.hypot(actor.vx, actor.vy);
  const moving = speed > 34;
  const stride = actor.plantTimer > 0
    ? 0.2
    : moving
      ? Math.sin(actor.stepPhase) * 0.2
      : 0;
  const swingProgress = actor.swingTimer > 0
    ? 1 - actor.swingTimer / Math.max(actor.swingDuration, 0.01)
    : 0;
  const swingArc = actor.swingTimer > 0 ? Math.sin(clamp(swingProgress, 0, 1) * Math.PI * 0.9) : 0;
  const anticipation = clamp(actor.anticipation, 0, 1);
  const shotKey = actor.lastShotKey || (isPlayer ? state.selectedShot : 'palm');
  const defeatPose = ['defeat', 'pointLoss'].includes(actor.poseType) && actor.poseTimer > 0 ? 1 : 0;
  const lowPose = Math.max(
    ['kill', 'roller'].includes(shotKey) ? Math.max(anticipation, swingArc) : 0,
    defeatPose * 0.38
  );

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (isPlayerReady) {
    ctx.strokeStyle = 'rgba(215, 243, 106, 0.78)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(actorX, actorY + 8, size * 1.65, size * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (speed > 110) {
    ctx.strokeStyle = isPlayer ? 'rgba(255, 184, 77, 0.48)' : 'rgba(125, 228, 220, 0.42)';
    ctx.lineWidth = 2;
    for (let index = 0; index < 3; index += 1) {
      const offset = (index - 1) * 7;
      ctx.beginPath();
      ctx.moveTo(actorX - actor.vx * 0.09, actorY + offset - actor.vy * 0.06);
      ctx.lineTo(actorX - actor.vx * 0.025, actorY + offset - actor.vy * 0.02);
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.ellipse(actorX + 4, actorY + size * 1.05, size * 1.25, size * 0.4, -0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(actorX, actorY);
  ctx.translate(0, size * lowPose * 0.16);
  const leanDirection = shotKey === 'backhand' ? -1 : 1;
  ctx.rotate(leanDirection * swingArc * 0.08);
  ctx.lineCap = 'square';

  const leftFootX = -size * (0.28 + stride);
  const rightFootX = size * (0.28 - stride);
  const legTopY = size * 0.48;
  const footY = size * (1.22 - lowPose * 0.08);
  ctx.strokeStyle = '#071018';
  ctx.lineWidth = size * 0.5 * bodyWidth;
  ctx.beginPath();
  ctx.moveTo(-size * 0.22 * bodyWidth, legTopY);
  ctx.lineTo(leftFootX, footY);
  ctx.moveTo(size * 0.22 * bodyWidth, legTopY);
  ctx.lineTo(rightFootX, footY);
  ctx.stroke();
  ctx.strokeStyle = bottomColor;
  ctx.lineWidth = size * 0.3 * bodyWidth;
  ctx.beginPath();
  ctx.moveTo(-size * 0.22 * bodyWidth, legTopY);
  ctx.lineTo(leftFootX, footY);
  ctx.moveTo(size * 0.22 * bodyWidth, legTopY);
  ctx.lineTo(rightFootX, footY);
  ctx.stroke();

  ctx.fillStyle = shoes.color;
  ctx.strokeStyle = '#071018';
  ctx.lineWidth = 2.4;
  ctx.fillRect(leftFootX - size * 0.3, footY - size * 0.04, size * 0.58, size * 0.25);
  ctx.strokeRect(leftFootX - size * 0.3, footY - size * 0.04, size * 0.58, size * 0.25);
  ctx.fillRect(rightFootX - size * 0.22, footY - size * 0.04, size * 0.58, size * 0.25);
  ctx.strokeRect(rightFootX - size * 0.22, footY - size * 0.04, size * 0.58, size * 0.25);

  ctx.strokeStyle = '#081019';
  ctx.lineWidth = 3.5;
  ctx.fillStyle = topColor || actor.color;
  ctx.beginPath();
  ctx.moveTo(-size * 0.72 * bodyWidth, -size * (0.5 + anticipation * 0.08));
  ctx.lineTo(-size * 0.2 * bodyWidth, -size * 0.82);
  ctx.lineTo(size * 0.72 * bodyWidth, -size * (0.5 + anticipation * 0.08));
  ctx.lineTo(size * 0.48 * bodyWidth, size * (0.62 - lowPose * 0.08));
  ctx.lineTo(-size * 0.1 * bodyWidth, size * 0.76);
  ctx.lineTo(-size * 0.48 * bodyWidth, size * (0.62 - lowPose * 0.08));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawPixelEmblem(ctx, emblem.id, 0, -size * 0.08, size * 0.5, accentColor);

  let leftHand = { x: -0.98, y: 0.22 };
  let rightHand = { x: 0.98, y: 0.22 };
  if (shotKey === 'backhand') {
    leftHand = { x: 0.58 - anticipation * 0.22, y: 0.08 };
    rightHand = { x: -0.92 - anticipation * 0.38 - swingArc * 0.34, y: -0.08 - swingArc * 0.48 };
  } else if (shotKey === 'roller') {
    leftHand = { x: -0.72, y: 0.4 };
    rightHand = { x: 0.92 + swingArc * 0.36, y: 0.62 + swingArc * 0.46 };
  } else if (shotKey === 'kill') {
    leftHand = { x: -0.8, y: 0.3 };
    rightHand = { x: 1.02 + swingArc * 0.5, y: 0.1 - swingArc * 0.52 };
  } else if (shotKey === 'slice') {
    leftHand = { x: -0.88, y: 0.1 };
    rightHand = { x: 0.82 + swingArc * 0.5, y: 0.5 - swingArc * 0.28 };
  } else if (shotKey === 'lob') {
    leftHand = { x: -0.78, y: 0.22 };
    rightHand = { x: 0.72 + swingArc * 0.38, y: -0.42 - Math.max(anticipation, swingArc) * 0.74 };
  } else {
    leftHand = { x: -0.92 - anticipation * 0.14, y: 0.28 };
    rightHand = { x: 0.92 + swingArc * 0.48, y: 0.2 - Math.max(anticipation * 0.38, swingArc) * 0.82 };
  }
  if (actor.poseTimer > 0 && actor.poseType === 'victory') {
    leftHand = { x: -1.18, y: -1.12 };
    rightHand = { x: 1.18, y: -1.12 };
  } else if (actor.poseTimer > 0 && actor.poseType === 'pointWin') {
    leftHand = { x: -0.84, y: 0.18 };
    rightHand = { x: 1.08, y: -0.96 };
  } else if (actor.poseTimer > 0 && actor.poseType === 'defeat') {
    leftHand = { x: -0.62, y: 0.82 };
    rightHand = { x: 0.62, y: 0.82 };
  } else if (actor.poseTimer > 0 && actor.poseType === 'pointLoss') {
    leftHand = { x: -0.76, y: 0.58 };
    rightHand = { x: 0.76, y: 0.58 };
  }

  ctx.strokeStyle = '#081019';
  ctx.lineWidth = size * 0.56;
  ctx.beginPath();
  ctx.moveTo(-size * 0.48, -size * 0.24);
  ctx.lineTo(size * leftHand.x, size * leftHand.y);
  ctx.moveTo(size * 0.48, -size * 0.24);
  ctx.lineTo(size * rightHand.x, size * rightHand.y);
  ctx.stroke();
  ctx.strokeStyle = skin.color;
  ctx.lineWidth = size * 0.3;
  ctx.stroke();

  if (avatar.bodyart !== 'none') {
    ctx.fillStyle = bodyart.color || '#26333b';
    ctx.fillRect(size * rightHand.x - size * 0.17, size * rightHand.y - 2, size * 0.28, 4);
    ctx.fillRect(size * leftHand.x - size * 0.11, size * leftHand.y - 2, size * 0.26, 4);
    if (avatar.bodyart === 'sleeve') {
      ctx.fillRect(size * 0.5, -size * 0.24, size * 0.18, size * 0.62);
    }
  }
  if (avatar.accessory === 'wristTape') {
    ctx.fillStyle = accessory.color || '#f1eee5';
    ctx.fillRect(size * rightHand.x - size * 0.13, size * rightHand.y - size * 0.1, size * 0.25, size * 0.2);
  }

  const headY = -size * 1.38;
  ctx.fillStyle = skin.color;
  ctx.strokeStyle = '#071018';
  ctx.lineWidth = 3;
  ctx.fillRect(-size * 0.42, headY, size * 0.84, size * 0.76);
  ctx.strokeRect(-size * 0.42, headY, size * 0.84, size * 0.76);

  ctx.fillStyle = hair.color;
  if (avatar.hair === 'afro') {
    ctx.fillRect(-size * 0.58, headY - size * 0.3, size * 1.16, size * 0.42);
    ctx.fillRect(-size * 0.46, headY - size * 0.46, size * 0.92, size * 0.26);
  } else if (avatar.hair === 'mohawk') {
    ctx.fillRect(-size * 0.13, headY - size * 0.46, size * 0.26, size * 0.5);
  } else if (['braids', 'locs'].includes(avatar.hair)) {
    ctx.fillRect(-size * 0.48, headY - size * 0.2, size * 0.96, size * 0.28);
    for (let index = 0; index < 4; index += 1) {
      ctx.fillRect(-size * 0.48 + index * size * 0.3, headY, size * 0.1, size * 0.82);
    }
  } else {
    ctx.fillRect(-size * 0.46, headY - size * (avatar.hair === 'buzz' ? 0.1 : 0.2), size * 0.92, size * (avatar.hair === 'buzz' ? 0.16 : 0.28));
  }
  if (avatar.hair === 'ponytail') {
    ctx.fillRect(size * 0.36, headY - size * 0.08, size * 0.38, size * 0.22);
  }

  if (avatar.headwear !== 'none') {
    ctx.fillStyle = headwear.color;
    if (avatar.headwear === 'bucket') {
      ctx.fillRect(-size * 0.58, headY - size * 0.28, size * 1.16, size * 0.12);
      ctx.fillRect(-size * 0.42, headY - size * 0.48, size * 0.84, size * 0.24);
    } else {
      ctx.fillRect(-size * 0.46, headY - size * 0.3, size * 0.92, size * 0.22);
      if (avatar.headwear === 'fitted') {
        ctx.fillRect(size * 0.32, headY - size * 0.14, size * 0.38, size * 0.09);
      }
    }
  }

  ctx.fillStyle = '#071018';
  const eyeHeight = face.id === 'wide' ? size * 0.14 : size * 0.09;
  ctx.fillRect(-size * 0.28, headY + size * 0.3, size * 0.18, eyeHeight);
  ctx.fillRect(size * 0.1, headY + size * 0.3, size * 0.18, eyeHeight);
  if (face.id === 'tough') {
    ctx.fillRect(-size * 0.32, headY + size * 0.2, size * 0.25, size * 0.05);
    ctx.fillRect(size * 0.07, headY + size * 0.2, size * 0.25, size * 0.05);
  }
  if (face.id === 'grin') {
    ctx.fillRect(-size * 0.22, headY + size * 0.56, size * 0.44, size * 0.1);
  } else {
    ctx.fillRect(-size * 0.16, headY + size * 0.58, size * 0.32, size * 0.06);
  }
  if (facialHair.id !== 'none') {
    ctx.fillStyle = hair.color;
    if (['mustache', 'goatee', 'beard'].includes(facialHair.id)) {
      ctx.fillRect(-size * 0.2, headY + size * 0.5, size * 0.4, size * 0.08);
    }
    if (['goatee', 'beard'].includes(facialHair.id)) {
      ctx.fillRect(-size * 0.12, headY + size * 0.58, size * 0.24, size * 0.17);
    }
    if (facialHair.id === 'beard') {
      ctx.fillRect(-size * 0.34, headY + size * 0.5, size * 0.68, size * 0.25);
    }
    if (facialHair.id === 'stubble') {
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-size * 0.3, headY + size * 0.5, size * 0.6, size * 0.2);
      ctx.globalAlpha = 1;
    }
  }
  if (avatar.eyewear !== 'none') {
    ctx.fillStyle = eyewear.color || '#071018';
    ctx.fillRect(
      -size * 0.36,
      headY + size * 0.22,
      size * 0.72,
      avatar.eyewear === 'clear' ? size * 0.09 : size * 0.2
    );
  }

  if (['chain', 'silverChain'].includes(avatar.accessory)) {
    ctx.strokeStyle = accessory.color || '#ffd66b';
    ctx.lineWidth = Math.max(1.5, size * 0.08);
    ctx.beginPath();
    ctx.arc(0, -size * 0.48, size * 0.28, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
  if (avatar.accessory === 'hoops') {
    ctx.strokeStyle = accessory.color || '#ffd66b';
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.strokeRect(-size * 0.5, headY + size * 0.35, size * 0.1, size * 0.18);
    ctx.strokeRect(size * 0.4, headY + size * 0.35, size * 0.1, size * 0.18);
  }

  ctx.fillStyle = 'rgba(5, 11, 18, 0.78)';
  ctx.font = `800 ${Math.max(8, size * 0.52)}px "Barlow Condensed"`;
  ctx.textAlign = 'center';
  ctx.fillText(isPlayer ? '01' : 'G', 0, size * 0.08);

  if (actor.plantTimer > 0) {
    ctx.fillStyle = 'rgba(244, 220, 176, 0.62)';
    ctx.fillRect(leftFootX - size * 0.44, footY + size * 0.22, size * 0.22, 3);
    ctx.fillRect(rightFootX + size * 0.28, footY + size * 0.18, size * 0.28, 3);
  }
  if (actor.holdingGround) {
    ctx.fillStyle = '#071018';
    ctx.strokeStyle = '#7de4dc';
    ctx.lineWidth = 2;
    ctx.fillRect(-size * 0.72, -size * 2.38, size * 1.44, size * 0.48);
    ctx.strokeRect(-size * 0.72, -size * 2.38, size * 1.44, size * 0.48);
    ctx.fillStyle = '#7de4dc';
    ctx.font = `900 ${Math.max(8, size * 0.42)}px "Space Grotesk"`;
    ctx.fillText('SET', 0, -size * 2.04);
  }
  ctx.restore();
}

function drawBall() {
  const ball = state.ball;
  const renderY = ball.y - ball.z * 0.34;
  const shotColor = SHOTS[ball.shotKey]?.color || '#ffd04e';
  const ballDepth = getRenderDepthScale(ball.y);
  const playerCameraBoost = CAMERA_MODES[state.camera.modeIndex].id === 'player' ? 1.08 : 1;
  const renderRadius = ball.radius * (0.78 + ballDepth * 0.34) * playerCameraBoost;

  for (let index = ball.trail.length - 1; index >= 0; index -= 1) {
    const point = ball.trail[index];
    const alpha = (ball.trail.length - index) / ball.trail.length;
    const trailDepth = getRenderDepthScale(point.y);
    ctx.globalAlpha = alpha * 0.28;
    ctx.fillStyle = shotColor;
    ctx.beginPath();
    ctx.arc(
      point.x,
      point.y - point.z * 0.34,
      Math.max(1.5, ball.radius * trailDepth * alpha * 0.7),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(ball.x + 2, ball.y + 8, renderRadius + 5, renderRadius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(ball.x - 2, renderY - 3, 1, ball.x, renderY, renderRadius + 9);
  glow.addColorStop(0, '#fffbd5');
  glow.addColorStop(0.35, shotColor);
  glow.addColorStop(0.72, '#ff9b2f');
  glow.addColorStop(1, 'rgba(255, 106, 42, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ball.x, renderY, renderRadius + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shotColor;
  ctx.beginPath();
  ctx.arc(ball.x, renderY, renderRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(115, 49, 19, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ball.x, renderY, renderRadius * 0.64, -0.9, 1.35);
  ctx.stroke();

  if (Math.abs(ball.spin) > 0.2 || Math.abs(ball.verticalSpin) > 0.2) {
    ctx.strokeStyle = shotColor;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      ball.x,
      renderY,
      renderRadius + 7,
      ball.spin >= 0 ? -1.2 : 1.9,
      ball.spin >= 0 ? 1.6 : 4.7
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function getAimPreview() {
  const charge = state.charge;
  if (!charge.active) {
    return null;
  }
  const shotKey = charge.shotKey || state.selectedShot;
  const shot = SHOTS[shotKey];
  const grade = getChargeGrade(charge.value, shotKey);
  const balance = getBodyBalance(state.player, shotKey);
  const aimBias = clamp(aimBiasFromKeys(), -1, 1);
  const liveContact = state.ball.active
    && state.ball.expectedReceiver === 'player'
    && !state.ball.needsFrontWall;
  const contact = liveContact
    ? getContactQuality(state.player, shotKey)
    : { aimError: 0.02, heightOffset: 0 };
  const placementScale = 282 * shot.aimScale;
  const wideAimRisk = Math.pow(Math.abs(aimBias), 1.65)
    * grade.wideRisk
    * (0.035 + Math.max(0, shot.aimScale - 0.85) * 0.045);
  const readinessRisk = ['kill', 'roller'].includes(shotKey) && balance < 0.74
    ? shotKey === 'roller' ? 0.2 : 0.06
    : 0;
  const totalError = Math.max(
    0.012,
    contact.aimError + grade.aimError + (1 - balance) * 0.11 + wideAimRisk + readinessRisk
  );
  const targetZ = clamp(
    shot.targetHeight + contact.heightOffset - state.input.aimY * 34,
    shot.minWallHeight,
    172
  );
  return {
    x: clamp(COURT.centerX + aimBias * placementScale, COURT.left, COURT.right),
    y: COURT.frontWallY - targetZ * 0.34,
    radiusX: clamp(totalError * placementScale * 1.4, 9, 92),
    radiusY: clamp(6 + totalError * 62, 7, 24),
    color: shot.color,
    label: grade.key === 'early' ? 'CONTROL' : grade.key === 'sweet' ? 'POWER' : grade.label.toUpperCase(),
    balance,
  };
}

function drawAimWindow() {
  const aim = getAimPreview();
  if (!aim) {
    return;
  }
  const pulse = reducedMotionQuery?.matches ? 0.5 : (Math.sin(performance.now() / 92) + 1) / 2;
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.strokeStyle = aim.color;
  ctx.fillStyle = `${aim.color}18`;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.ellipse(aim.x, aim.y, aim.radiusX + pulse * 2, aim.radiusY + pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(aim.x - 9, aim.y);
  ctx.lineTo(aim.x + 9, aim.y);
  ctx.moveTo(aim.x, aim.y - 7);
  ctx.lineTo(aim.x, aim.y + 7);
  ctx.stroke();

  ctx.fillStyle = aim.color;
  for (let index = 0; index < 6; index += 1) {
    const angle = index * 2.399 + 0.35;
    const distance = 7 + (index % 3) * 5;
    ctx.fillRect(
      aim.x + Math.cos(angle) * distance - 1,
      aim.y + Math.sin(angle) * distance * 0.5 - 1,
      2,
      2
    );
  }
  ctx.font = '900 9px "Space Grotesk"';
  ctx.textAlign = 'center';
  ctx.fillText(`${aim.label} · ${getBalanceLabel(aim.balance).toUpperCase()}`, aim.x, aim.y - aim.radiusY - 7);
  ctx.restore();
}

function drawReadMarker() {
  const prediction = state.prediction;
  const ball = state.ball;
  if (
    !prediction.valid
    || !ball.active
    || (ball.expectedReceiver !== 'player' && !state.training)
  ) {
    return;
  }
  const baseVisibility = state.training
    ? 0.82
    : state.difficulty === 'easy'
      ? 0.72
      : state.difficulty === 'medium'
        ? 0.42
        : 0.2;
  const visibility = clamp(
    baseVisibility
      + (state.rhythm.readWindow - 1) * 0.32
      + (state.player.readingBall ? 0.34 : 0),
    0.16,
    0.94
  );
  const secondBounce = prediction.bounceNumber > 1;
  const pulse = reducedMotionQuery?.matches ? 0.5 : (Math.sin(performance.now() / 105) + 1) / 2;
  const radius = clamp(13 + prediction.eta * 19, 14, 40);
  const color = secondBounce || !prediction.inBounds ? '#ff4d83' : '#d7f36a';

  ctx.save();
  ctx.globalAlpha = visibility;
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}22`;
  ctx.lineWidth = secondBounce ? 3 : 2;
  ctx.setLineDash(secondBounce ? [5, 4] : [9, 6]);
  ctx.beginPath();
  ctx.ellipse(prediction.x, prediction.y, radius + pulse * 4, (radius + pulse * 4) * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.font = '900 10px "Space Grotesk"';
  ctx.textAlign = 'center';
  ctx.fillText(
    secondBounce ? '2ND' : prediction.inBounds ? state.player.readingBall ? 'TRACK' : 'READ' : 'OUT',
    prediction.x,
    prediction.y + 3
  );
  ctx.restore();
}

function drawCallout() {
  const callout = state.callout;
  if (callout.timer <= 0 || !callout.text) {
    return;
  }
  const progress = 1 - callout.timer / Math.max(callout.duration, 0.01);
  const scale = 0.82 + clamp(progress, 0, 1) * 0.34;
  ctx.save();
  ctx.translate(callout.x, callout.y - 18 - progress * 16);
  ctx.rotate(-0.08);
  ctx.scale(scale, scale);
  ctx.globalAlpha = clamp(callout.timer * 2.2, 0, 1);
  ctx.font = '900 25px "Barlow Condensed"';
  ctx.textAlign = 'center';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#071018';
  ctx.strokeText(callout.text, 0, 0);
  ctx.fillStyle = callout.color;
  ctx.fillText(callout.text, 0, 0);
  ctx.restore();
}

function getReachForActor(actor) {
  if (actor.id === 'player') {
    const labReadScale = 1 + (state.rhythm.readWindow - 1) * 0.42;
    const focusScale = actor.readingBall ? 1.1 : 1;
    return {
      reachX: (actor.radius + 24) * labReadScale * focusScale,
      reachY: (actor.radius + 24) * labReadScale * focusScale,
    };
  }

  const reachBonus = DIFFICULTIES[state.difficulty].reachBonus;
  return {
    reachX: actor.radius + 24 + reachBonus,
    reachY: actor.radius + 24 + reachBonus,
  };
}

function getCameraTarget(mode, effectiveZoom) {
  const ball = state.ball;
  const activeBallX = ball.active ? ball.x : state.player.x;
  const activeBallY = ball.active ? ball.y - ball.z * 0.1 : state.player.y;

  if (mode.id === 'broadcast' && effectiveZoom <= 1.04) {
    return { x: 480, y: 300 };
  }

  if (mode.id === 'player') {
    return {
      x: state.player.x * 0.52 + activeBallX * 0.48,
      y: state.player.y * 0.35 + activeBallY * 0.34 + COURT.shortLineY * 0.31,
    };
  }

  if (mode.id === 'follow') {
    return {
      x: state.player.x * 0.58 + activeBallX * 0.42,
      y: state.player.y * 0.4 + activeBallY * 0.35 + COURT.frontWallY * 0.25,
    };
  }

  if (mode.id === 'courtside') {
    return {
      x: activeBallX * 0.62 + state.player.x * 0.38,
      y: activeBallY * 0.45 + state.player.y * 0.15 + COURT.frontWallY * 0.4,
    };
  }

  return {
    x: state.player.x * 0.42 + activeBallX * 0.58,
    y: state.player.y * 0.35 + activeBallY * 0.65,
  };
}

function drawPresentationOverlay(width, height) {
  const introTimer = state.presentation.introTimer;
  if (introTimer > 0 && !state.training) {
    const progress = 1 - introTimer / state.presentation.introDuration;
    const fade = Math.min(1, progress * 5, (1 - progress) * 6);
    const cardWidth = Math.min(width - 28, 620);
    const cardX = (width - cardWidth) / 2;
    const cardY = height * 0.24;
    ctx.save();
    ctx.globalAlpha = clamp(fade, 0, 1);
    ctx.fillStyle = 'rgba(5, 11, 18, 0.88)';
    ctx.fillRect(cardX, cardY, cardWidth, 164);
    ctx.fillStyle = '#d7f36a';
    ctx.fillRect(cardX, cardY, cardWidth, 5);
    ctx.fillStyle = '#ff4d83';
    ctx.fillRect(cardX + cardWidth - 86, cardY + 5, 86, 5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb84d';
    ctx.font = '800 11px "Space Grotesk"';
    ctx.fillText(`${VENUES[state.venueIndex].label.toUpperCase()} · FIRST TO ${state.targetScore}`, width / 2, cardY + 28);
    ctx.fillStyle = '#f2f4ed';
    ctx.font = `900 ${Math.min(42, cardWidth * 0.07)}px "Barlow Condensed"`;
    ctx.fillText(`${(state.avatar.name || 'YOU').toUpperCase()}  VS  ${opponentName().toUpperCase()}`, width / 2, cardY + 75);
    ctx.fillStyle = '#7de4dc';
    ctx.font = '900 15px "Barlow Condensed"';
    ctx.fillText(DIFFICULTIES[state.difficulty].style.toUpperCase(), width / 2, cardY + 105);
    ctx.fillStyle = 'rgba(242, 244, 237, 0.72)';
    ctx.font = '600 11px "Space Grotesk"';
    const tacticWords = DIFFICULTIES[state.difficulty].tactic.split(' ');
    const tacticLines = [''];
    for (const word of tacticWords) {
      const lineIndex = tacticLines.length - 1;
      const candidate = `${tacticLines[lineIndex]} ${word}`.trim();
      if (ctx.measureText(candidate).width > cardWidth - 42 && tacticLines.length < 2) {
        tacticLines.push(word);
      } else {
        tacticLines[lineIndex] = candidate;
      }
    }
    tacticLines.forEach((line, index) => ctx.fillText(line, width / 2, cardY + 128 + index * 16));
    ctx.restore();
  }

  if (state.mode === 'matchOver' && state.presentation.matchWinner) {
    const playerWon = state.presentation.matchWinner === 'player';
    const stats = state.matchStats;
    const panelWidth = Math.min(560, width * 0.88);
    const panelHeight = 154;
    const metrics = [
      ['Longest', stats.longestRally],
      ['Pure', stats.player.pureContacts],
      ['Cracks', stats.player.cracks],
      ['Blocks', stats.blocksCalled],
    ];
    ctx.save();
    ctx.translate(width / 2, height * 0.46);
    ctx.rotate(playerWon ? -0.025 : 0.025);
    ctx.fillStyle = 'rgba(5, 11, 18, 0.86)';
    ctx.fillRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
    ctx.strokeStyle = playerWon ? '#d7f36a' : '#ff4d83';
    ctx.lineWidth = 4;
    ctx.strokeRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
    ctx.fillStyle = playerWon ? '#d7f36a' : '#ff4d83';
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(40, width * 0.075)}px "Barlow Condensed"`;
    ctx.fillText(playerWon ? 'COURT IS YOURS' : 'RUN IT BACK', 0, -30);
    ctx.fillStyle = 'rgba(242, 244, 237, 0.68)';
    ctx.font = '800 9px "Space Grotesk"';
    ctx.fillText(
      `${state.scores.player}–${state.scores.ai} · ${stats.pointsPlayed} RALLIES PLAYED`,
      0,
      -11
    );
    const metricWidth = panelWidth / metrics.length;
    metrics.forEach(([label, value], index) => {
      const metricX = -panelWidth / 2 + metricWidth * (index + 0.5);
      if (index > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(metricX - metricWidth / 2, 7, 1, 45);
      }
      ctx.fillStyle = index % 2 === 0 ? '#7de4dc' : '#ffb84d';
      ctx.font = `900 ${Math.min(26, metricWidth * 0.34)}px "Barlow Condensed"`;
      ctx.fillText(String(value), metricX, 31);
      ctx.fillStyle = 'rgba(242, 244, 237, 0.72)';
      ctx.font = '800 8px "Space Grotesk"';
      ctx.fillText(label.toUpperCase(), metricX, 48);
    });
    ctx.fillStyle = 'rgba(242, 244, 237, 0.56)';
    ctx.font = '700 8px "Space Grotesk"';
    ctx.fillText('PRESS SERVE TO RUN IT BACK', 0, 68);
    ctx.restore();
  }
}

function draw() {
  const { width, height, dpr } = canvasSize;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const portraitCamera = height / width > 0.9;
  const mode = CAMERA_MODES[state.camera.modeIndex];
  const fitScale = portraitCamera ? height / 600 : Math.min(width / 960, height / 600);
  const effectiveZoom = mode.baseZoom * state.camera.zoom;
  const scale = fitScale * effectiveZoom;
  const depthCompression = clamp(1 - (state.rhythm.cameraDepth - 1) * 0.58, 0.82, 1.09);
  const scaleY = scale * mode.yScale * depthCompression;
  const visibleWorldWidth = width / scale;
  const visibleWorldHeight = height / scaleY;
  const target = getCameraTarget(mode, effectiveZoom);
  const minCameraX = Math.min(480, visibleWorldWidth / 2);
  const maxCameraX = Math.max(480, 960 - visibleWorldWidth / 2);
  const minCameraY = Math.min(300, visibleWorldHeight / 2);
  const maxCameraY = Math.max(300, 600 - visibleWorldHeight / 2);
  const targetX = clamp(target.x, minCameraX, maxCameraX);
  const targetY = clamp(target.y, minCameraY, maxCameraY);
  state.camera.x += (targetX - state.camera.x) * 0.09;
  state.camera.y += (targetY - state.camera.y) * 0.09;
  const allowShake = !reducedMotionQuery?.matches;
  const shakeX = allowShake && state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = allowShake && state.shake > 0 ? (Math.random() - 0.5) * state.shake * 0.65 : 0;

  ctx.save();
  ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
  ctx.scale(scale, scaleY);
  ctx.transform(1, 0, mode.shear, 1, 0, 0);
  ctx.translate(-state.camera.x, -state.camera.y);
  drawBackground();
  drawAimWindow();
  drawReadMarker();
  if (!state.training) {
    drawActor(state.ai);
  }
  drawActor(state.player);
  drawBall();
  drawParticles();
  drawCallout();
  ctx.restore();
  drawPresentationOverlay(width, height);

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 223, 142, ${state.flash * 0.16})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function tick(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.025);
  state.lastTime = now;
  const worldDt = dt * state.rhythm.masterTempo;
  const actorDt = worldDt * state.rhythm.footworkClock;
  const ballDt = worldDt * state.rhythm.ballClock;
  const preparationDt = worldDt / state.rhythm.readWindow;

  updateGamepad();
  updateCharge(preparationDt);
  if (ui.avatarDialog.open) {
    drawAvatarPreview(now / 1000);
  }
  if (state.hitStop > 0) {
    state.hitStop = Math.max(0, state.hitStop - dt);
    updateEffects(dt * 0.2);
    draw();
    requestAnimationFrame(tick);
    return;
  }
  updatePlayer(actorDt);
  updateAi(actorDt);
  if (state.hitStop > 0) {
    draw();
    requestAnimationFrame(tick);
    return;
  }
  updateBall(ballDt);
  updateCooldowns(worldDt);
  updateEffects(dt);
  draw();
  requestAnimationFrame(tick);
}

function handleKeyChange(event, isPressed) {
  const key = event.key.toLowerCase();
  const chargeKeys = {
    ' ': state.selectedShot,
    j: 'palm',
    k: 'slice',
    l: 'fist',
    u: 'backhand',
    i: 'kill',
    o: 'roller',
    p: 'lob',
  };

  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'backspace'].includes(key)) {
    event.preventDefault();
  }

  if (isPressed) {
    keys.add(key);
  } else {
    keys.delete(key);
  }

  if (!isPressed) {
    if (chargeKeys[key]) {
      releasePlayerCharge(`key-${key}`);
    }
    return;
  }

  if (event.repeat && [' ', 'r', 'backspace', '1', '2', '3', '4', '5', '6', '7', 'j', 'k', 'l', 'u', 'i', 'o', 'p', 'c', '-', '=', '+'].includes(key)) {
    return;
  }

  if (key === ' ') {
    beginPlayerCharge(state.selectedShot, 'key- ');
  } else if (key === 'r') {
    startServe();
  } else if (key === 'backspace') {
    resetMatch();
  } else if (key === '1') {
    setShotMode('palm');
  } else if (key === '2') {
    setShotMode('slice');
  } else if (key === '3') {
    setShotMode('fist');
  } else if (key === '4') {
    setShotMode('backhand');
  } else if (key === '5') {
    setShotMode('kill');
  } else if (key === '6') {
    setShotMode('roller');
  } else if (key === '7') {
    setShotMode('lob');
  } else if (key === 'j') {
    beginPlayerCharge('palm', 'key-j');
  } else if (key === 'k') {
    beginPlayerCharge('slice', 'key-k');
  } else if (key === 'l') {
    beginPlayerCharge('fist', 'key-l');
  } else if (key === 'u') {
    beginPlayerCharge('backhand', 'key-u');
  } else if (key === 'i') {
    beginPlayerCharge('kill', 'key-i');
  } else if (key === 'o') {
    beginPlayerCharge('roller', 'key-o');
  } else if (key === 'p') {
    beginPlayerCharge('lob', 'key-p');
  } else if (key === 't') {
    openTraining();
  } else if (key === 'c') {
    cycleCamera();
  } else if (key === '-' || key === '_') {
    changeCameraZoom(-0.1);
  } else if (key === '=' || key === '+') {
    changeCameraZoom(0.1);
  }
}

for (const button of ui.difficultyButtons) {
  button.addEventListener('click', () => {
    ensureAudio();
    setDifficulty(button.dataset.difficulty);
  });
}

for (const button of ui.shotButtons) {
  button.addEventListener('click', () => {
    ensureAudio();
    setShotMode(button.dataset.shot, state.ball.active);
  });
}

for (const button of ui.virtualButtons) {
  const release = () => {
    keys.delete(button.dataset.key);
    button.classList.remove('is-held');
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    ensureAudio();
    button.setPointerCapture(event.pointerId);
    keys.add(button.dataset.key);
    button.classList.add('is-held');
  });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}

function openHelp() {
  if (typeof ui.helpDialog.showModal === 'function') {
    ui.helpDialog.showModal();
  }
}

function closeHelp() {
  if (ui.helpDialog.open) {
    ui.helpDialog.close();
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  ui.soundButton.setAttribute('aria-pressed', String(state.soundEnabled));
  ui.soundButton.querySelector('.utility-label').textContent = state.soundEnabled ? 'Sound on' : 'Sound off';
  ui.soundButton.querySelector('.utility-icon').textContent = state.soundEnabled ? '◖))' : '◖×';
  if (state.soundEnabled) {
    ensureAudio();
    playSound('bounce');
  }
}

ui.serveButton.addEventListener('click', () => {
  ensureAudio();
  startServe();
});
ui.resetButton.addEventListener('click', resetMatch);
ui.swingButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  ensureAudio();
  ui.swingButton.setPointerCapture(event.pointerId);
  beginPlayerCharge(state.selectedShot, 'touch-slap');
});
ui.swingButton.addEventListener('pointerup', (event) => {
  event.preventDefault();
  releasePlayerCharge('touch-slap');
});
ui.swingButton.addEventListener('pointercancel', () => {
  if (state.charge.inputKey === 'touch-slap') {
    resetCharge();
  }
});
ui.swingButton.addEventListener('click', (event) => {
  if (event.detail === 0) {
    attemptPlayerSwing();
  }
});
ui.cameraButton.addEventListener('click', cycleCamera);
ui.zoomOutButton.addEventListener('click', () => changeCameraZoom(-0.1));
ui.zoomInButton.addEventListener('click', () => changeCameraZoom(0.1));
ui.venueButton.addEventListener('click', cycleVenue);
ui.avatarButton.addEventListener('click', openAvatarCreator);
ui.closeAvatarButton.addEventListener('click', closeAvatarCreator);
ui.randomizeAvatarButton.addEventListener('click', randomizeAvatar);
ui.resetAvatarButton.addEventListener('click', () => {
  state.avatar = { ...DEFAULT_AVATAR };
  ui.avatarNameInput.value = state.avatar.name;
  renderAvatarOptionGroups();
  drawAvatarPreview();
});
ui.saveAvatarButton.addEventListener('click', saveAvatar);
ui.avatarNameInput.addEventListener('input', () => {
  state.avatar.name = ui.avatarNameInput.value.trim().slice(0, 14) || 'You';
  drawAvatarPreview();
});
for (const button of ui.avatarPresetButtons) {
  button.addEventListener('click', () => applyAvatarPreset(button.dataset.avatarPreset));
}
for (const button of ui.avatarPoseButtons) {
  button.addEventListener('click', () => setAvatarPreviewPose(button.dataset.avatarPose));
}
ui.avatarDialog.addEventListener('click', (event) => {
  if (event.target === ui.avatarDialog) {
    closeAvatarCreator();
  }
});
ui.trainingButton.addEventListener('click', openTraining);
ui.closeTrainingButton.addEventListener('click', closeTraining);
ui.exitTrainingButton.addEventListener('click', exitTraining);
for (const card of ui.trainingCards) {
  card.addEventListener('click', () => startTraining(card.dataset.training));
}
ui.trainingDialog.addEventListener('click', (event) => {
  if (event.target === ui.trainingDialog) {
    closeTraining();
  }
});
ui.rhythmButton.addEventListener('click', openRhythmLab);
ui.rhythmChip.addEventListener('click', openRhythmLab);
ui.closeRhythmButton.addEventListener('click', closeRhythmLab);
ui.resetRhythmButton.addEventListener('click', () => applyRhythmPreset('real'));
ui.copyRhythmButton.addEventListener('click', copyRhythmCode);
for (const button of ui.rhythmPresetButtons) {
  button.addEventListener('click', () => applyRhythmPreset(button.dataset.rhythmPreset));
}
for (const control of ui.rhythmControls) {
  control.addEventListener('input', () => updateRhythmControl(control));
}
ui.rhythmDialog.addEventListener('click', (event) => {
  if (event.target === ui.rhythmDialog) {
    closeRhythmLab();
  }
});
ui.soundButton.addEventListener('click', toggleSound);
ui.helpButton.addEventListener('click', openHelp);
ui.rulesButton.addEventListener('click', openHelp);
ui.closeHelpButton.addEventListener('click', closeHelp);
ui.helpDialog.addEventListener('click', (event) => {
  if (event.target === ui.helpDialog) {
    closeHelp();
  }
});

window.addEventListener('keydown', (event) => handleKeyChange(event, true));
window.addEventListener('keyup', (event) => handleKeyChange(event, false));
window.addEventListener('blur', () => {
  keys.clear();
  if (state.charge.active) {
    resetCharge();
  }
});
window.addEventListener('gamepadconnected', (event) => {
  state.input.gamepadIndex = event.gamepad.index;
  state.input.gamepadButtons = [];
  ui.gamepadStatus.classList.add('is-connected');
  ui.gamepadStatus.querySelector('span').textContent = 'Gamepad';
});
window.addEventListener('gamepaddisconnected', (event) => {
  if (state.input.gamepadIndex === event.gamepad.index) {
    state.input.gamepadIndex = null;
    state.input.gamepadButtons = [];
    if (state.charge.inputKey?.startsWith('pad-')) {
      resetCharge();
    }
  }
});
window.addEventListener('resize', resizeCanvas);

if ('ResizeObserver' in window) {
  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);
}

resizeCanvas();
resetMatch();
requestAnimationFrame(tick);
