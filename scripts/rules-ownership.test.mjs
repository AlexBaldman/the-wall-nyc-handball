import assert from 'node:assert/strict';
import * as legacyRules from '../src/sim/rules.js';
import * as handballRules from '../src/sports/handball/rules.js';
import { ONE_WALL_HANDBALL } from '../src/sports/handball/sport-pack.js';

const exportedRuleNames = [
  'MATCH_TARGET_SCORE',
  'createMatchState',
  'opponentOf',
  'isLegalServeBounce',
  'beginPoint',
  'registerLegalContact',
  'registerWallContact',
  'registerFloorContact',
  'resolveServeFault',
  'awardRally',
];

for (const name of exportedRuleNames) {
  assert.equal(
    legacyRules[name],
    handballRules[name],
    `Legacy sim/rules export ${name} should resolve to the handball-owned implementation`,
  );
  assert.equal(
    ONE_WALL_HANDBALL.rules[name],
    handballRules[name],
    `SportPack should expose the handball-owned ${name} rule`,
  );
}

const state = handballRules.beginPoint(handballRules.createMatchState({ server: 'player' }));
assert.equal(state.phase, 'serve-ready');
assert.equal(state.expectedHitter, 'player');

console.log('Handball rule ownership compatibility passed.');
