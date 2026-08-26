import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'intercept.html'), 'utf8');
const lab = readFileSync(resolve(root, 'src/labs/intercept-lab.js'), 'utf8');
const presets = readFileSync(resolve(root, 'src/labs/intercept-lab-presets.js'), 'utf8');
const liveCoordinator = readFileSync(resolve(root, 'src/labs/ball-lab.js'), 'utf8');
const liveEntry = readFileSync(resolve(root, 'src/labs/ball-lab-entry.js'), 'utf8');

for (const id of ['scenarioPreset', 'presetState']) {
  assert.ok(html.includes(`id="${id}"`), `Intercept Lab should expose ${id}`);
}
assert.ok(lab.includes('INTERCEPT_LAB_PRESETS'), 'Lab must consume the shared preset definitions');
assert.ok(lab.includes('selectedPresetScenario.ball'), 'Preset mode must plan from exact benchmark ball state');
assert.ok(lab.includes('source.horizon'), 'Preset mode must preserve benchmark horizon');
assert.ok(lab.includes('markScenarioCustom'), 'Manual scenario edits must clear preset identity');
assert.ok(lab.includes('movementExperiment.addEventListener'), 'Movement experiment selector must remain independent');
assert.ok(presets.includes('HANDBALL_INTERCEPT_BENCHMARKS'), 'Presets must source canonical benchmark data');
assert.equal(liveCoordinator.includes('INTERCEPT_LAB_PRESETS'), false, 'Live coordinator must not know Lab presets');
assert.equal(liveEntry.includes('intercept-lab-presets'), false, 'Street Match composition must not import Lab presets');

console.log('Intercept Lab preset boundary passed.');
