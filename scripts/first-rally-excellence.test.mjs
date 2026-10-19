import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ASSISTANCE_PROFILES,
  resolveAssistanceProfile,
  resolveHandAssistConfig,
} from '../src/sports/handball/assistance-profile.js';
import { ONE_WALL_HANDBALL } from '../src/sports/handball/sport-pack.js';
import { deriveReleaseCue } from '../src/presentation/coach-timing.js';
import { createPlaytestSessionReport, validatePlaytestSessionReport } from '../src/playtest/session-report.js';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
assert.deepEqual(Object.keys(ASSISTANCE_PROFILES), ['guided', 'street', 'pure']);
assert.equal(resolveAssistanceProfile('unknown').id, 'guided');
assert.equal(resolveHandAssistConfig('guided', ONE_WALL_HANDBALL), ONE_WALL_HANDBALL.noviceHandAssist);
assert.equal(resolveHandAssistConfig('street', ONE_WALL_HANDBALL), ONE_WALL_HANDBALL.handAssist);
assert.equal(resolveHandAssistConfig('pure', ONE_WALL_HANDBALL), null);

const reference = { recommended: { time: 0.13 } };
const settled = { movementDistanceMeters: 0.03 };
assert.equal(deriveReleaseCue({ plan: reference, footwork: settled, preparing: true, swingContactLag: 0.075 }), 'strike');
assert.equal(deriveReleaseCue({ plan: { recommended: { time: 0.32 } }, footwork: settled, preparing: true }), 'hold');
assert.equal(deriveReleaseCue({ plan: { recommended: { time: 0.23 } }, footwork: settled, preparing: false }), 'prepare');
assert.equal(deriveReleaseCue({ plan: { recommended: { time: 0.7 } }, footwork: { movementDistanceMeters: 0.5 } }), 'move');
assert.notEqual(deriveReleaseCue({ plan: { recommended: { time: 0.005 } }, footwork: settled, preparing: true }), 'strike',
  'A past release window must not keep flashing RELEASE NOW');
assert.equal(deriveReleaseCue({ plan: null }), 'recover');

const game = read('src/labs/ball-lab.js');
const shell = read('src/labs/mvp-shell.js');
const report = read('src/labs/mvp-playtest-session.js');
const lab = read('lab.html');
const coach = read('src/labs/intercept-coach.js');
assert.ok(game.includes('resolveHandAssistConfig(state.assistance'), 'Assist must depend on a separate player setting');
assert.ok(!game.includes("state.mode === 'practice' || state.difficulty === 'rookie'"), 'Opponent level must not silently change hand assistance');
assert.ok(game.includes('getSwingContactLag'), 'Coach must use actual release-to-contact travel estimate');
assert.ok(coach.includes('deriveReleaseCue({'), 'Live cue must use timing-derived prompt');
assert.ok(shell.includes('api.setAssistance('));
assert.ok(lab.includes('id="assistanceSwitcher"'));
assert.ok(report.includes('handAssistProfileId: context.handAssistProfileId'));
assert.ok(report.includes('assistanceProfileId: context.assistanceProfileId'));

const sample = createPlaytestSessionReport({
  tuning: { assistanceProfileId: 'guided', handAssistProfileId: 'novice-hand-start' },
  session: { assistance: 'guided' },
  performance: { swingAttempts: 12, airSwings: 4, totalContacts: 7 },
});
assert.equal(sample.performance.swingAttempts, 12);
assert.equal(sample.performance.airSwings, 4);
assert.equal(sample.tuning.handAssistProfileId, 'novice-hand-start');

console.log('First Rally assistance, cue timing, telemetry, and ownership contracts passed.');
