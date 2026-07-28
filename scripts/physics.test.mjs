import assert from 'node:assert/strict';
import {
  accelerationFor,
  calculateDropReboundHeight,
  magnitude,
  resolveHandContact,
  stepBall,
  sweepMovingSpheres,
} from '../src/sim/ballistics.js';
import { BALL, COURT, MATERIAL, PHYSICS, UNITS, courtRatios } from '../src/sim/court.js';
import { createSeededRandom } from '../src/sim/random.js';
import { createReplayRecorder, validateReplay } from '../src/sim/replay.js';
import {
  awardRally,
  beginPoint,
  createMatchState,
  registerFloorContact,
  registerLegalContact,
  registerWallContact,
  resolveServeFault,
} from '../src/sim/rules.js';
import {
  assertSimulationSnapshot,
  createBallState,
  createPlayerCommand,
  createSimulationSnapshot,
} from '../src/sim/types.js';

const near = (actual, expected, tolerance, message) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, got ${actual}`,
  );
};

near(COURT.width, 6.096, 1e-12, 'Court width');
near(COURT.wallHeight, 4.8768, 1e-12, 'Wall height');
near(COURT.shortLine, 4.8768, 1e-12, 'Short line');
near(COURT.serviceMarkers, 7.62, 1e-12, 'Service markers');
near(COURT.longLine, 10.3632, 1e-12, 'Long line');
near(BALL.diameter, 0.047625, 1e-12, 'Ball diameter');
near(BALL.mass, 0.061, 1e-12, 'Ball mass');

const ratios = courtRatios();
near(ratios.shortLine, 16 / 34, 1e-12, 'Short-line ratio');
near(ratios.serviceMarkers, 25 / 34, 1e-12, 'Service-marker ratio');

const analyticalRebound = calculateDropReboundHeight() / UNITS.INCH;
assert.ok(
  analyticalRebound >= 48 && analyticalRebound <= 52,
  `Analytical drop rebound must be official, got ${analyticalRebound.toFixed(3)} inches`,
);

function simulateDrop() {
  const ball = createBallState({
    position: { x: 0, y: BALL.officialDropHeight, z: COURT.shortLine },
    velocity: { x: 0, y: 0, z: 0 },
  });
  let bounced = false;
  let apex = BALL.radius;
  let floorContacts = 0;

  for (let step = 0; step < PHYSICS.solverHz * 3; step += 1) {
    const events = stepBall(ball, 1 / PHYSICS.solverHz, {
      tick: step,
      coefficients: {
        floorRestitution: MATERIAL.floorRestitution,
        dragScale: 1,
        magnusScale: 1,
      },
    });
    floorContacts += events.filter(
      (event) => event.type === 'contact' && event.contact.kind === 'floor',
    ).length;
    if (ball.floorBounces > 0) {
      bounced = true;
      apex = Math.max(apex, ball.position.y);
      if (ball.velocity.y <= 0) break;
    }
  }

  assert.equal(bounced, true, 'Drop test should bounce');
  assert.equal(floorContacts, 1, 'Drop test should have one floor contact before apex');
  return apex / UNITS.INCH;
}

const simulatedRebound = simulateDrop();
assert.ok(
  simulatedRebound >= 48 && simulatedRebound <= 52,
  `Simulated drop rebound must be official, got ${simulatedRebound.toFixed(3)} inches`,
);

const fastBall = createBallState({
  position: { x: 0, y: 1.2, z: 5 },
  velocity: { x: 0, y: 0, z: -900 },
});
const fastEvents = stepBall(fastBall, 1 / 120, { tick: 1 });
assert.ok(
  fastEvents.some((event) => event.type === 'contact' && event.contact.kind === 'wall'),
  'Swept solver must detect a wall hit even when one step crosses the entire gap',
);
assert.ok(fastBall.velocity.z > 0, 'Wall collision should reverse wall-normal velocity');

const wallBall = createBallState({
  position: { x: 0, y: 1.5, z: 0.5 },
  velocity: { x: 2, y: 0.4, z: -10 },
  angularVelocity: { x: -30, y: 8, z: 0 },
});
const incomingEnergyProxy = magnitude(wallBall.velocity);
const wallEvents = stepBall(wallBall, 0.08, { tick: 2 });
assert.ok(
  wallEvents.some((event) => event.type === 'contact' && event.contact.kind === 'wall'),
  'Direct wall trajectory should collide',
);
assert.ok(
  magnitude(wallBall.velocity) <= incomingEnergyProxy * 1.05,
  'Passive wall contact must not add material translational energy',
);

const noSpinBall = createBallState({
  position: { x: 0, y: 1.2, z: 5 },
  velocity: { x: 0, y: 0, z: -12 },
  angularVelocity: { x: 0, y: 0, z: 0 },
});
const topSpinBall = createBallState({
  position: { x: 0, y: 1.2, z: 5 },
  velocity: { x: 0, y: 0, z: -12 },
  angularVelocity: { x: -100, y: 0, z: 0 },
});
const backSpinBall = createBallState({
  position: { x: 0, y: 1.2, z: 5 },
  velocity: { x: 0, y: 0, z: -12 },
  angularVelocity: { x: 100, y: 0, z: 0 },
});
assert.ok(
  accelerationFor(topSpinBall).y < accelerationFor(noSpinBall).y,
  'Topspin should increase downward acceleration on a wall-bound ball',
);
assert.ok(
  accelerationFor(backSpinBall).y > accelerationFor(noSpinBall).y,
  'Backspin should add lift relative to an unspun wall-bound ball',
);

const sweptTime = sweepMovingSpheres(
  { x: 0, y: 1, z: 1 },
  { x: 0, y: 1, z: 0 },
  BALL.radius,
  { x: 0, y: 1, z: 0.4 },
  { x: 0, y: 1, z: 0.8 },
  0.105,
);
assert.ok(sweptTime !== null && sweptTime >= 0 && sweptTime <= 1, 'Moving hand sweep should find contact');

const handBall = createBallState({
  position: { x: 0, y: 1, z: 0.7 },
  previousPosition: { x: 0, y: 1, z: 0.82 },
  velocity: { x: 0, y: 0, z: 4 },
});
const handContact = resolveHandContact(
  handBall,
  {
    previousPosition: { x: 0, y: 1, z: 1.05 },
    position: { x: 0, y: 1, z: 0.54 },
    velocity: { x: 0, y: 0, z: -15.3 },
    radius: 0.105,
  },
  {
    id: 'test-hand-contact',
    tick: 12,
    technique: 'topspin',
    charge: 0.82,
    spinImpulse: { x: -80, y: 0, z: 0 },
  },
);
assert.ok(handContact, 'Swept moving hand should create a contact record');
assert.ok(handBall.velocity.z < 0, 'A forward swing should send the incoming ball toward the wall');
assert.equal(handContact.technique, 'topspin');
assert.ok(handContact.outgoingSpin.x < 0, 'Topspin contact should create forward rotation');

const firstRandom = createSeededRandom(42);
const secondRandom = createSeededRandom(42);
const firstSequence = Array.from({ length: 64 }, () => firstRandom.next());
const secondSequence = Array.from({ length: 64 }, () => secondRandom.next());
assert.deepEqual(firstSequence, secondSequence, 'Seeded random streams must replay exactly');

const snapshot = createSimulationSnapshot({
  tick: 99,
  simulationTime: 0.825,
  seed: 42,
  player: { position: { x: 0, y: 0, z: COURT.serviceMarkers } },
  opponent: { position: { x: 0.5, y: 0, z: COURT.longLine } },
  match: createMatchState({
    active: true,
    phase: 'rally',
    targetScore: 11,
    scores: { player: 4, ai: 3 },
    server: 'player',
    expectedHitter: 'ai',
  }),
  hand: { position: { x: 0.3, y: 1, z: 7.4 } },
  opponentHand: { position: { x: 0.8, y: 1, z: 9.8 } },
  ball: handBall,
});
assert.equal(assertSimulationSnapshot(snapshot), true);
assert.equal(snapshot.opponent.position.z, COURT.longLine);
assert.equal(snapshot.match.targetScore, 11);
assert.deepEqual(snapshot.match.scores, { player: 4, ai: 3 });
assert.equal(snapshot.match.expectedHitter, 'ai');
assert.doesNotThrow(() => JSON.stringify(snapshot), 'Snapshot must be serializable');

const replayRecorder = createReplayRecorder({ seed: 42, label: 'test' });
replayRecorder.recordCommand(createPlayerCommand({
  tick: 4,
  sequence: 1,
  move: { x: 0.5, z: -0.25 },
  aim: { x: -0.7, y: 0.3 },
  contact: 'palm',
  phase: 'prepare',
  charge: 0.6,
}));
replayRecorder.recordContact(handContact);
replayRecorder.checkpoint(snapshot);
const replay = replayRecorder.export();
assert.equal(validateReplay(replay), true);
assert.equal(replay.commands.length, 1);
assert.equal(replay.contacts.length, 1);
assert.equal(replay.checkpoints.length, 1);

const playerCommand = createPlayerCommand({
  controllerId: 'ai',
  tick: 5,
  sequence: 2,
});
assert.equal(playerCommand.controllerId, 'ai', 'Commands identify their controller for future netcode');

let match = beginPoint(createMatchState({ server: 'player' }));
match = registerLegalContact(match, 'player', createBallState());
assert.equal(match.serveInFlight, true, 'The opening contact starts serve validation');
match = registerWallContact(match);
const legalServe = registerFloorContact(match, {
  x: 0,
  y: BALL.radius,
  z: COURT.shortLine + 0.8,
});
assert.equal(legalServe.verdict, null, 'A serve between short and long lines stays live');
assert.equal(legalServe.match.serveInFlight, false);
const untouchedSecondBounce = registerFloorContact(legalServe.match, {
  x: 0,
  y: BALL.radius,
  z: COURT.longLine - 0.5,
});
assert.equal(untouchedSecondBounce.verdict.winner, 'player');
assert.equal(untouchedSecondBounce.verdict.reason, 'second-bounce');

let shortServe = beginPoint(createMatchState({ server: 'player' }));
shortServe = registerLegalContact(shortServe, 'player', createBallState());
shortServe = registerWallContact(shortServe);
const shortVerdict = registerFloorContact(shortServe, {
  x: 0,
  y: BALL.radius,
  z: COURT.shortLine - 0.2,
});
assert.equal(shortVerdict.verdict.serveFault, true);
assert.equal(shortVerdict.verdict.reason, 'short-serve');

const firstFault = resolveServeFault(shortServe, 'short-serve');
assert.equal(firstFault.point, null, 'First serve fault keeps service');
assert.equal(firstFault.match.serveFaults, 1);
const doubleFault = resolveServeFault(firstFault.match, 'serve-down');
assert.equal(doubleFault.point.sideOut, true, 'Second fault is a side-out');
assert.equal(doubleFault.match.server, 'ai');

const serverWin = awardRally(createMatchState({ server: 'player' }), 'player', 'second-bounce');
assert.equal(serverWin.match.scores.player, 1, 'Only a serving winner scores');
const receiverWin = awardRally(createMatchState({ server: 'player' }), 'ai', 'second-bounce');
assert.deepEqual(receiverWin.match.scores, { player: 0, ai: 0 });
assert.equal(receiverWin.point.sideOut, true);
assert.equal(receiverWin.match.server, 'ai');
const streetMatchWin = awardRally(
  createMatchState({
    targetScore: 11,
    server: 'player',
    scores: { player: 10, ai: 8 },
  }),
  'player',
  'second-bounce',
);
assert.equal(streetMatchWin.match.scores.player, 11);
assert.equal(streetMatchWin.match.matchWinner, 'player');
assert.equal(streetMatchWin.point.matchWinner, 'player');

console.log(
  `Physics checks passed: ${simulatedRebound.toFixed(2)}″ drop rebound, `
    + `${COURT.width.toFixed(3)} m court width, swept wall + directional hand contacts, `
    + 'official serve/scoring rules, deterministic replay.',
);
