import * as THREE from '../../vendor/three.module.min.js';
import {
  add,
  calculateDropReboundHeight,
  magnitude,
  normalize,
  resolveHandContact,
  scale,
  stepBall,
  subtract,
} from '../sim/ballistics.js';
import { BALL, COURT, MATERIAL, PHYSICS, UNITS } from '../sim/court.js';
import { createSeededRandom } from '../sim/random.js';
import { createReplayRecorder } from '../sim/replay.js';
import {
  awardRally,
  beginPoint,
  createMatchState,
  opponentOf,
  registerFloorContact,
  registerLegalContact,
  registerWallContact,
  resolveServeFault,
} from '../sim/rules.js';
import {
  cloneSerializable,
  createBallState,
  createPlayerCommand,
  createSimulationSnapshot,
} from '../sim/types.js';

const canvas = document.getElementById('labCanvas');
const viewport = document.getElementById('viewportWrap');
const ui = Object.fromEntries(
  [
    'controllerBadge',
    'controllerName',
    'matchRibbon',
    'playerMatchScore',
    'aiMatchScore',
    'turnIndicator',
    'serveOwner',
    'rallyMetric',
    'aiReadLabel',
    'resultLabel',
    'speedMetric',
    'spinMetric',
    'heightMetric',
    'intentLabel',
    'intentDetail',
    'worldHint',
    'chargeReadout',
    'chargeLabel',
    'chargeFill',
    'chargeHint',
    'cameraZoom',
    'cameraZoomValue',
    'callout',
    'feedButton',
    'rallyButton',
    'rallyButtonLabel',
    'rallyButtonHint',
    'dropButton',
    'resetLabButton',
    'replayButton',
    'replayCount',
    'floorRestitution',
    'floorRestitutionValue',
    'wallRestitution',
    'wallRestitutionValue',
    'dragScale',
    'dragValue',
    'magnusScale',
    'magnusValue',
    'dropReadout',
    'tempoScale',
    'tempoValue',
    'resetPhysicsButton',
    'contactGrade',
    'spacingMetric',
    'prepMetric',
    'handMetric',
    'bounceMetric',
    'contactReason',
    'seedValue',
    'tickValue',
    'commandValue',
    'contactValue',
    'exportReplayButton',
  ].map((id) => [id, document.getElementById(id)]),
);

const SIMULATION_HZ = 120;
const SIMULATION_DT = 1 / SIMULATION_HZ;
const BALL_SUBSTEPS = PHYSICS.solverHz / SIMULATION_HZ;
const BALL_DT = 1 / PHYSICS.solverHz;
const SEED = 0x57414c4c;
const rng = createSeededRandom(SEED);
let recorder = createReplayRecorder({ seed: SEED });

const TECHNIQUES = {
  palm: {
    label: 'Open palm',
    intent: 'Control',
    color: 0x75e6de,
    pace: 1,
    restitution: 0.88,
    spin: { x: -18, y: 0, z: 0 },
  },
  topspin: {
    label: 'Topspin',
    intent: 'Dip + jump',
    color: 0xd6f55f,
    pace: 1.04,
    restitution: 0.92,
    spin: { x: -92, y: 0, z: 0 },
  },
  backspin: {
    label: 'Backspin',
    intent: 'Float + skid',
    color: 0xa777ff,
    pace: 0.94,
    restitution: 0.86,
    spin: { x: 88, y: 0, z: 0 },
  },
  fist: {
    label: 'Fist',
    intent: 'Hard + knuckle',
    color: 0xff9f32,
    pace: 1.16,
    restitution: 1.02,
    spin: { x: -4, y: 2, z: 0 },
  },
};

const KEY_TECHNIQUES = new Map([
  ['Space', 'palm'],
  ['KeyJ', 'topspin'],
  ['KeyK', 'backspin'],
  ['KeyL', 'fist'],
]);

const GAMEPAD_TECHNIQUES = new Map([
  [0, 'palm'],
  [2, 'topspin'],
  [1, 'backspin'],
  [3, 'fist'],
]);

const CAMERA_PRESETS = [
  {
    id: 'tactical',
    position: new THREE.Vector3(0, 9.6, 17.8),
    target: new THREE.Vector3(0, 1.7, 4.9),
  },
  {
    id: 'player',
    position: new THREE.Vector3(0, 4.9, 14.3),
    target: new THREE.Vector3(0, 1.75, 3.9),
  },
  {
    id: 'courtside',
    position: new THREE.Vector3(-8.3, 3.15, 9.4),
    target: new THREE.Vector3(0.2, 1.55, 3.6),
  },
];

const input = {
  keys: new Set(),
  move: { x: 0, z: 0 },
  aim: { x: 0, y: -0.7 },
  pointerAim: false,
  activeTechnique: null,
  prepareStartedAt: 0,
  modifiers: {
    english: 0,
    lift: false,
    drive: false,
  },
  gamepadIndex: null,
  gamepadButtons: [],
  commandSequence: 0,
  lastCommandDigest: '',
};

const physicsCoefficients = {
  floorRestitution: MATERIAL.floorRestitution,
  wallRestitution: MATERIAL.wallRestitution,
  dragScale: 1,
  magnusScale: 1,
};

const state = {
  tick: 0,
  simulationTime: 0,
  ball: createBallState({
    active: false,
    position: { x: 0, y: BALL.radius, z: COURT.serviceMarkers },
  }),
  player: {
    position: { x: 0, y: 0, z: COURT.serviceMarkers },
    velocity: { x: 0, y: 0, z: 0 },
    facing: Math.PI,
    preparation: 0,
    contact: 'palm',
  },
  ai: {
    position: { x: 0.62, y: 0, z: COURT.longLine - 0.45 },
    velocity: { x: 0, y: 0, z: 0 },
    facing: Math.PI,
    preparation: 0,
    contact: 'palm',
    preparing: false,
    prepareStartedAt: 0,
    plannedReleaseTick: null,
    targetPosition: { x: 0.62, z: COURT.longLine - 0.45 },
    observation: null,
    observationQueue: [],
    observationDelayTicks: 12,
    commandSequence: 0,
    lastCommandDigest: '',
  },
  hand: {
    position: { x: 0.38, y: 1.08, z: COURT.serviceMarkers - 0.18 },
    previousPosition: { x: 0.38, y: 1.08, z: COURT.serviceMarkers - 0.18 },
    velocity: { x: 0, y: 0, z: 0 },
    radius: 0.105,
    active: false,
  },
  aiHand: {
    position: { x: 1, y: 1.08, z: COURT.longLine - 0.63 },
    previousPosition: { x: 1, y: 1.08, z: COURT.longLine - 0.63 },
    velocity: { x: 0, y: 0, z: 0 },
    radius: 0.105,
    active: false,
  },
  selectedTechnique: 'palm',
  swing: null,
  aiSwing: null,
  lastHandContactTick: -1000,
  lastHandContact: null,
  lastWallContact: null,
  wallContactsAtLastHand: 0,
  contacts: 0,
  feeds: 0,
  mode: 'practice',
  match: createMatchState(),
  dropTracking: null,
  cameraIndex: 1,
  cameraFocalLength: 50,
  history: [],
  replayPlayback: null,
  trail: [],
  hintProgress: 0,
  pendingMissCheck: false,
  tempoScale: 0.78,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07131d);
scene.fog = new THREE.Fog(0x07131d, 16, 34);

const camera = new THREE.PerspectiveCamera(27, 1, 0.02, 80);
camera.position.copy(CAMERA_PRESETS[state.cameraIndex].position);
camera.lookAt(CAMERA_PRESETS[state.cameraIndex].target);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const wallAimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const wallAimPoint = new THREE.Vector3();

const sceneObjects = createCourtScene();
const ballObjects = createBallVisual();
const playerObjects = createPlayerVisual();
const opponentObjects = createOpponentVisual();
const trailGeometry = new THREE.BufferGeometry();
const trailLine = new THREE.Line(
  trailGeometry,
  new THREE.LineBasicMaterial({
    color: 0x75e6de,
    transparent: true,
    opacity: 0.72,
  }),
);
scene.add(trailLine);

let audioContext = null;
let accumulator = 0;
let lastFrameTime = performance.now();
let lastUiUpdate = 0;

function createCourtTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 1024;
  textureCanvas.height = 768;
  const context = textureCanvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, textureCanvas.height);
  gradient.addColorStop(0, '#456c78');
  gradient.addColorStop(0.52, '#305761');
  gradient.addColorStop(1, '#24444d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  context.globalAlpha = 0.14;
  context.strokeStyle = '#d7eef0';
  context.lineWidth = 4;
  for (let y = 0; y < textureCanvas.height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(textureCanvas.width, y + 7);
    context.stroke();
  }
  for (let x = 0; x < textureCanvas.width; x += 96) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 19, textureCanvas.height);
    context.stroke();
  }

  context.globalAlpha = 0.96;
  context.save();
  context.translate(510, 355);
  context.rotate(-0.055);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 172px Impact, sans-serif';
  context.lineJoin = 'round';
  context.lineWidth = 30;
  context.strokeStyle = '#07131d';
  context.strokeText('THE WALL', 0, 0);
  context.lineWidth = 18;
  context.strokeStyle = '#ff4e88';
  context.strokeText('THE WALL', -7, -5);
  context.fillStyle = '#ffad36';
  context.fillText('THE WALL', 0, 0);
  context.restore();

  context.font = '800 28px monospace';
  context.fillStyle = '#d6f55f';
  context.fillText('WEST 4TH · NO EASY POINTS', 48, 84);
  context.fillStyle = '#75e6de';
  context.fillText('BX  ·  BK  ·  LES  ·  QNS', 545, 690);

  for (let index = 0; index < 36; index += 1) {
    const x = (index * 197) % textureCanvas.width;
    const y = (index * 89) % textureCanvas.height;
    const radius = 2 + (index % 5);
    context.globalAlpha = 0.12 + (index % 4) * 0.04;
    context.fillStyle = index % 2 ? '#f3efe1' : '#05101a';
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createLine(points, color = 0xe7eee7, opacity = 0.82) {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Line(geometry, material);
}

function createLabelSprite(text, accent = '#d6f55f') {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext('2d');
  context.fillStyle = 'rgba(5, 11, 18, 0.82)';
  context.fillRect(0, 22, 512, 84);
  context.fillStyle = accent;
  context.font = '800 38px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(2.4, 0.6, 1);
  return sprite;
}

function createFence(width, height) {
  const points = [];
  const spacing = 0.33;
  for (let x = -width / 2; x <= width / 2 + 0.01; x += spacing) {
    points.push(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, height, 0));
  }
  for (let y = 0; y <= height + 0.01; y += spacing) {
    points.push(new THREE.Vector3(-width / 2, y, 0), new THREE.Vector3(width / 2, y, 0));
  }
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: 0x6e8c91,
      transparent: true,
      opacity: 0.24,
    }),
  );
}

function createCourtScene() {
  const hemisphere = new THREE.HemisphereLight(0xffc487, 0x112d39, 2.2);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffa45e, 4.5);
  sun.position.set(-6, 12, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -4;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 36;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x75e6de, 1.4);
  rim.position.set(8, 5, -6);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT.width + 7, COURT.longLine + COURT.runback + 7),
    new THREE.MeshStandardMaterial({
      color: 0x203c42,
      roughness: 0.96,
      metalness: 0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.012, (COURT.longLine + COURT.runback) / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  const liveFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT.width, COURT.longLine),
    new THREE.MeshStandardMaterial({
      color: 0x31565b,
      roughness: 0.92,
      transparent: true,
      opacity: 0.78,
    }),
  );
  liveFloor.rotation.x = -Math.PI / 2;
  liveFloor.position.set(0, -0.002, COURT.longLine / 2);
  liveFloor.receiveShadow = true;
  scene.add(liveFloor);

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(COURT.width, COURT.wallHeight, 0.22),
    new THREE.MeshStandardMaterial({
      map: createCourtTexture(),
      roughness: 0.91,
      metalness: 0,
    }),
  );
  wall.position.set(0, COURT.wallHeight / 2, -0.11);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  const wallOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(COURT.width, COURT.wallHeight, 0.23)),
    new THREE.LineBasicMaterial({ color: 0xd6f55f, transparent: true, opacity: 0.72 }),
  );
  wallOutline.position.copy(wall.position);
  scene.add(wallOutline);

  const lineY = 0.012;
  const half = COURT.halfWidth;
  scene.add(createLine([[-half, lineY, 0], [-half, lineY, COURT.longLine]], 0xeff4ed));
  scene.add(createLine([[half, lineY, 0], [half, lineY, COURT.longLine]], 0xeff4ed));
  scene.add(createLine([[-half, lineY, COURT.shortLine], [half, lineY, COURT.shortLine]], 0xd6f55f));
  scene.add(createLine([[-half, lineY, COURT.longLine], [half, lineY, COURT.longLine]], 0xff9f32));
  scene.add(
    createLine(
      [[-half, lineY + 0.002, COURT.serviceMarkers], [-half + COURT.serviceMarkerLength, lineY + 0.002, COURT.serviceMarkers]],
      0x75e6de,
    ),
  );
  scene.add(
    createLine(
      [[half - COURT.serviceMarkerLength, lineY + 0.002, COURT.serviceMarkers], [half, lineY + 0.002, COURT.serviceMarkers]],
      0x75e6de,
    ),
  );

  const shortLabel = createLabelSprite('16′ SHORT', '#d6f55f');
  shortLabel.position.set(-half - 0.85, 0.34, COURT.shortLine);
  shortLabel.rotation.x = -Math.PI / 2;
  scene.add(shortLabel);
  const serveLabel = createLabelSprite('25′ SERVE', '#75e6de');
  serveLabel.position.set(-half - 0.85, 0.34, COURT.serviceMarkers);
  scene.add(serveLabel);
  const longLabel = createLabelSprite('34′ LONG', '#ff9f32');
  longLabel.position.set(-half - 0.85, 0.34, COURT.longLine);
  scene.add(longLabel);

  const leftFence = createFence(COURT.longLine + COURT.runback + 2, 4.2);
  leftFence.rotation.y = Math.PI / 2;
  leftFence.position.set(-half - 1.3, 0, (COURT.longLine + COURT.runback) / 2);
  scene.add(leftFence);
  const rightFence = leftFence.clone();
  rightFence.position.x = half + 1.3;
  scene.add(rightFence);

  const cityMaterial = new THREE.MeshStandardMaterial({
    color: 0x0c202d,
    roughness: 1,
    emissive: 0x06121b,
    emissiveIntensity: 0.4,
  });
  for (let index = 0; index < 12; index += 1) {
    const width = 1.2 + (index % 4) * 0.43;
    const height = 4.4 + ((index * 7) % 6) * 0.76;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 1.5),
      cityMaterial,
    );
    building.position.set(-10 + index * 1.8, height / 2, -3.2 - (index % 3));
    scene.add(building);
  }

  const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.28, 32),
    new THREE.MeshBasicMaterial({
      color: 0xd6f55f,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthTest: false,
    }),
  );
  targetRing.position.set(0, 2.35, 0.018);
  targetRing.renderOrder = 8;
  scene.add(targetRing);

  const targetCross = createLine([[-0.4, 0, 0], [0.4, 0, 0]], 0xd6f55f);
  targetCross.position.copy(targetRing.position);
  targetCross.renderOrder = 8;
  scene.add(targetCross);
  const targetCrossVertical = createLine([[0, -0.4, 0], [0, 0.4, 0]], 0xd6f55f);
  targetCrossVertical.position.copy(targetRing.position);
  targetCrossVertical.renderOrder = 8;
  scene.add(targetCrossVertical);

  return { floor, wall, targetRing, targetCross, targetCrossVertical };
}

function createBallVisual() {
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL.radius, 24, 16),
    new THREE.MeshStandardMaterial({
      color: 0x1e78ff,
      roughness: 0.72,
      emissive: 0x083f91,
      emissiveIntensity: 0.6,
    }),
  );
  ball.castShadow = true;
  scene.add(ball);

  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(BALL.radius * 2.6, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0x75e6de,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  scene.add(aura);

  return { ball, aura };
}

function createPlayerVisual() {
  const group = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9b5f3e, roughness: 0.88 });
  const jersey = new THREE.MeshStandardMaterial({
    color: 0xff4e88,
    roughness: 0.78,
    emissive: 0x2d0716,
    emissiveIntensity: 0.35,
  });
  const shorts = new THREE.MeshStandardMaterial({ color: 0x122d45, roughness: 0.82 });
  const shoes = new THREE.MeshStandardMaterial({
    color: 0xd6f55f,
    roughness: 0.63,
    emissive: 0x23300b,
    emissiveIntensity: 0.25,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.27), jersey);
  torso.position.y = 1.27;
  torso.castShadow = true;
  group.add(torso);

  const chest = createLabelSprite('W', '#d6f55f');
  chest.scale.set(0.35, 0.18, 1);
  chest.position.set(0, 1.34, -0.15);
  group.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin);
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), ink);
  hair.position.set(0, 1.96, 0);
  hair.rotation.z = -0.06;
  group.add(hair);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.3), shorts);
  hips.position.y = 0.83;
  hips.castShadow = true;
  group.add(hips);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.65, 8), skin);
    leg.position.set(side * 0.16, 0.42, 0);
    leg.castShadow = true;
    group.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.38), shoes);
    shoe.position.set(side * 0.16, 0.07, -0.07);
    shoe.castShadow = true;
    group.add(shoe);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.58, 8), skin);
    arm.position.set(side * 0.38, 1.3, 0);
    arm.rotation.z = side * -0.16;
    arm.castShadow = true;
    group.add(arm);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.44, 24),
    new THREE.MeshBasicMaterial({
      color: 0x02070b,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);

  group.position.set(state.player.position.x, 0, state.player.position.z);
  group.rotation.y = Math.PI;
  scene.add(group);

  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(state.hand.radius, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffbc91,
      roughness: 0.68,
      emissive: 0x45190c,
      emissiveIntensity: 0.2,
    }),
  );
  hand.castShadow = true;
  scene.add(hand);

  const intentGeometry = new THREE.BufferGeometry();
  const intentLine = new THREE.Line(
    intentGeometry,
    new THREE.LineDashedMaterial({
      color: 0xa777ff,
      dashSize: 0.16,
      gapSize: 0.11,
      transparent: true,
      opacity: 0.62,
      depthTest: false,
    }),
  );
  intentLine.renderOrder = 7;
  scene.add(intentLine);

  return { group, torso, hand, intentLine };
}

function createOpponentVisual() {
  const group = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: 0x071018, roughness: 0.82 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x5c3529, roughness: 0.9 });
  const jersey = new THREE.MeshStandardMaterial({
    color: 0x75e6de,
    roughness: 0.76,
    emissive: 0x062b31,
    emissiveIntensity: 0.45,
  });
  const shorts = new THREE.MeshStandardMaterial({ color: 0x43245e, roughness: 0.82 });
  const shoes = new THREE.MeshStandardMaterial({
    color: 0xff9f32,
    roughness: 0.64,
    emissive: 0x351604,
    emissiveIntensity: 0.22,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.73, 0.28), jersey);
  torso.position.y = 1.28;
  torso.castShadow = true;
  group.add(torso);

  const chest = createLabelSprite('G', '#07131d');
  chest.scale.set(0.35, 0.18, 1);
  chest.position.set(0, 1.34, -0.15);
  group.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.175, 16, 12), skin);
  head.position.y = 1.84;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.12, 10), ink);
  hair.position.set(0, 1.99, 0);
  group.add(hair);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.33, 0.3), shorts);
  hips.position.y = 0.84;
  hips.castShadow = true;
  group.add(hips);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.66, 8), skin);
    leg.position.set(side * 0.16, 0.43, 0);
    leg.castShadow = true;
    group.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.38), shoes);
    shoe.position.set(side * 0.16, 0.07, -0.07);
    shoe.castShadow = true;
    group.add(shoe);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.59, 8), skin);
    arm.position.set(side * 0.39, 1.31, 0);
    arm.rotation.z = side * -0.16;
    arm.castShadow = true;
    group.add(arm);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 24),
    new THREE.MeshBasicMaterial({
      color: 0x02070b,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);

  group.position.set(state.ai.position.x, 0, state.ai.position.z);
  group.rotation.y = Math.PI;
  scene.add(group);

  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(state.aiHand.radius, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x7a4937,
      roughness: 0.68,
      emissive: 0x123f45,
      emissiveIntensity: 0.3,
    }),
  );
  hand.castShadow = true;
  scene.add(hand);

  const perceptionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.21, 24),
    new THREE.MeshBasicMaterial({
      color: 0x75e6de,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthTest: false,
    }),
  );
  perceptionRing.rotation.x = -Math.PI / 2;
  perceptionRing.visible = false;
  perceptionRing.renderOrder = 9;
  scene.add(perceptionRing);

  return { group, torso, hand, perceptionRing };
}

function chargeForHeldTime(held) {
  if (held <= 0.18) return 0.2 + held / 0.18 * 0.18;
  if (held <= 0.72) return 0.38 + (held - 0.18) / 0.54 * 0.57;
  if (held <= 1.28) return 0.95 + Math.sin((held - 0.72) / 0.56 * Math.PI) * 0.05;
  return Math.max(0.68, 1 - (held - 1.28) * 0.2);
}

function currentCharge() {
  if (!input.activeTechnique) return 0;
  return chargeForHeldTime(Math.max(0, state.simulationTime - input.prepareStartedAt));
}

function currentAiCharge() {
  if (!state.ai.preparing) return 0;
  return chargeForHeldTime(Math.max(0, state.simulationTime - state.ai.prepareStartedAt));
}

function wallTarget() {
  return {
    x: input.aim.x * (COURT.halfWidth - 0.28),
    y: 0.42 + ((input.aim.y + 1) / 2) * (COURT.wallHeight - 0.72),
    z: 0,
  };
}

function selectHandSide() {
  if (!state.ball.active) return input.aim.x >= 0 ? 1 : -1;
  return state.ball.position.x >= state.player.position.x ? 1 : -1;
}

function restingHandPosition(charge = 0) {
  const side = selectHandSide();
  const ballX = state.ball.active ? state.ball.position.x : state.player.position.x + side * 0.38;
  const reachableBallX = Math.max(
    state.player.position.x - 0.63,
    Math.min(state.player.position.x + 0.63, ballX),
  );
  const preparedX = THREE.MathUtils.lerp(
    state.player.position.x + side * 0.38,
    reachableBallX + side * 0.035,
    Math.min(1, charge * 1.3),
  );
  const trackedBallY = state.ball.active
    ? THREE.MathUtils.clamp(state.ball.position.y, 0.42, 1.62)
    : 1.08 + input.aim.y * 0.11;
  return {
    x: preparedX,
    y: THREE.MathUtils.lerp(
      1.08 + input.aim.y * 0.11,
      trackedBallY,
      Math.min(0.82, charge * 1.18),
    ),
    z: state.player.position.z - 0.17 + charge * 0.48,
  };
}

function beginTechnique(technique) {
  if (!TECHNIQUES[technique] || state.replayPlayback) return;
  unlockAudio();
  if (input.activeTechnique) return;
  if (
    state.mode === 'match'
    && state.match.active
    && state.match.expectedHitter !== 'player'
  ) {
    ui.resultLabel.textContent = 'Ghost owns this touch';
    ui.contactReason.textContent = 'Recover your position and read the return. Your hand becomes live when the turn changes.';
    return;
  }
  if (
    state.mode === 'match'
    && state.match.phase === 'serve-ready'
    && state.match.server === 'player'
  ) {
    startServeToss('player');
  }
  state.selectedTechnique = technique;
  state.player.contact = technique;
  input.activeTechnique = technique;
  input.prepareStartedAt = state.simulationTime;
  state.pendingMissCheck = false;
  syncTechniqueUi();
}

function releaseTechnique(technique) {
  if (input.activeTechnique !== technique || state.replayPlayback) return;
  const charge = currentCharge();
  input.activeTechnique = null;
  startSwing(technique, charge);
  state.pendingMissCheck = true;
  syncTechniqueUi();
}

function startSwing(techniqueKey, charge) {
  const technique = TECHNIQUES[techniqueKey];
  const preparedStart = restingHandPosition(charge);
  const target = wallTarget();
  const handSpeed = (7.4 + charge * 7.2) * technique.pace * (input.modifiers.drive ? 1.08 : 1);
  const travelDistance = 1.28;
  const duration = Math.max(0.075, travelDistance / handSpeed);
  const predictionTime = duration * 0.5;
  const predictedBall = state.ball.active
    ? {
        x: state.ball.position.x + state.ball.velocity.x * predictionTime,
        y: state.ball.position.y
          + state.ball.velocity.y * predictionTime
          - 0.5 * PHYSICS.gravity * predictionTime * predictionTime,
        z: state.ball.position.z + state.ball.velocity.z * predictionTime,
      }
    : preparedStart;
  const withinAssistReach = (
    state.ball.active
    && Math.abs(predictedBall.x - state.player.position.x) <= 0.78
    && predictedBall.y >= 0.28
    && predictedBall.y <= 1.8
    && predictedBall.z >= state.player.position.z - 1.55
    && predictedBall.z <= state.player.position.z + 0.55
  );
  const initialDirection = normalize(
    subtract(target, withinAssistReach ? predictedBall : preparedStart),
    { x: 0, y: 0, z: -1 },
  );
  const desiredStart = withinAssistReach
    ? subtract(predictedBall, scale(initialDirection, travelDistance * 0.5))
    : preparedStart;
  const start = {
    x: preparedStart.x + THREE.MathUtils.clamp(desiredStart.x - preparedStart.x, -0.22, 0.22),
    y: preparedStart.y + THREE.MathUtils.clamp(desiredStart.y - preparedStart.y, -0.28, 0.28),
    z: preparedStart.z + THREE.MathUtils.clamp(desiredStart.z - preparedStart.z, -0.42, 0.42),
  };
  const assist = subtract(start, preparedStart);
  const direction = normalize(subtract(target, start), { x: 0, y: 0, z: -1 });
  const lift = input.modifiers.lift ? 0.21 : 0;
  const drive = input.modifiers.drive ? -0.18 : 0;
  direction.y += lift + drive;
  const normalizedDirection = normalize(direction, { x: 0, y: 0, z: -1 });

  state.swing = {
    technique: techniqueKey,
    charge,
    modifiers: cloneSerializable(input.modifiers),
    start,
    end: add(start, scale(normalizedDirection, travelDistance)),
    elapsed: 0,
    duration,
    assist,
    madeContact: false,
  };
}

function aiRestingHandPosition(charge = 0) {
  const observation = state.ai.observation;
  const observedPosition = observation?.active ? observation.position : null;
  const serving = (
    state.mode === 'match'
    && state.match.phase === 'serve-toss'
    && state.match.server === 'ai'
  );
  const side = observedPosition
    ? observedPosition.x >= state.ai.position.x ? 1 : -1
    : -1;
  const observedX = observedPosition?.x ?? state.ai.position.x + side * 0.38;
  const reachableX = THREE.MathUtils.clamp(
    observedX,
    state.ai.position.x - 0.63,
    state.ai.position.x + 0.63,
  );
  const baseY = serving ? 0.78 : 1.08;
  const trackedY = observedPosition
    ? serving
      ? THREE.MathUtils.clamp(observedPosition.y - 0.14, 0.68, 1.04)
      : THREE.MathUtils.clamp(observedPosition.y, 0.4, 1.62)
    : baseY;
  return {
    x: THREE.MathUtils.lerp(
      state.ai.position.x + side * 0.38,
      reachableX + side * 0.035,
      Math.min(1, charge * 1.3),
    ),
    y: THREE.MathUtils.lerp(baseY, trackedY, Math.min(0.8, charge * 1.12)),
    z: state.ai.position.z - 0.17 + charge * 0.48,
  };
}

function startAiPreparation(technique = 'palm', releaseTick = null) {
  if (state.ai.preparing || state.aiSwing) return;
  state.ai.preparing = true;
  state.ai.prepareStartedAt = state.simulationTime;
  state.ai.contact = technique;
  state.ai.plannedReleaseTick = releaseTick;
}

function projectAiObservation(observation, seconds) {
  if (!observation?.active || seconds <= 0) {
    return observation
      ? {
          position: { ...observation.position },
          velocity: { ...observation.velocity },
          angularVelocity: { ...observation.angularVelocity },
        }
      : null;
  }

  const projected = createBallState({
    active: true,
    position: observation.position,
    velocity: observation.velocity,
    angularVelocity: observation.angularVelocity,
  });
  let remaining = seconds;
  let projectionTick = observation.sourceTick;
  while (remaining > 1e-6) {
    const dt = Math.min(BALL_DT, remaining);
    stepBall(projected, dt, {
      tick: projectionTick,
      coefficients: physicsCoefficients,
    });
    remaining -= dt;
    projectionTick += 1;
  }
  return projected;
}

function startAiSwing() {
  if (!state.ai.preparing || state.aiSwing) return;
  const techniqueKey = state.ai.contact;
  const technique = TECHNIQUES[techniqueKey];
  const charge = currentAiCharge();
  const preparedStart = { ...state.aiHand.position };
  const observation = state.ai.observation;
  const handSpeed = (7.2 + charge * 6.8) * technique.pace;
  const travelDistance = 1.28;
  const preliminaryDuration = Math.max(0.11, travelDistance / handSpeed);
  const observationAge = observation
    ? Math.max(0, state.tick - observation.sourceTick) / SIMULATION_HZ
    : 0;
  const predictionTime = observationAge + preliminaryDuration * 0.5;
  const projectedBall = projectAiObservation(observation, predictionTime);
  const perceivedBall = projectedBall?.position ?? preparedStart;
  const serving = state.match.phase === 'serve-toss' && state.match.server === 'ai';
  const target = {
    x: THREE.MathUtils.clamp(
      -state.player.position.x * 0.48 + rng.signed(0.32),
      -COURT.halfWidth + 0.35,
      COURT.halfWidth - 0.35,
    ),
    y: serving
      ? 1.55 + rng.signed(0.05)
      : perceivedBall.y < 0.7
        ? 0.82 + rng.signed(0.06)
      : techniqueKey === 'topspin'
        ? 1.62
        : 1.86 + rng.signed(0.18),
    z: 0,
  };
  const canAssist = (
    observation?.active
    && Math.abs(perceivedBall.x - state.ai.position.x) <= 0.86
    && perceivedBall.y >= BALL.radius
    && perceivedBall.y <= 1.82
    && perceivedBall.z >= state.ai.position.z - 1.95
    && perceivedBall.z <= state.ai.position.z + 1.1
  );
  const direction = normalize(
    subtract(target, canAssist ? perceivedBall : preparedStart),
    { x: 0, y: 0, z: -1 },
  );
  const english = rng.signed(0.32);
  const modifiers = {
    english,
    lift: serving || perceivedBall.y < 0.48,
    drive: perceivedBall.y > 1.18 && charge > 0.62,
  };
  direction.y += modifiers.lift ? 0.18 : 0;
  direction.y += modifiers.drive ? -0.12 : 0;
  const normalizedDirection = normalize(direction, { x: 0, y: 0, z: -1 });
  const contactOffset = state.aiHand.radius + BALL.radius * 0.78;
  const desiredContactPoint = canAssist
    ? subtract(perceivedBall, scale(normalizedDirection, contactOffset))
    : preparedStart;
  const contactPoint = {
    x: THREE.MathUtils.clamp(
      desiredContactPoint.x,
      state.ai.position.x - 0.72,
      state.ai.position.x + 0.72,
    ),
    y: THREE.MathUtils.clamp(desiredContactPoint.y, BALL.radius, 1.9),
    z: THREE.MathUtils.clamp(
      desiredContactPoint.z,
      state.ai.position.z - 1.75,
      state.ai.position.z + 0.72,
    ),
  };
  const approachDistance = magnitude(subtract(contactPoint, preparedStart));
  const pathDistance = Math.max(0.2, approachDistance + travelDistance);
  const duration = THREE.MathUtils.clamp(pathDistance / handSpeed, 0.12, 0.28);
  const contactProgress = THREE.MathUtils.clamp(
    approachDistance / pathDistance,
    0.32,
    0.58,
  );

  state.ai.preparing = false;
  state.ai.plannedReleaseTick = null;
  state.aiSwing = {
    technique: techniqueKey,
    charge,
    modifiers,
    start: preparedStart,
    contactPoint,
    contactProgress,
    end: add(contactPoint, scale(normalizedDirection, travelDistance)),
    elapsed: 0,
    duration,
    assist: subtract(contactPoint, preparedStart),
    madeContact: false,
  };
}

function startServeToss(server) {
  if (
    state.mode !== 'match'
    || !state.match.active
    || state.match.phase !== 'serve-ready'
    || state.match.server !== server
  ) {
    return;
  }
  const actor = server === 'player' ? state.player : state.ai;
  const side = server === 'player' ? 1 : -1;
  state.ball = createBallState({
    active: true,
    position: {
      x: actor.position.x + side * 0.38,
      y: 0.92,
      z: actor.position.z - 0.5,
    },
    velocity: { x: 0, y: 1.48, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  });
  state.match = {
    ...state.match,
    phase: 'serve-toss',
    expectedHitter: server,
  };
  state.lastHandContact = null;
  state.lastWallContact = null;
  state.wallContactsAtLastHand = 0;
  state.trail.length = 0;
  ui.resultLabel.textContent = server === 'player' ? 'Serve toss is live' : 'Wall Ghost serves';
  if (server === 'ai') {
    state.ai.observation = {
      active: true,
      position: { ...state.ball.position },
      velocity: { ...state.ball.velocity },
      sourceTick: state.tick,
      deliveredTick: state.tick,
    };
    startAiPreparation('palm', state.tick + 28);
  }
}

function resetActorsForMatch() {
  const playerServing = state.match.server === 'player';
  state.player.position = {
    x: playerServing ? -0.42 : -0.62,
    y: 0,
    z: playerServing ? COURT.serviceMarkers : COURT.longLine - 0.55,
  };
  state.ai.position = {
    x: playerServing ? 0.62 : 0.42,
    y: 0,
    z: playerServing ? COURT.longLine - 0.55 : COURT.serviceMarkers,
  };
  state.player.velocity = { x: 0, y: 0, z: 0 };
  state.ai.velocity = { x: 0, y: 0, z: 0 };
  state.ai.targetPosition = {
    x: state.ai.position.x,
    z: state.ai.position.z,
  };
  state.hand.position = restingHandPosition(0);
  state.hand.previousPosition = { ...state.hand.position };
  state.aiHand.position = aiRestingHandPosition(0);
  state.aiHand.previousPosition = { ...state.aiHand.position };
}

function startRallyPoint() {
  unlockAudio();
  if (state.mode === 'match' && state.match.active) return;
  if (state.match.matchWinner) {
    state.match = createMatchState();
  }
  state.mode = 'match';
  state.match = beginPoint(state.match);
  state.ball = createBallState({
    active: false,
    position: { x: 0, y: BALL.radius, z: COURT.serviceMarkers },
  });
  state.swing = null;
  state.aiSwing = null;
  state.ai.preparing = false;
  state.ai.observation = null;
  state.ai.observationQueue.length = 0;
  input.activeTechnique = null;
  state.lastHandContact = null;
  state.lastWallContact = null;
  state.wallContactsAtLastHand = 0;
  state.trail.length = 0;
  resetActorsForMatch();
  ui.bounceMetric.textContent = '—';
  ui.contactGrade.textContent = 'Point ready';
  ui.contactReason.textContent = state.match.server === 'player'
    ? 'Hold any contact button to toss and serve through the same physical hand collider.'
    : 'Wall Ghost receives delayed ball observations and must make a real serve contact.';
  ui.resultLabel.textContent = state.match.server === 'player'
    ? state.match.serveFaults === 1 ? 'Second serve · hold a contact' : 'Your serve · hold a contact'
    : 'Wall Ghost steps in to serve';
  if (state.match.server === 'ai') {
    startServeToss('ai');
  }
  syncMatchUi();
}

function updatePlayer() {
  const keyMoveX = (input.keys.has('KeyD') ? 1 : 0) - (input.keys.has('KeyA') ? 1 : 0);
  const keyMoveZ = (input.keys.has('KeyS') ? 1 : 0) - (input.keys.has('KeyW') ? 1 : 0);
  const moveX = Math.abs(input.move.x) > 0.08 ? input.move.x : keyMoveX;
  const moveZ = Math.abs(input.move.z) > 0.08 ? input.move.z : keyMoveZ;
  const moveLength = Math.hypot(moveX, moveZ);
  const normalizedX = moveLength > 1 ? moveX / moveLength : moveX;
  const normalizedZ = moveLength > 1 ? moveZ / moveLength : moveZ;
  const preparing = Boolean(input.activeTechnique);
  const maximumSpeed = preparing ? 2.25 : 3.95;
  const targetVelocityX = normalizedX * maximumSpeed;
  const targetVelocityZ = normalizedZ * maximumSpeed;
  const acceleration = preparing ? 15 : 22;
  const response = 1 - Math.exp(-acceleration * SIMULATION_DT);

  state.player.velocity.x += (targetVelocityX - state.player.velocity.x) * response;
  state.player.velocity.z += (targetVelocityZ - state.player.velocity.z) * response;
  state.player.position.x += state.player.velocity.x * SIMULATION_DT;
  state.player.position.z += state.player.velocity.z * SIMULATION_DT;
  state.player.position.x = THREE.MathUtils.clamp(
    state.player.position.x,
    -COURT.halfWidth + 0.38,
    COURT.halfWidth - 0.38,
  );
  state.player.position.z = THREE.MathUtils.clamp(
    state.player.position.z,
    COURT.shortLine - 1.15,
    COURT.longLine + COURT.runback - 0.6,
  );
  state.player.preparation = currentCharge();
}

function updateAiPerception() {
  const perceptionLive = state.mode === 'match' && state.match.active;
  if (!perceptionLive) {
    state.ai.observation = null;
    state.ai.observationQueue.length = 0;
    ui.aiReadLabel.textContent = 'Waiting · 96 ms delay';
    return;
  }

  if (state.tick % 6 === 0 && state.ball.active) {
    state.ai.observationQueue.push({
      active: true,
      position: {
        x: state.ball.position.x + rng.signed(0.025),
        y: Math.max(BALL.radius, state.ball.position.y + rng.signed(0.018)),
        z: state.ball.position.z + rng.signed(0.03),
      },
      velocity: {
        x: state.ball.velocity.x + rng.signed(0.06),
        y: state.ball.velocity.y + rng.signed(0.08),
        z: state.ball.velocity.z + rng.signed(0.08),
      },
      angularVelocity: {
        x: state.ball.angularVelocity.x + rng.signed(1.5),
        y: state.ball.angularVelocity.y + rng.signed(1.5),
        z: state.ball.angularVelocity.z + rng.signed(1.5),
      },
      sourceTick: state.tick,
      deliveredTick: state.tick + state.ai.observationDelayTicks,
    });
  }

  while (
    state.ai.observationQueue.length
    && state.ai.observationQueue[0].deliveredTick <= state.tick
  ) {
    state.ai.observation = state.ai.observationQueue.shift();
  }

  if (state.ai.observation) {
    const age = state.tick - state.ai.observation.sourceTick;
    ui.aiReadLabel.textContent = `${Math.round(age / SIMULATION_HZ * 1000)} ms old · noisy read`;
  } else {
    ui.aiReadLabel.textContent = 'Waiting · 96 ms delay';
  }
}

function updateAiActor() {
  updateAiPerception();
  const matchLive = state.mode === 'match' && state.match.active;
  const ownsTouch = matchLive && state.match.expectedHitter === 'ai';
  const observation = state.ai.observation;
  const observationAge = observation
    ? Math.max(0, (state.tick - observation.sourceTick) / SIMULATION_HZ)
    : 0;
  const perceivedNow = projectAiObservation(observation, observationAge);

  if (ownsTouch && state.match.phase === 'serve-ready' && state.match.server === 'ai') {
    startServeToss('ai');
  }

  if (ownsTouch && observation?.active) {
    if (state.match.phase === 'serve-toss' && state.match.server === 'ai') {
      state.ai.targetPosition = {
        x: state.ai.position.x,
        z: state.ai.position.z,
      };
      if (!state.ai.preparing && !state.aiSwing) {
        startAiPreparation('palm', state.tick + 30);
      }
    } else if (perceivedNow.velocity.z > 0.2) {
      const interceptZ = 8.35;
      const eta = Math.max(
        0,
        (interceptZ - perceivedNow.position.z) / Math.max(0.2, perceivedNow.velocity.z),
      );
      const predictedX = perceivedNow.position.x + perceivedNow.velocity.x * eta;
      state.ai.targetPosition = {
        x: THREE.MathUtils.clamp(
          predictedX,
          -COURT.halfWidth + 0.42,
          COURT.halfWidth - 0.42,
        ),
        z: THREE.MathUtils.clamp(
          interceptZ,
          COURT.shortLine + 0.6,
          COURT.longLine - 0.32,
        ),
      };

      if (eta <= 0.72 && !state.ai.preparing && !state.aiSwing) {
        const technique = perceivedNow.position.y < 0.55
          ? 'backspin'
          : state.match.rallyContacts >= 4 && rng.next() > 0.64
            ? 'topspin'
            : 'palm';
        startAiPreparation(technique);
      }
      if (eta <= 0.075 && state.ai.preparing && !state.aiSwing) {
        startAiSwing();
      }
    } else {
      state.ai.targetPosition = {
        x: THREE.MathUtils.clamp(
          -state.player.position.x * 0.42,
          -COURT.halfWidth + 0.55,
          COURT.halfWidth - 0.55,
        ),
        z: 8.25,
      };
    }
  } else if (matchLive) {
    state.ai.targetPosition = {
      x: THREE.MathUtils.clamp(
        -state.player.position.x * 0.5 + 0.45,
        -COURT.halfWidth + 0.58,
        COURT.halfWidth - 0.58,
      ),
      z: state.match.server === 'ai' && state.match.phase === 'serve-ready'
        ? COURT.serviceMarkers
        : 8.5,
    };
  } else {
    state.ai.targetPosition = {
      x: 0.62,
      z: COURT.longLine - 0.45,
    };
  }

  if (
    ownsTouch
    && state.ai.preparing
    && state.ai.plannedReleaseTick !== null
    && state.tick >= state.ai.plannedReleaseTick
  ) {
    startAiSwing();
  }

  const dx = state.ai.targetPosition.x - state.ai.position.x;
  const dz = state.ai.targetPosition.z - state.ai.position.z;
  const distance = Math.hypot(dx, dz);
  const maximumSpeed = state.ai.preparing ? 2.35 : 3.65;
  const targetVx = distance > 0.035 ? dx / distance * maximumSpeed : 0;
  const targetVz = distance > 0.035 ? dz / distance * maximumSpeed : 0;
  const response = 1 - Math.exp(-(state.ai.preparing ? 14 : 20) * SIMULATION_DT);
  state.ai.velocity.x += (targetVx - state.ai.velocity.x) * response;
  state.ai.velocity.z += (targetVz - state.ai.velocity.z) * response;
  state.ai.position.x += state.ai.velocity.x * SIMULATION_DT;
  state.ai.position.z += state.ai.velocity.z * SIMULATION_DT;
  state.ai.position.x = THREE.MathUtils.clamp(
    state.ai.position.x,
    -COURT.halfWidth + 0.38,
    COURT.halfWidth - 0.38,
  );
  state.ai.position.z = THREE.MathUtils.clamp(
    state.ai.position.z,
    COURT.shortLine - 0.9,
    COURT.longLine + 0.7,
  );
  state.ai.preparation = currentAiCharge();
}

function updateHand() {
  const previous = { ...state.hand.position };
  let position;
  let active = false;

  if (state.swing) {
    state.swing.elapsed += SIMULATION_DT;
    const progress = Math.min(1, state.swing.elapsed / state.swing.duration);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - ((-2 * progress + 2) ** 2) / 2;
    position = {
      x: THREE.MathUtils.lerp(state.swing.start.x, state.swing.end.x, eased),
      y: THREE.MathUtils.lerp(state.swing.start.y, state.swing.end.y, eased),
      z: THREE.MathUtils.lerp(state.swing.start.z, state.swing.end.z, eased),
    };
    active = progress >= 0.12 && progress <= 0.86 && !state.swing.madeContact;

    if (progress >= 1) {
      const missed = !state.swing.madeContact && state.pendingMissCheck;
      state.swing = null;
      state.pendingMissCheck = false;
      if (missed) explainMiss();
    }
  } else {
    position = restingHandPosition(currentCharge());
  }

  state.hand.previousPosition = previous;
  state.hand.position = position;
  state.hand.velocity = scale(subtract(position, previous), 1 / SIMULATION_DT);
  state.hand.active = active;
}

function updateAiHand() {
  const previous = { ...state.aiHand.position };
  let position;
  let active = false;

  if (state.aiSwing) {
    state.aiSwing.elapsed += SIMULATION_DT;
    const progress = Math.min(1, state.aiSwing.elapsed / state.aiSwing.duration);
    const contactProgress = state.aiSwing.contactProgress ?? 0.5;
    const approaching = progress <= contactProgress;
    const segmentProgress = approaching
      ? progress / contactProgress
      : (progress - contactProgress) / (1 - contactProgress);
    const eased = segmentProgress;
    const segmentStart = approaching ? state.aiSwing.start : state.aiSwing.contactPoint;
    const segmentEnd = approaching ? state.aiSwing.contactPoint : state.aiSwing.end;
    position = {
      x: THREE.MathUtils.lerp(segmentStart.x, segmentEnd.x, eased),
      y: THREE.MathUtils.lerp(segmentStart.y, segmentEnd.y, eased),
      z: THREE.MathUtils.lerp(segmentStart.z, segmentEnd.z, eased),
    };
    active = progress >= 0.08 && progress <= 0.9 && !state.aiSwing.madeContact;
    if (progress >= 1) {
      state.aiSwing = null;
    }
  } else {
    position = aiRestingHandPosition(currentAiCharge());
  }

  state.aiHand.previousPosition = previous;
  state.aiHand.position = position;
  state.aiHand.velocity = scale(subtract(position, previous), 1 / SIMULATION_DT);
  state.aiHand.active = active;
}

function commandForTick() {
  return createPlayerCommand({
    controllerId: 'player',
    tick: state.tick,
    sequence: input.commandSequence,
    move: { x: input.move.x, z: input.move.z },
    aim: input.aim,
    contact: input.activeTechnique ?? state.swing?.technique ?? null,
    phase: input.activeTechnique ? 'prepare' : state.swing ? 'swing' : 'none',
    modifiers: input.modifiers,
    charge: state.player.preparation,
  });
}

function aiCommandForTick() {
  const dx = state.ai.targetPosition.x - state.ai.position.x;
  const dz = state.ai.targetPosition.z - state.ai.position.z;
  const length = Math.hypot(dx, dz) || 1;
  return createPlayerCommand({
    controllerId: 'ai',
    tick: state.tick,
    sequence: state.ai.commandSequence,
    move: {
      x: THREE.MathUtils.clamp(dx / length, -1, 1),
      z: THREE.MathUtils.clamp(dz / length, -1, 1),
    },
    aim: {
      x: THREE.MathUtils.clamp(-state.player.position.x / COURT.halfWidth, -1, 1),
      y: -0.08,
    },
    contact: state.ai.preparing
      ? state.ai.contact
      : state.aiSwing?.technique ?? null,
    phase: state.ai.preparing ? 'prepare' : state.aiSwing ? 'swing' : 'none',
    modifiers: state.aiSwing?.modifiers,
    charge: state.ai.preparation,
  });
}

function recordCommandIfChanged() {
  const command = commandForTick();
  const digest = JSON.stringify({
    move: command.move,
    aim: {
      x: Math.round(command.aim.x * 100) / 100,
      y: Math.round(command.aim.y * 100) / 100,
    },
    contact: command.contact,
    phase: command.phase,
    modifiers: command.modifiers,
    chargeBand: Math.round(command.charge * 10),
  });
  if (digest === input.lastCommandDigest) return;
  input.lastCommandDigest = digest;
  input.commandSequence += 1;
  command.sequence = input.commandSequence;
  recorder.recordCommand(command);
}

function recordAiCommandIfChanged() {
  const command = aiCommandForTick();
  const digest = JSON.stringify({
    move: {
      x: Math.round(command.move.x * 10) / 10,
      z: Math.round(command.move.z * 10) / 10,
    },
    contact: command.contact,
    phase: command.phase,
    chargeBand: Math.round(command.charge * 10),
    observationTick: state.ai.observation?.sourceTick ?? null,
  });
  if (digest === state.ai.lastCommandDigest) return;
  state.ai.lastCommandDigest = digest;
  state.ai.commandSequence += 1;
  command.sequence = state.ai.commandSequence;
  recorder.recordCommand(command);
}

function techniqueSpin(swing) {
  const base = TECHNIQUES[swing.technique].spin;
  const chargeScale = 0.55 + swing.charge * 0.65;
  const english = swing.modifiers.english * (42 + swing.charge * 50);
  return {
    x: base.x * chargeScale,
    y: base.y + english,
    z: base.z,
  };
}

function updateBallAndContacts() {
  if (!state.ball.active) return;
  const handStart = { ...state.hand.previousPosition };
  const handEnd = { ...state.hand.position };
  const aiHandStart = { ...state.aiHand.previousPosition };
  const aiHandEnd = { ...state.aiHand.position };

  for (let substep = 0; substep < BALL_SUBSTEPS; substep += 1) {
    const startFraction = substep / BALL_SUBSTEPS;
    const endFraction = (substep + 1) / BALL_SUBSTEPS;
    const subHand = {
      previousPosition: {
        x: THREE.MathUtils.lerp(handStart.x, handEnd.x, startFraction),
        y: THREE.MathUtils.lerp(handStart.y, handEnd.y, startFraction),
        z: THREE.MathUtils.lerp(handStart.z, handEnd.z, startFraction),
      },
      position: {
        x: THREE.MathUtils.lerp(handStart.x, handEnd.x, endFraction),
        y: THREE.MathUtils.lerp(handStart.y, handEnd.y, endFraction),
        z: THREE.MathUtils.lerp(handStart.z, handEnd.z, endFraction),
      },
      velocity: { ...state.hand.velocity },
      radius: state.hand.radius,
    };
    const subAiHand = {
      previousPosition: {
        x: THREE.MathUtils.lerp(aiHandStart.x, aiHandEnd.x, startFraction),
        y: THREE.MathUtils.lerp(aiHandStart.y, aiHandEnd.y, startFraction),
        z: THREE.MathUtils.lerp(aiHandStart.z, aiHandEnd.z, startFraction),
      },
      position: {
        x: THREE.MathUtils.lerp(aiHandStart.x, aiHandEnd.x, endFraction),
        y: THREE.MathUtils.lerp(aiHandStart.y, aiHandEnd.y, endFraction),
        z: THREE.MathUtils.lerp(aiHandStart.z, aiHandEnd.z, endFraction),
      },
      velocity: { ...state.aiHand.velocity },
      radius: state.aiHand.radius,
    };

    const events = stepBall(state.ball, BALL_DT, {
      tick: state.tick,
      contactSequence: state.contacts,
      coefficients: physicsCoefficients,
    });
    handleBallEvents(events);

    if (
      (state.mode === 'practice' || (
        state.mode === 'match'
        && state.match.active
        && state.match.expectedHitter === 'player'
        && (
          !state.match.serveInFlight
          || state.match.expectedHitter === state.match.server
        )
      ))
      && state.hand.active
      && state.swing
      && !state.swing.madeContact
      && state.tick - state.lastHandContactTick > 18
      && state.ball.active
    ) {
      const technique = TECHNIQUES[state.swing.technique];
      const contact = resolveHandContact(state.ball, subHand, {
        id: `hand-${state.tick}-${state.contacts}`,
        tick: state.tick,
        technique: state.swing.technique,
        charge: state.swing.charge,
        restitution: technique.restitution,
        faceInfluence: 0.66,
        spinImpulse: techniqueSpin(state.swing),
        modifiers: state.swing.modifiers,
        assist: state.swing.assist,
      });
      if (contact) handleHandContact(contact, 'player');
    }

    if (
      state.mode === 'match'
      && state.match.active
      && state.match.expectedHitter === 'ai'
      && (
        !state.match.serveInFlight
        || state.match.expectedHitter === state.match.server
      )
      && state.aiHand.active
      && state.aiSwing
      && !state.aiSwing.madeContact
      && state.tick - state.lastHandContactTick > 18
      && state.ball.active
    ) {
      const technique = TECHNIQUES[state.aiSwing.technique];
      const contact = resolveHandContact(state.ball, subAiHand, {
        id: `ai-hand-${state.tick}-${state.contacts}`,
        tick: state.tick,
        technique: state.aiSwing.technique,
        charge: state.aiSwing.charge,
        restitution: technique.restitution,
        faceInfluence: 0.66,
        spinImpulse: techniqueSpin(state.aiSwing),
        modifiers: state.aiSwing.modifiers,
        assist: state.aiSwing.assist,
      });
      if (contact) handleHandContact(contact, 'ai');
    }
  }

  updateDropTracking();
  if (
    state.mode === 'match'
    && state.match.active
    && state.match.serveInFlight
    && state.match.wallReached
    && state.ball.velocity.z > 0
    && state.ball.position.z > COURT.longLine - BALL.radius
  ) {
    handleMatchServeFault('long-serve');
    return;
  }
  if (
    state.ball.position.z > COURT.longLine + COURT.runback + 4
    || Math.abs(state.ball.position.x) > COURT.halfWidth + 6
    || state.ball.floorBounces > 4
  ) {
    if (state.mode === 'match' && state.match.active) {
      resolveMatchPoint(
        state.match.expectedHitter ? opponentOf(state.match.expectedHitter) : opponentOf(state.match.lastHitter),
        'unreachable',
      );
      return;
    }
    state.ball.active = false;
    if (state.mode === 'practice' && !state.lastHandContact) {
      ui.resultLabel.textContent = 'Ball escaped the live court';
    }
  }
}

const POINT_REASON_LABELS = {
  'floor-before-wall': 'Down · floor before wall',
  'second-bounce': 'Second bounce',
  'bounce-out': 'Bounce out',
  'wall-out': 'Missed the live wall',
  'double-fault': 'Double fault',
  unreachable: 'Out of reach',
};

function finishPointPresentation(point) {
  const winnerName = point.winner === 'player' ? 'You' : 'Wall Ghost';
  const winnerVerb = point.winner === 'player' ? 'own' : 'owns';
  const reasonLabel = POINT_REASON_LABELS[point.reason] ?? point.reason;
  ui.resultLabel.textContent = point.matchWinner
    ? `${winnerName} ${winnerVerb} the lab`
    : point.scored
      ? `${winnerName} score · ${reasonLabel}`
      : `Side out · ${winnerName} serve`;
  ui.contactGrade.textContent = point.scored ? 'Point scored' : 'Side out';
  ui.contactReason.textContent = point.matchWinner
    ? `${winnerName} reached ${state.match.targetScore}. Reset or run the match back.`
    : point.scored
      ? `${winnerName} won the rally while serving, so the scoreboard moves.`
      : `${winnerName} won as receiver. No point is scored; service changes hands.`;
  showCallout(point.matchWinner ? winnerName === 'You' ? 'Court yours!' : 'Run it back!' : point.scored ? 'Point!' : 'Side out!');
  ui.rallyButtonLabel.textContent = point.matchWinner ? 'Run it back' : 'Next point';
  ui.rallyButtonHint.textContent = point.matchWinner
    ? `Final · ${state.match.scores.player}–${state.match.scores.ai}`
    : `${state.match.server === 'player' ? 'Your' : 'Ghost'} serve`;
  syncMatchUi();
}

function resolveMatchPoint(winner, reason) {
  if (state.mode !== 'match' || !state.match.active || !winner) return;
  const result = awardRally(state.match, winner, reason);
  state.match = result.match;
  state.ball.active = false;
  state.swing = null;
  state.aiSwing = null;
  state.ai.preparing = false;
  input.activeTechnique = null;
  finishPointPresentation(result.point);
}

function handleMatchServeFault(reason) {
  const result = resolveServeFault(state.match, reason);
  state.match = result.match;
  state.ball.active = false;
  state.swing = null;
  state.aiSwing = null;
  state.ai.preparing = false;
  input.activeTechnique = null;

  if (result.point) {
    finishPointPresentation(result.point);
    return;
  }

  const label = {
    'short-serve': 'Short fault',
    'long-serve': 'Long fault',
    'outside-serve': 'Outside fault',
    'serve-down': 'Down serve',
    'wall-out': 'Wall-out fault',
  }[reason] ?? 'Service fault';
  ui.resultLabel.textContent = `${label} · second serve`;
  ui.contactGrade.textContent = 'First service fault';
  ui.contactReason.textContent = 'The server keeps one final attempt. The same physical serve rules apply.';
  ui.rallyButtonLabel.textContent = 'Second serve';
  ui.rallyButtonHint.textContent = state.match.server === 'player' ? 'Your ball' : 'Ghost ball';
  showCallout('Fault!');
  syncMatchUi();
}

function handleBallEvents(events) {
  for (const event of events) {
    if (event.type === 'wall-out') {
      if (state.mode === 'match' && state.match.active) {
        if (state.match.serveInFlight) {
          handleMatchServeFault('wall-out');
        } else {
          resolveMatchPoint(opponentOf(state.match.lastHitter), 'wall-out');
        }
        continue;
      }
      ui.resultLabel.textContent = 'Out — missed the live wall';
      showCallout('Out!');
      playImpact(92, 0.08);
      continue;
    }

    if (event.type !== 'contact') continue;
    state.contacts += 1;
    recorder.recordContact(event.contact);
    if (event.contact.kind === 'wall') {
      if (state.mode === 'match' && state.match.active) {
        state.match = registerWallContact(state.match);
      }
      state.lastWallContact = event.contact;
      const wallFeet = event.contact.position.y / UNITS.FOOT;
      ui.heightMetric.textContent = `${wallFeet.toFixed(1)}′`;
      ui.resultLabel.textContent = event.contact.metadata.crack
        ? 'Crack seam — dead rebound'
        : `Live wall at ${wallFeet.toFixed(1)} feet`;
      showCallout(event.contact.metadata.crack ? 'Crack!' : 'Wall!');
      playImpact(event.contact.metadata.crack ? 68 : 112, event.contact.metadata.crack ? 0.16 : 0.09);
      rumble(event.contact.metadata.crack ? 0.8 : 0.45, 90);
    } else if (event.contact.kind === 'floor') {
      if (state.mode === 'match' && state.match.active) {
        const result = registerFloorContact(state.match, event.contact.position);
        state.match = result.match;
        if (result.verdict?.serveFault) {
          handleMatchServeFault(result.verdict.reason);
          continue;
        }
        if (result.verdict?.winner) {
          resolveMatchPoint(result.verdict.winner, result.verdict.reason);
          continue;
        }
        if (state.match.bouncesAfterWall === 1) {
          ui.bounceMetric.textContent = 'One';
          ui.contactReason.textContent = state.match.serveInFlight
            ? 'The serve is waiting for its required legal bounce.'
            : `${state.match.expectedHitter === 'player' ? 'Your' : 'Ghost’s'} return is live before the second bounce.`;
        }
        syncMatchUi();
        playImpact(54, 0.045);
        continue;
      }
      const floorBeforeWall = (
        state.lastHandContact
        && state.ball.wallContacts <= state.wallContactsAtLastHand
      );
      if (floorBeforeWall) {
        ui.resultLabel.textContent = 'Down — floor before the wall';
        ui.bounceMetric.textContent = 'Down';
        ui.contactReason.textContent = 'The hand collision drove the ball into the floor before it reached the front wall.';
        showCallout('Down!');
        state.ball.active = false;
        playImpact(46, 0.08);
        continue;
      }
      if (state.lastHandContact && ui.bounceMetric.textContent === 'Waiting') {
        const inBounds = event.contact.metadata.inBounds;
        ui.bounceMetric.textContent = inBounds ? 'In' : 'Out';
        ui.contactReason.textContent = inBounds
          ? 'The first bounce landed inside the regulation rectangle.'
          : 'The first bounce missed the regulation rectangle. Change the collision, not a shot preset.';
      }
      playImpact(54, 0.045);
    }
  }
}

function handleHandContact(contact, hitter = 'player') {
  state.contacts += 1;
  state.lastHandContactTick = state.tick;
  state.lastHandContact = contact;
  state.wallContactsAtLastHand = state.ball.wallContacts;
  contact.metadata.hitter = hitter;
  if (hitter === 'player') {
    state.swing.madeContact = true;
    state.pendingMissCheck = false;
  } else {
    state.aiSwing.madeContact = true;
  }
  recorder.recordContact(contact);

  if (state.mode === 'match') {
    state.match = registerLegalContact(state.match, hitter, state.ball);
  }

  const speedMph = magnitude(contact.outgoingVelocity) * 2.236936;
  const spinRpm = magnitude(contact.outgoingSpin) * 60 / (Math.PI * 2);
  const handSpeed = magnitude(contact.metadata.handVelocity);
  const actor = hitter === 'player' ? state.player : state.ai;
  const lateralSpacing = Math.abs(contact.position.x - actor.position.x);
  const spacingGrade = lateralSpacing < 0.28
    ? 'Jammed'
    : lateralSpacing > 0.64
      ? 'Reached'
      : 'Clean';
  const prepGrade = contact.charge >= 0.92
    ? 'Loaded'
    : contact.charge >= 0.55
      ? 'Set'
      : 'Quick';
  const pure = spacingGrade === 'Clean' && contact.charge >= 0.55;

  ui.speedMetric.textContent = speedMph.toFixed(1);
  ui.spinMetric.textContent = Math.round(spinRpm);
  ui.contactGrade.textContent = pure ? 'Pure contact' : `${spacingGrade} contact`;
  ui.spacingMetric.textContent = spacingGrade;
  ui.prepMetric.textContent = `${prepGrade} · ${Math.round(contact.charge * 100)}%`;
  ui.handMetric.textContent = `${handSpeed.toFixed(1)} m/s`;
  ui.bounceMetric.textContent = 'Waiting';
  ui.contactReason.textContent = pure
    ? `${hitter === 'player' ? 'Your' : 'Ghost’s'} ${TECHNIQUES[contact.technique].label.toLowerCase()} met the ball inside a balanced reach window. Physics now owns the result.`
    : spacingGrade === 'Jammed'
      ? 'The ball got too close to the body. Create space earlier for cleaner direction.'
      : 'The hand reached near its anatomical limit. Move your feet into the lane.';
  ui.resultLabel.textContent = `${hitter === 'player' ? 'You' : 'Ghost'} · ${TECHNIQUES[contact.technique].label} · ${speedMph.toFixed(1)} mph`;
  showCallout(pure ? hitter === 'player' ? 'Pure!' : 'Ghost!' : 'Contact!');
  playImpact(hitter === 'player' ? 185 : 154, 0.12);
  if (hitter === 'player') {
    rumble(pure ? 0.68 : 0.42, 75);
    state.hintProgress += 1;
    if (state.hintProgress >= 2) ui.worldHint.classList.add('is-hidden');
  }
  syncMatchUi();
}

function explainMiss() {
  if (!state.ball.active) {
    ui.contactGrade.textContent = 'No live ball';
    ui.contactReason.textContent = 'Feed a ball first, then prepare while it is returning from the wall.';
    return;
  }

  const lateral = Math.abs(state.ball.position.x - state.player.position.x);
  const depth = state.ball.position.z - state.player.position.z;
  let reason = 'The hand path and ball path never crossed.';
  if (lateral > 0.75) reason = 'Reached — move sideways into the ball lane before releasing.';
  else if (depth > 0.45) reason = 'Late — the ball passed the front hip before the hand arrived.';
  else if (depth < -1.0) reason = 'Early — hold the preparation until the ball enters reach.';
  else if (state.ball.position.y > 1.75) reason = 'High — point higher and meet it earlier, or let it drop.';
  else if (state.ball.position.y < 0.35) reason = 'Low — get closer to the bounce and release through its rise.';

  ui.contactGrade.textContent = 'Air swing';
  ui.contactReason.textContent = reason;
  ui.spacingMetric.textContent = lateral > 0.75 ? 'Reached' : 'No overlap';
  ui.prepMetric.textContent = `${Math.round(state.player.preparation * 100)}%`;
  ui.handMetric.textContent = 'Miss';
  ui.resultLabel.textContent = reason.split(' — ')[0];
  showCallout('Miss!');
  playImpact(74, 0.035);
}

function updateDropTracking() {
  if (!state.dropTracking || !state.ball.active) return;
  if (!state.dropTracking.bounced && state.ball.floorBounces > 0) {
    state.dropTracking.bounced = true;
    state.dropTracking.apex = state.ball.position.y;
  }
  if (state.dropTracking.bounced) {
    state.dropTracking.apex = Math.max(state.dropTracking.apex, state.ball.position.y);
    if (!state.dropTracking.complete && state.ball.velocity.y <= 0) {
      state.dropTracking.complete = true;
      const inches = state.dropTracking.apex / UNITS.INCH;
      const pass = inches >= 48 && inches <= 52;
      ui.resultLabel.textContent = `${inches.toFixed(1)}″ rebound · ${pass ? 'official window' : 'outside window'}`;
      ui.contactGrade.textContent = pass ? 'Drop test passes' : 'Drop test misses';
      ui.contactReason.textContent = `A 70″ free fall rebounded to ${inches.toFixed(1)}″ with floor restitution ${physicsCoefficients.floorRestitution.toFixed(3)}.`;
      showCallout(pass ? '50-inch!' : 'Tune it!');
    }
  }
}

function feedBall() {
  unlockAudio();
  state.mode = 'practice';
  state.match = {
    ...state.match,
    active: false,
    phase: 'practice',
    expectedHitter: null,
    serveInFlight: false,
  };
  state.ai.preparing = false;
  state.aiSwing = null;
  state.feeds += 1;
  state.lastHandContact = null;
  state.lastWallContact = null;
  state.wallContactsAtLastHand = 0;
  state.dropTracking = null;
  const feedSide = state.feeds % 2 === 1 ? 1 : -1;
  const feedX = THREE.MathUtils.clamp(
    state.player.position.x + feedSide * (0.42 + rng.signed(0.06)),
    -COURT.halfWidth + 0.4,
    COURT.halfWidth - 0.4,
  );
  state.ball = createBallState({
    active: true,
    position: { x: feedX, y: 1.52, z: BALL.radius + 0.01 },
    velocity: { x: rng.signed(0.22), y: -1.05, z: 7.28 },
    angularVelocity: { x: 18, y: rng.signed(4), z: 0 },
  });
  state.trail.length = 0;
  ui.resultLabel.textContent = 'Read the bounce';
  ui.heightMetric.textContent = '—';
  ui.bounceMetric.textContent = '—';
  ui.contactGrade.textContent = 'Ball approaching';
  ui.contactReason.textContent = 'Move into its lane. Point at the wall. Hold a contact and release through the rise.';
  syncMatchUi();
}

function runDropTest() {
  unlockAudio();
  state.mode = 'drop';
  state.match = {
    ...state.match,
    active: false,
    phase: 'drop-test',
    expectedHitter: null,
    serveInFlight: false,
  };
  state.ai.preparing = false;
  state.aiSwing = null;
  state.lastHandContact = null;
  state.ball = createBallState({
    active: true,
    position: { x: -1.15, y: BALL.officialDropHeight, z: COURT.shortLine + 0.35 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  });
  state.dropTracking = {
    bounced: false,
    complete: false,
    apex: BALL.radius,
  };
  state.trail.length = 0;
  ui.resultLabel.textContent = 'Dropping from 70 inches';
  ui.contactGrade.textContent = 'Official rebound test';
  ui.contactReason.textContent = 'The target is a 48–52 inch rebound at 68°F. No visual scale factor touches the collision.';
  syncMatchUi();
}

function resetLab({ resetSeed = true } = {}) {
  if (resetSeed) rng.setState(SEED);
  state.mode = 'practice';
  state.match = createMatchState();
  state.ball = createBallState({
    active: false,
    position: { x: 0, y: BALL.radius, z: COURT.serviceMarkers },
  });
  state.player.position = { x: 0, y: 0, z: COURT.serviceMarkers };
  state.player.velocity = { x: 0, y: 0, z: 0 };
  state.player.preparation = 0;
  state.ai.position = { x: 0.62, y: 0, z: COURT.longLine - 0.45 };
  state.ai.velocity = { x: 0, y: 0, z: 0 };
  state.ai.preparation = 0;
  state.ai.preparing = false;
  state.ai.plannedReleaseTick = null;
  state.ai.targetPosition = { x: 0.62, z: COURT.longLine - 0.45 };
  state.ai.observation = null;
  state.ai.observationQueue.length = 0;
  state.ai.commandSequence = 0;
  state.ai.lastCommandDigest = '';
  state.hand.position = restingHandPosition(0);
  state.hand.previousPosition = { ...state.hand.position };
  state.aiHand.position = aiRestingHandPosition(0);
  state.aiHand.previousPosition = { ...state.aiHand.position };
  state.swing = null;
  state.aiSwing = null;
  state.lastHandContact = null;
  state.lastWallContact = null;
  state.wallContactsAtLastHand = 0;
  state.dropTracking = null;
  state.trail.length = 0;
  state.history.length = 0;
  state.replayPlayback = null;
  input.activeTechnique = null;
  input.commandSequence = 0;
  input.lastCommandDigest = '';
  recorder = createReplayRecorder({ seed: SEED });
  ui.resultLabel.textContent = 'Ready for the feed';
  ui.speedMetric.textContent = '0.0';
  ui.spinMetric.textContent = '0';
  ui.heightMetric.textContent = '—';
  ui.contactGrade.textContent = 'No contact yet';
  ui.spacingMetric.textContent = '—';
  ui.prepMetric.textContent = '—';
  ui.handMetric.textContent = '—';
  ui.bounceMetric.textContent = '—';
  ui.contactReason.textContent = 'Feed a ball. Move into its lane. Hold a contact button and release as it enters reach.';
  syncTechniqueUi();
  syncMatchUi();
}

function currentSnapshot(events = []) {
  return createSimulationSnapshot({
    tick: state.tick,
    simulationTime: state.simulationTime,
    seed: rng.getState(),
    player: state.player,
    opponent: state.ai,
    hand: state.hand,
    opponentHand: state.aiHand,
    ball: state.ball,
    events,
  });
}

function updateSimulation() {
  state.tick += 1;
  state.simulationTime += SIMULATION_DT;
  pollGamepad();
  updatePlayer();
  updateAiActor();
  updateHand();
  updateAiHand();
  updateBallAndContacts();
  recordCommandIfChanged();
  recordAiCommandIfChanged();

  if (state.tick % 2 === 0) {
    state.history.push(currentSnapshot());
    if (state.history.length > 540) state.history.shift();
  }
  if (state.tick % SIMULATION_HZ === 0) recorder.checkpoint(currentSnapshot());
  if (state.ball.active && state.tick % 2 === 0) {
    state.trail.push({ ...state.ball.position });
    if (state.trail.length > 54) state.trail.shift();
  }
}

function replayLastContact() {
  if (state.history.length < 10) {
    ui.resultLabel.textContent = 'Nothing to replay yet';
    return;
  }
  state.replayPlayback = {
    frames: state.history.slice(),
    cursor: 0,
    accumulator: 0,
  };
  ui.resultLabel.textContent = 'Replay · simulation paused';
}

function updateReplay(delta) {
  if (!state.replayPlayback) return null;
  state.replayPlayback.accumulator += delta;
  while (state.replayPlayback.accumulator >= 1 / 60) {
    state.replayPlayback.accumulator -= 1 / 60;
    state.replayPlayback.cursor += 1;
  }
  const frame = state.replayPlayback.frames[state.replayPlayback.cursor];
  if (!frame) {
    state.replayPlayback = null;
    ui.resultLabel.textContent = 'Replay complete';
    return null;
  }
  return frame;
}

function updateVisuals(snapshot = null) {
  const ballState = snapshot?.ball ?? state.ball;
  const playerState = snapshot?.player ?? state.player;
  const handState = snapshot?.hand ?? state.hand;
  const opponentState = snapshot?.opponent ?? state.ai;
  const opponentHandState = snapshot?.opponentHand ?? state.aiHand;

  playerObjects.group.position.set(
    playerState.position.x,
    0,
    playerState.position.z,
  );
  const movementLean = THREE.MathUtils.clamp((playerState.velocity?.x ?? 0) * -0.035, -0.12, 0.12);
  playerObjects.torso.rotation.z += (movementLean - playerObjects.torso.rotation.z) * 0.18;
  playerObjects.hand.position.set(
    handState.position.x,
    handState.position.y,
    handState.position.z,
  );
  playerObjects.hand.material.emissiveIntensity = handState.active ? 1.4 : 0.2;

  opponentObjects.group.position.set(
    opponentState.position.x,
    0,
    opponentState.position.z,
  );
  const opponentLean = THREE.MathUtils.clamp(
    (opponentState.velocity?.x ?? 0) * -0.035,
    -0.12,
    0.12,
  );
  opponentObjects.torso.rotation.z += (
    opponentLean - opponentObjects.torso.rotation.z
  ) * 0.18;
  opponentObjects.hand.position.set(
    opponentHandState.position.x,
    opponentHandState.position.y,
    opponentHandState.position.z,
  );
  opponentObjects.hand.material.emissiveIntensity = opponentHandState.active ? 1.55 : 0.25;

  ballObjects.ball.visible = ballState.active;
  ballObjects.aura.visible = ballState.active;
  if (ballState.active) {
    ballObjects.ball.position.set(
      ballState.position.x,
      ballState.position.y,
      ballState.position.z,
    );
    ballObjects.aura.position.copy(ballObjects.ball.position);
    ballObjects.ball.rotation.x += (ballState.angularVelocity.x ?? 0) / 60;
    ballObjects.ball.rotation.y += (ballState.angularVelocity.y ?? 0) / 60;
  }

  const target = wallTarget();
  for (const object of [
    sceneObjects.targetRing,
    sceneObjects.targetCross,
    sceneObjects.targetCrossVertical,
  ]) {
    object.position.x = target.x;
    object.position.y = target.y;
  }
  const technique = TECHNIQUES[state.selectedTechnique];
  sceneObjects.targetRing.material.color.setHex(technique.color);
  sceneObjects.targetCross.material.color.setHex(technique.color);
  sceneObjects.targetCrossVertical.material.color.setHex(technique.color);

  const intentPoints = [
    new THREE.Vector3(handState.position.x, handState.position.y, handState.position.z),
    new THREE.Vector3(target.x, target.y, 0.035),
  ];
  playerObjects.intentLine.geometry.setFromPoints(intentPoints);
  playerObjects.intentLine.computeLineDistances();

  if (!snapshot) {
    const observation = state.ai.observation;
    opponentObjects.perceptionRing.visible = Boolean(
      state.mode === 'match'
      && state.match.active
      && observation?.active,
    );
    if (opponentObjects.perceptionRing.visible) {
      const age = Math.max(0, state.tick - observation.sourceTick);
      const pulse = 1 + Math.sin(state.simulationTime * 10) * 0.12;
      opponentObjects.perceptionRing.position.set(
        observation.position.x,
        observation.position.y,
        observation.position.z,
      );
      opponentObjects.perceptionRing.scale.setScalar(
        pulse * THREE.MathUtils.clamp(1 + age / 90, 1, 1.45),
      );
    }
    trailGeometry.setFromPoints(
      state.trail.map((point) => new THREE.Vector3(point.x, point.y, point.z)),
    );
  }
}

function updateCamera() {
  const preset = CAMERA_PRESETS[state.cameraIndex];
  const focusX = state.mode === 'match'
    ? (state.player.position.x + state.ai.position.x) * 0.5
    : state.player.position.x;
  const lateralFollow = state.cameraIndex === 1
    ? focusX * 0.14
    : state.cameraIndex === 2
      ? focusX * 0.06
      : 0;
  const desiredPosition = preset.position.clone();
  desiredPosition.x += lateralFollow;
  camera.position.lerp(desiredPosition, 0.075);
  const target = preset.target.clone();
  target.x += focusX * (state.cameraIndex === 1 ? 0.09 : 0.03);
  camera.lookAt(target);

  const sensorHeight = 24;
  camera.fov = THREE.MathUtils.radToDeg(
    2 * Math.atan(sensorHeight / (2 * state.cameraFocalLength)),
  );
  camera.updateProjectionMatrix();
}

function updateChargeUi() {
  const charge = currentCharge();
  const active = Boolean(input.activeTechnique);
  ui.chargeReadout.classList.toggle('is-active', active);
  ui.chargeReadout.setAttribute('aria-hidden', String(!active));
  ui.chargeFill.style.width = `${Math.round(charge * 100)}%`;
  if (!active) return;

  const held = state.simulationTime - input.prepareStartedAt;
  if (held < 0.18) {
    ui.chargeLabel.textContent = 'Hand set';
    ui.chargeHint.textContent = 'Release now for a control touch';
  } else if (charge < 0.82) {
    ui.chargeLabel.textContent = 'Loading through the feet';
    ui.chargeHint.textContent = 'More preparation adds hand speed';
  } else if (held <= 1.28) {
    ui.chargeLabel.textContent = 'Power plateau';
    ui.chargeHint.textContent = 'A broad release window — watch the ball';
  } else {
    ui.chargeLabel.textContent = 'Body tension rising';
    ui.chargeHint.textContent = 'Holding longer no longer adds useful power';
  }
}

function syncTechniqueUi() {
  document.querySelectorAll('.technique-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.technique === state.selectedTechnique);
  });
  const technique = TECHNIQUES[state.selectedTechnique];
  const modifiers = [];
  if (input.modifiers.english < 0) modifiers.push('left English');
  if (input.modifiers.english > 0) modifiers.push('right English');
  if (input.modifiers.lift) modifiers.push('lift');
  if (input.modifiers.drive) modifiers.push('drive');
  ui.intentLabel.textContent = `${technique.label} · ${technique.intent}`;
  ui.intentDetail.textContent = modifiers.length
    ? `${modifiers.join(' + ')} changes the hand impulse—not a canned shot path.`
    : 'Point at the wall, hold, then release through the ball.';
}

function syncMatchUi() {
  const match = state.match;
  const inMatch = state.mode === 'match';
  const serverName = match.server === 'player' ? 'You' : 'Ghost';
  const receiverName = match.server === 'player' ? 'Ghost' : 'You';

  ui.playerMatchScore.textContent = String(match.scores.player);
  ui.aiMatchScore.textContent = String(match.scores.ai);
  ui.serveOwner.textContent = `${serverName} serve${match.serveFaults ? ` · fault ${match.serveFaults}` : ''}`;
  ui.rallyMetric.textContent = `${match.rallyContacts}-contact rally`;
  ui.matchRibbon.classList.toggle('is-match', inMatch);
  ui.rallyButton.disabled = inMatch && match.active;

  if (!inMatch) {
    ui.turnIndicator.textContent = state.mode === 'drop' ? 'Official ball test' : 'Sparring lab';
    const hasMatchProgress = match.scores.player > 0 || match.scores.ai > 0 || match.serveFaults > 0;
    ui.rallyButtonLabel.textContent = hasMatchProgress ? 'Resume Ghost match' : 'Spar with Ghost';
    ui.rallyButtonHint.textContent = hasMatchProgress
      ? `${serverName} serve · ${match.scores.player}–${match.scores.ai}`
      : 'First to 5 · server scores';
    return;
  }

  if (match.matchWinner) {
    ui.turnIndicator.textContent = `${match.matchWinner === 'player' ? 'You win' : 'Ghost wins'} · match`;
    ui.rallyButtonLabel.textContent = 'Run it back';
    ui.rallyButtonHint.textContent = `Final · ${match.scores.player}–${match.scores.ai}`;
    return;
  }

  if (match.active) {
    if (match.phase === 'serve-ready') {
      ui.turnIndicator.textContent = match.server === 'player' ? 'Hold to serve' : 'Ghost steps in';
    } else if (match.phase === 'serve-toss') {
      ui.turnIndicator.textContent = `${serverName} toss · release`;
    } else if (match.serveInFlight) {
      ui.turnIndicator.textContent = 'Serve must bounce past short';
    } else {
      ui.turnIndicator.textContent = match.expectedHitter === 'player'
        ? 'Your ball · move + release'
        : 'Ghost reads the return';
    }
    ui.rallyButtonLabel.textContent = 'Point live';
    ui.rallyButtonHint.textContent = `${receiverName} receiving`;
    return;
  }

  if (match.phase === 'serve-fault') {
    ui.turnIndicator.textContent = 'First fault · one serve left';
    ui.rallyButtonLabel.textContent = 'Second serve';
    ui.rallyButtonHint.textContent = `${serverName} ball`;
    return;
  }

  ui.turnIndicator.textContent = match.pointWinner
    ? `${match.pointWinner === 'player' ? 'You' : 'Ghost'} won the rally`
    : 'Point complete';
  ui.rallyButtonLabel.textContent = 'Next point';
  ui.rallyButtonHint.textContent = `${serverName} serve`;
}

function syncPhysicsUi() {
  ui.tempoValue.textContent = `${Math.round(state.tempoScale * 100)}%`;
  ui.floorRestitutionValue.textContent = physicsCoefficients.floorRestitution.toFixed(3);
  ui.wallRestitutionValue.textContent = physicsCoefficients.wallRestitution.toFixed(3);
  ui.dragValue.textContent = `${Math.round(physicsCoefficients.dragScale * 100)}%`;
  ui.magnusValue.textContent = `${Math.round(physicsCoefficients.magnusScale * 100)}%`;
  const predicted = calculateDropReboundHeight({
    restitution: physicsCoefficients.floorRestitution,
  }) / UNITS.INCH;
  ui.dropReadout.textContent = `Predicted drop rebound: ${predicted.toFixed(1)}″`;
  ui.dropReadout.style.color = predicted >= 48 && predicted <= 52 ? 'var(--lime)' : 'var(--pink)';
}

function syncTelemetryUi(timestamp) {
  if (timestamp - lastUiUpdate < 80) return;
  lastUiUpdate = timestamp;
  const replay = recorder.export();
  ui.seedValue.textContent = `0x${SEED.toString(16).toUpperCase()}`;
  ui.tickValue.textContent = state.tick.toLocaleString();
  ui.commandValue.textContent = replay.commands.length.toLocaleString();
  ui.contactValue.textContent = replay.contacts.length.toLocaleString();
  ui.replayCount.textContent = `${replay.contacts.length} events`;
  updateChargeUi();
}

function pollGamepad() {
  const pads = navigator.getGamepads?.() ?? [];
  let gamepad = input.gamepadIndex === null ? null : pads[input.gamepadIndex];
  if (!gamepad) {
    gamepad = Array.from(pads).find(Boolean) ?? null;
    input.gamepadIndex = gamepad?.index ?? null;
  }
  if (!gamepad) {
    input.move.x = 0;
    input.move.z = 0;
    return;
  }

  input.move.x = applyDeadzone(gamepad.axes[0] ?? 0);
  input.move.z = applyDeadzone(gamepad.axes[1] ?? 0);
  const aimX = applyDeadzone(gamepad.axes[2] ?? 0, 0.12);
  const aimY = applyDeadzone(gamepad.axes[3] ?? 0, 0.12);
  if (Math.abs(aimX) > 0 || Math.abs(aimY) > 0) {
    input.pointerAim = false;
    input.aim.x = THREE.MathUtils.clamp(input.aim.x + aimX * SIMULATION_DT * 1.35, -1, 1);
    input.aim.y = THREE.MathUtils.clamp(input.aim.y - aimY * SIMULATION_DT * 1.35, -1, 1);
  }

  for (const [index, technique] of GAMEPAD_TECHNIQUES) {
    const pressed = Boolean(gamepad.buttons[index]?.pressed);
    const wasPressed = Boolean(input.gamepadButtons[index]);
    if (pressed && !wasPressed) beginTechnique(technique);
    if (!pressed && wasPressed) releaseTechnique(technique);
    input.gamepadButtons[index] = pressed;
  }

  const previousModifiers = JSON.stringify(input.modifiers);
  input.modifiers.english = gamepad.buttons[4]?.pressed
    ? -1
    : gamepad.buttons[5]?.pressed
      ? 1
      : keyboardEnglish();
  input.modifiers.lift = (gamepad.buttons[6]?.value ?? 0) > 0.35 || input.keys.has('KeyQ');
  input.modifiers.drive = (gamepad.buttons[7]?.value ?? 0) > 0.35 || input.keys.has('KeyE');
  if (JSON.stringify(input.modifiers) !== previousModifiers) syncTechniqueUi();
}

function applyDeadzone(value, deadzone = 0.16) {
  const absolute = Math.abs(value);
  if (absolute <= deadzone) return 0;
  return Math.sign(value) * (absolute - deadzone) / (1 - deadzone);
}

function keyboardEnglish() {
  return input.keys.has('KeyZ') ? -1 : input.keys.has('KeyX') ? 1 : 0;
}

function updateKeyboardModifiers() {
  if (input.gamepadIndex !== null) return;
  input.modifiers.english = keyboardEnglish();
  input.modifiers.lift = input.keys.has('KeyQ');
  input.modifiers.drive = input.keys.has('KeyE');
  syncTechniqueUi();
}

function setCamera(id) {
  const index = CAMERA_PRESETS.findIndex((preset) => preset.id === id);
  if (index < 0) return;
  state.cameraIndex = index;
  document.querySelectorAll('[data-camera]').forEach((button) => {
    button.classList.toggle('active', button.dataset.camera === id);
  });
}

function cycleCamera() {
  setCamera(CAMERA_PRESETS[(state.cameraIndex + 1) % CAMERA_PRESETS.length].id);
}

function showCallout(message) {
  ui.callout.textContent = message;
  ui.callout.classList.remove('is-active');
  void ui.callout.offsetWidth;
  ui.callout.classList.add('is-active');
}

function unlockAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
}

function playImpact(frequency, gainValue) {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, frequency * 0.55), now + 0.09);
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.13);
}

function rumble(intensity, milliseconds) {
  const pads = navigator.getGamepads?.() ?? [];
  const gamepad = input.gamepadIndex === null ? null : pads[input.gamepadIndex];
  const actuator = gamepad?.vibrationActuator;
  if (!actuator?.playEffect) return;
  actuator.playEffect('dual-rumble', {
    duration: milliseconds,
    strongMagnitude: intensity,
    weakMagnitude: intensity * 0.72,
  }).catch(() => {});
}

function resize() {
  const rect = viewport.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateAimFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(wallAimPlane, wallAimPoint)) return;
  input.pointerAim = true;
  input.aim.x = THREE.MathUtils.clamp(wallAimPoint.x / (COURT.halfWidth - 0.28), -1, 1);
  const normalizedY = (
    wallAimPoint.y - 0.42
  ) / (COURT.wallHeight - 0.72);
  input.aim.y = THREE.MathUtils.clamp(normalizedY * 2 - 1, -1, 1);
}

function downloadReplay() {
  const replay = recorder.export();
  const blob = new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `the-wall-replay-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(href);
}

function frame(timestamp) {
  const delta = Math.min(0.05, Math.max(0, (timestamp - lastFrameTime) / 1000));
  lastFrameTime = timestamp;
  const replaySnapshot = updateReplay(delta);

  if (!state.replayPlayback) {
    accumulator += delta * state.tempoScale;
    let steps = 0;
    while (accumulator >= SIMULATION_DT && steps < 8) {
      updateSimulation();
      accumulator -= SIMULATION_DT;
      steps += 1;
    }
    if (steps === 8) accumulator = 0;
  }

  updateVisuals(replaySnapshot);
  updateCamera();
  syncTelemetryUi(timestamp);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (event) => {
  const technique = KEY_TECHNIQUES.get(event.code);
  if (technique) {
    event.preventDefault();
    if (!event.repeat) beginTechnique(technique);
    return;
  }
  input.keys.add(event.code);
  updateKeyboardModifiers();
  if (event.repeat) return;
  if (event.code === 'KeyR') startRallyPoint();
  if (event.code === 'KeyF') feedBall();
  if (event.code === 'KeyC') cycleCamera();
  if (event.code === 'Backspace') {
    event.preventDefault();
    resetLab();
  }
});

window.addEventListener('keyup', (event) => {
  const technique = KEY_TECHNIQUES.get(event.code);
  if (technique) {
    event.preventDefault();
    releaseTechnique(technique);
    return;
  }
  input.keys.delete(event.code);
  updateKeyboardModifiers();
});

window.addEventListener('blur', () => {
  if (input.activeTechnique) releaseTechnique(input.activeTechnique);
  input.keys.clear();
  input.move = { x: 0, z: 0 };
  updateKeyboardModifiers();
});

canvas.addEventListener('pointermove', updateAimFromPointer);
canvas.addEventListener('pointerdown', (event) => {
  unlockAudio();
  updateAimFromPointer(event);
  canvas.focus();
});

document.querySelectorAll('.technique-button').forEach((button) => {
  const technique = button.dataset.technique;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    beginTechnique(technique);
  });
  button.addEventListener('pointerup', (event) => {
    event.preventDefault();
    releaseTechnique(technique);
  });
  button.addEventListener('pointercancel', () => releaseTechnique(technique));
});

document.querySelectorAll('[data-camera]').forEach((button) => {
  button.addEventListener('click', () => setCamera(button.dataset.camera));
});

ui.cameraZoom.addEventListener('input', () => {
  state.cameraFocalLength = Number(ui.cameraZoom.value);
  ui.cameraZoomValue.textContent = `${state.cameraFocalLength} mm`;
});
ui.tempoScale.addEventListener('input', () => {
  state.tempoScale = Number(ui.tempoScale.value) * 0.01;
  syncPhysicsUi();
});
ui.feedButton.addEventListener('click', feedBall);
ui.rallyButton.addEventListener('click', startRallyPoint);
ui.dropButton.addEventListener('click', runDropTest);
ui.resetLabButton.addEventListener('click', () => resetLab());
ui.replayButton.addEventListener('click', replayLastContact);
ui.exportReplayButton.addEventListener('click', downloadReplay);
ui.resetPhysicsButton.addEventListener('click', () => {
  state.tempoScale = 0.78;
  physicsCoefficients.floorRestitution = MATERIAL.floorRestitution;
  physicsCoefficients.wallRestitution = MATERIAL.wallRestitution;
  physicsCoefficients.dragScale = 1;
  physicsCoefficients.magnusScale = 1;
  ui.tempoScale.value = '78';
  ui.floorRestitution.value = String(MATERIAL.floorRestitution);
  ui.wallRestitution.value = String(MATERIAL.wallRestitution);
  ui.dragScale.value = '100';
  ui.magnusScale.value = '100';
  syncPhysicsUi();
});

for (const [element, key, scaleValue = 1] of [
  [ui.floorRestitution, 'floorRestitution', 1],
  [ui.wallRestitution, 'wallRestitution', 1],
  [ui.dragScale, 'dragScale', 0.01],
  [ui.magnusScale, 'magnusScale', 0.01],
]) {
  element.addEventListener('input', () => {
    physicsCoefficients[key] = Number(element.value) * scaleValue;
    syncPhysicsUi();
  });
}

window.addEventListener('gamepadconnected', (event) => {
  input.gamepadIndex = event.gamepad.index;
  input.gamepadButtons = [];
  ui.controllerBadge.classList.add('is-connected');
  const playStation = /playstation|dualsense|dualshock/i.test(event.gamepad.id);
  ui.controllerName.textContent = playStation ? 'PlayStation controller' : 'Gamepad connected';
  ui.worldHint.querySelector('kbd').textContent = playStation ? '×' : 'A';
});

window.addEventListener('gamepaddisconnected', (event) => {
  if (input.gamepadIndex !== event.gamepad.index) return;
  input.gamepadIndex = null;
  input.gamepadButtons = [];
  ui.controllerBadge.classList.remove('is-connected');
  ui.controllerName.textContent = 'Keys + mouse';
  ui.worldHint.querySelector('kbd').textContent = 'A';
});

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(viewport);
resize();
syncPhysicsUi();
syncTechniqueUi();
syncMatchUi();
ui.seedValue.textContent = `0x${SEED.toString(16).toUpperCase()}`;
window.__THE_WALL_LAB__ = {
  getSnapshot: () => cloneSerializable(currentSnapshot()),
  getReplay: () => recorder.export(),
  getMatch: () => cloneSerializable(state.match),
  getAiObservation: () => cloneSerializable(state.ai.observation),
  feedBall,
  startRallyPoint,
  startGhostPoint: () => {
    if (state.match.active) return;
    state.match = createMatchState({
      server: 'ai',
      scores: state.match.scores,
    });
    startRallyPoint();
  },
  runDropTest,
  resetLab,
};
requestAnimationFrame(frame);
